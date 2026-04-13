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

// DEV MODE - Remove in production
const DEV_PARTNER_ID = parseInt(process.env.DEV_PARTNER_ID ?? '0')
const USE_DEV = process.env.NODE_ENV === 'development' && DEV_PARTNER_ID > 0

export default async function PagamentosPage() {
  let partner = null
  let userEmail = ''

  if (USE_DEV) {
    partner = {
      email: 'dev@seazone.com.br',
      partenaire_id: 0,
      display_name: 'Dev (Katia Emmel)',
    }
    userEmail = USE_DEV ? 'dev@seazone.com.br' : (user?.email ?? '')
  } else {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userEmail = user.email ?? ''
    partner = await getPartnerForCurrentUser()
  }

  if (!partner) {
    return (
      <DashboardShell email={userEmail} active="pagamentos">
        <EmptyPartner email={userEmail} />
        <ChatPanel />
      </DashboardShell>
    )
  }

  const partnerId = USE_DEV ? DEV_PARTNER_ID : partner.parceiro_id

  const [summary, evolucao, extrato] = await Promise.all([
    getDashboardSummary(partnerId),
    getDashboardEvolucaoMensal(partnerId),
    getExtratoMensalPorImovel(partnerId),
  ])

  const stats = aggregatePaymentStats(evolucao)
  const extratoGrouped = groupExtratoByMes(extrato)

  const imoveisPorComissao = extrato
    .filter((e) => e.comissao > 0)
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 6)

  return (
    <DashboardShell email={userEmail} partnerName={partner.display_name} active="pagamentos">
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