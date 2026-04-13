import 'server-only'
import Papa from 'papaparse'

/**
 * Nekt Data API REST helper.
 *
 * A API eh assincrona: submete SQL, recebe presigned URL de um CSV no S3 (valido 1h),
 * a gente baixa e parseia. Latencia tipica observada: 1.5-3s.
 *
 * A chave (NEKT_API_KEY) NUNCA deve sair do server. Este arquivo usa 'server-only'
 * pra garantir erro de build se for importado em Client Component.
 */

const NEKT_ENDPOINT = 'https://api.nekt.ai/api/v1/sql-query/'

type NektSubmitResponse = {
  state: 'SUCCEEDED' | 'FAILED' | 'RUNNING' | 'CANCELLED'
  presigned_urls?: string[]
  state_change_reason?: string
  data_scanned_in_bytes?: number
  execution_time_in_millis?: number
}

export class NektError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message)
    this.name = 'NektError'
  }
}

/**
 * Executa um SQL no Nekt (AWS Athena) e retorna linhas parseadas.
 * Todos os campos vem como string — conversao fica por conta do caller (ver parseReal).
 */
export async function queryNekt<T = Record<string, string>>(sql: string): Promise<T[]> {
  const apiKey = process.env.NEKT_API_KEY
  if (!apiKey) {
    throw new NektError('NEKT_API_KEY ausente no ambiente do server')
  }

  // 1. Submeter SQL
  const submitRes = await fetch(NEKT_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, mode: 'csv' }),
  })

  if (!submitRes.ok) {
    const body = await submitRes.text()
    throw new NektError(`Nekt API HTTP ${submitRes.status}`, body)
  }

  const data = (await submitRes.json()) as NektSubmitResponse

  if (data.state === 'FAILED' || data.state === 'CANCELLED') {
    throw new NektError(`Query ${data.state}: ${data.state_change_reason ?? 'sem motivo'}`, data)
  }

  if (data.state === 'RUNNING') {
    // Na validacao SELECT 1 veio SUCCEEDED direto. Se virmos RUNNING em queries reais,
    // adicionar polling aqui. Por ora, erro explicito.
    throw new NektError('Query ainda em RUNNING — polling nao implementado', data)
  }

  const url = data.presigned_urls?.[0]
  if (!url) {
    throw new NektError('SUCCEEDED mas sem presigned_urls', data)
  }

  // 2. Download do CSV
  const csvRes = await fetch(url)
  if (!csvRes.ok) {
    throw new NektError(`Download CSV HTTP ${csvRes.status}`)
  }
  const csv = await csvRes.text()

  // 3. Parse
  const parsed = Papa.parse<T>(csv, {
    header: true,
    skipEmptyLines: true,
    // Athena retorna valores com aspas; Papa trata por padrao.
  })

  if (parsed.errors.length > 0) {
    // Nao lanca — algumas linhas com lixo podem dar warning sem invalidar o todo.
    console.warn('[nekt] CSV parse warnings:', parsed.errors.slice(0, 3))
  }

  return parsed.data
}

/**
 * Converte valor BR tipo "R$ 5.085,77" em number (5085.77).
 * Retorna null pra string vazia, null, ou valores invalidos.
 */
export function parseReal(value: string | null | undefined): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const cleaned = trimmed.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Converte "MM/YYYY" em um Date (primeiro dia do mes, UTC).
 * Tolera formato "DD/MM/YYYY" que aparece mixturado na tabela de faturamento.
 * Retorna null pra strings invalidas.
 */
export function parseMesAno(value: string | null | undefined): Date | null {
  if (!value) return null
  const mm_yyyy = /^(\d{2})\/(\d{4})$/.exec(value.trim())
  if (mm_yyyy) {
    const month = Number(mm_yyyy[1])
    const year = Number(mm_yyyy[2])
    if (month < 1 || month > 12) return null
    return new Date(Date.UTC(year, month - 1, 1))
  }
  const dd_mm_yyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (dd_mm_yyyy) {
    const month = Number(dd_mm_yyyy[2])
    const year = Number(dd_mm_yyyy[3])
    if (month < 1 || month > 12) return null
    return new Date(Date.UTC(year, month - 1, 1))
  }
  return null
}
