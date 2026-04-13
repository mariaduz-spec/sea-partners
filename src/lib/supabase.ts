import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Usa cookies pra manter sessao entre requests.
 *
 * Para uso em Client Components, criar um helper separado (createBrowserClient).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing Supabase env vars: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`)
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // `setAll` foi chamado num Server Component. Ignorar — middleware cuida disso.
          }
        },
      },
    }
  )
}
