import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getDashboardEvolucaoMensal,
  getExtratoMensalPorImovel,
  aggregatePaymentStats,
  groupExtratoByMes,
  formatBRL,
  formatBRLCompact,
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

  const [summary, evolucao, extrato] = await Promise.all([
    getDashboardSummary(partner.parceiro_id),
    getDashboardEvolucaoMensal(partner.parceiro_id),
    getExtratoMensalPorImovel(partner.parceiro_id),
  ])

  const stats = aggregatePaymentStats(evolucao)
  const extratoGrouped = groupExtratoByMes(extrato)

  // Top 6 imóvel que mais gerou佣金
  const imoveisPorComissao = extrato
    .filter((e) => e.comissao > 0)
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 6)

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
          Receita por imóvel
        </h3>
        <p
          className="body-reg mt-1"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          Receita mensal gerada por cada imóvel que você indicou.
        </p>
      </div>

      {/* 3 metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          icon={<Coins size={18} />}
          label="Total recebido"
          value={formatBRLCompact(stats.total_pago)}
          sub={`${stats.count_pago} mês{stats.count_pago === 1 ? '' : 'es'} pago${stats.count_pago === 1 ? '' : 's'}`}
          tone="coral"
        />
        <MetricCard
          icon={<Receipt size={18} />}
          label="A pagar"
          value={formatBRLCompact(stats.total_a_pagar)}
          sub={`${stats.count_a_pagar} mês${stats.count_a_pagar === 1 ? '' : 'es'} pendente${stats.count_a_pagar === 1 ? '' : 's'}`}
          tone="muted"
        />
        <MetricCard
          icon={<Wallet size={18} />}
          label="Em apuração"
          value={formatBRLCompact(stats.total_em_apuracao)}
          sub={`${stats.count_em_apuracao} mês${stats.count_em_apuracao === 1 ? '' : 'es'} em processamento`}
          tone="success"
        />
      </div>

      {/* Histórico consolidado */}
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
              Receita por mês
            </h4>
            <p
              className="detail-reg mt-1"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              {evolucao.filter((m) => m.comissao_mes > 0).length} meses com receita
            </p>
          </div>
        </div>
        <PaymentsHistory
          meses={evolucao}
          extratoPorMes={extratoGrouped}
        />
      </div>

      {/* Top imóveis por comissão */}
      {imoveisPorComissao.length > 0 && (
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
              <Coins size={18} />
            </div>
            <div>
              <h4 style={{ color: 'var(--color-foreground)' }}>
                Top imóveis (receita 12m)
              </h4>
              <p
                className="detail-reg mt-1"
                style={{ color: 'var(--color-muted-fg)' }}
              >
                Os {imoveisPorComissao.length} imóveis que mais geraram receita
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {imoveisPorComissao.map((imovel) => (
              <div
                key={imovel.code}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div>
                  <p
                    className="body font-mono"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {imovel.code}
                  </p>
                  <p
                    className="detail-reg"
                    style={{ color: 'var(--color-muted-fg)' }}
                  >
                    {imovel.commission_type}
                  </p>
                </div>
                <p
                  className="body"
                  style={{ color: 'var(--color-coral)' }}
                >
                  {formatBRL(imovel.comissao)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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