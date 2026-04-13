import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sea Partners — Portal do Parceiro Seazone',
  description:
    'Acompanhe suas indicações, receita dos imóveis e comissão em tempo real.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
