import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * Webhook receives status updates from Pipedrive deals
 *
 * POST body: {
 *   deal_id: number,
 *   status: "won" | "lost" | "open",
 *   title: string
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json().catch(() => null)

    if (!body?.deal_id || !body?.status) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    const { deal_id, status, title } = body

    // Map Pipedrive status to our status
    const statusMap: Record<string, string> = {
      won: 'convertido',
      lost: 'perdido',
      open: 'sincronizado',
    }
    const newStatus = statusMap[status] || 'sincronizado'

    // Find the indication by pipedrive_deal_id
    const { data: existing } = await supabase
      .from('indicacoes_pendentes')
      .select('id, parceiro_email, nome_indicado')
      .eq('pipedrive_deal_id', deal_id)
      .single()

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Indicação não encontrada' }), { status: 404 })
    }

    // Update status
    await supabase
      .from('indicacoes_pendentes')
      .update({ status: newStatus })
      .eq('pipedrive_deal_id', deal_id)

    // Create notification
    const tituloStatus = newStatus === 'convertido' ? '🎉 Indicação convertida!' : newStatus === 'perdido' ? '😔 Indicação perdida' : '📋 Status atualizado'

    await supabase.from('notificacoes').insert({
      parceiro_email: existing.parceiro_email,
      tipo: 'indicacao_status',
      titulo: `${tituloStatus} ${existing.nome_indicado}`,
      mensagem: title ? `O lead "${title}" mudou para: ${newStatus}` : undefined,
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[webhook/indicacao] error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}