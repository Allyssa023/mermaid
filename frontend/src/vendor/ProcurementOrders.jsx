import { useState, useCallback } from 'react'
import { listProcurementOrders, cancelProcurementOrder } from './api/procurement'
import { useVendorPolling } from './hooks/useVendorPolling'

const BUCKETS = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED']

const STATUS_MAP = {
  PENDING:   'pending',
  ACCEPTED:  'active',
  READY:     'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export default function ProcurementOrders() {
  const [bucket, setBucket] = useState('PENDING')
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState(null)

  const fetcher = useCallback(() => listProcurementOrders(bucket), [bucket])
  const { data: orders = [], loading, refetch } = useVendorPolling(fetcher, 20000)

  const handleCancel = async (orderId) => {
    setCancelError(null)
    try {
      await cancelProcurementOrder(orderId, cancelReason || undefined)
      setCancellingId(null)
      setCancelReason('')
      refetch()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to cancel order.'
      setCancelError(msg)
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Procurement</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Procurement <em>Orders</em>
          </h1>
          <p className="page__sub">Track orders placed with fishermen through the procurement feed.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div className="seg">
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
        </div>

        {loading && orders.length === 0 && (
          <div className="empty"><div className="empty__title">Loading…</div></div>
        )}
        {!loading && orders.length === 0 && (
          <div className="empty">
            <div className="empty__title">No {bucket.toLowerCase()} orders</div>
          </div>
        )}
      </div>

      {orders.map(order => {
        const canCancel = order.status === 'PENDING' || order.status === 'ACCEPTED'
        const isCancelOpen = cancellingId === order.id

        return (
          <div key={order.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card__head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}>
                    {order.speciesName ?? '(species unknown)'}
                  </span>
                  {order.isPreorder && <span className="chip chip--accent">Preorder</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {[
                    order.fishermanName ?? `Fisherman #${order.fishermanId}`,
                    order.qtyKg != null && `${order.qtyKg.toFixed(1)} kg`,
                    order.pricePerKg != null && `₱${order.pricePerKg.toFixed(2)}/kg`,
                  ].filter(Boolean).join(' · ')}
                </div>
                {order.notes && (
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic', marginTop: 4 }}>
                    "{order.notes}"
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Placed {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span className={`status status--${STATUS_MAP[order.status] || ''}`}>
                  <span className="status__dot" />{order.status}
                </span>
                <span className="kbd">#{order.id}</span>
              </div>
            </div>

            {canCancel && !isCancelOpen && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                  onClick={() => { setCancellingId(order.id); setCancelError(null) }}
                >
                  Cancel order
                </button>
              </div>
            )}

            {isCancelOpen && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--unsafe-soft)', borderRadius: 8 }}>
                <input
                  className="input"
                  placeholder="Reason for cancellation (optional)"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                {cancelError && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginBottom: 8 }}>{cancelError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn--sm"
                    style={{ background: 'var(--unsafe)', color: 'white', borderColor: 'var(--unsafe)' }}
                    onClick={() => handleCancel(order.id)}
                  >
                    Confirm Cancel
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setCancellingId(null); setCancelReason(''); setCancelError(null) }}
                  >
                    Keep order
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
