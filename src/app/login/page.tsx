'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Mail, ArrowRight, CheckCircle2, ChevronDown, User } from 'lucide-react'

const DEV_USERS = [
  { email: 'demo.mineia@seazone.com.br', name: 'Mineia' },
  { email: 'demo.gilberto@seazone.com.br', name: 'Gilberto Baumgarten' },
  { email: 'maria.duz@seazone.com.br', name: 'Maria Duz (Katia Emmel)' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showDev, setShowDev] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.includes('@')) {
      setErrorMsg('Email invalido')
      setStatus('error')
      return
    }

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="eyebrow inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{
              background: 'var(--color-navy-bg)',
              color: 'white',
            }}
          >
            <span>SEA PARTNERS</span>
          </div>
          <h2 className="login-title">Portal do parceiro</h2>
          <p
            className="body-reg mt-2"
            style={{ color: 'var(--color-muted-fg)' }}
          >
            Acompanhe suas indicações, receita dos imóveis e comissão em tempo real.
          </p>
        </div>

        {status === 'sent' ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
              style={{
                background: 'color-mix(in oklab, var(--color-success) 15%, transparent)',
                color: 'var(--color-success)',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <p className="p-ui" style={{ color: 'var(--color-foreground)' }}>
              Link enviado!
            </p>
            <p
              className="body-reg mt-2"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Verifica o email{' '}
              <span className="body" style={{ color: 'var(--color-foreground)' }}>
                {email}
              </span>{' '}
              e clica no link pra entrar.
            </p>
            <p
              className="detail-reg mt-6"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              O link expira em 1 hora. Pode fechar essa aba.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="rounded-xl p-6 space-y-4"
            style={{
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <label className="block">
              <span className="body" style={{ color: 'var(--color-foreground)' }}>
                Email
              </span>
              <div className="mt-2 relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-muted-fg)' }}
                />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'sending'}
                  className="body-reg w-full rounded-lg pl-10 pr-3 outline-none transition"
                  style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border-strong)',
                    color: 'var(--color-foreground)',
                    height: '48px',
                  }}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={status === 'sending' || !email}
              className="body w-full rounded-lg inline-flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--color-coral)',
                color: 'white',
                height: '48px',
              }}
              onMouseEnter={(e) =>
                !e.currentTarget.disabled &&
                (e.currentTarget.style.background = 'var(--color-navy-bg)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'var(--color-coral)')
              }
            >
              {status === 'sending' ? 'Enviando...' : 'Entrar com magic link'}
              {status !== 'sending' && <ArrowRight size={16} />}
            </button>

            {errorMsg && (
              <p
                className="body-reg text-center"
                style={{ color: 'var(--color-error)' }}
              >
                {errorMsg}
              </p>
            )}

            <p
              className="detail-reg text-center pt-2"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Sem senha. Enviamos um link pro seu email.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px dashed var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowDev(!showDev)}
                  className="w-full flex items-center justify-between body-reg px-3 py-2 rounded-lg transition"
                  style={{
                    background: 'var(--color-navy-bg)',
                    color: 'white',
                    opacity: 0.7,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <User size={14} />
                    Dev mode — login rápido
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${showDev ? 'rotate-180' : ''}`} />
                </button>

                {showDev && (
                  <div className="mt-2 space-y-1">
                    {DEV_USERS.map((u) => (
                      <DevLoginButton key={u.email} email={u.email} name={u.name} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

function DevLoginButton({ email, name }: { email: string; name: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDevLogin() {
    setLoading(true)
    window.location.href = `/api/dev-login?email=${encodeURIComponent(email)}`
  }

  return (
    <button
      type="button"
      onClick={handleDevLogin}
      disabled={loading}
      className="w-full text-left body-reg px-3 py-2 rounded-lg transition"
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-foreground)',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? 'Enviando...' : name}
      <span className="detail-reg block" style={{ color: 'var(--color-muted-fg)' }}>
        {email}
      </span>
    </button>
  )
}