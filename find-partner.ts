import https from 'https'

async function queryNekt(sql: string) {
  const response = await fetch('https://api.nekt.ai/api/v1/sql-query/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEKT_API_KEY || ''
    },
    body: JSON.stringify({ sql })
  })
  const data = await response.json()

  if (data.state !== 'SUCCEEDED') {
    throw new Error(data.state_change_reason)
  }

  const url = data.presigned_urls[0]
  const csv = await new Promise<string>((resolve, reject) => {
    https.get(url, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve(body))
      res.on('error', reject)
    })
  })

  const lines = csv.trim().split('\n')
  if (lines.length <= 1) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]))
  })
}

async function main() {
  // Test UNION approach: indications_property OR base_pagamento
  const sql = `
WITH partner_imoveis AS (
  SELECT DISTINCT TRY_CAST(property_id AS BIGINT) AS property_id
  FROM nekt_trusted.sapron_public_partners_indications_property
  WHERE TRY_CAST(partner_id AS BIGINT) = 174 AND status = 'Won'
  UNION
  SELECT DISTINCT TRY_CAST(p.id AS BIGINT) AS property_id
  FROM nekt_service.base_pagamento_parceiros b
  INNER JOIN nekt_trusted.sapron_public_property_property p ON TRIM(b.codigo_do_imovel_unidade) = TRIM(p.code)
  WHERE TRY_CAST(b.parceiro AS BIGINT) = 174
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
SELECT COUNT(*) as total_imoveis, SUM(ROUND(comissao_12m, 2)) as total_comissao
FROM comissao
`
  const rows = await queryNekt(sql)
  console.log('UNION result for 174:', JSON.stringify(rows, null, 2))

  // Also test for 17818
  const sql2 = sql.replace(/= 174/g, '= 17818')
  const rows2 = await queryNekt(sql2)
  console.log('UNION result for 17818:', JSON.stringify(rows2, null, 2))
}

main()