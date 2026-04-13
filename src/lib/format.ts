/**
 * Tipos e formatters compartilhados entre server e client.
 * NAO importa 'server-only' — pode ser usado em client components.
 */

export type DashboardSummary = {
  total_indicacoes: number
  total_com_pagamento: number
  total_recebido: number
  ticket_medio: number
  primeiro_pagamento: Date | null
  ultimo_pagamento: Date | null
}

export type PagamentoParceiro = {
  deal_id: number
  title: string
  close_date: string | null            // ISO date (MM/YYYY display é derivado)
  close_date_display: string            // "dd/mm/yyyy" pt-BR
  mes_ano: string                       // "MM/YYYY" derivado pra agrupar
  deal_status: string                   // 'won' geralmente
  taxa_de_adesao: number                // valor efetivamente pago ao parceiro
  valor_contrato: number                // valor do deal no Pipedrive (contexto)
  forma_pagamento: string
  codigo_do_imovel_unidade: string
  endereco_do_imovel: string
  cidade: string
}

export type PagamentosPorMes = {
  mes_ano: string                       // "MM/YYYY"
  mes_date: Date | null
  total_recebido: number
  total_indicacoes: number
  count_com_pagamento: number
}

export type DashboardImovel = {
  apto_id: string
  code: string
  prop_status: string
  taxa_de_adesao: number                // se o deal do imóvel teve taxa
  n_meses_ativos: number
}

/** Formata BRL: 45969.75 -> "R$ 45.969,75". */
export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/** Formata compacto: 2298487 -> "R$ 2,3M". */
export function formatBRLCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}k`
  return formatBRL(v)
}
