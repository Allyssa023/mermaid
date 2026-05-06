import { useState, useCallback } from 'react'
import { listProcurementOrders, cancelProcurementOrder } from './api/procurement'
import { useVendorPolling } from './hooks/useVendorPolling'

const BUCKETS = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED']

const STATUS_COLORS = {
  PENDING: { bg: '#fef9c3', text: '#854d0e' },
  ACCEPTED: { bg: '#dbeafe', text: '#1e40af' },
  READY: { bg: '#d1fae5', text: '#065f46' },
  COMPLETED: { bg: '#f0fdf4', text: '#166534' },
  CANCELLED: { bg: '#f3f4f6', text: '#6b7280' },
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
    <div style={styles.wrap}>
      <h2 style={styles.heading}>Procurement Orders</h2>

      <div style={styles.tabs}>
        {BUCKETS.map(b => (
          <button
            key={b}
            onClick={() => setBucket(b)}
            style={{ ...styles.tab, ...(bucket === b ? styles.tabActive : {}) }}
          >
            {b.charAt(0) + b.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <p style={styles.muted}>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={styles.muted}>No {bucket.toLowerCase()} orders.</p>
      ) : (
        <div style={styles.list}>
          {orders.map(order => {
            const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING
            const canCancel = order.status === 'PENDING' || order.status === 'ACCEPTED'
            const isCancelOpen = cancellingId === order.id

            return (
              <div key={order.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.cardInfo}>
                    <span style={styles.species}>{order.speciesName ?? '(species unknown)'}</span>
                    {order.isPreorder && <span style={styles.preorderBadge}>Preorder</span>}
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.text }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={styles.orderId}>#{order.id}</div>
                </div>

                <div style={styles.cardBody}>
                  <Row label="From" value={order.fishermanName ?? `Fisherman #${order.fishermanId}`} />
                  {order.qtyKg != null && <Row label="Quantity" value={`${order.qtyKg.toFixed(1)} kg`} />}
                  {order.pricePerKg != null && <Row label="Price" value={`₱${order.pricePerKg.toFixed(2)}/kg`} />}
                  {order.notes && <Row label="Notes" value={order.notes} />}
                  <Row label="Placed" value={new Date(order.createdAt).toLocaleString()} />
                </div>

                {canCancel && !isCancelOpen && (
                  <button
                    onClick={() => { setCancellingId(order.id); setCancelError(null) }}
                    style={styles.cancelTrigger}
                  >
                    Cancel order
                  </button>
                )}

                {isCancelOpen && (
                  <div style={styles.cancelBox}>
                    <input
                      placeholder="Reason (optional)"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      style={styles.reasonInput}
                    />
                    {cancelError && <div style={styles.cancelErr}>{cancelError}</div>}
                    <div style={styles.cancelActions}>
                      <button onClick={() => handleCancel(order.id)} style={styles.confirmCancelBtn}>
                        Confirm Cancel
                      </button>
                      <button
                        onClick={() => { setCancellingId(null); setCancelReason(''); setCancelError(null) }}
                        style={styles.abortBtn}
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
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#6b7280', minWidth: 72 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

const styles = {
  wrap: { padding: 24, maxWidth: 680 },
  heading: { marginTop: 0, marginBottom: 16, fontSize: 20, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 20,
    background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151',
  },
  tabActive: { background: '#0284c7', color: '#fff', borderColor: '#0284c7' },
  muted: { color: '#9ca3af', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', background: '#fff' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  species: { fontWeight: 600, fontSize: 15 },
  preorderBadge: {
    fontSize: 11, padding: '2px 7px', borderRadius: 10,
    background: '#ede9fe', color: '#7c3aed', fontWeight: 500,
  },
  statusBadge: { fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 500 },
  orderId: { fontSize: 12, color: '#9ca3af' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 4 },
  cancelTrigger: {
    marginTop: 12, padding: '5px 12px', background: 'none',
    border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 4, cursor: 'pointer', fontSize: 13,
  },
  cancelBox: { marginTop: 12, padding: 12, background: '#fef2f2', borderRadius: 6 },
  reasonInput: {
    width: '100%', padding: '6px 10px', border: '1px solid #fca5a5',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', marginBottom: 8,
  },
  cancelErr: { color: '#b91c1c', fontSize: 12, marginBottom: 8 },
  cancelActions: { display: 'flex', gap: 8 },
  confirmCancelBtn: {
    padding: '6px 14px', background: '#ef4444', color: '#fff',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
  },
  abortBtn: {
    padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db',
    borderRadius: 4, cursor: 'pointer', fontSize: 13,
  },
}
