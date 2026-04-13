import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

/**
 * Dev login — cria sessão diretamente via service role, sem email.
 * SÓ funciona em development mode.
 * Use: GET /api/dev-login?email=xxx
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not set — add it to .env.local' },
      { status: 500 }
    )
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey)

  // Find or create confirmed user
  const { data: usersData } = await admin.auth.admin.listUsers()
  let user = usersData?.users.find((u) => u.email === email)

  if (!user) {
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !newUser.user) {
      return NextResponse.json(
        { error: error?.message ?? 'Failed to create user' },
        { status: 500 }
      )
    }
    user = newUser.user
  }

  // Generate a session (creates access + refresh tokens)
  const { data: sessionData, error: sessionError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

  if (sessionError || !sessionData) {
    return NextResponse.json(
      { error: sessionError?.message ?? 'Failed to generate link' },
      { status: 500 }
    )
  }

  // Redirect to callback with the hashed token — it will exchange automatically
  const origin = new URL(request.url).origin
  const callbackUrl = `${origin}/auth/callback?code=${sessionData.properties.hashed_token}&next=/dashboard`

  return NextResponse.redirect(callbackUrl)
}
