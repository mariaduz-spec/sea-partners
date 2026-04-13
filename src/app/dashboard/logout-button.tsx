'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
    >
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  )
}
