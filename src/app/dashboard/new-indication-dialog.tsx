'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, CheckCircle2, Loader2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

type FormState = {
  nome_indicado: string
  telefone: string
  email_indicado: string
  endereco_imovel: string
  observacoes: string
}

const EMPTY: FormState = {
  nome_indicado: '',
  telefone: '',
  email_indicado: '',
  endereco_imovel: '',
  observacoes: '',
}

export default function NewIndicationDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Foco no primeiro input ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [open])

  function closeDialog() {
    setOpen(false)
    setTimeout(() => {
      setForm(EMPTY)
      setStatus('idle')
      setErrorMsg('')
    }, 300)
  }

  // ESC fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && status !== 'submitting') {
        closeDialog()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, status])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/indicacoes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await res.json()

      if (!res.ok) {
        setErrorMsg(payload?.error ?? 'Erro ao salvar indicação.')
        setStatus('error')
        return
      }

      setStatus('success')
      // Auto-fecha após 2s e refresca o dashboard
      setTimeout(() => {
        closeDialog()
        router.refresh()
      }, 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado')
      setStatus('error')
    }
  }

  const submitDisabled =
    status === 'submitting' ||
    form.nome_indicado.trim().length < 2 ||
    form.telefone.trim().length < 8

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="body inline-flex items-center gap-2 rounded-lg px-4 transition"
        style={{
          background: 'var(--color-coral)',
          color: 'white',
          height: 40,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--color-coral-hover)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'var(--color-coral)')
        }
      >
        <Plus size={16} />
        Nova indicação
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(12, 22, 64, 0.4)' }}
            onClick={() => status !== 'submitting' && closeDialog()}
          />
          <div
            role="dialog"
            aria-label="Nova indicação"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4"
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card-lg)',
              }}
            >
              <header
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{
                      background: 'var(--color-coral-light)',
                      color: 'var(--color-coral)',
                    }}
                  >
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <p className="body" style={{ color: 'var(--color-foreground)' }}>
                      Nova indicação
                    </p>
                    <p
                      className="detail-reg"
                      style={{ color: 'var(--color-muted-fg)' }}
                    >
                      Cadastre um novo lead pra nossa equipe comercial
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDialog}
                  disabled={status === 'submitting'}
                  aria-label="Fechar"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition disabled:opacity-50"
                  style={{ color: 'var(--color-muted-fg)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--color-muted)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <X size={18} />
                </button>
              </header>

              {status === 'success' ? (
                <div className="p-8 text-center">
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                    style={{
                      background:
                        'color-mix(in oklab, var(--color-success) 18%, transparent)',
                      color: 'var(--color-success)',
                    }}
                  >
                    <CheckCircle2 size={28} />
                  </div>
                  <p
                    className="p-ui"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    Indicação registrada!
                  </p>
                  <p
                    className="body-reg mt-2"
                    style={{ color: 'var(--color-muted-fg)' }}
                  >
                    Nosso time comercial vai entrar em contato em até 24h. Obrigada!
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="p-5 space-y-4">
                  <Field label="Nome do indicado" required>
                    <input
                      ref={firstInputRef}
                      type="text"
                      required
                      minLength={2}
                      value={form.nome_indicado}
                      onChange={(e) => update('nome_indicado', e.target.value)}
                      placeholder="João Silva"
                      disabled={status === 'submitting'}
                      className="input-bluezone"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Telefone" required>
                      <input
                        type="tel"
                        required
                        minLength={8}
                        value={form.telefone}
                        onChange={(e) => update('telefone', e.target.value)}
                        placeholder="(48) 99999-9999"
                        disabled={status === 'submitting'}
                        className="input-bluezone"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={form.email_indicado}
                        onChange={(e) => update('email_indicado', e.target.value)}
                        placeholder="joao@exemplo.com"
                        disabled={status === 'submitting'}
                        className="input-bluezone"
                      />
                    </Field>
                  </div>

                  <Field label="Endereço do imóvel">
                    <input
                      type="text"
                      value={form.endereco_imovel}
                      onChange={(e) => update('endereco_imovel', e.target.value)}
                      placeholder="Rua, número, bairro, cidade"
                      disabled={status === 'submitting'}
                      className="input-bluezone"
                    />
                  </Field>

                  <Field label="Observações">
                    <textarea
                      rows={3}
                      value={form.observacoes}
                      onChange={(e) => update('observacoes', e.target.value)}
                      placeholder="Qualquer detalhe relevante: número de quartos, mobília, contexto da indicação..."
                      disabled={status === 'submitting'}
                      className="input-bluezone"
                      style={{ resize: 'vertical', minHeight: 80 }}
                    />
                  </Field>

                  {errorMsg && (
                    <p
                      className="body-reg"
                      style={{ color: 'var(--color-error)' }}
                    >
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeDialog}
                      disabled={status === 'submitting'}
                      className="body flex-1 rounded-lg transition disabled:opacity-50"
                      style={{
                        background: 'transparent',
                        color: 'var(--color-foreground)',
                        border: '1px solid var(--color-border-strong)',
                        height: 44,
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitDisabled}
                      className="body flex-1 rounded-lg inline-flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'var(--color-coral)',
                        color: 'white',
                        height: 44,
                      }}
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar indicação'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span
        className="body"
        style={{ color: 'var(--color-foreground)' }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--color-coral)', marginLeft: 4 }}>*</span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
