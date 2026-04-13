import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware ja redireciona pra /login, mas guard extra nao machuca.
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sea Partners</h1>
            <p className="text-xs text-slate-500">Portal do parceiro</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-slate-700 text-lg font-medium">Bem-vinda, {user.email?.split('@')[0]}</p>
          <p className="text-slate-500 text-sm mt-3">
            Em breve: suas indicações, receita mensal dos imóveis e comissão acumulada.
          </p>
        </div>
      </main>
    </div>
  )
}
