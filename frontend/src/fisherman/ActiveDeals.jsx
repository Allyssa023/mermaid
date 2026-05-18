import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import {
  listMyDeals, submitProposal,
  acceptProposal, cancelDeal,
} from './api/deals'

const PAGE_SIZE = 10

function Pager({ page, total, onPage }) {
  if (total <= 1) return null
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="pager__info">{page} of {total}</span>
      <button className="pager__btn" disabled={page >= total} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

const STATUS_CHIP = {
  NEGOTIATING: 'chip--caution',
  AGREED:      'chip--safe',
  REJECTED:    'chip--unsafe',
  EXPIRED:     'chip--muted',
  CANCELLED:   'chip--muted',
}

const PIPE_CLASS = {
  NEGOTIATING: 'deal-row__pipe--neg',
  AGREED:      'deal-row__pipe--agreed',
  REJECTED:    'deal-row__pipe--closed',
  EXPIRED:     'deal-row__pipe--closed',
  CANCELLED:   'deal-row__pipe--closed',
}

function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

const FILTERS = [
  { id: 'ALL',       label: 'All deals' },
  { id: 'PROPOSALS', label: 'Negotiating' },
  { id: 'AGREED',    label: 'Agreed' },
  { id: 'CLOSED',    label: 'Closed' },
]

export default function ActiveDeals({ setPage }) {
  const qc = useQueryClient()
  const dealsQ = useQuery({ queryKey: ['deals', 'mine', 'all'], queryFn: () => listMyDeals() })
  const [filter, setFilter] = useState('ALL')
  const [counterModal, setCounterModal] = useState(null)
  const [counterQty, setCounterQty] = useState('')
  const [counterPrice, setCounterPrice] = useState('')
  const [dealsPage, setDealsPage] = useState(1)

  const allDeals = dealsQ.data ?? []

  const counterMut = useMutation({
    mutationFn: ({ dealId, qtyKg, pricePerKg }) => submitProposal(dealId, Number(qtyKg), Number(pricePerKg)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', 'mine', 'all'] })
      setCounterModal(null)
      setCounterQty('')
      setCounterPrice('')
    },
  })

  const acceptMut = useMutation({
    mutationFn: (dealId) => {
      const deal = allDeals.find(d => d.id === dealId)
      const pending = deal?.latestProposal?.status === 'PENDING' ? deal.latestProposal : null
      return pending ? acceptProposal(dealId, pending.id) : Promise.reject(new Error('No pending proposal'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals', 'mine', 'all'] }),
  })

  const cancelMut = useMutation({
    mutationFn: (dealId) => cancelDeal(dealId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals', 'mine', 'all'] }),
  })

  const stats = useMemo(() => ({
    negotiating: allDeals.filter(d => d.status === 'NEGOTIATING').length,
    agreed:      allDeals.filter(d => d.status === 'AGREED').length,
    closed:      allDeals.filter(d => ['REJECTED', 'EXPIRED', 'CANCELLED'].includes(d.status)).length,
    total:       allDeals.length,
    agreedValue: allDeals.filter(d => d.status === 'AGREED')
                         .reduce((s, d) => s + (d.latestProposal?.pricePerKg ?? 0) * (d.latestProposal?.qtyKg ?? 0), 0),
  }), [allDeals])

  const CLOSED_STATUSES = ['REJECTED', 'EXPIRED', 'CANCELLED']

  const filtered = useMemo(() => {
    if (filter === 'PROPOSALS') return allDeals.filter(d => d.status === 'NEGOTIATING')
    if (filter === 'AGREED')    return allDeals.filter(d => d.status === 'AGREED')
    if (filter === 'CLOSED')    return allDeals.filter(d => CLOSED_STATUSES.includes(d.status))
    return allDeals
  }, [allDeals, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((dealsPage - 1) * PAGE_SIZE, dealsPage * PAGE_SIZE)

  if (dealsQ.isLoading) {
    return <div style={{ padding: '24px 28px', color: 'var(--ink-3)', fontSize: 13 }}>Loading deals…</div>
  }
  if (dealsQ.error) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div className="f-error">Failed to load deals. <span className="f-error__retry" onClick={dealsQ.refetch}>Retry</span></div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div className="page__head" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow"><span className="dot" />Vendor negotiations</div>
          <h1 className="page__title">Active <em className="chip-lime">Deals</em></h1>
          <p className="page__sub">Proposals, engagements, and pending handoffs with your vendor network.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><I.Filter size={12} /> Filter</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="f-kpi-strip">
        <div className="fk-cell">
          <div className="fk-l">Total deals</div>
          <div className="fk-v">{stats.total}</div>
          <div className="fk-s">all time</div>
        </div>
        <div className="fk-cell">
          <div className="fk-l">Negotiating</div>
          <div className="fk-v" style={{ color: 'var(--caution)' }}>{stats.negotiating}</div>
          <div className="fk-s">awaiting response</div>
        </div>
        <div className="fk-cell">
          <div className="fk-l">Agreed</div>
          <div className="fk-v" style={{ color: 'var(--safe)' }}>{stats.agreed}</div>
          <div className="fk-s">deals running</div>
        </div>
        <div className="fk-cell">
          <div className="fk-l">Agreed value</div>
          <div className="fk-v">₱{(stats.agreedValue / 1000).toFixed(1)}<small>k</small></div>
          <div className="fk-s">across agreed deals</div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="f-pipeline">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="f-pipeline__head">Deal pipeline</div>
            <div className="f-pipeline__sub">Distribution across negotiation stages</div>
          </div>
          <span className="chip chip--safe" style={{ fontSize: 11 }}>{stats.agreed} agreed</span>
        </div>
        <div className="f-pipeline__bars">
          <div className="f-pipeline__bar f-pipeline__bar--neg"    style={{ flex: stats.negotiating || 0.5 }} />
          <div className="f-pipeline__bar f-pipeline__bar--agreed" style={{ flex: stats.agreed || 0.5 }} />
          <div className="f-pipeline__bar f-pipeline__bar--closed" style={{ flex: stats.closed || 0.5 }} />
        </div>
        <div className="f-pipeline__labels">
          <span><span className="sw" style={{ background: 'var(--caution)' }} /><strong>{stats.negotiating}</strong> Negotiating</span>
          <span><span className="sw" style={{ background: 'var(--safe)' }} /><strong>{stats.agreed}</strong> Agreed</span>
          <span><span className="sw" style={{ background: 'var(--ink-5)' }} /><strong>{stats.closed}</strong> Closed</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="f-filter-pills">
        {FILTERS.map(({ id, label }) => {
          const count = id === 'ALL' ? allDeals.length
            : id === 'PROPOSALS' ? stats.negotiating
            : id === 'AGREED'    ? stats.agreed
            : stats.closed
          return (
            <span
              key={id}
              className={`f-pill-btn${filter === id ? ' on' : ''}`}
              onClick={() => { setFilter(id); setDealsPage(1) }}
            >
              {label}
              <span style={{ marginLeft: 6, opacity: 0.6, fontFamily: 'var(--font-code)', fontSize: 10 }}>{count}</span>
            </span>
          )
        })}
      </div>

      {/* Deal rows */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--ink-4)' }}>
          <div style={{ marginBottom: 8 }}>No deals here.</div>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0 }}>Vendors will propose when you post catch alerts.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paged.map(deal => {
              const latest = deal.latestProposal
              const vendorLabel = deal.counterpartyName ?? deal.vendorName ?? null
              const vendorRef   = vendorLabel ?? `Vendor #${deal.counterpartyId ?? deal.vendorId ?? ''}`
              const initials    = (vendorLabel ?? 'V').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const displayQty  = latest?.qtyKg ?? null
              const displayPrice = latest?.pricePerKg ?? null
              const canActOnPending = deal.status === 'NEGOTIATING' && latest?.status === 'PENDING'
              return (
                <div key={deal.id} className="deal-row">
                  <div className={`deal-row__pipe ${PIPE_CLASS[deal.status] ?? ''}`} />
                  {/* col 1 — vendor identity */}
                  <div className="deal-row__identity">
                    <div className="deal-row__avatar">{initials}</div>
                    <div className="deal-row__info">
                      <div className="deal-row__vendor">{vendorRef} <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--ink-4)', fontWeight: 400 }}>D-{deal.id}</span></div>
                      <div className="deal-row__meta">{deal.speciesName ?? '—'} · {timeAgo(deal.updatedAt)}</div>
                    </div>
                  </div>
                  {/* col 2 — status */}
                  <div className="deal-row__status">
                    <span className={`chip ${STATUS_CHIP[deal.status] ?? 'chip--muted'}`}>
                      <span className="chip__dot" />{deal.status}
                    </span>
                  </div>
                  {/* col 3 — qty */}
                  <div className="deal-row__metric">
                    <div className="deal-row__val">{displayQty != null ? `${displayQty}` : '—'}<span style={{ fontSize: 11, color: 'var(--accent-lime)', marginLeft: 3 }}>{displayQty != null ? 'kg' : ''}</span></div>
                    <div className="deal-row__sub">{deal.speciesName ?? '—'}</div>
                  </div>
                  {/* col 4 — price */}
                  <div className="deal-row__metric">
                    <div className="deal-row__val deal-row__val--lime">
                      {displayPrice != null ? `₱${displayPrice}/kg` : '—'}
                    </div>
                    <div className="deal-row__sub">{deal.status === 'AGREED' ? 'agreed' : 'latest offer'}</div>
                  </div>
                  {/* col 5 — actions */}
                  <div className="deal-row__actions">
                    <button className="btn btn--sm btn--ghost" onClick={() => setPage?.('messages')}><I.Message size={11} /> Chat</button>
                    {canActOnPending && (
                      <>
                        <button className="btn btn--sm btn--ghost"
                          onClick={() => { setCounterModal(deal.id); setCounterQty(latest.qtyKg ?? ''); setCounterPrice(latest.pricePerKg ?? '') }}>
                          Counter
                        </button>
                        <button className="btn btn--sm" style={{ background: 'var(--safe-soft)', color: 'var(--safe)', borderColor: 'rgba(110,231,183,0.3)' }}
                          onClick={() => acceptMut.mutate(deal.id)} disabled={acceptMut.isPending}>
                          Accept
                        </button>
                      </>
                    )}
                    {deal.status === 'NEGOTIATING' && (
                      <button className="btn btn--sm btn--icon"
                        style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', borderColor: 'rgba(251,113,133,0.3)' }}
                        title="Cancel deal"
                        onClick={() => cancelMut.mutate(deal.id)} disabled={cancelMut.isPending}>
                        <I.X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Pager page={dealsPage} total={totalPages} onPage={setDealsPage} />
        </>
      )}

      {/* Counter modal */}
      {counterModal && (
        <div className="f-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setCounterModal(null)}>
          <div className="f-modal">
            <div className="f-modal__title">Counter Proposal</div>
            <div className="f-field">
              <label className="f-label">Quantity (kg)</label>
              <input className="f-input" type="number" min={0} value={counterQty} onChange={e => setCounterQty(e.target.value)} />
            </div>
            <div className="f-field">
              <label className="f-label">Price per kg (₱)</label>
              <input className="f-input" type="number" min={0} value={counterPrice} onChange={e => setCounterPrice(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn--ghost" onClick={() => setCounterModal(null)}>Cancel</button>
              <button className="btn btn--lime"
                disabled={counterMut.isPending || !counterQty || !counterPrice}
                onClick={() => counterMut.mutate({ dealId: counterModal, qtyKg: counterQty, pricePerKg: counterPrice })}>
                {counterMut.isPending ? 'Sending…' : 'Send counter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
