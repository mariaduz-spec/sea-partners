'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

type Props = {
  data: Array<{ mes_ano: string; receita_mes: number; comissao_mes: number }>
}

export default function RevenueChart({ data }: Props) {
  const chartData = data.map((d) => ({
    mes: d.mes_ano,
    receita: d.receita_mes,
    comissao: d.comissao_mes,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EBEBF5" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: '#62656F' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
          tick={{ fontSize: 11, fill: '#62656F' }}
          width={60}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#F9F9F9' }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #EBEBF5',
            fontSize: 12,
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          }}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : Number(value) || 0
            const label = name === 'receita' ? 'Receita' : 'Comissão'
            return [
              `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              label,
            ]
          }}
        />
        <Bar dataKey="receita" fill="#0C1640" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
