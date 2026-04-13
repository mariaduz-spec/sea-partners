import 'server-only'
import { createSupabaseServerClient } from './supabase'

export type PartnerMapping = {
  email: string
  parceiro_id: number
  display_name: string
}

/**
 * Busca o mapping parceiro do usuario logado.
 * Retorna null se:
 *   - nao ha sessao
 *   - email do usuario nao esta na tabela partner_mapping
 * RLS garante que cada usuario so ve o proprio mapping.
 */
export async function getPartnerForCurrentUser(): Promise<PartnerMapping | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabase
    .from('partner_mapping')
    .select('email, parceiro_id, display_name')
    .eq('email', user.email)
    .maybeSingle()

  return data as PartnerMapping | null
}
