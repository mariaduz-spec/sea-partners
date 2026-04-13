import { formatBRL, type DashboardMes, type PaymentStatus } from '@/lib/queries'
import { CheckCircle2, Clock, Hourglass } from 'lucide-react'

type Props = {
  meses: DashboardMes[]
}

/**
 * Historico de pagamentos da comissao — lista todos os meses disponiveis
 * com status (pago / a pagar / em apuracao) e data efetiva ou prevista.
 */
export default function PaymentsHistory({ meses }: Props) {
  const mesesOrdenados = [...meses].sort((a, b) => b.mes_ano.localeCompare(a.mes_ano, 'pt-BR'))
  // Ordenacao real por data — usa parse do MM/YYYY
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th
              className="eyebrow text-left py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Mês
            </th>
            <th
              className="eyebrow text-right py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Sua comissão
            </th>
            <th
              className="eyebrow text-right py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Imóveis ativos
            </th>
            <th
              className="eyebrow text-left py-3 pl-4"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {mesesOrdenados.map((m) => (
            <tr key={m.mes_ano} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td className="body py-3" style={{ color: 'var(--color-foreground)' }}>
                {m.mes_ano}
              </td>
              <td
                className="body py-3 text-right tabular-nums"
                style={{ color: 'var(--color-coral)' }}
              >
                {formatBRL(m.comissao_mes)}
              </td>
              <td
                className="body-reg py-3 text-right tabular-nums"
                style={{ color: 'var(--color-muted-fg)' }}
              >
                {m.n_imoveis_ativos}
              </td>
              <td className="py-3 pl-4">
                <StatusPill status={m.status} label={m.label_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
