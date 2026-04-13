'use client'

import { useState } from 'react'
import { formatBRL, type DashboardMes, type PaymentStatus } from '@/lib/queries'
import { CheckCircle2, Clock, Hourglass, ChevronDown, ChevronRight } from 'lucide-react'

type ImovelNoMes = { code: string; prop_status: string; comissao: number }

type Props = {
  meses: DashboardMes[]
  extratoPorMes: Record<string, ImovelNoMes[]>
}

/**
 * Historico expansivel: cada linha de mes tem um chevron.
 * Click expande mostrando quais imoveis geraram comissao naquele mes.
 */
export default function PaymentsHistory({ meses, extratoPorMes }: Props) {
  const mesesOrdenados = [...meses]
  mesesOrdenados.sort((a, b) => {
    const [ma, ya] = a.mes_ano.split('/').map(Number)
    const [mb, yb] = b.mes_ano.split('/').map(Number)
    return yb - ya || mb - ma
  })

  if (meses.length === 0) {
    return (
      <p className="body-reg text-center py-8" style={{ color: 'var(--color-muted-fg)' }}>
        Sem histórico disponível ainda.
      </p>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div
        className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-center py-3 eyebrow"
        style={{
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-muted-fg)',
        }}
      >
        <span className="w-4" aria-hidden />
        <span>Mês</span>
        <span className="text-right">Comissão</span>
        <span className="text-right hidden sm:inline">Imóveis</span>
        <span className="pl-2">Status</span>
      </div>

      {/* Linhas */}
      <div>
        {mesesOrdenados.map((m) => (
          <MesRow
            key={m.mes_ano}
            mes={m}
            imoveis={extratoPorMes[m.mes_ano] ?? []}
          />
        ))}
      </div>
    </div>
  )
}

function MesRow({ mes, imoveis }: { mes: DashboardMes; imoveis: ImovelNoMes[] }) {
  const [open, setOpen] = useState(false)
  const ChevronIcon = open ? ChevronDown : ChevronRight

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-center py-3 text-left transition cursor-pointer"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--color-muted)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        <span className="w-4 flex items-center justify-center">
          <ChevronIcon
            size={14}
            style={{ color: 'var(--color-muted-fg)' }}
          />
        </span>
        <span className="body" style={{ color: 'var(--color-foreground)' }}>
          {mes.mes_ano}
        </span>
        <span
          className="body text-right tabular-nums"
          style={{ color: 'var(--color-coral)' }}
        >
          {formatBRL(mes.comissao_mes)}
        </span>
        <span
          className="body-reg text-right tabular-nums hidden sm:inline"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          {mes.n_imoveis_ativos}
        </span>
        <span className="pl-2">
          <StatusPill status={mes.status} label={mes.label_status} />
        </span>
      </button>

      {open && (
        <div
          className="pb-3"
          style={{
            background:
              'color-mix(in oklab, var(--color-muted) 60%, transparent)',
          }}
        >
          <div className="px-4 py-2 detail" style={{ color: 'var(--color-muted-fg)' }}>
            {imoveis.length > 0
              ? `Quebra por imóvel (${imoveis.length})`
              : 'Sem detalhamento por imóvel disponível neste mês.'}
          </div>
          {imoveis.length > 0 && (
            <div>
              {imoveis.map((i) => (
                <div
                  key={i.code}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-center py-2 px-1"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <span className="w-4" aria-hidden />
                  <span
                    className="body-reg font-mono"
                    style={{ color: 'var(--color-foreground)', fontSize: 13 }}
                  >
                    {i.code}
                  </span>
                  <span
                    className="body-reg text-right tabular-nums"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {formatBRL(i.comissao)}
                  </span>
                  <span className="hidden sm:inline" aria-hidden />
                  <span className="pl-2">
                    <PropertyStatusPill status={i.prop_status} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status, label }: { status: PaymentStatus; label: string }) {
  const config = {
    pago: {
      bg: 'color-mix(in oklab, var(--color-success) 15%, transparent)',
      color: 'var(--color-success)',
      Icon: CheckCircle2,
    },
    a_pagar: {
      bg: 'var(--color-coral-light)',
      color: 'var(--color-coral)',
      Icon: Clock,
    },
    em_apuracao: {
      bg: 'var(--color-muted)',
      color: 'var(--color-muted-fg)',
      Icon: Hourglass,
    },
  }[status]

  return (
    <span
      className="detail inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      <config.Icon size={12} />
      {label}
    </span>
  )
}

function PropertyStatusPill({ status }: { status: string }) {
  const isActive = status === 'Active'
  return (
    <span
      className="detail inline-block px-2 py-0.5 rounded-full"
      style={
        isActive
          ? {
              background:
                'color-mix(in oklab, var(--color-success) 15%, transparent)',
              color: 'var(--color-success)',
            }
          : {
              background: 'var(--color-muted)',
              color: 'var(--color-muted-fg)',
            }
      }
    >
      {status || '—'}
    </span>
  )
}
