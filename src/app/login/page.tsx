'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
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
              background: 'var(--color-navy)',
              color: 'white',
            }}
          >
            <span>SEA PARTNERS</span>
          </div>
          <h2 style={{ color: 'var(--color-navy)' }}>Portal do parceiro</h2>
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
            <p className="p-ui" style={{ color: 'var(--color-navy)' }}>
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
                (e.currentTarget.style.background = 'var(--color-navy)')
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
          </form>
        )}
      </div>
    </div>
  )
}
