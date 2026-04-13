import 'server-only'
import { queryNekt } from './nekt'
import type {
  DashboardSummary,
  IndicacaoWon,
  DashboardImovel,
  DashboardMes,
  PagamentoPorMesPorImovel,
  PaymentStatus,
} from './format'

export type {
  DashboardSummary,
  IndicacaoWon,
  DashboardImovel,
  DashboardMes,
  PagamentoPorMesPorImovel,
  PaymentStatus,
}
export { formatBRL, formatBRLCompact, describeCommission } from './format'

/**
 * Queries do portal Sea Partners.
 *
 * MODELO REAL DE COMISSAO (descoberto via sapron_public_partners_indications_property):
 * - commission_payment_type = 'Recurring' → commission = 0.02 (2% mensal sobre receita)
 * - commission_payment_type = 'Single' → fixed_commission_amount (one-shot)
 *
 * Cadeia de dados:
 * - partner_id (sapron) vem do partner_mapping Supabase
 * - indications_property (status='Won') define QUAIS imoveis + tipo de comissao
 * - property.id === property_id → property.code + status
 * - receita mensal (faturamento_por_imovel) → aplica commission → valor que o parceiro recebe
 */

/** Regra simulada de status de pagamento (enquanto nao temos tabela de pagamentos reais): */
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

/** CTE comum: junta indicacoes Won do parceiro com property + codigo. */
function wonIndicationsCTE(partnerId: number): string {
  return `
won AS (
  SELECT
    i.id AS indication_id,
    i.property_id,
    p.code,
    p.status AS prop_status,
    i.owner_name,
    i.property_city,
    i.property_neighborhood,
    i.commission_payment_type,
    i.commission,
    i.fixed_commission_amount,
    i.won_timestamp,
    i.pipedrive_deal_id
  FROM nekt_trusted.sapron_public_partners_indications_property i
  INNER JOIN nekt_trusted.sapron_public_property_property p ON p.id = i.property_id
  WHERE i.partner_id = ${partnerId}
    AND i.status = 'Won'
)`
}

/** Resumo consolidado: total/won/lost, comissao 12m estimada. */
export async function getDashboardSummary(partnerId: number): Promise<DashboardSummary> {
  const sql = `
-- Totais por status
WITH stats AS (
  SELECT
    COUNT(*) AS total_indicacoes,
    COUNT(CASE WHEN status = 'Won' THEN 1 END) AS indicacoes_won,
    COUNT(CASE WHEN status = 'Lost' THEN 1 END) AS indicacoes_lost,
    COUNT(CASE WHEN status = 'In_Progress' THEN 1 END) AS indicacoes_in_progress
  FROM nekt_trusted.sapron_public_partners_indications_property
  WHERE partner_id = ${partnerId}
),
${wonIndicationsCTE(partnerId)},
ativos AS (
  SELECT COUNT(*) AS imoveis_ativos FROM won WHERE prop_status = 'Active'
),
-- Comissao 12m estimada: soma de (receita * commission) pros Recurring + fixed pros Single
comissao_12m AS (
  SELECT
    SUM(
      CASE
        WHEN won.commission_payment_type = 'Recurring' THEN
          COALESCE(TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE) * won.commission, 0)
        ELSE 0
      END
    ) AS recurring_12m,
    -- Single: assume que o pagamento single aconteceu no won_timestamp; filtra ultimos 12m
    (SELECT COALESCE(SUM(fixed_commission_amount), 0) FROM won
      WHERE commission_payment_type = 'Single'
        AND won_timestamp >= date_add('month', -12, current_timestamp)
    ) AS single_12m,
    COUNT(DISTINCT f.mes_ano) AS meses_com_receita
  FROM won
  LEFT JOIN nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
    ON f.apto_id = CAST(won.property_id AS VARCHAR)
    AND try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
)
SELECT
  stats.total_indicacoes,
  stats.indicacoes_won,
  stats.indicacoes_lost,
  stats.indicacoes_in_progress,
  ativos.imoveis_ativos,
  ROUND(COALESCE(comissao_12m.recurring_12m, 0) + COALESCE(comissao_12m.single_12m, 0), 2) AS comissao_12m_estimada,
  comissao_12m.meses_com_receita
FROM stats, ativos, comissao_12m`

  const rows = await queryNekt<Record<string, string>>(sql)
  const r = rows[0] ?? {}
  const total_comissao = Number(r.comissao_12m_estimada ?? 0)
  const meses = Number(r.meses_com_receita ?? 0)
  return {
    total_indicacoes: Number(r.total_indicacoes ?? 0),
    indicacoes_won: Number(r.indicacoes_won ?? 0),
    indicacoes_lost: Number(r.indicacoes_lost ?? 0),
    indicacoes_in_progress: Number(r.indicacoes_in_progress ?? 0),
    imoveis_ativos: Number(r.imoveis_ativos ?? 0),
    comissao_12m_estimada: total_comissao,
    media_comissao_mensal: meses > 0 ? total_comissao / meses : 0,
    meses_com_receita: meses,
  }
}

/** Lista imoveis indicados (Won) com tipo de comissao + comissao 12m calculada. */
export async function getDashboardImoveis(partnerId: number): Promise<DashboardImovel[]> {
  const sql = `
WITH ${wonIndicationsCTE(partnerId).slice(1)},
receita_12m AS (
  SELECT
    f.apto_id,
    f.mes_ano,
    TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
),
comissao_por_imovel AS (
  SELECT
    won.indication_id,
    won.property_id,
    won.code,
    won.prop_status,
    won.commission_payment_type,
    won.commission,
    won.fixed_commission_amount,
    CASE
      WHEN won.commission_payment_type = 'Recurring'
        THEN COALESCE(SUM(r.receita * won.commission), 0)
      WHEN won.commission_payment_type = 'Single' AND won.won_timestamp >= date_add('month', -12, current_timestamp)
        THEN won.fixed_commission_amount
      ELSE 0
    END AS comissao_12m,
    COUNT(DISTINCT CASE WHEN r.receita > 0 THEN r.mes_ano END) AS n_meses_ativos
  FROM won
  LEFT JOIN receita_12m r ON r.apto_id = CAST(won.property_id AS VARCHAR)
  GROUP BY won.indication_id, won.property_id, won.code, won.prop_status,
           won.commission_payment_type, won.commission, won.fixed_commission_amount, won.won_timestamp
)
SELECT
  indication_id,
  property_id,
  code,
  prop_status,
  commission_payment_type,
  commission,
  fixed_commission_amount,
  ROUND(comissao_12m, 2) AS comissao_12m,
  n_meses_ativos
FROM comissao_por_imovel
ORDER BY comissao_12m DESC NULLS LAST
LIMIT 150`

  const rows = await queryNekt<Record<string, string>>(sql)
  return rows.map((r) => {
    const type = r.commission_payment_type ?? ''
    const commission = Number(r.commission ?? 0)
    const fixed = Number(r.fixed_commission_amount ?? 0)
    const commission_display =
      type === 'Recurring'
        ? `${(commission * 100).toFixed(1).replace('.0', '')}% recorrente`
        : type === 'Single'
          ? `R$ ${fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} fixo`
          : type || '—'
    return {
      indication_id: Number(r.indication_id ?? 0),
      property_id: Number(r.property_id ?? 0),
      code: r.code ?? '',
      prop_status: r.prop_status ?? '',
      commission_payment_type: type,
      commission_display,
      comissao_12m: Number(r.comissao_12m ?? 0),
      n_meses_ativos: Number(r.n_meses_ativos ?? 0),
    }
  })
}

/** Evolucao mensal: comissao total de todos os imoveis Recurring daquele mes. */
export async function getDashboardEvolucaoMensal(partnerId: number): Promise<DashboardMes[]> {
  const sql = `
WITH ${wonIndicationsCTE(partnerId).slice(1)},
fat AS (
  SELECT
    f.apto_id,
    f.mes_ano,
    try(date_parse(f.mes_ano, '%m/%Y')) AS mes_date,
    TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
),
joined AS (
  SELECT
    fat.mes_ano,
    fat.mes_date,
    fat.apto_id,
    fat.receita,
    won.commission_payment_type,
    won.commission
  FROM fat
  INNER JOIN won ON CAST(won.property_id AS VARCHAR) = fat.apto_id
)
SELECT
  mes_ano,
  COALESCE(ROUND(SUM(receita), 2), 0) AS receita_imoveis,
  COALESCE(ROUND(SUM(
    CASE WHEN commission_payment_type = 'Recurring' THEN receita * commission ELSE 0 END
  ), 2), 0) AS comissao_mes,
  COUNT(DISTINCT CASE WHEN receita > 0 THEN apto_id END) AS n_imoveis_ativos
FROM joined
GROUP BY mes_ano, mes_date
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

/** Extrato: comissao de cada imovel em cada mes (pra expandir a tabela de historico). */
export async function getExtratoMensalPorImovel(
  partnerId: number
): Promise<PagamentoPorMesPorImovel[]> {
  const sql = `
WITH ${wonIndicationsCTE(partnerId).slice(1)},
fat AS (
  SELECT
    f.apto_id,
    f.mes_ano,
    try(date_parse(f.mes_ano, '%m/%Y')) AS mes_date,
    TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
)
SELECT
  fat.mes_ano,
  won.code,
  won.prop_status,
  won.commission_payment_type AS commission_type,
  ROUND(
    CASE
      WHEN won.commission_payment_type = 'Recurring' THEN COALESCE(SUM(fat.receita * won.commission), 0)
      ELSE 0
    END, 2
  ) AS comissao
FROM fat
INNER JOIN won ON CAST(won.property_id AS VARCHAR) = fat.apto_id
GROUP BY fat.mes_ano, fat.mes_date, won.code, won.prop_status, won.commission_payment_type
HAVING (
  CASE
    WHEN won.commission_payment_type = 'Recurring' THEN SUM(fat.receita * won.commission)
    ELSE 0
  END
) > 0
ORDER BY fat.mes_date DESC, comissao DESC`

  const rows = await queryNekt<Record<string, string>>(sql)
  return rows.map((r) => ({
    mes_ano: r.mes_ano ?? '',
    code: r.code ?? '',
    prop_status: r.prop_status ?? '',
    commission_type: r.commission_type ?? '',
    comissao: Number(r.comissao ?? 0),
  }))
}

export function groupExtratoByMes(
  extrato: PagamentoPorMesPorImovel[]
): Record<string, Array<{ code: string; prop_status: string; commission_type: string; comissao: number }>> {
  const map: Record<string, Array<{ code: string; prop_status: string; commission_type: string; comissao: number }>> = {}
  for (const item of extrato) {
    const list = map[item.mes_ano] ?? []
    list.push({
      code: item.code,
      prop_status: item.prop_status,
      commission_type: item.commission_type,
      comissao: item.comissao,
    })
    map[item.mes_ano] = list
  }
  return map
}

export function aggregatePaymentStats(meses: DashboardMes[]): {
  total_pago: number
  total_a_pagar: number
  total_em_apuracao: number
  count_pago: number
  count_a_pagar: number
  count_em_apuracao: number
} {
  const stats = {
    total_pago: 0,
    total_a_pagar: 0,
    total_em_apuracao: 0,
    count_pago: 0,
    count_a_pagar: 0,
    count_em_apuracao: 0,
  }
  for (const m of meses) {
    if (m.status === 'pago') {
      stats.total_pago += m.comissao_mes
      stats.count_pago += 1
    } else if (m.status === 'a_pagar') {
      stats.total_a_pagar += m.comissao_mes
      stats.count_a_pagar += 1
    } else {
      stats.total_em_apuracao += m.comissao_mes
      stats.count_em_apuracao += 1
    }
  }
  return stats
}
