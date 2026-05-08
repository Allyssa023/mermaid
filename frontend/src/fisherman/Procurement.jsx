// frontend/src/fisherman/Procurement.jsx
import { useState, useCallback } from 'react'
import { listProcurementOrders, acceptOrder, markReady, completeOrder, cancelOrder } from './api/procurement'
import { useFishermanPolling } from './hooks/useFishermanPolling'

const BUCKETS = ['PENDING','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED']

const STATUS_CLS = {
  PENDING: 'status--pending', ACCEPTED: 'status--confirmed', READY: 'status--active',
  COMPLETED: 'status--completed', CANCELLED: 'status--cancelled', DISPUTED: 'status--disputed',
}

export default function Procurement() {
  const [bucket, setBucket]     = useState('PENDING')
  const [busy, setBusy]         = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const fetcher = useCallback(() => listProcurementOrders(bucket), [bucket])
  const { data, loading, error, isStale, refetch } = useFishermanPolling(fetcher, [bucket])
  const orders = Array.isArray(data) ? data : []

  const act = async (action, id, extra) => {
    setBusy(id)
    try { await action(id, extra); refetch() }
    catch {}
    finally { setBusy(null) }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Sales</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Vendor <em>Orders.</em></h1>
          <p className="page__sub">Orders from vendors — accept, prepare, complete.</p>
        </div>
        <div className="page__actions">
          {isStale && <span className="chip chip--caution chip--dot">Stale</span>}
          <button className="btn btn--ghost btn--sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 16 }}>
        {BUCKETS.map(b => (
          <button
            key={b}
            className={`seg__btn${bucket === b ? ' on' : ''}`}
            onClick={() => setBucket(b)}
          >
            {b.charAt(0) + b.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--unsafe)', background: 'var(--unsafe-soft)', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error.message || 'Failed to load orders.'}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : orders.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No {bucket.toLowerCase()} orders</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(order => (
            <div key={order.id} className="card">
              <div className="card__head">
                <div>
                  {order.isPreorder && (
                    <span className="chip chip--accent" style={{ marginBottom: 4, display: 'inline-block' }}>Preorder</span>
                  )}
                  <div className="card__title">
                    {order.speciesName}
                    <span className="kbd" style={{ marginLeft: 8, fontSize: 11 }}>#{order.id}</span>
                  </div>
                  <div className="card__sub">
                    from {order.vendorName || `Vendor #${order.fishermanId}`}
                    {order.qtyKg != null && ` · ${order.qtyKg} kg`}
                    {order.pricePerKg != null && ` · ₱${order.pricePerKg}/kg`}
                  </div>
                  {/* Payment badge — only visible in COMPLETED orders when paymentMethod is set (Phase 3) */}
                  {order.paymentMethod && (
                    <span className={`chip ${order.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      {order.paymentMethod === 'CASH' ? 'Cash' : 'Credit / Utang'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`status ${STATUS_CLS[order.status] || ''}`}>{order.status}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {order.status === 'PENDING' && (
                      <>
                        <button className="btn btn--accent btn--sm" disabled={busy === order.id}
                          onClick={() => act(acceptOrder, order.id)}>Accept</button>
                        <button className="btn btn--ghost btn--sm"
                          style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                          onClick={() => { setCancelTarget(order); setCancelReason('') }}>Cancel</button>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button className="btn btn--primary btn--sm" disabled={busy === order.id}
                        onClick={() => act(markReady, order.id)}>Mark Ready</button>
                    )}
                    {order.status === 'READY' && (
                      <button className="btn btn--primary btn--sm" disabled={busy === order.id}
                        onClick={() => act(completeOrder, order.id)}>Complete</button>
                    )}
                  </div>
                </div>
              </div>
              {order.notes && (
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal__head">
              <div className="modal__title">Cancel order?</div>
            </div>
            <div className="form-row" style={{ padding: '12px 0' }}>
              <label>Reason (optional)</label>
              <input className="input" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setCancelTarget(null)}>Back</button>
              <button
                className="btn btn--sm"
                style={{ background: 'var(--unsafe)', color: 'var(--paper)', border: 'none' }}
                onClick={() => { act(cancelOrder, cancelTarget.id, cancelReason || undefined); setCancelTarget(null) }}
              >Cancel Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
