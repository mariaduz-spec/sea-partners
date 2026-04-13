import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getDashboardImoveis,
  getDashboardEvolucaoMensal,
  formatBRL,
  type DashboardImovel,
  type DashboardMes,
  type DashboardSummary,
} from '@/lib/queries'

export const maxDuration = 60

/**
 * Client apontando pro LLM Hub da Seazone (LiteLLM gateway).
 *
 * Usamos @ai-sdk/openai-compatible porque LiteLLM tem quirks no formato
 * de streaming que nao batem com @ai-sdk/openai oficial (erro
 * "text-delta for missing text part"). Esse provider tolera.
 */
const hub = createOpenAICompatible({
  name: 'seazone-hub',
  baseURL: process.env.LLM_HUB_BASE_URL ?? 'https://hub.seazone.dev/v1',
  apiKey: process.env.LLM_HUB_API_KEY,
})

// Modelo do hub usado pro assistente. apps-premium = Claude Haiku via Hub (cliente-facing, pt-BR).
const HUB_MODEL = process.env.LLM_HUB_MODEL ?? 'apps-premium'

const SYSTEM_PROMPT = `Voce e o assistente do Sea Partners, portal self-service da Seazone para parceiros indicadores de imoveis em aluguel por temporada.

# Regras obrigatorias

1. **Lingua**: responda sempre em portugues brasileiro. Tom proximo mas profissional.
2. **Nao invente numeros**: use APENAS os dados fornecidos abaixo. Se a pergunta for sobre algo fora desses dados (outro parceiro, periodo anterior a 12 meses, etc.), diga claramente que essa informacao nao esta disponivel.
3. **Formato de valores**: sempre em reais brasileiros (R$ 1.234,56 — ponto de milhar, virgula decimal).
4. **Tom**: conciso, direto. Parceiros sao ocupados. Evite paragrafos longos e floreios.
5. **Markdown**: use negrito e listas quando ajudar clareza. Nao use headings (#). Respostas curtas sao melhores.
6. **Quando pedirem "resumo semanal"** ou similar: gere 3-4 bullets cobrindo (a) total do mes mais recente, (b) comparacao com mes anterior ou media, (c) destaques de imoveis ou padrao relevante, (d) 1 sugestao de acao se fizer sentido.
7. **Jamais mencione IDs internos, CODIGOS de imovel ou parceiro, SQL, Nekt, Supabase, etc.** Fale como produto de negocio, nao como sistema tecnico.
8. **Regra de comissao**: 2% sobre a receita de reservas (receita do hospede pro imovel). Essa e a regra padrao do modelo revenue share do Sea Partners nesse MVP.

# Proatividade

Se o parceiro fizer uma pergunta aberta (ex: "como esta meu mes?"), voce pode proativamente:
- Destacar se houve tendencia de alta/queda
- Apontar o imovel de maior e menor desempenho
- Sugerir olhar para um imovel especifico se algo parece fora do padrao
`

function buildContexto(
  displayName: string,
  summary: DashboardSummary,
  imoveis: DashboardImovel[],
  evolucao: DashboardMes[]
): string {
  const imoveisAtivos = imoveis.filter((i) => i.receita_12m > 0)
  const imoveisResumo = imoveisAtivos
    .slice(0, 20)
    .map(
      (i) =>
        `- ${i.code} (${i.prop_status}): receita 12m ${formatBRL(
          i.receita_12m
        )}, comissao ${formatBRL(i.comissao_12m)}, ${i.n_meses} meses ativos`
    )
    .join('\n')

  const evolucaoResumo = evolucao
    .map(
      (m) =>
        `- ${m.mes_ano}: receita ${formatBRL(m.receita_mes)}, comissao ${formatBRL(
          m.comissao_mes
        )}, ${m.n_imoveis_ativos} imoveis ativos`
    )
    .join('\n')

  const media =
    summary.meses_distintos > 0
      ? summary.comissao_2pct / summary.meses_distintos
      : 0

  return `# Dados do parceiro ${displayName} (ultimos 12 meses)

## Resumo
- Imoveis indicados no total: ${summary.imoveis_indicados}
- Imoveis rendendo receita: ${summary.imoveis_com_receita}
- Receita total dos imoveis: ${formatBRL(summary.receita_total_12m)}
- Comissao do parceiro (2%): ${formatBRL(summary.comissao_2pct)}
- Comissao media mensal: ${formatBRL(Math.round(media))}
- Meses com dados: ${summary.meses_distintos}

## Evolucao mensal (do mais antigo ao mais recente)
${evolucaoResumo || 'Sem dados mensais.'}

## Imoveis com receita (top 20, ordenados por receita 12m)
${imoveisResumo || 'Sem imoveis com receita no periodo.'}
`
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    // Auth
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Partner lookup
    const partner = await getPartnerForCurrentUser()
    if (!partner) {
      return new Response(
        JSON.stringify({ error: 'No partner mapping for this user' }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      )
    }

    // Carrega contexto (3 queries em paralelo, ~1-3s)
    const [summary, imoveis, evolucao] = await Promise.all([
      getDashboardSummary(partner.parceiro_id),
      getDashboardImoveis(partner.parceiro_id),
      getDashboardEvolucaoMensal(partner.parceiro_id),
    ])

    const contexto = buildContexto(
      partner.display_name,
      summary,
      imoveis,
      evolucao
    )

    const result = streamText({
      model: hub(HUB_MODEL),
      system: `${SYSTEM_PROMPT}\n\n${contexto}`,
      messages: await convertToModelMessages(messages),
      temperature: 0.4,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('[api/chat] error:', err)
    const message =
      err instanceof Error ? err.message : 'unknown server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
