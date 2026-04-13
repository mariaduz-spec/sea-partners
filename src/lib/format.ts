/**
 * Tipos e formatters compartilhados entre server e client.
 * NAO importa 'server-only' — pode ser usado em client components.
 */

export type PaymentStatus = 'pago' | 'a_pagar' | 'em_apuracao'

export type DashboardMes = {
  mes_ano: string
  receita_mes: number
  comissao_mes: number
  n_imoveis_ativos: number
  status: PaymentStatus
  data_pagamento: Date | null
  label_status: string
}

export type DashboardImovel = {
  apto_id: string
  code: string
  prop_status: string
  receita_12m: number
  comissao_12m: number
  n_meses: number
}

export type DashboardSummary = {
  imoveis_indicados: number
  imoveis_resolvidos: number
  imoveis_com_receita: number
  receita_total_12m: number
  comissao_2pct: number
  meses_distintos: number
}

export type ExtratoImovelNoMes = {
  mes_ano: string
  code: string
  prop_status: string
  comissao: number
}

export const COMMISSION_PCT = 0.02

/** Formata BRL: 45969.75 -> "R$ 45.969,75". */
export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/** Formata compacto: 2298487 -> "R$ 2,3M". Util pra numero grande no topo. */
export function formatBRLCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}k`
  return formatBRL(v)
}
