'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Sea Partners</h1>
          <p className="text-slate-600 mt-2">Portal do parceiro indicador Seazone</p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
            <p className="font-medium text-emerald-900">Link enviado!</p>
            <p className="text-sm text-emerald-800">
              Verifica o email <span className="font-medium">{email}</span> e clica no link pra entrar.
            </p>
            <p className="text-xs text-emerald-700 mt-3">
              O link expira em 1 hora. Pode fechar essa aba.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 bg-white rounded-xl border p-6 shadow-sm">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                autoFocus
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                disabled={status === 'sending'}
              />
            </label>

            <button
              type="submit"
              disabled={status === 'sending' || !email}
              className="w-full rounded-lg bg-slate-900 text-white py-2.5 px-4 font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {status === 'sending' ? 'Enviando...' : 'Entrar com magic link'}
            </button>

            {errorMsg && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}

            <p className="text-xs text-slate-500 text-center pt-2">
              Sem senha. A gente manda um link pro seu email.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
