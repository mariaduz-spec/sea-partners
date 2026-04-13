'use client'

import { useState } from 'react'
import { formatBRL, type PagamentoParceiro } from '@/lib/format'
import { ChevronDown, ChevronRight, MapPin, CreditCard, FileText } from 'lucide-react'

type Props = {
  pagamentos: PagamentoParceiro[]
}

/**
 * Historico de pagamentos (deals won com taxa_de_adesao) ordenados por data desc.
 * Cada linha expansivel pra mostrar detalhes do deal.
 */
export default function PaymentsHistory({ pagamentos }: Props) {
  if (pagamentos.length === 0) {
    return (
      <p className="body-reg text-center py-8" style={{ color: 'var(--color-muted-fg)' }}>
        Sem pagamentos registrados ainda.
      </p>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        className="grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center py-3 eyebrow"
        style={{
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-muted-fg)',
        }}
      >
        <span className="w-4" aria-hidden />
        <span>Indicação</span>
        <span className="text-right">Valor</span>
        <span className="text-right pr-1">Data</span>
      </div>

      {/* Linhas */}
      <div>
        {pagamentos.map((p) => (
          <PagamentoRow key={p.deal_id} pagamento={p} />
        ))}
      </div>
    </div>
  )
}

function PagamentoRow({ pagamento }: { pagamento: PagamentoParceiro }) {
  const [open, setOpen] = useState(false)
  const ChevronIcon = open ? ChevronDown : ChevronRight
  const temPagamento = pagamento.taxa_de_adesao > 0

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center py-3 text-left transition cursor-pointer"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--color-muted)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        <span className="w-4 flex items-center justify-center">
          <ChevronIcon size={14} style={{ color: 'var(--color-muted-fg)' }} />
        </span>
        <div className="min-w-0">
          <p
            className="body truncate"
            style={{ color: 'var(--color-foreground)' }}
          >
            {pagamento.title || '—'}
          </p>
          {pagamento.codigo_do_imovel_unidade && (
            <p
              className="detail-reg font-mono truncate"
              style={{ color: 'var(--color-muted-fg)' }}
            >
              {pagamento.codigo_do_imovel_unidade}
              {pagamento.cidade && ` · ${pagamento.cidade}`}
            </p>
          )}
        </div>
        <span
          className="body text-right tabular-nums"
          style={{
            color: temPagamento ? 'var(--color-coral)' : 'var(--color-muted-fg)',
          }}
        >
          {temPagamento ? formatBRL(pagamento.taxa_de_adesao) : 'Sem taxa'}
        </span>
        <span
          className="detail-reg text-right pr-1"
          style={{ color: 'var(--color-muted-fg)' }}
        >
          {pagamento.close_date_display}
        </span>
      </button>

      {open && (
        <div
          className="pb-4 pt-2 px-4 space-y-2"
          style={{
            background: 'color-mix(in oklab, var(--color-muted) 60%, transparent)',
          }}
        >
          <DetailRow
            icon={<FileText size={14} />}
            label="ID do deal"
            value={String(pagamento.deal_id)}
          />
          {pagamento.endereco_do_imovel && (
            <DetailRow
              icon={<MapPin size={14} />}
              label="Endereço"
              value={pagamento.endereco_do_imovel}
            />
          )}
          {pagamento.forma_pagamento && (
            <DetailRow
              icon={<CreditCard size={14} />}
              label="Forma de pagamento"
              value={pagamento.forma_pagamento}
            />
          )}
          {pagamento.valor_contrato > 0 && (
            <DetailRow
              icon={<FileText size={14} />}
              label="Valor do contrato (ref. imóvel)"
              value={formatBRL(pagamento.valor_contrato)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded"
        style={{
          background: 'var(--color-muted)',
          color: 'var(--color-muted-fg)',
        }}
      >
        {icon}
      </span>
      <span
        className="detail"
        style={{ color: 'var(--color-muted-fg)', minWidth: 140 }}
      >
        {label}
      </span>
      <span
        className="body-reg truncate"
        style={{ color: 'var(--color-foreground)' }}
      >
        {value}
      </span>
    </div>
  )
}
