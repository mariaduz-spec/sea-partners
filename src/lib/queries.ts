import 'server-only'
import { queryNekt } from './nekt'
import type {
  DashboardSummary,
  PagamentoParceiro,
  PagamentosPorMes,
  DashboardImovel,
} from './format'

export type {
  DashboardSummary,
  PagamentoParceiro,
  PagamentosPorMes,
  DashboardImovel,
}
export { formatBRL, formatBRLCompact } from './format'

/**
 * Queries do portal Sea Partners.
 *
 * Fonte de verdade dos pagamentos: nekt_service.partner_payment_base
 * (deal do parceiro no Pipedrive com taxa_de_adesao). Um parceiro recebe
 * um valor one-shot quando o imovel que ele indicou fecha contrato.
 *
 * Receita mensal do imovel (nekt_service.google_sheets_faturamento_...)
 * eh usada apenas como contexto — nao eh paga ao parceiro no modelo atual.
 */

/** Parser seguro pra timestamp "YYYY-MM-DD HH:MM:SS" que vem como string do Athena. */
function parseCloseTime(raw: string | null | undefined): Date | null {
  if (!raw) return null
  // Formatos observados: "2025-12-18 16:19:05" ou ISO-like
  const s = raw.replace(' ', 'T') + 'Z'
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function formatMesAno(d: Date | null): string {
  if (!d) return ''
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${mm}/${yyyy}`
}

function formatDateDisplay(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Resumo consolidado do parceiro — usado nos metric cards.
 */
export async function getDashboardSummary(parceiroId: number): Promise<DashboardSummary> {
  const sql = `
SELECT
  COUNT(*) AS total_indicacoes,
  COUNT(CASE WHEN taxa_de_adesao > 0 THEN 1 END) AS total_com_pagamento,
  COALESCE(ROUND(SUM(taxa_de_adesao), 2), 0) AS total_recebido,
  COALESCE(ROUND(AVG(CASE WHEN taxa_de_adesao > 0 THEN taxa_de_adesao END), 2), 0) AS ticket_medio,
  MIN(CASE WHEN taxa_de_adesao > 0 THEN close_time END) AS primeiro_pagamento,
  MAX(CASE WHEN taxa_de_adesao > 0 THEN close_time END) AS ultimo_pagamento
FROM nekt_service.partner_payment_base
WHERE parceiro = ${parceiroId}
  AND status = 'won'`

  const rows = await queryNekt<Record<string, string>>(sql)
  const r = rows[0] ?? {}
  return {
    total_indicacoes: Number(r.total_indicacoes ?? 0),
    total_com_pagamento: Number(r.total_com_pagamento ?? 0),
    total_recebido: Number(r.total_recebido ?? 0),
    ticket_medio: Number(r.ticket_medio ?? 0),
    primeiro_pagamento: parseCloseTime(r.primeiro_pagamento),
    ultimo_pagamento: parseCloseTime(r.ultimo_pagamento),
  }
}

/**
 * Lista completa de pagamentos (deals won do parceiro).
 * Cada linha = uma indicacao que fechou contrato = um pagamento potencial
 * (pode ter taxa_de_adesao = 0 se o deal foi fechado sem taxa).
 */
export async function getPagamentosParceiro(
  parceiroId: number
): Promise<PagamentoParceiro[]> {
  const sql = `
SELECT
  id,
  title,
  close_time,
  status,
  value,
  taxa_de_adesao,
  forma_pagamento,
  codigo_do_imovel_unidade,
  endereco_do_imovel,
  city_adjusted
FROM nekt_service.partner_payment_base
WHERE parceiro = ${parceiroId}
  AND status = 'won'
ORDER BY close_time DESC`

  const rows = await queryNekt<Record<string, string>>(sql)
  return rows.map((r) => {
    const closeDate = parseCloseTime(r.close_time)
    return {
      deal_id: Number(r.id ?? 0),
      title: r.title ?? '',
      close_date: closeDate?.toISOString() ?? null,
      close_date_display: formatDateDisplay(closeDate),
      mes_ano: formatMesAno(closeDate),
      deal_status: r.status ?? '',
      taxa_de_adesao: Number(r.taxa_de_adesao ?? 0),
      valor_contrato: Number(r.value ?? 0),
      forma_pagamento: r.forma_pagamento ?? '',
      codigo_do_imovel_unidade: r.codigo_do_imovel_unidade ?? '',
      endereco_do_imovel: r.endereco_do_imovel ?? '',
      cidade: r.city_adjusted ?? '',
    }
  })
}

/**
 * Agrega pagamentos por mes de fechamento. Usado no grafico de evolucao.
 */
export function aggregatePagamentosPorMes(
  pagamentos: PagamentoParceiro[]
): PagamentosPorMes[] {
  const map = new Map<string, PagamentosPorMes>()

  for (const p of pagamentos) {
    if (!p.mes_ano) continue
    const key = p.mes_ano
    const prev = map.get(key) ?? {
      mes_ano: key,
      mes_date: p.close_date ? new Date(p.close_date) : null,
      total_recebido: 0,
      total_indicacoes: 0,
      count_com_pagamento: 0,
    }
    prev.total_indicacoes += 1
    if (p.taxa_de_adesao > 0) {
      prev.total_recebido += p.taxa_de_adesao
      prev.count_com_pagamento += 1
    }
    map.set(key, prev)
  }

  return Array.from(map.values()).sort((a, b) => {
    const [ma, ya] = a.mes_ano.split('/').map(Number)
    const [mb, yb] = b.mes_ano.split('/').map(Number)
    return ya - yb || ma - mb
  })
}

/**
 * Lista de imoveis indicados pelo parceiro, enriquecida com status do imovel
 * (Active/Inactive) e a taxa que o parceiro recebeu daquele deal.
 */
export async function getDashboardImoveis(parceiroId: number): Promise<DashboardImovel[]> {
  const sql = `
WITH pagamentos AS (
  SELECT
    TRIM(bp.codigo_do_imovel_unidade) AS code,
    SUM(bp.taxa_de_adesao) AS taxa_de_adesao
  FROM nekt_service.partner_payment_base bp
  WHERE bp.parceiro = ${parceiroId}
    AND bp.status = 'won'
    AND bp.codigo_do_imovel_unidade IS NOT NULL
    AND bp.codigo_do_imovel_unidade <> ''
  GROUP BY TRIM(bp.codigo_do_imovel_unidade)
),
imoveis AS (
  SELECT
    CAST(p.id AS VARCHAR) AS apto_id,
    TRIM(p.code) AS code,
    p.status AS prop_status
  FROM nekt_trusted.sapron_public_property_property p
  INNER JOIN pagamentos pg ON TRIM(p.code) = pg.code
),
meses AS (
  SELECT
    i.apto_id,
    COUNT(DISTINCT f.mes_ano) AS n_meses_ativos
  FROM imoveis i
  LEFT JOIN nekt_service.google_sheets_faturamento_por_imovel_por_franquia_anfitriao_imovel f
    ON f.apto_id = i.apto_id
    AND TRY_CAST(
      REPLACE(REPLACE(REPLACE(f.receita_reservas, 'R$ ', ''), '.', ''), ',', '.') AS DOUBLE
    ) > 0
  GROUP BY i.apto_id
)
SELECT
  i.apto_id,
  i.code,
  i.prop_status,
  COALESCE(ROUND(pg.taxa_de_adesao, 2), 0) AS taxa_de_adesao,
  COALESCE(m.n_meses_ativos, 0) AS n_meses_ativos
FROM imoveis i
LEFT JOIN pagamentos pg ON pg.code = i.code
LEFT JOIN meses m ON m.apto_id = i.apto_id
ORDER BY taxa_de_adesao DESC NULLS LAST, i.code
LIMIT 80`

  const rows = await queryNekt<Record<string, string>>(sql)
  return rows.map((r) => ({
    apto_id: r.apto_id ?? '',
    code: r.code ?? '',
    prop_status: r.prop_status ?? '',
    taxa_de_adesao: Number(r.taxa_de_adesao ?? 0),
    n_meses_ativos: Number(r.n_meses_ativos ?? 0),
  }))
}
