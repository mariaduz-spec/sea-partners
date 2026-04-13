import 'server-only'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Dev login — cria sessão via OTP admin, bypassing PKCE.
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
      { error: 'SUPABASE_SERVICE_ROLE_KEY not set' },
      { status: 500 }
    )
  }

  // OTP via admin API with create_new_session — creates session directly, no PKCE needed
  const res = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      create_new_session: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await res.json() as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }

  const origin = new URL(request.url).origin

  // If session was created directly
  if (data.access_token && data.refresh_token) {
    const response = NextResponse.redirect(`${origin}/dashboard`)
    response.cookies.set('sb-access-token', data.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: data.expires_in ?? 3600,
      path: '/',
    })
    response.cookies.set('sb-refresh-token', data.refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  }

  // Fallback: OTP sent but no session — redirect to login
  return NextResponse.redirect(`${origin}/login?dev=otp_sent`)
}
