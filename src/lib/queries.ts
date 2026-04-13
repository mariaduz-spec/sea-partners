import 'server-only'
import { queryNekt } from './nekt'

/**
 * Queries do dashboard — cadeia validada end-to-end com dados reais.
 * Encadeamento: parceiro_id (base_pagamento_parceiros)
 *   → codes alfanumericos
 *   → property_property.id via code (CODE eh elo; partner_id na tabela esta NULL)
 *   → faturamento.apto_id (CAST VARCHAR)
 *   → receita_reservas (varchar BR, REPLACE triplo + TRY_CAST)
 *   → filtro ultimos 12 meses calendario (try(date_parse) tolera formato DD/MM/YYYY)
 */

export const COMMISSION_PCT = 0.02

/** CTEs comuns reutilizadas em todas as queries. Inseridas via interpolacao de parceiroId. */
function commonCTEs(parceiroId: number): string {
  return `
WITH codes AS (
  SELECT DISTINCT TRIM(codigo_do_imovel_unidade) AS code
  FROM nekt_service.base_pagamento_parceiros
  WHERE parceiro = ${parceiroId}
    AND codigo_do_imovel_unidade IS NOT NULL
    AND codigo_do_imovel_unidade <> ''
),
ids AS (
  SELECT DISTINCT CAST(p.id AS VARCHAR) AS apto_id, p.code, p.status AS prop_status
  FROM nekt_trusted.sapron_public_property_property p
  INNER JOIN codes c ON TRIM(p.code) = c.code
),
fat AS (
  SELECT f.apto_id, f.mes_ano,
         try(date_parse(f.mes_ano, '%m/%Y')) AS mes_date,
         TRY_CAST(REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE) AS receita
  FROM nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
  INNER JOIN ids i ON f.apto_id = i.apto_id
  WHERE try(date_parse(f.mes_ano, '%m/%Y')) >= date_add('month', -12, date_trunc('month', current_date))
)
`
}

export type DashboardSummary = {
  imoveis_indicados: number
  imoveis_resolvidos: number
  imoveis_com_receita: number
  receita_total_12m: number
  comissao_2pct: number
  meses_distintos: number
}

export async function getDashboardSummary(parceiroId: number): Promise<DashboardSummary> {
  const sql = `${commonCTEs(parceiroId)}
SELECT
  (SELECT COUNT(*) FROM codes) AS imoveis_indicados,
  (SELECT COUNT(*) FROM ids) AS imoveis_resolvidos,
  COUNT(DISTINCT apto_id) AS imoveis_com_receita,
  COALESCE(ROUND(SUM(receita), 2), 0) AS receita_total_12m,
  COALESCE(ROUND(SUM(receita) * ${COMMISSION_PCT}, 2), 0) AS comissao_2pct,
  COUNT(DISTINCT mes_ano) AS meses_distintos
FROM fat`

  const rows = await queryNekt<Record<string, string>>(sql)
  const r = rows[0] ?? {}
  return {
    imoveis_indicados: Number(r.imoveis_indicados ?? 0),
    imoveis_resolvidos: Number(r.imoveis_resolvidos ?? 0),
    imoveis_com_receita: Number(r.imoveis_com_receita ?? 0),
    receita_total_12m: Number(r.receita_total_12m ?? 0),
    comissao_2pct: Number(r.comissao_2pct ?? 0),
    meses_distintos: Number(r.meses_distintos ?? 0),
  }
}

export type DashboardImovel = {
  apto_id: string
  code: string
  prop_status: string
  receita_12m: number
  comissao_12m: number
  n_meses: number
}

export async function getDashboardImoveis(parceiroId: number): Promise<DashboardImovel[]> {
  const sql = `${commonCTEs(parceiroId)}
SELECT
  i.apto_id,
  i.code,
  i.prop_status,
  COALESCE(ROUND(SUM(fat.receita), 2), 0) AS receita_12m,
  COALESCE(ROUND(SUM(fat.receita) * ${COMMISSION_PCT}, 2), 0) AS comissao_12m,
  COUNT(DISTINCT fat.mes_ano) AS n_meses
FROM ids i
LEFT JOIN fat ON fat.apto_id = i.apto_id
GROUP BY i.apto_id, i.code, i.prop_status
ORDER BY receita_12m DESC NULLS LAST
LIMIT 50`

  const rows = await queryNekt<Record<string, string>>(sql)
  return rows.map((r) => ({
    apto_id: r.apto_id ?? '',
    code: r.code ?? '',
    prop_status: r.prop_status ?? '',
    receita_12m: Number(r.receita_12m ?? 0),
    comissao_12m: Number(r.comissao_12m ?? 0),
    n_meses: Number(r.n_meses ?? 0),
  }))
}

export type PaymentStatus = 'pago' | 'a_pagar' | 'em_apuracao'

export type DashboardMes = {
  mes_ano: string
  receita_mes: number
  comissao_mes: number
  n_imoveis_ativos: number
  status: PaymentStatus
  data_pagamento: Date | null       // data efetiva ou prevista
  label_status: string               // copy amigavel pra UI
}

/**
 * Classifica um mes_ano ("MM/YYYY") em pago / a_pagar / em_apuracao
 * conforme a data de hoje.
 *
 * Regra:
 * - mesmo MM/YYYY do today → em_apuracao (ainda rodando)
 * - MM-1 (mes fechado mais recente) → a_pagar (aguardando processamento financeiro)
 * - qualquer mes anterior → pago (pagamento historicamente liquidado)
 *
 * Data prevista/efetiva: dia 10 do mes seguinte ao fechamento.
 */
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

  const todayMonth = today.getUTCMonth() + 1   // 1-12
  const todayYear = today.getUTCFullYear()

  const isCurrent = mm === todayMonth && yyyy === todayYear
  // mes anterior (MM-1 do ano corrente OU dez do ano anterior se estivermos em jan)
  const isPrevious =
    (mm === todayMonth - 1 && yyyy === todayYear) ||
    (todayMonth === 1 && mm === 12 && yyyy === todayYear - 1)

  // Data prevista/efetiva de pagamento = dia 10 do mes seguinte ao fechamento
  const nextMonth = mm === 12 ? 1 : mm + 1
  const nextYear = mm === 12 ? yyyy + 1 : yyyy
  const dataPagamento = new Date(Date.UTC(nextYear, nextMonth - 1, 10))

  if (isCurrent) {
    return {
      status: 'em_apuracao',
      data_pagamento: null,
      label_status: 'Em apuração',
    }
  }
  if (isPrevious) {
    return {
      status: 'a_pagar',
      data_pagamento: dataPagamento,
      label_status: `A pagar até ${dataPagamento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
    }
  }
  return {
    status: 'pago',
    data_pagamento: dataPagamento,
    label_status: `Pago em ${dataPagamento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
  }
}

export async function getDashboardEvolucaoMensal(parceiroId: number): Promise<DashboardMes[]> {
  const sql = `${commonCTEs(parceiroId)}
SELECT
  mes_ano,
  COALESCE(ROUND(SUM(receita), 2), 0) AS receita_mes,
  COALESCE(ROUND(SUM(receita) * ${COMMISSION_PCT}, 2), 0) AS comissao_mes,
  COUNT(DISTINCT apto_id) AS n_imoveis_ativos
FROM fat
GROUP BY mes_ano, mes_date
ORDER BY mes_date ASC`

  const rows = await queryNekt<Record<string, string>>(sql)
  const today = new Date()
  return rows.map((r) => {
    const mes_ano = r.mes_ano ?? ''
    const statusInfo = computePaymentStatus(mes_ano, today)
    return {
      mes_ano,
      receita_mes: Number(r.receita_mes ?? 0),
      comissao_mes: Number(r.comissao_mes ?? 0),
      n_imoveis_ativos: Number(r.n_imoveis_ativos ?? 0),
      ...statusInfo,
    }
  })
}

/**
 * Totais agrupados por status de pagamento. Usado nos metric cards de pagamentos.
 */
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
