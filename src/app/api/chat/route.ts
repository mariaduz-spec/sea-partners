import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getDashboardImoveis,
  getDashboardEvolucaoMensal,
  getExtratoMensalPorImovel,
  aggregatePaymentStats,
  formatBRL,
  formatBRLCompact,
  type DashboardSummary,
  type DashboardImovel,
  type DashboardMes,
} from '@/lib/queries'

export const maxDuration = 60

const hub = createOpenAICompatible({
  name: 'seazone-hub',
  baseURL: process.env.LLM_HUB_BASE_URL ?? 'https://hub.seazone.dev/v1',
  apiKey: process.env.LLM_HUB_API_KEY,
})

const HUB_MODEL = process.env.LLM_HUB_MODEL ?? 'claude-haiku'

const SYSTEM_PROMPT = `Voce e o assistente do Sea Partners, portal self-service da Seazone para parceiros indicadores de imoveis em aluguel por temporada.

# Regras

1. **Lingua**: portugues brasileiro. Tom proximo e profissional.
2. **Nao invente numeros**: use APENAS os dados abaixo. Se perguntarem sobre algo fora desses dados, diga que nao esta disponivel.
3. **Formato**: valores sempre em R$ 1.234,56 (ponto de milhar, virgula decimal).
4. **Conciso**: parceiros sao ocupados. Listas e bullets ajudam.
5. **Nao exponha**: IDs internos, CODIGOS brutos, SQL, Nekt, Supabase. Fale como produto de negocio.
6. **Modelo de pagamento real**:
   - **Recorrente (Recurring)**: 2% sobre a receita mensal do imovel. O parceiro recebe todo mes enquanto o imovel gerar receita.
   - **Unico (Single)**: valor fixo pago uma vez (one-shot) quando o imovel fecha contrato.
7. **Quando pedirem 'resumo'**: gere 3-4 bullets cobrindo (a) comissao total 12m, (b) numero de indicacoes, (c) melhores geradores de receita, (d) 1 sugestao se fizer sentido.

# Contextualizacoes uteis

- "Imoveis ativos" = imoveis em operacao na Seazone (status Active)
- "Indicacoes Won" = imoveis que o parceiro indicou e que fecharam contrato
- "Receita" = valor mensal que o imovel gerou (nao e o que o parceiro recebe)
- "Comissao" = 2% da receita (se Recurring) ou valorfixo (se Single)
`

function buildContexto(
  displayName: string,
  summary: DashboardSummary,
  imoveis: DashboardImovel[],
  evolucao: DashboardMes[]
): string {
  const stats = aggregatePaymentStats(evolucao)
  const imoveisAtivos = imoveis.filter((i) => i.prop_status === 'Active')
  const imoveisRecurring = imoveis.filter((i) => i.commission_payment_type === 'Recurring')
  const imoveisSingle = imoveis.filter((i) => i.commission_payment_type === 'Single')

  // Top 5 por comissao
  const top5 = [...imoveis]
    .sort((a, b) => b.comissao_12m - a.comissao_12m)
    .slice(0, 5)
    .map((i) => `- ${i.code}: ${formatBRL(i.comissao_12m)} (${i.commission_display})`)
    .join('\n')

  // Recent evolution
  const recent = evolucao.slice(-6).map((m) =>
    `- ${m.mes_ano}: ${formatBRL(m.comissao_mes)} (${m.label_status})`
  ).join('\n')

  return `# Dados do parceiro ${displayName}

## Resumo
- Indicacoes totais: ${summary.total_indicacoes}
- Won: ${summary.indicacoes_won} | Lost: ${summary.indicacoes_lost} | Em curso: ${summary.indicacoes_in_progress}
- Imoveis ativos: ${summary.imoveis_ativos}
- Comissao 12m estimada: ${formatBRL(summary.comissao_12m_estimada)}
- Media mensal: ${formatBRL(summary.media_comissao_mensal)} (${summary.meses_com_receita} meses com receita)

## Status pagamentos
- Total gerado: ${formatBRL(stats.total_gerado)} (${stats.meses_com_receita} meses com receita)

## Imoveis por tipo
- Recorrente: ${imoveisRecurring.length}
- Unico: ${imoveisSingle.length}
- Inativos: ${imoveisAtivos.length === 0 ? imoveis.length : imoveis.length - imoveisAtivos.length}

## Top 5 geradores (12m)
${top5 || 'Sem dados.'}

## Evolucao recente (ultimos 6 meses)
${recent || 'Sem dados.'}
`
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

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

    const partner = await getPartnerForCurrentUser()
    if (!partner) {
      return new Response(
        JSON.stringify({ error: 'No partner mapping for this user' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
    }

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
    const message = err instanceof Error ? err.message : 'unknown server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}