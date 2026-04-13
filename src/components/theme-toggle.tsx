'use client'

import { useTheme } from '@/lib/theme-provider'
import { Sun, Moon } from 'lucide-react'

/**
 * Toggle light/dark. Posicionado em header navy em ambos os modos,
 * entao estiliza sempre com branco-translucido.
 */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme()
  const isDark = resolved === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="inline-flex items-center justify-center rounded-lg transition"
      style={{
        background: 'var(--color-header-hover)',
        color: 'var(--color-header-fg)',
        width: 36,
        height: 36,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'var(--color-header-hover)')
      }
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
