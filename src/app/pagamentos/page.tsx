import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getDashboardEvolucaoMensal,
  getExtratoMensalPorImovel,
  getWithdrawals,
  aggregatePaymentStats,
  groupExtratoByMes,
  formatBRL,
  formatBRLCompact,
} from '@/lib/queries'
import ChatPanel from '@/app/dashboard/chat-panel'
import PaymentsHistory from '@/app/dashboard/payments-history'
import DashboardShell from '@/components/dashboard-shell'
import { Wallet, MailQuestion, Coins, Receipt, Banknote, ArrowDownCircle, CheckCircle, XCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

// DEV MODE - Remove in production
const DEV_PARTNER_ID = parseInt(process.env.DEV_PARTNER_ID ?? '0')
const USE_DEV = process.env.NODE_ENV === 'development' && DEV_PARTNER_ID > 0

export default async function PagamentosPage() {
  let partnerId = 0
  let userEmail = ''
  let displayName = ''

  if (USE_DEV) {
    partnerId = DEV_PARTNER_ID
    userEmail = 'dev@seazone.com.br'
    displayName = 'Dev (Katia Emmel)'
  } else {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userEmail = user.email ?? ''
    const partner = await getPartnerForCurrentUser()
    if (!partner) {
      return (
        <DashboardShell email={userEmail} active="pagamentos">
          <EmptyPartner email={userEmail} />
          <ChatPanel />
        </DashboardShell>
      )
    }
    partnerId = partner.parceiro_id
    displayName = partner.display_name
  }

  const [summary, evolucao, extrato, { withdrawals, stats: withdrawStats }] = await Promise.all([
    getDashboardSummary(partnerId),
    getDashboardEvolucaoMensal(partnerId),
    getExtratoMensalPorImovel(partnerId),
    getWithdrawals(partnerId),
  ])

  const stats = aggregatePaymentStats(evolucao)
  const extratoGrouped = groupExtratoByMes(extrato)

  const imoveisPorComissao = extrato
    .filter((e) => e.comissao > 0)
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 6)

  return (
    <DashboardShell email={userEmail} partnerName={displayName} active="pagamentos">
      <div className="mb-6">
        <span className="eyebrow" style={{ color: 'var(--color-coral)' }}>Pagamentos</span>
        <h3 className="mt-1" style={{ color: 'var(--color-foreground)' }}>Receita por imóvel</h3>
        <p className="body-reg mt-1" style={{ color: 'var(--color-muted-fg)' }}>
          Receita mensal gerada por cada imóvel que você indicou.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={<Coins size={18} />} label="Total pago" value={formatBRLCompact(stats.total_pago)} sub={`${stats.count_pago} mês(es) pago(s)`} tone="coral" />
        <MetricCard icon={<Receipt size={18} />} label="A pagar" value={formatBRLCompact(stats.total_a_pagar)} sub={`${stats.count_a_pagar} mês(es) pendente(s)`} tone="muted" />
        <MetricCard icon={<Wallet size={18} />} label="Em apuração" value={formatBRLCompact(stats.total_em_apuracao)} sub={`${stats.count_em_apuracao} mês(es)`} tone="success" />
      </div>

      <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}>
            <Wallet size={18} />
          </div>
          <div>
            <h4>Receita por mês</h4>
            <p className="detail-reg mt-1">{evolucao.filter((m) => m.comissao_mes > 0).length} meses com receita</p>
          </div>
        </div>
        <PaymentsHistory meses={evolucao} extratoPorMes={extratoGrouped} />
      </div>

      {withdrawals.length > 0 && (
        <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: 'var(--color-navy)', color: 'white' }}>
              <Banknote size={18} />
            </div>
            <div>
              <h4>Saques</h4>
              <p className="detail-reg mt-1">Histórico de retiradas realizadas e pendentes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg p-4 text-center" style={{ background: 'color-mix(in oklab, var(--color-success) 10%, transparent)' }}>
              <p className="body" style={{ color: 'var(--color-muted-fg)' }}>Total sacado</p>
              <p className="metric" style={{ color: 'var(--color-success)', fontSize: 22 }}>{formatBRLCompact(withdrawStats.total_withdrawn)}</p>
              <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>{withdrawStats.count_withdrawn} saque(s)</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ background: 'color-mix(in oklab, var(--color-warning, #f59e0b) 10%, transparent)' }}>
              <p className="body" style={{ color: 'var(--color-muted-fg)' }}>Pendente</p>
              <p className="metric" style={{ color: 'var(--color-warning, #f59e0b)', fontSize: 22 }}>{formatBRLCompact(withdrawStats.total_pending)}</p>
              <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>{withdrawStats.count_pending} pendente(s)</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ background: 'var(--color-surface)' }}>
              <p className="body" style={{ color: 'var(--color-muted-fg)' }}>Solicitações</p>
              <p className="metric" style={{ fontSize: 22 }}>{withdrawals.length}</p>
              <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>total de pedidos</p>
            </div>
          </div>

          <div className="space-y-2">
            {withdrawals.slice(0, 10).map((w) => {
              const isPaid = w.status === 'Paid'
              const isCanceled = w.status === 'Canceled'
              const statusIcon = isPaid ? <CheckCircle size={14} /> : isCanceled ? <XCircle size={14} /> : <Clock size={14} />
              const statusColor = isPaid ? 'var(--color-success)' : isCanceled ? 'var(--color-error)' : '#f59e0b'
              const dateStr = w.date_paid || w.date_requested
              return (
                <div key={w.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ color: statusColor }}>{statusIcon}</div>
                    <div>
                      <p className="body" style={{ color: 'var(--color-foreground)' }}>{dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</p>
                      <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>{w.payment_method || 'Pix'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="body" style={{ color: isCanceled ? 'var(--color-muted-fg)' : 'var(--color-foreground)' }}>
                      {isCanceled ? `— ${formatBRL(w.value)}` : formatBRL(w.value)}
                    </p>
                    <p className="detail-reg" style={{ color: statusColor }}>{w.status === 'Paid' ? 'Pago' : w.status === 'Canceled' ? 'Cancelado' : 'Pendente'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {imoveisPorComissao.length > 0 && (
        <div className="rounded-xl p-6" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}>
              <Coins size={18} />
            </div>
            <div>
              <h4>Top imóveis (receita 12m)</h4>
              <p className="detail-reg mt-1">Os {imoveisPorComissao.length} imóveis que mais geraram receita</p>
            </div>
          </div>
          <div className="space-y-3">
            {imoveisPorComissao.map((imovel) => (
              <div key={imovel.code} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <p className="body font-mono" style={{ color: 'var(--color-foreground)' }}>{imovel.code}</p>
                  <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>{imovel.commission_type}</p>
                </div>
                <p className="body" style={{ color: 'var(--color-coral)' }}>{formatBRL(imovel.comissao)}</p>
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
    <div className="rounded-xl p-12 text-center max-w-lg mx-auto" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}><MailQuestion size={24} /></div>
      <p className="p-ui" style={{ color: 'var(--color-foreground)' }}>Conta ainda não vinculada</p>
      <p className="body-reg mt-2" style={{ color: 'var(--color-muted-fg)' }}>Entre em contato com o time comercial da Seazone.</p>
      <p className="detail-reg mt-6 font-mono" style={{ color: 'var(--color-muted-fg)' }}>{email}</p>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: 'coral' | 'success' | 'muted' }) {
  const toneStyles = {
    coral: { iconBg: 'var(--color-coral-light)', iconColor: 'var(--color-coral)', valueColor: 'var(--color-coral)' },
    success: { iconBg: 'color-mix(in oklab, var(--color-success) 15%, transparent)', iconColor: 'var(--color-success)', valueColor: 'var(--color-foreground)' },
    muted: { iconBg: 'var(--color-muted)', iconColor: 'var(--color-muted-fg)', valueColor: 'var(--color-foreground)' },
  }[tone]

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: toneStyles.iconBg, color: toneStyles.iconColor }}>{icon}</div>
        <p className="body" style={{ color: 'var(--color-muted-fg)' }}>{label}</p>
      </div>
      <p style={{ color: toneStyles.valueColor, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</p>
      <p className="detail-reg mt-2" style={{ color: 'var(--color-muted-fg)' }}>{sub}</p>
    </div>
  )
}