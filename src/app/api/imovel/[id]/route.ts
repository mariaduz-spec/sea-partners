import { getImovelEvolucaoMensal } from '@/lib/queries'
import { formatBRL } from '@/lib/format'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const propertyId = Number(id)

    if (!propertyId || isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 })
    }

    const evolucao = await getImovelEvolucaoMensal(propertyId)

    // Format for display
    const meses = evolucao
      .filter(m => m.receita_imoveis > 0)
      .map(m => ({
        mes_ano: m.mes_ano,
        receita: formatBRL(m.receita_imoveis),
        comissao: formatBRL(m.comissao_mes),
      }))

    return NextResponse.json({ meses })
  } catch (err) {
    console.error('[api/imovel] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}