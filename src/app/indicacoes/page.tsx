import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getPartnerForCurrentUser } from '@/lib/partner'
import { getIndicacoesPendentes } from '@/lib/queries'
import ChatPanel from '@/app/dashboard/chat-panel'
import NewIndicationDialog from '@/app/dashboard/new-indication-dialog'
import DashboardShell from '@/components/dashboard-shell'
import { UserPlus, Clock, CheckCircle, XCircle, MailQuestion } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function IndicacoesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const partner = await getPartnerForCurrentUser()
  if (!partner) {
    return (
      <DashboardShell email={user.email ?? ''} active="indicacoes">
        <EmptyPartner email={user.email ?? ''} />
        <ChatPanel />
      </DashboardShell>
    )
  }

  const indicacoes = await getIndicacoesPendentes(user.email ?? '')

  return (
    <DashboardShell email={user.email ?? ''} partnerName={partner.display_name} active="indicacoes">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow" style={{ color: 'var(--color-coral)' }}>Indicações</span>
          <h3 className="mt-1" style={{ color: 'var(--color-foreground)' }}>Clientesindicados</h3>
          <p className="body-reg mt-1" style={{ color: 'var(--color-muted-fg)' }}>
            Acompanhe suas indicações e o status de cada lead.
          </p>
        </div>
        <div className="shrink-0 mt-1"><NewIndicationDialog /></div>
      </div>

      {indicacoes.length === 0 ? (
        <EmptyIndicacoes />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="eyebrow text-left px-5 py-3" style={{ color: 'var(--color-muted-fg)' }}>Cliente</th>
                <th className="eyebrow text-left px-5 py-3" style={{ color: 'var(--color-muted-fg)' }}>Contato</th>
                <th className="eyebrow text-left px-5 py-3" style={{ color: 'var(--color-muted-fg)' }}>Imóvel</th>
                <th className="eyebrow text-left px-5 py-3" style={{ color: 'var(--color-muted-fg)' }}>Status</th>
                <th className="eyebrow text-right px-5 py-3" style={{ color: 'var(--color-muted-fg)' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {indicacoes.map((i) => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="body px-5 py-4" style={{ color: 'var(--color-foreground)' }}>
                    {i.nome_indicado}
                  </td>
                  <td className="body px-5 py-4" style={{ color: 'var(--color-muted-fg)' }}>
                    <div>{i.telefone}</div>
                    {i.email_indicado && <div className="detail-reg">{i.email_indicado}</div>}
                  </td>
                  <td className="body px-5 py-4" style={{ color: 'var(--color-muted-fg)' }}>
                    {i.endereco_imovel || '—'}
                  </td>
                  <td className="px-5 py-4"><IndicacaoStatusPill status={i.status} /></td>
                  <td className="body-reg px-5 py-4 text-right" style={{ color: 'var(--color-muted-fg)' }}>
                    {new Date(i.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function EmptyIndicacoes() {
  return (
    <div className="rounded-xl p-12 text-center" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}><UserPlus size={24} /></div>
      <p className="p-ui" style={{ color: 'var(--color-foreground)' }}>Nenhuma indicação ainda</p>
      <p className="body-reg mt-2" style={{ color: 'var(--color-muted-fg)' }}>
        Clique em &quot;Nova indicação&quot; para cadastrar seu primeiro lead.
      </p>
    </div>
  )
}

function IndicacaoStatusPill({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    aguardando_sync: { bg: 'color-mix(in oklab, #f59e0b 15%, transparent)', color: '#f59e0b', icon: <Clock size={12} />, label: 'Aguardando' },
    sincronizado: { bg: 'color-mix(in oklab, var(--color-navy) 15%, transparent)', color: 'var(--color-navy)', icon: <CheckCircle size={12} />, label: 'Sincronizado' },
    convertido: { bg: 'color-mix(in oklab, var(--color-success) 18%, transparent)', color: 'var(--color-success)', icon: <CheckCircle size={12} />, label: 'Convertido' },
    perdido: { bg: 'var(--color-muted)', color: 'var(--color-muted-fg)', icon: <XCircle size={12} />, label: 'Perdido' },
  }
  const cfg = configs[status] || configs.aguardando_sync
  return (
    <span className="detail inline-flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}