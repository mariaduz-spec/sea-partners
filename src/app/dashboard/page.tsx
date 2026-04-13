import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getDashboardImoveis,
  getDashboardEvolucaoMensal,
  aggregatePaymentStats,
  formatBRL,
  formatBRLCompact,
} from '@/lib/queries'
import LogoutButton from './logout-button'
import RevenueChart from './revenue-chart'
import ChatPanel from './chat-panel'
import NewIndicationDialog from './new-indication-dialog'
import PaymentsHistory from './payments-history'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  TrendingUp,
  Wallet,
  Building2,
  MailQuestion,
  Clock,
  CheckCircle2,
  Hourglass,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const partner = await getPartnerForCurrentUser()

  if (!partner) {
    return (
      <DashboardShell email={user.email ?? ''}>
        <div
          className="rounded-xl p-12 text-center max-w-lg mx-auto"
          style={{
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{
              background: 'var(--color-coral-light)',
              color: 'var(--color-coral)',
            }}
          >
            <MailQuestion size={24} />
          </div>
          <p className="p-ui" style={{ color: 'var(--color-foreground)' }}>
            Conta ainda não vinculada
          </p>
          <p
            className="body-reg mt-2"
            style={{ color: 'var(--color-muted-fg)' }}
          >
            Entre em contato com o time comercial da Seazone para liberar seu acesso como parceiro.
          </p>
          <p
            className="detail-reg mt-6 font-mono"
            style={{ color: 'var(--color-muted-fg)' }}
          >
            {user.email}
          </p>
        </div>
      </DashboardShell>
    )
  }

  const [summary, imoveis, evolucao] = await Promise.all([
    getDashboardSummary(partner.parceiro_id),
    getDashboardImoveis(partner.parceiro_id),
    getDashboardEvolucaoMensal(partner.parceiro_id),
  ])

  const imoveisAtivos = imoveis.filter((i) => i.receita_12m > 0)
  const imoveisInativos = imoveis.filter((i) => i.receita_12m === 0)
  const mediaComissaoMensal =
    summary.meses_distintos > 0 ? summary.comissao_2pct / summary.meses_distintos : 0
  const pagStats = aggregatePaymentStats(evolucao)

  return (
    <DashboardShell email={user.email ?? ''} partnerName={partner.display_name}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow" style={{ color: 'var(--color-coral)' }}>
            Olá 👋
          </span>
          <h3 className="mt-1" style={{ color: 'var(--color-foreground)' }}>
            {partner.display_name}
          </h3>
          <p
            className="body-reg mt-1"
            style={{ color: 'var(--color-muted-fg)' }}
          >
            Desempenho dos imóveis que você indicou nos últimos 12 meses.
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <NewIndicationDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          icon={<TrendingUp size={20} />}
          label="Receita últimos 12 meses"
          value={formatBRLCompact(summary.receita_total_12m)}
          sub={`${summary.imoveis_com_receita} imóveis ativos · ${summary.imoveis_indicados} indicados`}
        />
        <MetricCard
          icon={<Wallet size={20} />}
          label="Sua comissão (2%)"
          value={formatBRL(summary.comissao_2pct)}
          sub={`${summary.meses_distintos} meses · média ${formatBRL(
            Math.round(mediaComissaoMensal)
          )}/mês`}
          accent
        />
      </div>

      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h4 style={{ color: 'var(--color-foreground)' }}>Evolução mensal</h4>
        <p
          className="detail-reg mt-1 mb-4"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          Receita gerada pelos seus imóveis, mês a mês
        </p>
        <RevenueChart data={evolucao} />
      </div>

      {/* Status de pagamento de comissoes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PaymentStatusCard
          icon={<Clock size={18} />}
          label="A receber"
          value={formatBRL(pagStats.total_a_pagar)}
          sub={
            pagStats.count_a_pagar > 0
              ? `${pagStats.count_a_pagar} mês em processamento`
              : 'sem pagamentos pendentes'
          }
          tone="coral"
        />
        <PaymentStatusCard
          icon={<Hourglass size={18} />}
          label="Em apuração"
          value={formatBRL(pagStats.total_em_apuracao)}
          sub={`mês corrente · fecha no último dia`}
          tone="muted"
        />
        <PaymentStatusCard
          icon={<CheckCircle2 size={18} />}
          label="Recebido 12m"
          value={formatBRL(pagStats.total_pago)}
          sub={`${pagStats.count_pago} ${
            pagStats.count_pago === 1 ? 'mês pago' : 'meses pagos'
          }`}
          tone="success"
        />
      </div>

      {/* Historico de pagamentos */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{
              background: 'var(--color-coral-light)',
              color: 'var(--color-coral)',
            }}
          >
            <Wallet size={18} />
          </div>
          <div>
            <h4 style={{ color: 'var(--color-foreground)' }}>
              Histórico de pagamentos
            </h4>
            <p
              className="detail-reg mt-1"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Comissão mês a mês · pagamento no dia 10 do mês seguinte ao fechamento
            </p>
          </div>
        </div>
        <PaymentsHistory meses={evolucao} />
      </div>

      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{
              background: 'var(--color-coral-light)',
              color: 'var(--color-coral)',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <h4 style={{ color: 'var(--color-foreground)' }}>
              Imóveis rendendo receita ({imoveisAtivos.length})
            </h4>
            <p
              className="detail-reg mt-1"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Ordenados por receita do período · comissão = 2% da receita de reservas
            </p>
          </div>
        </div>
        <ImoveisTable imoveis={imoveisAtivos} emptyLabel="Nenhum imóvel com receita no período." />
      </div>

      {imoveisInativos.length > 0 && (
        <details
          className="rounded-xl p-6"
          style={{
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
          }}
        >
          <summary
            className="body cursor-pointer select-none"
            style={{ color: 'var(--color-muted-fg)' }}
          >
            Imóveis sem receita nos últimos 12 meses ({imoveisInativos.length})
          </summary>
          <div className="mt-4">
            <ImoveisTable imoveis={imoveisInativos} emptyLabel="—" />
          </div>
        </details>
      )}

      {/* Assistente IA — floating button + sheet lateral */}
      <ChatPanel />
    </DashboardShell>
  )
}

/* ─────────────────────────────────────────── Sub-componentes ─ */

function DashboardShell({
  email,
  partnerName,
  children,
}: {
  email: string
  partnerName?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <header
        style={{
          background: 'var(--color-header-bg)',
          color: 'var(--color-header-fg)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{
                background: 'var(--color-coral)',
                color: 'white',
              }}
            >
              <span className="body" style={{ fontWeight: 700 }}>
                S
              </span>
            </div>
            <div>
              <p className="body" style={{ color: 'var(--color-header-fg)' }}>
                Sea Partners
              </p>
              <p
                className="detail-reg"
                style={{ color: 'var(--color-header-muted)' }}
              >
                {partnerName ?? 'Portal do parceiro'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="detail-reg hidden sm:inline"
              style={{ color: 'var(--color-header-muted)' }}
            >
              {email}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={
        accent
          ? {
              background: 'var(--color-coral)',
              color: 'white',
              boxShadow: 'var(--shadow-coral)',
            }
          : {
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
          style={{
            background: accent
              ? 'rgba(255, 255, 255, 0.2)'
              : 'var(--color-navy)',
            color: 'white',
          }}
        >
          {icon}
        </div>
        <p
          className="body"
          style={{
            color: accent ? 'rgba(255, 255, 255, 0.85)' : 'var(--color-muted-fg)',
          }}
        >
          {label}
        </p>
      </div>
      <p className="metric">{value}</p>
      <p
        className="detail-reg mt-3"
        style={{
          color: accent ? 'rgba(255, 255, 255, 0.75)' : 'var(--color-muted-fg)',
        }}
      >
        {sub}
      </p>
    </div>
  )
}

function ImoveisTable({
  imoveis,
  emptyLabel,
}: {
  imoveis: Array<{
    apto_id: string
    code: string
    prop_status: string
    receita_12m: number
    comissao_12m: number
    n_meses: number
  }>
  emptyLabel: string
}) {
  if (imoveis.length === 0) {
    return (
      <p
        className="body-reg text-center py-8"
        style={{ color: 'var(--color-muted-fg)' }}
      >
        {emptyLabel}
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
              Código
            </th>
            <th
              className="eyebrow text-left py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Status
            </th>
            <th
              className="eyebrow text-right py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Receita 12m
            </th>
            <th
              className="eyebrow text-right py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Comissão
            </th>
            <th
              className="eyebrow text-right py-3"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              Meses ativos
            </th>
          </tr>
        </thead>
        <tbody>
          {imoveis.map((i) => (
            <tr key={i.apto_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td
                className="body py-3 font-mono"
                style={{ color: 'var(--color-foreground)' }}
              >
                {i.code}
              </td>
              <td className="py-3">
                <StatusPill status={i.prop_status} />
              </td>
              <td
                className="body-reg py-3 text-right tabular-nums"
                style={{ color: 'var(--color-foreground)' }}
              >
                {i.receita_12m > 0 ? (
                  formatBRL(i.receita_12m)
                ) : (
                  <span style={{ color: 'var(--color-muted-fg)' }}>—</span>
                )}
              </td>
              <td
                className="body py-3 text-right tabular-nums"
                style={{ color: 'var(--color-coral)' }}
              >
                {i.comissao_12m > 0 ? (
                  formatBRL(i.comissao_12m)
                ) : (
                  <span style={{ color: 'var(--color-muted-fg)' }}>—</span>
                )}
              </td>
              <td
                className="body-reg py-3 text-right tabular-nums"
                style={{ color: 'var(--color-muted-fg)' }}
              >
                {i.n_meses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'Active'
  return (
    <span
      className="detail inline-block px-2.5 py-1 rounded-full"
      style={
        isActive
          ? {
              background:
                'color-mix(in oklab, var(--color-success) 18%, transparent)',
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

function PaymentStatusCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  tone: 'coral' | 'success' | 'muted'
}) {
  const toneStyles = {
    coral: {
      iconBg: 'var(--color-coral-light)',
      iconColor: 'var(--color-coral)',
      valueColor: 'var(--color-coral)',
    },
    success: {
      iconBg: 'color-mix(in oklab, var(--color-success) 15%, transparent)',
      iconColor: 'var(--color-success)',
      valueColor: 'var(--color-success)',
    },
    muted: {
      iconBg: 'var(--color-muted)',
      iconColor: 'var(--color-muted-fg)',
      valueColor: 'var(--color-foreground)',
    },
  }[tone]

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: toneStyles.iconBg, color: toneStyles.iconColor }}
        >
          {icon}
        </div>
        <p className="body" style={{ color: 'var(--color-muted-fg)' }}>
          {label}
        </p>
      </div>
      <p
        style={{
          color: toneStyles.valueColor,
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      <p
        className="detail-reg mt-2"
        style={{ color: 'var(--color-muted-fg)' }}
      >
        {sub}
      </p>
    </div>
  )
}
