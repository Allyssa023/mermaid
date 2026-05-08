import { useState, useCallback } from 'react'
import { useVendorPolling } from './hooks/useVendorPolling'
import { listInbox, acceptOrder, markOrderReady, completeOrder, cancelOrder } from './api/orders'

const TABS = [
  { key: 'NEW',       label: 'New' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY',     label: 'Ready' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_MAP = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  ACCEPTED:  'active',
  READY:     'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

function OrderCard({ order, onAction }) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const act = async (fn) => {
    setBusy(true); setErr('')
    try { await fn(); onAction() }
    catch (e) { setErr(e.message || 'Action failed.') }
    finally { setBusy(false) }
  }

  const s = order.status

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card__head" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="kbd">Order #{order.id}</span>
            {order.kind === 'PROCUREMENT' && (
              <span className="chip chip--accent">Procurement</span>
            )}
          </div>
          <div className="card__title">{order.buyerName || `Buyer #${order.buyerId}`}</div>
          <div className="card__sub">
            {[order.speciesName, order.qtyKg != null && `${order.qtyKg} kg`, order.pricePerKg != null && `₱${order.pricePerKg}/kg`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span className={`status status--${STATUS_MAP[s] || ''}`}>
          <span className="status__dot" />{s}
        </span>
      </div>

      {err && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 6 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {(s === 'PENDING' || s === 'CONFIRMED') && (
          <button className="btn btn--accent btn--sm" disabled={busy} onClick={() => act(() => acceptOrder(order.id))}>
            {busy ? '…' : 'Accept'}
          </button>
        )}
        {s === 'ACCEPTED' && (
          <button className="btn btn--sm" style={{ background: 'var(--safe)', color: 'white', borderColor: 'var(--safe)' }} disabled={busy} onClick={() => act(() => markOrderReady(order.id))}>
            {busy ? '…' : 'Mark Ready'}
          </button>
        )}
        {s === 'READY' && (
          <button className="btn btn--sm" style={{ background: 'var(--safe)', color: 'white', borderColor: 'var(--safe)' }} disabled={busy} onClick={() => act(() => completeOrder(order.id))}>
            {busy ? '…' : 'Complete'}
          </button>
        )}
        {(s === 'PENDING' || s === 'CONFIRMED' || s === 'ACCEPTED') && !cancelling && (
          <button className="btn btn--ghost btn--sm" style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }} disabled={busy} onClick={() => setCancelling(true)}>
            Cancel
          </button>
        )}
      </div>

      {cancelling && (
        <div style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="Cancellation reason (optional)"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn--sm" style={{ background: 'var(--unsafe)', color: 'white', borderColor: 'var(--unsafe)' }} disabled={busy}
              onClick={() => act(() => cancelOrder(order.id, cancelReason || undefined))}>
              {busy ? '…' : 'Confirm Cancel'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => { setCancelling(false); setCancelReason('') }}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrdersInbox() {
  const [activeTab, setActiveTab] = useState('NEW')

  const fetcher = useCallback(() => listInbox(activeTab), [activeTab])
  const { data: orders, isStale, loading, error, refetch } = useVendorPolling(fetcher, [activeTab])

  const list = Array.isArray(orders) ? orders : []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Fulfillment</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Orders <em>Inbox</em>
          </h1>
          <p className="page__sub">Accept, prepare, and complete incoming buyer orders.</p>
        </div>
        <div className="page__actions">
          {isStale && <span className="chip chip--caution chip--dot">Stale data</span>}
          <button className="btn btn--ghost btn--sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div className="seg">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`seg__btn${activeTab === t.key ? ' on' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading && list.length === 0 && (
          <div className="empty"><div className="empty__title">Loading…</div></div>
        )}
        {error && list.length === 0 && (
          <div style={{ color: 'var(--unsafe)', padding: '16px 0', fontSize: 13 }}>
            {error.message || 'Failed to load orders.'}
          </div>
        )}
        {!loading && list.length === 0 && !error && (
          <div className="empty">
            <div className="empty__title">No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} orders</div>
          </div>
        )}
      </div>

      {list.map(order => (
        <OrderCard key={order.id} order={order} onAction={refetch} />
      ))}
    </div>
  )
}
