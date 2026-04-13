export default function DashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-muted)' }}>
      <header
        style={{
          background: 'var(--color-background)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div
            className="inline-flex items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            <span className="body" style={{ fontWeight: 700 }}>S</span>
          </div>
          <div>
            <p className="body" style={{ color: 'var(--color-foreground)' }}>
              Sea Partners
            </p>
            <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>
              Carregando dados...
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
          <div className="h-4 w-64 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl h-32 animate-pulse" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }} />
          <div className="rounded-xl h-32 animate-pulse" style={{ background: 'var(--color-primary)', opacity: 0.7 }} />
        </div>
        <div className="rounded-xl h-80 animate-pulse" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }} />
        <div className="rounded-xl h-96 animate-pulse" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }} />
      </main>
    </div>
  )
}
