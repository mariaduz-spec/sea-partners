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
import { TrendingUp, Wallet, Building2, MailQuestion } from 'lucide-react'

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
          }}
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
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

  return (
    <DashboardShell email={user.email ?? ''} partnerName={partner.display_name}>
      {/* Saudacao */}
      <div className="mb-6">
        <h3 style={{ color: 'var(--color-foreground)' }}>
          Olá, {partner.display_name}
        </h3>
        <p
          className="body-reg mt-1"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          Aqui está o desempenho dos imóveis que você indicou nos últimos 12 meses.
        </p>
      </div>

      {/* Metric cards */}
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
          sub={`${summary.meses_distintos} meses com receita · média R$ ${
            summary.meses_distintos > 0
              ? Math.round(
                  summary.comissao_2pct / summary.meses_distintos
                ).toLocaleString('pt-BR')
              : 0
          }/mês`}
          accent
        />
      </div>

      {/* Grafico */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
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

      {/* Tabela imoveis ativos */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0"
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
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
                Ordenados por receita do período. Comissão = 2% da receita de reservas.
              </p>
            </div>
          </div>
        </div>
        <ImoveisTable imoveis={imoveisAtivos} emptyLabel="Nenhum imóvel com receita no período." />
      </div>

      {/* Imoveis sem receita — opcional */}
      {imoveisInativos.length > 0 && (
        <details
          className="rounded-xl p-6"
          style={{
            background: 'var(--color-muted)',
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
    <div className="min-h-screen" style={{ background: 'var(--color-muted)' }}>
      <header
        style={{
          background: 'var(--color-background)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
              style={{
                background: 'var(--color-primary)',
                color: 'white',
              }}
            >
              <span className="body" style={{ fontWeight: 700 }}>
                S
              </span>
            </div>
            <div>
              <p className="body" style={{ color: 'var(--color-foreground)' }}>
                Sea Partners
              </p>
              <p
                className="detail-reg"
                style={{ color: 'var(--color-muted-fg)' }}
              >
                {partnerName ?? 'Portal do parceiro'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="detail-reg hidden sm:inline"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              {email}
            </span>
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
              background: 'var(--color-primary)',
              color: 'white',
            }
          : {
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
            }
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="inline-flex items-center justify-center w-8 h-8 rounded-full"
          style={{
            background: accent
              ? 'rgba(255, 255, 255, 0.15)'
              : 'var(--color-primary-light)',
            color: accent ? 'white' : 'var(--color-primary)',
          }}
        >
          {icon}
        </div>
        <p
          className="body"
          style={{
            color: accent ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-muted-fg)',
          }}
        >
          {label}
        </p>
      </div>
      <p className="metric">{value}</p>
      <p
        className="detail-reg mt-2"
        style={{
          color: accent ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-muted-fg)',
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
          <tr
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <th
              className="detail text-left py-2"
              style={{ color: 'var(--color-muted-fg)', fontWeight: 500 }}
            >
              Código
            </th>
            <th
              className="detail text-left py-2"
              style={{ color: 'var(--color-muted-fg)', fontWeight: 500 }}
            >
              Status
            </th>
            <th
              className="detail text-right py-2"
              style={{ color: 'var(--color-muted-fg)', fontWeight: 500 }}
            >
              Receita 12m
            </th>
            <th
              className="detail text-right py-2"
              style={{ color: 'var(--color-muted-fg)', fontWeight: 500 }}
            >
              Comissão
            </th>
            <th
              className="detail text-right py-2"
              style={{ color: 'var(--color-muted-fg)', fontWeight: 500 }}
            >
              Meses ativos
            </th>
          </tr>
        </thead>
        <tbody>
          {imoveis.map((i) => (
            <tr
              key={i.apto_id}
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
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
                style={{ color: 'var(--color-foreground)' }}
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
      className="detail inline-block px-2 py-0.5 rounded-full"
      style={
        isActive
          ? {
              background:
                'color-mix(in oklab, var(--color-success) 15%, transparent)',
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
