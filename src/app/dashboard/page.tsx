import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import {
  getDashboardSummary,
  getDashboardImoveis,
  getDashboardEvolucaoMensal,
  formatBRL,
  formatBRLCompact,
} from '@/lib/queries'
import CommissionChart from './commission-chart'
import ImovelSelector from './imovel-selector'
import ChatPanel from './chat-panel'
import NewIndicationDialog from './new-indication-dialog'
import DashboardShell from '@/components/dashboard-shell'
import {
  Wallet,
  Building2,
  MailQuestion,
  BadgeDollarSign,
  TrendingUp,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const partner = await getPartnerForCurrentUser()

  if (!partner) {
    return (
      <DashboardShell email={user.email ?? ''} active="visao geral">
        <EmptyPartner email={user.email ?? ''} />
        <ChatPanel />
      </DashboardShell>
    )
  }

  const [summary, imoveis, evolucao] = await Promise.all([
    getDashboardSummary(partner.parceiro_id),
    getDashboardImoveis(partner.parceiro_id),
    getDashboardEvolucaoMensal(partner.parceiro_id),
  ])

  const imoveisAtivos = imoveis.filter((i) => i.prop_status === 'Active')
  const imoveisInativos = imoveis.filter((i) => i.prop_status !== 'Active')

  return (
    <DashboardShell
      email={user.email ?? ''}
      partnerName={partner.display_name}
      active="visao geral"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow" style={{ color: 'var(--color-coral)' }}>Olá 👋</span>
          <h3 className="mt-1" style={{ color: 'var(--color-foreground)' }}>{partner.display_name}</h3>
          <p className="body-reg mt-1" style={{ color: 'var(--color-muted-fg)' }}>Suas indicações e a receita que você gera.</p>
        </div>
        <div className="shrink-0 mt-1"><NewIndicationDialog /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={<BadgeDollarSign size={20} />} label="Comissão Total" value={formatBRLCompact(summary.comissao_12m_estimada)} sub={`${summary.meses_com_receita} meses com receita`} accent />
        <MetricCard icon={<TrendingUp size={20} />} label="Média mensal" value={formatBRLCompact(summary.media_comissao_mensal)} sub="média por mês ativo" />
        <MetricCard icon={<Wallet size={20} />} label="Indicações" value={String(summary.total_indicacoes)} sub={`${summary.indicacoes_won} ganha${summary.indicacoes_won === 1 ? '' : 's'} · ${summary.indicacoes_in_progress} em curso`} />
      </div>

      <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
        <h4>Evolução mensal</h4>
        <p className="detail-reg mt-1 mb-4">Receita acumulada por mês</p>
        <CommissionChart data={evolucao} />
      </div>

      <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}><Building2 size={18} /></div>
          <div><h4>Seus imóveis ({imoveis.length})</h4><p className="detail-reg mt-1">Selecione um imóvel para ver os detalhes</p></div>
        </div>
        <ImovelSelector imoveisAtivos={imoveisAtivos} imoveisInativos={imoveisInativos} />
      </div>

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

function MetricCard({ icon, label, value, sub, accent = false }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-6" style={accent ? { background: 'var(--color-coral)', color: 'white', boxShadow: 'var(--shadow-coral)' } : { background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: accent ? 'rgba(255,255,255,0.2)' : 'var(--color-navy)', color: 'white' }}>{icon}</div>
        <p className="body" style={{ color: accent ? 'rgba(255,255,255,0.85)' : 'var(--color-muted-fg)' }}>{label}</p>
      </div>
      <p className="metric">{value}</p>
      <p className="detail-reg mt-3" style={{ color: accent ? 'rgba(255,255,255,0.75)' : 'var(--color-muted-fg)' }}>{sub}</p>
    </div>
  )
}

function ImoveisTable({ imoveis, emptyLabel }: { imoveis: Array<{ indication_id: number; property_id: number; code: string; prop_status: string; commission_payment_type: string; commission_display: string; comissao_12m: number; n_meses_ativos: number }>; emptyLabel: string }) {
  if (imoveis.length === 0) return <p className="body-reg text-center py-8" style={{ color: 'var(--color-muted-fg)' }}>{emptyLabel}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          <th className="eyebrow text-left py-3" style={{ color: 'var(--color-muted-fg)' }}>Código</th>
          <th className="eyebrow text-left py-3" style={{ color: 'var(--color-muted-fg)' }}>Status</th>
          <th className="eyebrow text-left py-3" style={{ color: 'var(--color-muted-fg)' }}>Comissão</th>
          <th className="eyebrow text-right py-3" style={{ color: 'var(--color-muted-fg)' }}>Total</th>
          <th className="eyebrow text-right py-3" style={{ color: 'var(--color-muted-fg)' }}>Meses</th>
        </tr></thead>
        <tbody>
          {imoveis.map((i) => (
            <tr key={i.indication_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td className="body py-3 font-mono" style={{ color: 'var(--color-foreground)' }}>{i.code}</td>
              <td className="py-3"><StatusPill status={i.prop_status} /></td>
              <td className="body py-3" style={{ color: 'var(--color-muted-fg)' }}>{i.commission_display}</td>
              <td className="body py-3 text-right tabular-nums" style={{ color: i.comissao_12m > 0 ? 'var(--color-coral)' : 'var(--color-muted-fg)' }}>{i.comissao_12m > 0 ? formatBRL(i.comissao_12m) : '—'}</td>
              <td className="body-reg py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-fg)' }}>{i.n_meses_ativos}</td>
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
    <span className="detail inline-block px-2.5 py-1 rounded-full" style={isActive ? { background: 'color-mix(in oklab, var(--color-success) 18%, transparent)', color: 'var(--color-success)' } : { background: 'var(--color-muted)', color: 'var(--color-muted-fg)' }}>
      {status || '—'}
    </span>
  )
}