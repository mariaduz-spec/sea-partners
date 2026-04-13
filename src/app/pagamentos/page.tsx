import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardEvolucaoMensal,
  aggregatePaymentStats,
  formatBRL,
} from '@/lib/queries'
import ChatPanel from '@/app/dashboard/chat-panel'
import PaymentsHistory from '@/app/dashboard/payments-history'
import DashboardShell from '@/components/dashboard-shell'
import { Wallet, Clock, CheckCircle2, Hourglass, MailQuestion } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PagamentosPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const partner = await getPartnerForCurrentUser()

  if (!partner) {
    return (
      <DashboardShell email={user.email ?? ''} active="pagamentos">
        <EmptyPartner email={user.email ?? ''} />
        <ChatPanel />
      </DashboardShell>
    )
  }

  const evolucao = await getDashboardEvolucaoMensal(partner.parceiro_id)
  const pagStats = aggregatePaymentStats(evolucao)

  return (
    <DashboardShell
      email={user.email ?? ''}
      partnerName={partner.display_name}
      active="pagamentos"
    >
      <div className="mb-6">
        <span className="eyebrow" style={{ color: 'var(--color-coral)' }}>
          Pagamentos
        </span>
        <h3 className="mt-1" style={{ color: 'var(--color-foreground)' }}>
          Sua comissão mês a mês
        </h3>
        <p
          className="body-reg mt-1"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          Pagamento feito no dia 10 do mês seguinte ao fechamento da comissão.
        </p>
      </div>

      {/* 3 status cards */}
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

      {/* Historico detalhado */}
      <div
        className="rounded-xl p-6"
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
              Todos os meses dos últimos 12 com valor e status
            </p>
          </div>
        </div>
        <PaymentsHistory meses={evolucao} />
      </div>

      <ChatPanel />
    </DashboardShell>
  )
}

/* ─────────────────────────────────────────── Sub-componentes ─ */

function EmptyPartner({ email }: { email: string }) {
  return (
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
      <p className="body-reg mt-2" style={{ color: 'var(--color-muted-fg)' }}>
        Entre em contato com o time comercial da Seazone para liberar seu acesso como parceiro.
      </p>
      <p
        className="detail-reg mt-6 font-mono"
        style={{ color: 'var(--color-muted-fg)' }}
      >
        {email}
      </p>
    </div>
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
