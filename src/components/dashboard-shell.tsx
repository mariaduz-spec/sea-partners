import Link from 'next/link'
import LogoutButton from '@/app/dashboard/logout-button'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Shell compartilhado entre /dashboard e /pagamentos.
 * Header navy + nav com links ativos destacados em coral.
 *
 * Server component puro — fica leve; o nav ativo eh determinado
 * pela prop `active` passada pela page.tsx.
 */
export default function DashboardShell({
  email,
  partnerName,
  active,
  children,
}: {
  email: string
  partnerName?: string
  active: 'visao-geral' | 'pagamentos'
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
              className="detail-reg hidden md:inline"
              style={{ color: 'var(--color-header-muted)' }}
            >
              {email}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        {/* Nav */}
        <nav
          className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1"
          aria-label="Navegação principal"
        >
          <NavLink href="/dashboard" active={active === 'visao-geral'}>
            Visão geral
          </NavLink>
          <NavLink href="/pagamentos" active={active === 'pagamentos'}>
            Pagamentos
          </NavLink>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="body inline-flex items-center px-4 pb-3 pt-2 transition relative"
      style={{
        color: active
          ? 'var(--color-header-fg)'
          : 'var(--color-header-muted)',
        borderBottom: active
          ? '2px solid var(--color-coral)'
          : '2px solid transparent',
      }}
    >
      {children}
    </Link>
  )
}
