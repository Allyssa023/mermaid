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

const STATUS_COLORS = {
  PENDING:   { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
  CONFIRMED: { bg: 'rgba(99,102,241,0.1)',  color: '#4f46e5' },
  ACCEPTED:  { bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  READY:     { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  COMPLETED: { bg: 'rgba(107,114,128,0.1)', color: '#374151' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
}

function StatusBadge({ status }) {
  const style = STATUS_COLORS[status] || {}
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: style.bg, color: style.color,
    }}>
      {status}
    </span>
  )
}

function btnStyle(color, outline = false) {
  return {
    padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${color}`,
    background: outline ? 'transparent' : color,
    color: outline ? color : '#fff',
  }
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
    <div style={{
      background: '#fff', border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 10, padding: '16px 18px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            Order #{order.id}
            {order.kind === 'PROCUREMENT' && (
              <span style={{ marginLeft: 6, fontSize: 11, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
                PROCUREMENT
              </span>
            )}
          </div>
          <div style={{ color: 'var(--ink-2, #6b7280)', fontSize: 13, marginTop: 2 }}>
            {order.buyerName || `Buyer #${order.buyerId}`}
            {order.speciesName && ` · ${order.speciesName}`}
            {order.qtyKg != null && ` · ${order.qtyKg} kg`}
            {order.pricePerKg != null && ` · ₱${order.pricePerKg}/kg`}
          </div>
        </div>
        <StatusBadge status={s} />
      </div>

      {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {(s === 'PENDING' || s === 'CONFIRMED') && (
          <button disabled={busy} onClick={() => act(() => acceptOrder(order.id))}
            style={btnStyle('#2563eb')}>
            {busy ? '…' : 'Accept'}
          </button>
        )}
        {s === 'ACCEPTED' && (
          <button disabled={busy} onClick={() => act(() => markOrderReady(order.id))}
            style={btnStyle('#16a34a')}>
            {busy ? '…' : 'Mark Ready'}
          </button>
        )}
        {s === 'READY' && (
          <button disabled={busy} onClick={() => act(() => completeOrder(order.id))}
            style={btnStyle('#16a34a')}>
            {busy ? '…' : 'Complete'}
          </button>
        )}
        {(s === 'PENDING' || s === 'CONFIRMED' || s === 'ACCEPTED') && !cancelling && (
          <button disabled={busy} onClick={() => setCancelling(true)}
            style={btnStyle('#dc2626', true)}>
            Cancel
          </button>
        )}
      </div>

      {cancelling && (
        <div style={{ marginTop: 10 }}>
          <input
            placeholder="Cancellation reason (optional)"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button disabled={busy}
              onClick={() => act(() => cancelOrder(order.id, cancelReason || undefined))}
              style={btnStyle('#dc2626')}>
              {busy ? '…' : 'Confirm Cancel'}
            </button>
            <button onClick={() => { setCancelling(false); setCancelReason('') }}
              style={btnStyle('#6b7280', true)}>
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
    <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Orders Inbox</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isStale && <span style={{ fontSize: 12, color: '#d97706' }}>● Stale</span>}
          <button onClick={refetch}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === t.key ? 700 : 400,
              color: activeTab === t.key ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>Loading…</div>
      )}

      {error && list.length === 0 && (
        <div style={{ color: '#dc2626', padding: '20px 0' }}>{error.message || 'Failed to load orders.'}</div>
      )}

      {!loading && list.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
          No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} orders.
        </div>
      )}

      {list.map(order => (
        <OrderCard key={order.id} order={order} onAction={refetch} />
      ))}
    </div>
  )
}
