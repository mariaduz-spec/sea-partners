import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-provider'

export const metadata: Metadata = {
  title: 'Sea Partners — Portal do Parceiro Seazone',
  description:
    'Acompanhe suas indicações, receita dos imóveis e comissão em tempo real.',
}

// Script inline pra evitar flash of unstyled content (FOUC) na primeira renderizacao.
// Le o tema persistido antes do React hidratar e aplica no <html>.
const preloadThemeScript = `
(function() {
  try {
    var saved = localStorage.getItem('sea-partners-theme');
    var theme = saved === 'light' || saved === 'dark' ? saved :
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: preloadThemeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
