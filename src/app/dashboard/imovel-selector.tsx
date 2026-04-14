'use client'

import { useState, useEffect } from 'react'
import { formatBRL } from '@/lib/format'
import { Building2, CheckCircle, Clock, Loader2 } from 'lucide-react'

type Imovel = {
  indication_id: number
  property_id: number
  code: string
  prop_status: string
  commission_payment_type: string
  commission_display: string
  comissao_12m: number
  n_meses_ativos: number
}

type MesEvolucao = {
  mes_ano: string
  receita: string
  comissao: string
}

type Props = {
  imoveisAtivos: Imovel[]
  imoveisInativos: Imovel[]
}

export default function ImovelSelector({ imoveisAtivos, imoveisInativos }: Props) {
  const allImoveis = [...imoveisAtivos, ...imoveisInativos]
  const [selectedCode, setSelectedCode] = useState<string>('')
  const [evolucao, setEvolucao] = useState<MesEvolucao[]>([])
  const [loading, setLoading] = useState(false)

  // Find selected object
  const selected = allImoveis.find(i => i.code === selectedCode) || null

  // Fetch evolution when property_id changes
  const propertyId = selected?.property_id

  useEffect(() => {
    if (!propertyId) {
      setEvolucao([])
      return
    }

    async function fetchEvolucao() {
      setLoading(true)
      try {
        const res = await fetch(`/api/imovel/${propertyId}`)
        const data = await res.json()
        setEvolucao(data.meses || [])
      } catch (err) {
        console.error('Failed to fetch evolution:', err)
        setEvolucao([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvolucao()
  }, [propertyId])

  if (allImoveis.length === 0) {
    return (
      <p className="body-reg text-center py-8" style={{ color: 'var(--color-muted-fg)' }}>
        Nenhum imóvelindicado.
      </p>
    )
  }

  return (
    <div>
      {/* Dropdown */}
      <select
        value={selectedCode}
        onChange={(e) => setSelectedCode(e.target.value)}
        className="w-full rounded-lg px-3 py-2 border"
        style={{
          marginBottom: 16,
          background: 'var(--color-background)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-foreground)'
        }}
      >
        <option value="">Selecione um imóvel...</option>
        {imoveisAtivos.length > 0 && (
          <optgroup label="Ativos">
            {imoveisAtivos.map((i) => (
              <option key={i.code} value={i.code}>
                {i.code} — {i.commission_display}
              </option>
            ))}
          </optgroup>
        )}
        {imoveisInativos.length > 0 && (
          <optgroup label="Inativos">
            {imoveisInativos.map((i) => (
              <option key={i.code} value={i.code}>
                {i.code} — {i.commission_display}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Detail card */}
      {selected && (
        <ImovelDetail imovel={selected} evolucao={evolucao} loading={loading} />
      )}
    </div>
  )
}

function ImovelDetail({ imovel, evolucao, loading }: {
  imovel: Imovel
  evolucao: MesEvolucao[]
  loading: boolean
}) {
  const isActive = imovel.prop_status === 'Active'

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <p className="body font-mono" style={{ color: 'var(--color-foreground)' }}>
              {imovel.code}
            </p>
            <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>
              {imovel.commission_display}
            </p>
          </div>
        </div>
        <StatusPill status={imovel.prop_status} />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>
            Comissão Total
          </p>
          <p
            className="metric"
            style={{
              color: imovel.comissao_12m > 0 ? 'var(--color-coral)' : 'var(--color-muted-fg)',
            }}
          >
            {imovel.comissao_12m > 0 ? formatBRL(imovel.comissao_12m) : '—'}
          </p>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="detail-reg" style={{ color: 'var(--color-muted-fg)' }}>
            Meses Ativos
          </p>
          <p className="metric" style={{ color: 'var(--color-foreground)' }}>
            {imovel.n_meses_ativos}
          </p>
        </div>
      </div>

      {/* Evolução mensal */}
      <div>
        <p className="detail-reg mb-2" style={{ color: 'var(--color-muted-fg)' }}>
          Receita por mês
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-muted-fg)' }} />
          </div>
        ) : evolucao.length > 0 ? (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {evolucao.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3"
                style={{
                  borderBottom: idx < evolucao.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: idx % 2 === 0 ? 'var(--color-surface)' : 'transparent',
                }}
              >
                <span className="body" style={{ color: 'var(--color-foreground)' }}>{m.mes_ano}</span>
                <span className="body text-right" style={{ color: 'var(--color-coral)' }}>{m.comissao}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="body-reg text-center py-4" style={{ color: 'var(--color-muted-fg)' }}>
            Sem receita registrada.
          </p>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'Active'
  return (
    <span
      className="detail inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
      style={{
        background: isActive
          ? 'color-mix(in oklab, var(--color-success) 18%, transparent)'
          : 'var(--color-muted)',
        color: isActive ? 'var(--color-success)' : 'var(--color-muted-fg)',
      }}
    >
      {isActive ? <CheckCircle size={12} /> : <Clock size={12} />}
      {status || '—'}
    </span>
  )
}