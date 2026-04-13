export default function PagamentosLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <header style={{ background: 'var(--color-header-bg)', color: 'var(--color-header-fg)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: 'var(--color-coral)', color: 'white' }}
            >
              <span className="body" style={{ fontWeight: 700 }}>S</span>
            </div>
            <div>
              <p className="body">Sea Partners</p>
              <p
                className="detail-reg"
                style={{ color: 'var(--color-header-muted)' }}
              >
                Carregando pagamentos...
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div
            className="h-6 w-48 rounded-lg animate-pulse"
            style={{ background: 'var(--color-border-strong)' }}
          />
          <div
            className="h-4 w-64 rounded animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="rounded-xl h-32 animate-pulse"
            style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}
          />
          <div
            className="rounded-xl h-32 animate-pulse"
            style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}
          />
          <div
            className="rounded-xl h-32 animate-pulse"
            style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}
          />
        </div>
        <div
          className="rounded-xl h-96 animate-pulse"
          style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}
        />
      </main>
    </div>
  )
}
