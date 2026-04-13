import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getPagamentosParceiro,
  formatBRL,
} from '@/lib/queries'
import ChatPanel from '@/app/dashboard/chat-panel'
import PaymentsHistory from '@/app/dashboard/payments-history'
import DashboardShell from '@/components/dashboard-shell'
import { Wallet, MailQuestion, Coins, Receipt } from 'lucide-react'

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

  const [summary, pagamentos] = await Promise.all([
    getDashboardSummary(partner.parceiro_id),
    getPagamentosParceiro(partner.parceiro_id),
  ])

  const pagamentosComTaxa = pagamentos.filter((p) => p.taxa_de_adesao > 0)

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
          Histórico de indicações pagas
        </h3>
        <p
          className="body-reg mt-1"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          Valor recebido por cada indicação que você fez e virou contrato com a Seazone.
        </p>
      </div>

      {/* 3 metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          icon={<Coins size={18} />}
          label="Total recebido"
          value={formatBRL(summary.total_recebido)}
          sub={`${summary.total_com_pagamento} pagamento${summary.total_com_pagamento === 1 ? '' : 's'}`}
          tone="coral"
        />
        <MetricCard
          icon={<Receipt size={18} />}
          label="Ticket médio"
          value={summary.ticket_medio > 0 ? formatBRL(summary.ticket_medio) : '—'}
          sub={`por indicação paga`}
          tone="muted"
        />
        <MetricCard
          icon={<Wallet size={18} />}
          label="Indicações totais"
          value={String(summary.total_indicacoes)}
          sub={`${summary.total_com_pagamento} com taxa · ${summary.total_indicacoes - summary.total_com_pagamento} sem taxa`}
          tone="success"
        />
      </div>

      {/* Historico */}
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
              Todas as indicações pagas
            </h4>
            <p
              className="detail-reg mt-1"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              {pagamentosComTaxa.length} de {pagamentos.length} indicações geraram pagamento · click pra ver detalhes do deal
            </p>
          </div>
        </div>
        <PaymentsHistory pagamentos={pagamentos} />
      </div>

      <ChatPanel />
    </DashboardShell>
  )
}

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

function MetricCard({
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
      valueColor: 'var(--color-foreground)',
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
