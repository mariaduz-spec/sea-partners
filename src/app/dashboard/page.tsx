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
import LogoutButton from './logout-button'
import RevenueChart from './revenue-chart'

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
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-slate-700 text-lg font-medium">
            Sua conta ainda não está vinculada a um parceiro
          </p>
          <p className="text-slate-500 text-sm mt-3">
            Entre em contato com o time comercial da Seazone pra liberar o acesso.
          </p>
          <p className="text-xs text-slate-400 mt-6 font-mono">{user.email}</p>
        </div>
      </DashboardShell>
    )
  }

  const [summary, imoveis, evolucao] = await Promise.all([
    getDashboardSummary(partner.parceiro_id),
    getDashboardImoveis(partner.parceiro_id),
    getDashboardEvolucaoMensal(partner.parceiro_id),
  ])

  return (
    <DashboardShell email={user.email ?? ''} partnerName={partner.display_name}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          label="Receita últimos 12 meses"
          value={formatBRLCompact(summary.receita_total_12m)}
          sub={`${summary.imoveis_com_receita} imóveis ativos de ${summary.imoveis_indicados} indicados`}
        />
        <MetricCard
          label="Sua comissão (2%)"
          value={formatBRL(summary.comissao_2pct)}
          sub={`${summary.meses_distintos} meses com receita registrada`}
          accent
        />
      </div>

      <div className="rounded-xl border bg-white p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-1">Receita mensal</h2>
        <p className="text-xs text-slate-500 mb-4">Últimos 12 meses · em R$</p>
        <RevenueChart data={evolucao} />
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Seus imóveis indicados</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Top {imoveis.length} por receita · comissão 2% sobre receita reservas
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 font-medium">Código</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Receita 12m</th>
                <th className="py-2 font-medium text-right">Comissão</th>
                <th className="py-2 font-medium text-right">Meses ativos</th>
              </tr>
            </thead>
            <tbody>
              {imoveis.map((i) => (
                <tr key={i.apto_id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 font-mono text-xs">{i.code}</td>
                  <td className="py-2.5">
                    <StatusPill status={i.prop_status} />
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {i.receita_12m > 0 ? (
                      formatBRL(i.receita_12m)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium">
                    {i.comissao_12m > 0 ? (
                      formatBRL(i.comissao_12m)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">{i.n_meses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  )
}

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sea Partners</h1>
            <p className="text-xs text-slate-500">{partnerName ?? 'Portal do parceiro'}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:inline">{email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-6 ${
        accent ? 'bg-slate-900 text-white' : 'bg-white border'
      }`}
    >
      <p className={`text-sm ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <p className="text-3xl font-semibold mt-2 tabular-nums">{value}</p>
      <p className={`text-xs mt-2 ${accent ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'Active'
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {status || '—'}
    </span>
  )
}
