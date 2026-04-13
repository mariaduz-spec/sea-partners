'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'

const SUGGESTIONS = [
  'Gere meu resumo semanal',
  'Qual foi meu melhor mês?',
  'Qual imóvel rende mais?',
  'Em qual mês a receita caiu e por quê?',
]

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isBusy = status === 'submitted' || status === 'streaming'

  // Auto scroll ao final conforme mensagens chegam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Foca input quando abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function send(text: string) {
    const t = text.trim()
    if (!t || isBusy) return
    void sendMessage({ text: t })
    setInput('')
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente IA"
        className="fixed bottom-6 right-6 rounded-full z-40 inline-flex items-center gap-2 px-5 py-3 body transition"
        style={{
          background: 'var(--color-coral)',
          color: 'white',
          boxShadow: 'var(--shadow-coral)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Sparkles size={18} />
        Assistente IA
      </button>

      {/* Overlay + Sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 transition"
            style={{ background: 'rgba(12, 22, 64, 0.4)' }}
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-label="Assistente IA"
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] z-50 flex flex-col chat-panel-enter"
            style={{
              background: 'var(--color-background)',
              borderLeft: '1px solid var(--color-border)',
            }}
          >
            {/* Header */}
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
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="body" style={{ color: 'var(--color-foreground)' }}>
                    Assistente IA
                  </p>
                  <p
                    className="detail-reg"
                    style={{ color: 'var(--color-muted-fg)' }}
                  >
                    Claude · contexto do seu portfólio
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition"
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 ? (
                <EmptyState onPick={send} />
              ) : (
                <>
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {isBusy &&
                    messages[messages.length - 1]?.role === 'user' && (
                      <Thinking />
                    )}
                </>
              )}
              {error && (
                <div
                  className="rounded-lg p-3"
                  style={{
                    background:
                      'color-mix(in oklab, var(--color-error) 12%, transparent)',
                    border: '1px solid var(--color-error)',
                  }}
                >
                  <p
                    className="body-reg"
                    style={{ color: 'var(--color-error)' }}
                  >
                    Erro ao conversar: {error.message}
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="p-4 flex gap-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre seus dados..."
                disabled={isBusy}
                className="body-reg flex-1 rounded-lg px-3 outline-none"
                style={{
                  background: 'var(--color-muted)',
                  color: 'var(--color-foreground)',
                  border: '1px solid var(--color-border-strong)',
                  height: 42,
                }}
              />
              <button
                type="submit"
                aria-label="Enviar"
                disabled={isBusy || !input.trim()}
                className="rounded-lg inline-flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--color-coral)',
                  color: 'white',
                  width: 42,
                  height: 42,
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  )
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div>
      <p
        className="body-reg"
        style={{ color: 'var(--color-muted-fg)' }}
      >
        Converse sobre suas indicações, receita e comissão. Experimente:
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="body-reg text-left rounded-lg px-3 py-2.5 transition"
            style={{
              background: 'var(--color-muted)',
              color: 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-coral)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n\n')

  if (!text) return null

  const isUser = message.role === 'user'

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className="rounded-xl px-4 py-2.5 max-w-[85%]"
        style={
          isUser
            ? {
                background: 'var(--color-coral)',
                color: 'white',
              }
            : {
                background: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }
        }
      >
        <p
          className="body-reg"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 py-2">
      <Loader2
        size={14}
        className="animate-spin"
        style={{ color: 'var(--color-coral)' }}
      />
      <span
        className="body-reg"
        style={{ color: 'var(--color-muted-fg)' }}
      >
        analisando seus dados...
      </span>
    </div>
  )
}
