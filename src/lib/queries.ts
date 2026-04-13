import 'server-only'
import { queryNekt } from './nekt'
import type {
  DashboardSummary,
  DashboardImovel,
  DashboardMes,
  PagamentoPorMesPorImovel,
  PaymentStatus,
} from './format'

export type {
  DashboardSummary,
  DashboardImovel,
  DashboardMes,
  PagamentoPorMesPorImovel,
  PaymentStatus,
}
export { formatBRL, formatBRLCompact, describeCommission } from './format'

/**
 * Queries do portal Sea Partners.
 * Cadeia validada: base_pagamento_parceiros → property_property → faturamento
 */

// Status de pagamento por mês
export function computePaymentStatus(
  mesAno: string,
  today: Date = new Date()
): { status: PaymentStatus; data_pagamento: Date | null; label_status: string } {
  const match = /^(\d{2})\/(\d{4})$/.exec(mesAno.trim())
  if (!match) {
    return { status: 'em_apuracao', data_pagamento: null, label_status: 'Indeterminado' }
  }
  const mm = Number(match[1])
  const yyyy = Number(match[2])
  const todayMonth = today.getUTCMonth() + 1
  const todayYear = today.getUTCFullYear()
  const isCurrent = mm === todayMonth && yyyy === todayYear
  const isPrevious =
    (mm === todayMonth - 1 && yyyy === todayYear) ||
    (todayMonth === 1 && mm === 12 && yyyy === todayYear - 1)

  const nextMonth = mm === 12 ? 1 : mm + 1
  const nextYear = mm === 12 ? yyyy + 1 : yyyy
  const dataPagamento = new Date(Date.UTC(nextYear, nextMonth - 1, 10))

  if (isCurrent) return { status: 'em_apuracao', data_pagamento: null, label_status: 'Em apuração' }
  if (isPrevious) return {
    status: 'a_pagar',
    data_pagamento: dataPagamento,
    label_status: `A pagar até ${dataPagamento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
  }
  return {
    status: 'pago',
    data_pagamento: dataPagamento,
    label_status: `Pago em ${dataPagamento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
  }
}

/** Resumo consolidado usando base_pagamento_parceiros */
export async function getDashboardSummary(parceiroId: number): Promise<DashboardSummary> {
  // Simples: pega do resultado de getDashboardImoveis
  const imoveis = await getDashboardImoveis(parceiroId)
  const evolucao = await getDashboardEvolucaoMensal(parceiroId)

  const imoveisAtivos = imoveis.filter(i => i.prop_status === 'Active')
  const comissao12m = imoveis.reduce((sum, i) => sum + i.comissao_12m, 0)
  const mesesComReceita = evolucao.filter(e => e.comissao_mes > 0).length

  return {
    total_indicacoes: imoveis.length,
    indicacoes_won: imoveis.length, // base_pagamento_parceiros já é só indicações com imóvel
    indicacoes_lost: 0,
    indicacoes_in_progress: 0,
    imoveis_ativos: imoveisAtivos.length,
    comissao_12m_estimada: comissao12m,
    media_comissao_mensal: mesesComReceita > 0 ? comissao12m / mesesComReceita : 0,
    meses_com_receita: mesesComReceita,
  }
}

/** Lista de imóveis usando a cadeia correta */
export async function getDashboardImoveis(parceiroId: number): Promise<DashboardImovel[]> {
  const sql = `
WITH parceiros AS (
  SELECT DISTINCT
    TRIM(codigo_do_imovel_unidade) AS code,
    taxa_de_adesao,
    status
  FROM nekt_service.base_pagamento_parceiros
  WHERE parceiro = ${parceiroId}
),
imoveis AS (
  SELECT
    p.code,
    p.id AS property_id,
    p.status AS prop_status
  FROM nekt_trusted.sapron_public_property_property p
  INNER JOIN parceiros c ON TRIM(c.code) = TRIM(p.code)
),
fat AS (
  SELECT
    f.apto_id,
    COALESCE(TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE), 0) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
),
comissao AS (
  SELECT
    i.code,
    i.property_id,
    i.prop_status,
    COALESCE(SUM(fat.receita * 0.02), 0) AS comissao_12m,
    COUNT(DISTINCT CASE WHEN fat.receita > 0 THEN 1 END) AS n_meses_ativos
  FROM imoveis i
  LEFT JOIN fat ON fat.apto_id = CAST(i.property_id AS VARCHAR)
  GROUP BY i.code, i.property_id, i.prop_status
)
SELECT
  0 AS indication_id,
  property_id,
  code,
  prop_status,
  'Recurring' AS commission_payment_type,
  0.02 AS commission,
  0 AS fixed_commission_amount,
  ROUND(comissao_12m, 2) AS comissao_12m,
  n_meses_ativos
FROM comissao
ORDER BY comissao_12m DESC
LIMIT 80`

  const rows = await queryNekt<Record<string, string>>(sql)

  return rows.map((r) => ({
    indication_id: Number(r.indication_id ?? 0),
    property_id: Number(r.property_id ?? 0),
    code: r.code ?? '',
    prop_status: r.prop_status ?? '',
    commission_payment_type: r.commission_payment_type ?? '',
    commission_display: r.commission_payment_type === 'Recurring' ? '2% recorrente' : '',
    comissao_12m: Number(r.comissao_12m ?? 0),
    n_meses_ativos: Number(r.n_meses_ativos ?? 0),
  }))
}

/** Evolução mensal */
export async function getDashboardEvolucaoMensal(parceiroId: number): Promise<DashboardMes[]> {
  const sql = `
WITH parceiros AS (
  SELECT DISTINCT TRIM(codigo_do_imovel_unidade) AS code
  FROM nekt_service.base_pagamento_parceiros
  WHERE parceiro = ${parceiroId}
),
imoveis AS (
  SELECT p.id AS property_id
  FROM nekt_trusted.sapron_public_property_property p
  INNER JOIN parceiros c ON TRIM(c.code) = TRIM(p.code)
),
fat AS (
  SELECT
    f.apto_id,
    f.mes_ano,
    try(date_parse(f.mes_ano, '%m/%Y')) AS mes_date,
    COALESCE(TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE), 0) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
)
SELECT
  fat.mes_ano,
  COALESCE(ROUND(SUM(fat.receita), 2), 0) AS receita_imoveis,
  COALESCE(ROUND(SUM(fat.receita * 0.02), 2), 0) AS comissao_mes,
  COUNT(DISTINCT CASE WHEN fat.receita > 0 THEN fat.apto_id END) AS n_imoveis_ativos
FROM fat
INNER JOIN imoveis i ON CAST(i.property_id AS VARCHAR) = fat.apto_id
GROUP BY fat.mes_ano, fat.mes_date
ORDER BY mes_date ASC`

  const rows = await queryNekt<Record<string, string>>(sql)

  const today = new Date()
  return rows.map((r) => {
    const mes_ano = r.mes_ano ?? ''
    const statusInfo = computePaymentStatus(mes_ano, today)
    return {
      mes_ano,
      mes_date: mes_ano ? new Date(`${mes_ano.slice(3)}-${mes_ano.slice(0, 2)}-01T00:00:00Z`) : null,
      receita_imoveis: Number(r.receita_imoveis ?? 0),
      comissao_mes: Number(r.comissao_mes ?? 0),
      n_imoveis_ativos: Number(r.n_imoveis_ativos ?? 0),
      ...statusInfo,
    }
  })
}

export async function getExtratoMensalPorImovel(
  parceiroId: number
): Promise<PagamentoPorMesPorImovel[]> {
  return []
}

export function groupExtratoByMes(
  extrato: PagamentoPorMesPorImovel[]
): Record<string, Array<{ code: string; prop_status: string; commission_type: string; comissao: number }>> {
  return {}
}

export function aggregatePaymentStats(meses: DashboardMes[]) {
  const stats = { total_pago: 0, total_a_pagar: 0, total_em_apuracao: 0, count_pago: 0, count_a_pagar: 0, count_em_apuracao: 0 }
  for (const m of meses) {
    if (m.status === 'pago') { stats.total_pago += m.comissao_mes; stats.count_pago++ }
    else if (m.status === 'a_pagar') { stats.total_a_pagar += m.comissao_mes; stats.count_a_pagar++ }
    else { stats.total_em_apuracao += m.comissao_mes; stats.count_em_apuracao++ }
  }
  return stats
}
