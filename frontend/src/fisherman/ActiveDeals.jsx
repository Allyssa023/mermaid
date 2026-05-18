import { useEffect, useRef, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import DealChatPane from '../components/DealChatPane'
import {
  listMyDeals,
  submitProposal,
  getDeal,
  listDealMessages,
  acceptProposal,
  rejectProposal,
  cancelDeal,
} from './api/deals'

const GROUPS = ['NEGOTIATING', 'AGREED', 'REJECTED', 'EXPIRED', 'CANCELLED']

const GROUP_CHIP_COLOR = {
  NEGOTIATING: '#a3e635',
  AGREED: '#34d399',
  REJECTED: '#f87171',
  EXPIRED: 'rgba(255,255,255,0.35)',
  CANCELLED: 'rgba(255,255,255,0.35)',
}

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const m = Math.max(0, Math.round(ms / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export default function ActiveDeals({ setPage }) {
  const qc = useQueryClient()

  const dealsQ = useQuery({
    queryKey: ['deals', 'mine', 'all'],
    queryFn: () => listMyDeals(),
  })

  const [activeDealId, setActiveDealId] = useState(null)
  const [counterModal, setCounterModal] = useState(null) // holds dealId
  const [counterQty, setCounterQty] = useState('')
  const [counterPrice, setCounterPrice] = useState('')

  const cardsRef = useRef(null)

  // Group deals by status
  const grouped = useMemo(() => {
    const data = dealsQ.data ?? []
    const map = {}
    for (const d of data) {
      if (!map[d.status]) map[d.status] = []
      map[d.status].push(d)
    }
    return map
  }, [dealsQ.data])

  // GSAP stagger on mount / data change
  useEffect(() => {
    if (!cardsRef.current) return
    const cards = cardsRef.current.querySelectorAll('.f-card')
    if (cards.length === 0) return
    gsap.from(cards, {
      opacity: 0,
      y: 16,
      duration: 0.35,
      stagger: 0.06,
      ease: 'power2.out',
      clearProps: 'opacity,transform',
    })
  }, [dealsQ.data])

  const counterMut = useMutation({
    mutationFn: ({ dealId, qtyKg, pricePerKg }) =>
      submitProposal(dealId, Number(qtyKg), Number(pricePerKg)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', 'mine', 'all'] })
      setCounterModal(null)
      setCounterQty('')
      setCounterPrice('')
    },
  })

  const activeApiClient = { getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal }

  // ── Loading / error states ─────────────────────────────────────────────
  if (dealsQ.isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 320, padding: '24px 16px', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          Loading deals…
        </div>
      </div>
    )
  }

  if (dealsQ.error) {
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 320, padding: '24px 16px', color: '#f87171', fontSize: '0.85rem' }}>
          Failed to load deals.{' '}
          <button className="f-btn f-btn--secondary f-btn--sm" onClick={() => dealsQ.refetch()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const allDeals = dealsQ.data ?? []

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left panel: deal list ──────────────────────────────────────── */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 16px 12px', flexShrink: 0 }}>
          <div
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: '#fff',
              marginBottom: 2,
            }}
          >
            Active Deals
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            {allDeals.length} total
          </div>
        </div>

        {/* Scrollable list */}
        <div
          ref={cardsRef}
          style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}
        >
          {allDeals.length === 0 ? (
            <div
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.8rem',
                textAlign: 'center',
                marginTop: 40,
              }}
            >
              No deals yet. Vendors will propose when you post catch alerts.
            </div>
          ) : (
            GROUPS.filter(g => grouped[g] && grouped[g].length > 0).map(group => (
              <div key={group} style={{ marginBottom: 20 }}>
                {/* Group heading */}
                <div
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {group}
                </div>

                {/* Deal cards */}
                {grouped[group].map(deal => {
                  const isActive = activeDealId === deal.id
                  return (
                    <div
                      key={deal.id}
                      className="f-card"
                      style={{
                        padding: 18,
                        marginBottom: 10,
                        cursor: 'pointer',
                        outline: isActive ? '2px solid #a3e635' : '2px solid transparent',
                        transition: 'outline 0.15s',
                      }}
                      onClick={() => setActiveDealId(isActive ? null : deal.id)}
                    >
                      {/* Vendor name */}
                      <div
                        style={{
                          fontFamily: 'Space Grotesk, sans-serif',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: '#fff',
                          marginBottom: 6,
                        }}
                      >
                        {deal.vendorName || `Vendor #${deal.vendorId}`}
                      </div>

                      {/* Species + qty + price */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span className="f-chip f-chip--muted">
                          {deal.speciesName || 'Unknown'}
                        </span>
                        <span className="f-chip f-chip--muted">
                          {deal.qtyKg ?? '—'} kg
                        </span>
                        {deal.latestProposalPricePerKg != null && (
                          <span className="f-chip f-chip--lime">
                            ₱{deal.latestProposalPricePerKg}/kg
                          </span>
                        )}
                      </div>

                      {/* Footer row: time + counter button */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.35)',
                          }}
                        >
                          {timeAgo(deal.updatedAt)}
                        </span>

                        {group === 'NEGOTIATING' && (
                          <button
                            className="f-btn f-btn--secondary f-btn--sm"
                            onClick={e => {
                              e.stopPropagation()
                              setCounterModal(deal.id)
                              setCounterQty(deal.qtyKg ?? '')
                              setCounterPrice(deal.latestProposalPricePerKg ?? '')
                            }}
                          >
                            Counter
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: chat pane or placeholder ─────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeDealId ? (
          <DealChatPane
            dealId={activeDealId}
            apiClient={activeApiClient}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            <div style={{ fontSize: '2rem' }}>💬</div>
            <div style={{ fontSize: '0.85rem' }}>Select a deal to open chat</div>
          </div>
        )}
      </div>

      {/* ── Counter proposal modal ─────────────────────────────────────── */}
      {counterModal !== null && (
        <div className="f-modal-backdrop" onClick={() => setCounterModal(null)}>
          <div
            className="f-modal"
            onClick={e => e.stopPropagation()}
            style={{ minWidth: 320 }}
          >
            <div className="f-modal__title">Counter Proposal</div>

            <div className="f-field" style={{ marginBottom: 14 }}>
              <label className="f-label">Quantity (kg)</label>
              <input
                className="f-input"
                type="number"
                min="0"
                step="0.1"
                value={counterQty}
                onChange={e => setCounterQty(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>

            <div className="f-field" style={{ marginBottom: 20 }}>
              <label className="f-label">Price per kg (₱)</label>
              <input
                className="f-input"
                type="number"
                min="0"
                step="0.5"
                value={counterPrice}
                onChange={e => setCounterPrice(e.target.value)}
                placeholder="e.g. 200"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="f-btn f-btn--secondary f-btn--sm"
                onClick={() => setCounterModal(null)}
                disabled={counterMut.isPending}
              >
                Cancel
              </button>
              <button
                className="f-btn f-btn--primary f-btn--sm"
                disabled={counterMut.isPending || !counterQty || !counterPrice}
                onClick={() =>
                  counterMut.mutate({
                    dealId: counterModal,
                    qtyKg: counterQty,
                    pricePerKg: counterPrice,
                  })
                }
              >
                {counterMut.isPending ? 'Sending…' : 'Send Counter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
