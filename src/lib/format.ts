/**
 * Tipos e formatters compartilhados entre server e client.
 * NAO importa 'server-only' — pode ser usado em client components.
 */

export type PaymentStatus = 'pago' | 'a_pagar' | 'em_apuracao'

export type CommissionType = 'Recurring' | 'Single'

export type DashboardSummary = {
  total_indicacoes: number
  indicacoes_won: number
  indicacoes_lost: number
  indicacoes_in_progress: number
  imoveis_ativos: number
  comissao_12m_estimada: number
  media_comissao_mensal: number
  meses_com_receita: number
}

/** Uma indicacao "Won" com seu modelo de comissao e o imovel vinculado. */
export type IndicacaoWon = {
  indication_id: number
  property_id: number
  code: string
  prop_status: string              // Active/Inactive do imovel
  owner_name: string
  property_city: string
  property_neighborhood: string
  commission_payment_type: CommissionType | string
  commission: number                // ex 0.02 pra 2% (se Recurring)
  fixed_commission_amount: number   // valor fixo se Single
  won_timestamp: string | null
  pipedrive_deal_id: string
  /** Taxa de adesao da base_pagamento (as vezes existe em paralelo) — opcional */
  taxa_de_adesao?: number
}

export type DashboardImovel = {
  indication_id: number
  property_id: number
  code: string
  prop_status: string
  commission_payment_type: string
  commission_display: string        // "2% recorrente" ou "R$ 999 fixo"
  comissao_12m: number              // calculada: soma das comissoes nos ultimos 12m
  n_meses_ativos: number
}

export type DashboardMes = {
  mes_ano: string                   // "MM/YYYY"
  mes_date: Date | null
  receita_imoveis: number            // receita bruta dos imoveis naquele mes (contexto)
  comissao_mes: number               // valor que o parceiro ganhou
  n_imoveis_ativos: number
  status: PaymentStatus
  data_pagamento: Date | null
  label_status: string
}

export type PagamentoPorMesPorImovel = {
  mes_ano: string
  code: string
  prop_status: string
  commission_type: string
  comissao: number
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

/** Descreve o tipo de comissao em linguagem natural. */
export function describeCommission(
  type: string,
  commission: number,
  fixed: number
): string {
  if (type === 'Recurring') {
    const pct = (commission * 100).toFixed(1).replace('.0', '')
    return `${pct}% recorrente`
  }
  if (type === 'Single') {
    return `${formatBRL(fixed)} fixo`
  }
  return type || '—'
}
