import { createSupabaseServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 })
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('parceiro_email', user.email)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return Response.json({ notificacoes: data || [] })
  } catch (err) {
    console.error('[api/notificacoes] error:', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 })
    }

    const body = await request.json()
    const { id, lida } = body

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida })
      .eq('id', id)
      .eq('parceiro_email', user.email)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/notificacoes] error:', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}