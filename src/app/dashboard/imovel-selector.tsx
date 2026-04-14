'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/format'
import { Building2, ChevronDown, ChevronRight, CheckCircle, Clock } from 'lucide-react'

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

type Props = {
  imoveisAtivos: Imovel[]
  imoveisInativos: Imovel[]
}

export default function ImovelSelector({ imoveisAtivos, imoveisInativos }: Props) {
  const allImoveis = [...imoveisAtivos, ...imoveisInativos]
  const [selected, setSelected] = useState<Imovel | null>(null)

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
        value={selected?.indication_id ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value)
          setSelected(id ? allImoveis.find((i) => i.indication_id === id) || null : null)
        }}
        className="input-bluezone w-full"
        style={{ marginBottom: 16 }}
      >
        <option value="">Selecione um imóvel...</option>
        {imoveisAtivos.length > 0 && (
          <optgroup label="Ativos">
            {imoveisAtivos.map((i) => (
              <option key={i.indication_id} value={i.indication_id}>
                {i.code} — {i.commission_display}
              </option>
            ))}
          </optgroup>
        )}
        {imoveisInativos.length > 0 && (
          <optgroup label="Inativos">
            {imoveisInativos.map((i) => (
              <option key={i.indication_id} value={i.indication_id}>
                {i.code} — {i.commission_display}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Detail card */}
      {selected && <ImovelDetail imovel={selected} />}
    </div>
  )
}

function ImovelDetail({ imovel }: { imovel: Imovel }) {
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
      <div className="grid grid-cols-2 gap-4">
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