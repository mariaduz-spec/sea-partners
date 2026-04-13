'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { useTheme } from '@/lib/theme-provider'

type Props = {
  data: Array<{ mes_ano: string; receita_mes: number; comissao_mes: number }>
}

/**
 * Grafico de comissao mensal — destaque coral pra enfatizar que eh o ganho
 * do parceiro (nao a receita, que pertence ao proprietario/Seazone).
 */
export default function CommissionChart({ data }: Props) {
  const { resolved } = useTheme()
  const isDark = resolved === 'dark'

  const gridColor = isDark ? '#1F2858' : '#EBEBF5'
  const axisColor = isDark ? '#8A8EA3' : '#62656F'
  const barColor = isDark ? '#F56A67' : '#F1605D'
  const tooltipBg = isDark ? '#141D4A' : '#FFFFFF'
  const tooltipBorder = isDark ? '#2D3769' : '#EBEBF5'
  const tooltipText = isDark ? '#F5F5F7' : '#19191A'
  const cursorFill = isDark ? 'rgba(245, 106, 103, 0.1)' : 'rgba(241, 96, 93, 0.06)'

  const chartData = data.map((d) => ({
    mes: d.mes_ano,
    comissao: d.comissao_mes,
    receita: d.receita_mes,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: axisColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
          tick={{ fontSize: 11, fill: axisColor }}
          width={60}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: cursorFill }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tooltipBorder}`,
            background: tooltipBg,
            color: tooltipText,
            fontSize: 12,
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          }}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : Number(value) || 0
            const label = name === 'comissao' ? 'Comissão' : 'Receita do imóvel'
            return [
              `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              label,
            ]
          }}
        />
        <Bar dataKey="comissao" fill={barColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
