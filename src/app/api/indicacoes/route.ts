import { createSupabaseServerClient } from '@/lib/supabase'
import { getPartnerForCurrentUser } from '@/lib/partner'

type IndicacaoPayload = {
  nome_indicado: string
  telefone: string
  email_indicado?: string
  endereco_imovel?: string
  observacoes?: string
}

function validate(payload: unknown): {
  ok: true
  data: IndicacaoPayload
} | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Payload invalido' }
  }
  const p = payload as Record<string, unknown>

  const nome = typeof p.nome_indicado === 'string' ? p.nome_indicado.trim() : ''
  const telefone = typeof p.telefone === 'string' ? p.telefone.trim() : ''

  if (nome.length < 2) return { ok: false, error: 'Nome é obrigatório (min 2 caracteres)' }
  if (telefone.length < 8) return { ok: false, error: 'Telefone é obrigatório (min 8 dígitos)' }

  const asString = (v: unknown) =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined

  return {
    ok: true,
    data: {
      nome_indicado: nome,
      telefone,
      email_indicado: asString(p.email_indicado),
      endereco_imovel: asString(p.endereco_imovel),
      observacoes: asString(p.observacoes),
    },
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const valid = validate(body)
    if (!valid.ok) {
      return new Response(JSON.stringify({ error: valid.error }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'Nao autenticado' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    const partner = await getPartnerForCurrentUser()
    if (!partner) {
      return new Response(
        JSON.stringify({
          error:
            'Sua conta ainda nao esta vinculada a um parceiro. Contate o time comercial.',
        }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
    }

    const { data, error } = await supabase
      .from('indicacoes_pendentes')
      .insert({
        parceiro_id: partner.parceiro_id,
        parceiro_email: user.email,
        ...valid.data,
      })
      .select('id, created_at, status')
      .single()

    if (error) {
      console.error('[api/indicacoes] insert error:', error)
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar indicacao: ' + error.message }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ ok: true, indicacao: data }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/indicacoes] error:', err)
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
