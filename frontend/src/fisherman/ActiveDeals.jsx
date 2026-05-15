import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listMyDeals, engageDeal, rejectDeal } from './api/deals'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

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
    queryKey: ['deals', 'mine', 'NEGOTIATING'],
    queryFn: () => listMyDeals('NEGOTIATING'),
  })

  const [rejectingId, setRejectingId] = useState(null)
  const [reasonText, setReasonText] = useState('')

  const engageMut = useMutation({
    mutationFn: (id) => engageDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', 'mine', 'NEGOTIATING'] })
      if (typeof setPage === 'function') setPage('messages')
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectDeal(id, reason),
    onSuccess: () => {
      setRejectingId(null)
      setReasonText('')
      qc.invalidateQueries({ queryKey: ['deals', 'mine', 'NEGOTIATING'] })
    },
  })

  const grouped = useMemo(() => {
    const data = dealsQ.data ?? []
    const map = new Map()
    for (const d of data) {
      const key = d.catchAlertId
      if (!map.has(key)) map.set(key, { catchAlertId: key, speciesName: d.speciesName, deals: [] })
      map.get(key).deals.push(d)
    }
    return Array.from(map.values())
  }, [dealsQ.data])

  if (dealsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (dealsQ.error) return <div className="page"><ApiError error={dealsQ.error} onRetry={dealsQ.refetch} /></div>

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Negotiation</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Active <em>Deals</em>
          </h1>
          <p className="page__sub">Triage incoming vendor proposals. Accept to open chat, or reject with a reason.</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => dealsQ.refetch()}>
            <I.Refresh size={14} /> Refresh
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="empty">
          No active deals. New negotiations from vendors will appear here.
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.catchAlertId} className="card" style={{ marginBottom: 16 }}>
            <div className="card__head">
              <div>
                <div className="eyebrow">Catch Alert #{group.catchAlertId}</div>
                <h3 style={{ margin: '4px 0 0' }}>{group.speciesName || 'Unknown species'}</h3>
              </div>
              <span className="chip">{group.deals.length} {group.deals.length === 1 ? 'deal' : 'deals'}</span>
            </div>

            <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.deals.map(d => {
                const prop = d.latestProposal || {}
                const isRejecting = rejectingId === d.id
                return (
                  <div key={d.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong>{d.counterpartyName || `Vendor #${d.counterpartyId}`}</strong>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="chip">{prop.qtyKg ?? '—'} kg</span>
                          <span className="chip">₱{prop.pricePerKg ?? '—'}/kg</span>
                          <span className="kbd">{timeAgo(prop.createdAt || d.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn--sm btn--accent"
                          disabled={engageMut.isPending}
                          onClick={() => engageMut.mutate(d.id)}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn--sm btn--ghost"
                          disabled={rejectMut.isPending}
                          onClick={() => { setRejectingId(d.id); setReasonText('') }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {isRejecting && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          autoFocus
                          placeholder="Reason (e.g. price too low)"
                          value={reasonText}
                          onChange={(e) => setReasonText(e.target.value)}
                          style={{ flex: 1, minWidth: 200 }}
                        />
                        <button
                          className="btn btn--sm btn--accent"
                          disabled={rejectMut.isPending}
                          onClick={() => rejectMut.mutate({ id: d.id, reason: reasonText || 'No reason provided' })}
                        >
                          Confirm reject
                        </button>
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => { setRejectingId(null); setReasonText('') }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
