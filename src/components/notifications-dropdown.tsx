'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, CheckCircle, XCircle, Clock,Loader2 } from 'lucide-react'

type Notificacao = {
  id: string
  tipo: string
  titulo: string
  mensagem: string | null
  lida: boolean
  created_at: string
}

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    async function fetchNotificacoes() {
      setLoading(true)
      try {
        const res = await fetch('/api/notificacoes')
        const data = await res.json()
        setNotificacoes(data.notificacoes || [])
      } catch (err) {
        console.error('Failed to fetch notificacoes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotificacoes()
  }, [open])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition"
        style={{ color: 'var(--color-header-muted)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-muted)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        aria-label="Notificações"
      >
        {naoLidas > 0 ? <BellRing size={18} /> : <Bell size={18} />}
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--color-coral)', color: 'white' }}>
            {naoLidas}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50"
            style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card-lg)' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="body" style={{ color: 'var(--color-foreground)' }}>Notificações</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-muted-fg)' }} />
              </div>
            ) : notificacoes.length === 0 ? (
              <p className="body-reg text-center py-8" style={{ color: 'var(--color-muted-fg)' }}>
                Nenhuma notificação.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notificacoes.map((n) => (
                  <NotificacaoItem key={n.id} notificacao={n} onRead={() => {
                    setNotificacoes(prev => prev.map(item => item.id === n.id ? { ...item, lida: true } : item))
                  }} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function NotificacaoItem({ notificacao, onRead }: { notificacao: Notificacao; onRead: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    indicacao_status: <Clock size={14} />,
    comissao_nova: <CheckCircle size={14} />,
    saque_processado: <Clock size={14} />,
  }

  const icon = icons[notificacao.tipo] || <Bell size={14} />

  return (
    <div
      className="px-4 py-3 flex items-start gap-3"
      style={{ borderBottom: '1px solid var(--color-border)', background: notificacao.lida ? 'transparent' : 'color-mix(in oklab, var(--color-coral-light) 30%, transparent)' }}
      onClick={() => !notificacao.lida && onRead()}
    >
      <span style={{ color: 'var(--color-coral)' }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="body truncate" style={{ color: 'var(--color-foreground)' }}>{notificacao.titulo}</p>
        {notificacao.mensagem && (
          <p className="detail-reg truncate" style={{ color: 'var(--color-muted-fg)' }}>{notificacao.mensagem}</p>
        )}
        <p className="detail-reg mt-1" style={{ color: 'var(--color-muted-fg)' }}>
          {new Date(notificacao.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}