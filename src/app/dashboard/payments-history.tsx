'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/format'
import type { DashboardMes } from '@/lib/queries'
import { ChevronDown, ChevronRight, Coins, Home, Calendar } from 'lucide-react'

type Props = {
  meses: DashboardMes[]
  extratoPorMes: Record<
    string,
    Array<{
      code: string
      prop_status: string
      commission_type: string
      comissao: number
    }>
  >
}

/**
 * Histórico de receita por mês (evolução mensal).
 * Cada linha expansível para mostrar os imóveis que geraram receita naquele mês.
 */
export default function PaymentsHistory({ meses, extratoPorMes }: Props) {
  if (meses.length === 0) {
    return (
      <p className="body-reg text-center py-8" style={{ color: 'var(--color-muted-fg)' }}>
        Sem receita registrada ainda.
      </p>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        className="hidden sm:grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center py-3 eyebrow"
        style={{
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-muted-fg)',
        }}
      >
        <span className="w-4" aria-hidden />
        <span>Mês</span>
        <span className="text-right">Comissão</span>
        <span className="text-right">Status</span>
      </div>

      {/* Linhas */}
      <div>
        {meses.map((m) => {
          const extrato = extratoPorMes[m.mes_ano] ?? []
          return <MesRow key={m.mes_ano} mes={m} extrato={extrato} />
        })}
      </div>
    </div>
  )
}

function MesRow({
  mes,
  extrato,
}: {
  mes: DashboardMes
  extrato: Array<{
    code: string
    prop_status: string
    commission_type: string
    comissao: number
  }>
}) {
  const [open, setOpen] = useState(false)
  const ChevronIcon = open ? ChevronDown : ChevronRight
  const temReceita = mes.comissao_mes > 0

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center py-3 text-left transition cursor-pointer"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--color-muted)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        <span className="w-4 flex items-center justify-center">
          <ChevronIcon size={14} style={{ color: 'var(--color-muted-fg)' }} />
        </span>
        <span
          className="body"
          style={{ color: 'var(--color-foreground)' }}
        >
          {mes.mes_ano}
        </span>
        <span
          className="body text-right tabular-nums"
          style={{
            color: temReceita ? 'var(--color-coral)' : 'var(--color-muted-fg)',
          }}
        >
          {temReceita ? formatBRL(mes.comissao_mes) : '—'}
        </span>
        <span
          className="detail-reg text-right hidden sm:block"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          {mes.label_status}
        </span>
      </button>

      {open && extrato.length > 0 && (
        <div
          className="pb-4 pt-2 px-4 space-y-2"
          style={{
            background: 'color-mix(in oklab, var(--color-muted) 60%, transparent)',
          }}
        >
          {extrato.map((item) => (
            <div
              key={item.code}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Home size={14} style={{ color: 'var(--color-muted-fg)' }} />
                <span
                  className="body font-mono"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {item.code}
                </span>
                <span
                  className="detail"
                  style={{ color: 'var(--color-muted-fg)' }}
                >
                  {item.commission_type}
                </span>
              </div>
              <span
                className="body tabular-nums"
                style={{ color: 'var(--color-coral)' }}
              >
                {formatBRL(item.comissao)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}