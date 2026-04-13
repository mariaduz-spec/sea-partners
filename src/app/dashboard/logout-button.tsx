'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { LogOut } from 'lucide-react'

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
      className="body inline-flex items-center gap-1.5 px-3 rounded-full transition disabled:opacity-50"
      style={{
        background: 'transparent',
        color: 'var(--color-muted-fg)',
        height: '36px',
      }}
      onMouseEnter={(e) =>
        !e.currentTarget.disabled &&
        (e.currentTarget.style.background = 'var(--color-muted)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <LogOut size={14} />
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  )
}
