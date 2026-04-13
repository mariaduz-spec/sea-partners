import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getPagamentosParceiro,
  getDashboardImoveis,
  aggregatePagamentosPorMes,
  formatBRL,
  type PagamentoParceiro,
  type DashboardImovel,
  type DashboardSummary,
  type PagamentosPorMes,
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
4. **Conciso**: parceiros sao ocupados. Listas e negritos ajudam, headings nao.
5. **Nao exponha**: IDs internos, CODIGOS de imovel brutos, SQL, Nekt, Supabase. Fale como produto de negocio.
6. **Modelo de pagamento real**: o parceiro recebe **uma taxa de adesao one-shot** quando um imovel que ele indicou fecha contrato com a Seazone. Pode ser valor fixo (ex: R$ 200, R$ 499, R$ 999) ou zero (deals sem taxa). A forma de pagamento geralmente eh 'A Vista' ou 'Entrada + abatimento'.
7. **Quando pedirem 'resumo'**: gere 3-4 bullets cobrindo (a) total recebido no periodo, (b) numero de indicacoes, (c) destaques (melhor mes, maior pagamento), (d) 1 sugestao se fizer sentido.

# Contextualizacoes uteis

- "Imoveis ativos" = im\u00f3veis em operacao na Seazone (status Active)
- "Indicacoes" = deals won do parceiro no Pipedrive. Podem ou nao ter taxa de adesao.
- "Ticket medio" = valor medio por indicacao paga (ignorando as sem taxa).
`

function buildContexto(
  displayName: string,
  summary: DashboardSummary,
  pagamentos: PagamentoParceiro[],
  imoveis: DashboardImovel[],
  evolucao: PagamentosPorMes[]
): string {
  const pagamentosPagos = pagamentos.filter((p) => p.taxa_de_adesao > 0)
  const ultimosPagamentos = pagamentosPagos.slice(0, 10).map((p) =>
    `- ${p.close_date_display} · ${p.title || 'sem titulo'} (${p.codigo_do_imovel_unidade}): ${formatBRL(p.taxa_de_adesao)} · ${p.forma_pagamento}`
  ).join('\n')

  const melhorMes = evolucao.length > 0
    ? evolucao.reduce((best, cur) => (cur.total_recebido > best.total_recebido ? cur : best))
    : null

  const imoveisAtivos = imoveis.filter((i) => i.prop_status === 'Active')

  return `# Dados do parceiro ${displayName}

## Resumo
- Indicacoes totais (deals won): ${summary.total_indicacoes}
- Indicacoes com taxa paga: ${summary.total_com_pagamento}
- Total recebido: ${formatBRL(summary.total_recebido)}
- Ticket medio (por indicacao paga): ${formatBRL(summary.ticket_medio)}
${summary.primeiro_pagamento ? `- Primeiro pagamento: ${summary.primeiro_pagamento.toLocaleDateString('pt-BR')}` : ''}
${summary.ultimo_pagamento ? `- Ultimo pagamento: ${summary.ultimo_pagamento.toLocaleDateString('pt-BR')}` : ''}

## Imoveis em operacao
- Ativos: ${imoveisAtivos.length}
- Outros: ${imoveis.length - imoveisAtivos.length}

## Melhor mes
${melhorMes ? `${melhorMes.mes_ano}: ${formatBRL(melhorMes.total_recebido)} em ${melhorMes.count_com_pagamento} pagamento(s)` : 'Sem dados mensais.'}

## Evolucao mensal (do mais antigo ao mais recente)
${evolucao.length > 0
  ? evolucao.map((m) =>
      `- ${m.mes_ano}: ${formatBRL(m.total_recebido)} em ${m.total_indicacoes} indicacao(oes) (${m.count_com_pagamento} pagas)`
    ).join('\n')
  : 'Sem dados.'}

## Ultimos 10 pagamentos
${ultimosPagamentos || 'Sem pagamentos registrados.'}
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

    const [summary, pagamentos, imoveis] = await Promise.all([
      getDashboardSummary(partner.parceiro_id),
      getPagamentosParceiro(partner.parceiro_id),
      getDashboardImoveis(partner.parceiro_id),
    ])

    const evolucao = aggregatePagamentosPorMes(pagamentos)
    const contexto = buildContexto(
      partner.display_name,
      summary,
      pagamentos,
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
