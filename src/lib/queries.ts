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
 * Cadeia: sapron_public_partners_indications_property → property_property → faturamento
 */

// Status de pagamento removido - exibição depende do pedido de saque real
export function computePaymentStatus(
  _mesAno: string,
  _today: Date = new Date()
): { status: PaymentStatus; data_pagamento: Date | null; label_status: string } {
  return { status: 'em_apuracao', data_pagamento: null, label_status: 'Em apuração' }
}

/** Resumo consolidado */
export async function getDashboardSummary(parceiroId: number): Promise<DashboardSummary> {
  const imoveis = await getDashboardImoveis(parceiroId)
  const evolucao = await getDashboardEvolucaoMensal(parceiroId)

  const imoveisAtivos = imoveis.filter(i => i.prop_status === 'Active')
  const comissaoTotal = imoveis.reduce((sum, i) => sum + i.comissao_12m, 0)
  const mesesComReceita = evolucao.filter(e => e.comissao_mes > 0).length

  return {
    total_indicacoes: imoveis.length,
    indicacoes_won: imoveis.length,
    indicacoes_lost: 0,
    indicacoes_in_progress: 0,
    imoveis_ativos: imoveisAtivos.length,
    comissao_12m_estimada: comissaoTotal,
    media_comissao_mensal: mesesComReceita > 0 ? comissaoTotal / mesesComReceita : 0,
    meses_com_receita: mesesComReceita,
  }
}

/** Lista de imóveis - UNION de indications_property + base_pagamento (funciona pros dois) */
export async function getDashboardImoveis(parceiroId: number): Promise<DashboardImovel[]> {
  const sql = `
WITH partner_imoveis AS (
  SELECT DISTINCT TRY_CAST(property_id AS BIGINT) AS property_id
  FROM nekt_trusted.sapron_public_partners_indications_property
  WHERE TRY_CAST(partner_id AS BIGINT) = ${parceiroId} AND status = 'Won'
  UNION
  SELECT DISTINCT TRY_CAST(p.id AS BIGINT) AS property_id
  FROM nekt_service.base_pagamento_parceiros b
  INNER JOIN nekt_trusted.sapron_public_property_property p ON TRIM(b.codigo_do_imovel_unidade) = TRIM(p.code)
  WHERE TRY_CAST(b.parceiro AS BIGINT) = ${parceiroId}
),
imoveis AS (
  SELECT p.code, p.id AS property_id, p.status AS prop_status
  FROM nekt_trusted.sapron_public_property_property p
  INNER JOIN partner_imoveis i ON TRY_CAST(p.id AS BIGINT) = i.property_id
),
fat AS (
  SELECT f.apto_id, COALESCE(TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE), 0) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) IS NOT NULL
),
comissao AS (
  SELECT i.code, i.property_id, i.prop_status,
    COALESCE(SUM(fat.receita * 0.02), 0) AS comissao_12m,
    COUNT(DISTINCT CASE WHEN fat.receita > 0 THEN 1 END) AS n_meses_ativos
  FROM imoveis i LEFT JOIN fat ON fat.apto_id = CAST(i.property_id AS VARCHAR)
  GROUP BY i.code, i.property_id, i.prop_status
)
SELECT 0 AS indication_id, property_id, code, prop_status,
  'Recurring' AS commission_payment_type, 0.02 AS commission, 0 AS fixed_commission_amount,
  ROUND(comissao_12m, 2) AS comissao_12m, n_meses_ativos
FROM comissao ORDER BY comissao_12m DESC LIMIT 80`

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

/** Evolução mensal - UNION de indications_property + base_pagamento */
export async function getDashboardEvolucaoMensal(parceiroId: number): Promise<DashboardMes[]> {
  const sql = `
WITH partner_imoveis AS (
  SELECT DISTINCT TRY_CAST(property_id AS BIGINT) AS property_id
  FROM nekt_trusted.sapron_public_partners_indications_property
  WHERE TRY_CAST(partner_id AS BIGINT) = ${parceiroId} AND status = 'Won'
  UNION
  SELECT DISTINCT TRY_CAST(p.id AS BIGINT) AS property_id
  FROM nekt_service.base_pagamento_parceiros b
  INNER JOIN nekt_trusted.sapron_public_property_property p ON TRIM(b.codigo_do_imovel_unidade) = TRIM(p.code)
  WHERE TRY_CAST(b.parceiro AS BIGINT) = ${parceiroId}
),
imoveis AS (
  SELECT p.id AS property_id
  FROM nekt_trusted.sapron_public_property_property p
  INNER JOIN partner_imoveis i ON TRY_CAST(p.id AS BIGINT) = i.property_id
),
fat AS (
  SELECT f.apto_id, f.mes_ano, try(date_parse(f.mes_ano, '%m/%Y')) AS mes_date,
    COALESCE(TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE), 0) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) IS NOT NULL
)
SELECT fat.mes_ano,
  COALESCE(ROUND(SUM(fat.receita), 2), 0) AS receita_imoveis,
  COALESCE(ROUND(SUM(fat.receita * 0.02), 2), 0) AS comissao_mes,
  COUNT(DISTINCT CASE WHEN fat.receita > 0 THEN fat.apto_id END) AS n_imoveis_ativos
FROM fat INNER JOIN imoveis i ON CAST(i.property_id AS VARCHAR) = fat.apto_id
GROUP BY fat.mes_ano, fat.mes_date ORDER BY mes_date ASC`

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

export type Withdrawal = {
  id: number
  value: number
  status: string
  date_requested: string | null
  date_paid: string | null
  payment_method: string
  cancel_reason: string | null
}

export type WithdrawStats = {
  total_withdrawn: number
  total_pending: number
  count_withdrawn: number
  count_pending: number
}

/**
 * Saques via sapron_public_financial_partner_withdraw_request.
 * 17818 (Katia) -> withdraw partner_id = 324 (special mapping)
 * Others use direct partner_id mapping
 */
export async function getWithdrawals(parceiroId: number): Promise<{ withdrawals: Withdrawal[]; stats: WithdrawStats }> {
  const withdrawPartnerId = parceiroId === 17818 ? 324 : parceiroId

  const sql = `
SELECT
  id,
  COALESCE(TRY_CAST(value AS DOUBLE), 0) AS value,
  status,
  date_requested,
  date_paid,
  payment_method,
  cancel_reason
FROM nekt_trusted.sapron_public_financial_partner_withdraw_request
WHERE TRY_CAST(partner_id AS BIGINT) = ${withdrawPartnerId}
ORDER BY date_requested DESC
LIMIT 50`

  const rows = await queryNekt<Record<string, string>>(sql)

  const withdrawals: Withdrawal[] = rows.map((r) => ({
    id: Number(r.id ?? 0),
    value: Number(r.value ?? 0),
    status: r.status ?? '',
    date_requested: r.date_requested ?? null,
    date_paid: r.date_paid ?? null,
    payment_method: r.payment_method ?? '',
    cancel_reason: r.cancel_reason ?? null,
  }))

  const total_withdrawn = withdrawals
    .filter((w) => w.status === 'Paid')
    .reduce((s, w) => s + w.value, 0)
  const total_pending = withdrawals
    .filter((w) => w.status !== 'Paid' && w.status !== 'Canceled')
    .reduce((s, w) => s + w.value, 0)

  return {
    withdrawals,
    stats: {
      total_withdrawn,
      total_pending,
      count_withdrawn: withdrawals.filter((w) => w.status === 'Paid').length,
      count_pending: withdrawals.filter((w) => w.status !== 'Paid' && w.status !== 'Canceled').length,
    },
  }
}

/** Extrato mensal por imóvel */
export async function getExtratoMensalPorImovel(
  parceiroId: number
): Promise<PagamentoPorMesPorImovel[]> {
  const imoveis = await getDashboardImoveis(parceiroId)
  const evolucao = await getDashboardEvolucaoMensal(parceiroId)

  const result: PagamentoPorMesPorImovel[] = []
  for (const mes of evolucao) {
    for (const imovel of imoveis) {
      if (imovel.comissao_12m > 0) {
        result.push({
          mes_ano: mes.mes_ano,
          code: imovel.code,
          prop_status: imovel.prop_status,
          commission_type: imovel.commission_payment_type,
          comissao: Math.round(imovel.comissao_12m / 12 * 100) / 100,
        })
      }
    }
  }
  return result.slice(0, 100)
}

export function groupExtratoByMes(
  extrato: PagamentoPorMesPorImovel[]
): Record<string, Array<{ code: string; prop_status: string; commission_type: string; comissao: number }>> {
  const map: Record<string, Array<{ code: string; prop_status: string; commission_type: string; comissao: number }>> = {}
  for (const item of extrato) {
    if (!map[item.mes_ano]) {
      map[item.mes_ano] = []
    }
    map[item.mes_ano].push({
      code: item.code,
      prop_status: item.prop_status,
      commission_type: item.commission_type,
      comissao: item.comissao,
    })
  }
  return map
}

export function aggregatePaymentStats(meses: DashboardMes[]) {
  // Sem lógica de status - apenas soma toda a comissão gerada
  const total_gerado = meses.reduce((sum, m) => sum + m.comissao_mes, 0)
  const meses_com_receita = meses.filter(m => m.comissao_mes > 0).length
  return {
    total_gerado,
    meses_com_receita,
    count_meses: meses.length,
  }
}
