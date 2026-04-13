export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sea Partners</h1>
            <p className="text-xs text-slate-500">Carregando...</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-6 h-32 animate-pulse" />
          <div className="rounded-xl bg-slate-900/80 p-6 h-32 animate-pulse" />
        </div>
        <div className="rounded-xl border bg-white p-6 h-80 animate-pulse" />
        <div className="rounded-xl border bg-white p-6 h-96 animate-pulse" />
      </main>
    </div>
  )
}
