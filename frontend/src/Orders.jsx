import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut } from './api'

// ── Icons ──────────────────────────────────────────────────────────────────────

const ClipboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </svg>
)
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
)

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusChip({ status }) {
  const map = {
    PENDING:   { bg: '#fef3c7', color: '#92400e' },
    CONFIRMED: { bg: '#dbeafe', color: '#1e40af' },
    COMPLETED: { bg: '#d1fae5', color: '#065f46' },
    CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
    DISPUTED:  { bg: '#fce7f3', color: '#9d174d' },
  }
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  )
}

// ── Handoff Modal ──────────────────────────────────────────────────────────────

function HandoffModal({ order, token, onSuccess, onClose }) {
  const [actualKg, setActualKg] = useState('')
  const [finalPrice, setFinalPrice] = useState(order.agreedPricePerKg ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!actualKg || !finalPrice) return setError('Both fields are required.')
    setSubmitting(true)
    setError(null)
    try {
      await apiPost(`/orders/${order.id}/handoff`, token, {
        actualQtyKg: Number(actualKg),
        finalPricePerKg: Number(finalPrice),
      })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Record Handoff</h3>
          <button className="modal__close" onClick={onClose}><XIcon /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="trip-err">{error}</div>}
          <div className="trip-form__group">
            <label className="trip-form__label">Actual Weight (kg) *</label>
            <input className="trip-form__input" type="number" min="0.1" step="0.01" required
              value={actualKg} onChange={e => setActualKg(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Final Price (₱/kg) *</label>
            <input className="trip-form__input" type="number" min="0" step="0.01" required
              value={finalPrice} onChange={e => setFinalPrice(e.target.value)} />
          </div>
          {actualKg && finalPrice && (
            <div style={{ fontSize: 13, color: '#334155', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
              Total: <strong>₱{(Number(actualKg) * Number(finalPrice)).toFixed(2)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Record Handoff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Confirm Weight Modal ───────────────────────────────────────────────────────

function ConfirmWeightModal({ order, role, token, onSuccess, onClose }) {
  const h = order.handoff
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function confirm() {
    setSubmitting(true)
    setError(null)
    try {
      const path = role === 'FISHERMAN'
        ? `/orders/${order.id}/handoff/confirm-seller`
        : `/orders/${order.id}/handoff/confirm-buyer`
      await apiPut(path, token)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Confirm Weight & Price</h3>
          <button className="modal__close" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div className="trip-err">{error}</div>}
          <div style={{ fontSize: 13, color: '#334155', background: '#f8fafc', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>Actual weight: <strong>{h?.actualQtyKg} kg</strong></div>
            <div>Final price: <strong>₱{h?.finalPricePerKg}/kg</strong></div>
            <div>Total: <strong>₱{h?.totalAmount?.toFixed(2)}</strong></div>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            By confirming, you acknowledge that the weight and price above are correct.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>Cancel</button>
            <button className="trip-btn trip-btn--primary" onClick={confirm} disabled={submitting}>
              {submitting ? 'Confirming…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Payment Modal ──────────────────────────────────────────────────────────────

function PaymentModal({ order, token, onSuccess, onClose }) {
  const total = order.handoff?.totalAmount
  const [amount, setAmount] = useState(total != null ? String(total.toFixed(2)) : '')
  const [method, setMethod] = useState('CASH')
  const [proof, setProof] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!amount) return setError('Amount is required.')
    setSubmitting(true)
    setError(null)
    try {
      const body = { amount: Number(amount), method }
      if (proof) body.proofReference = proof
      await apiPost(`/orders/${order.id}/payment`, token, body)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Record Payment</h3>
          <button className="modal__close" onClick={onClose}><XIcon /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="trip-err">{error}</div>}
          <div className="trip-form__group">
            <label className="trip-form__label">Amount (₱) *</label>
            <input className="trip-form__input" type="number" min="0" step="0.01" required
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Payment Method *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['CASH', 'GCASH', 'MAYA', 'COD', 'BANK_TRANSFER'].map(m => (
                <label key={m} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  background: method === m ? '#eff6ff' : '#f8fafc',
                  border: `1.5px solid ${method === m ? '#3b82f6' : '#e2e8f0'}`,
                  borderRadius: 8, padding: '6px 12px', fontSize: 13,
                }}>
                  <input type="radio" name="method" value={m} checked={method === m}
                    onChange={() => setMethod(m)} style={{ accentColor: '#3b82f6' }} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Proof / Reference</label>
            <input className="trip-form__input" placeholder="GCash ref #, receipt #, etc." value={proof} onChange={e => setProof(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Order Card ─────────────────────────────────────────────────────────────────

function OrderCard({ order, role, token, onReload }) {
  const [modal, setModal] = useState(null) // 'handoff' | 'confirm-weight' | 'payment' | null
  const [acting, setActing] = useState(null)

  async function act(action) {
    setActing(action)
    try {
      if (action === 'accept')          await apiPut(`/orders/${order.id}/confirm`, token)
      else if (action === 'cancel')     await apiPut(`/orders/${order.id}/cancel`, token)
      else if (action === 'confirm-payment') await apiPut(`/orders/${order.id}/payment/confirm`, token)
      onReload()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setActing(null)
    }
  }

  const h = order.handoff
  const p = order.payment
  const speciesName = order.species?.commonName ?? '—'
  const isSeller = role === 'FISHERMAN'
  const isBuyer  = role === 'VENDOR'

  const handoffPending = h && h.status !== 'CONFIRMED'
  const sellerNeedsConfirm = isSeller && handoffPending && !h.confirmedBySeller
  const buyerNeedsConfirm  = isBuyer  && handoffPending && !h.confirmedByBuyer

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{speciesName}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{fmt(order.createdAt)}</div>
        </div>
        <StatusChip status={order.status} />
      </div>

      {/* Parties */}
      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div>Buyer: <strong>{order.buyer?.name ?? '—'}</strong></div>
        <div>Seller: <strong>{order.seller?.name ?? '—'}</strong></div>
        <div>Agreed price: <strong>₱{order.agreedPricePerKg}/kg</strong></div>
        {order.orderedQtyEstimate && <div>Estimated qty: {order.orderedQtyEstimate}</div>}
        {order.orderedQtyKg != null && <div>Ordered: {order.orderedQtyKg} kg</div>}
        {order.dispatchMode && <div>Dispatch: {order.dispatchMode}</div>}
      </div>

      {/* Handoff section */}
      {h && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#334155' }}>Handoff</div>
          <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>Actual weight: {h.actualQtyKg} kg · Price: ₱{h.finalPricePerKg}/kg · Total: ₱{h.totalAmount?.toFixed(2)}</div>
            <div>
              Seller confirmed: {h.confirmedBySeller ? '✓' : '…'} &nbsp;
              Buyer confirmed: {h.confirmedByBuyer ? '✓' : '…'} &nbsp;
              <StatusChip status={h.status} />
            </div>
          </div>
        </div>
      )}

      {/* Payment section */}
      {p && (
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#166534' }}>Payment</div>
          <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>₱{p.amount?.toFixed(2)} · {p.method} · <StatusChip status={p.status} /></div>
            {p.proofReference && <div>Ref: {p.proofReference}</div>}
            {p.paidAt && <div>Confirmed: {fmt(p.paidAt)}</div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* FISHERMAN on PENDING → accept or decline */}
        {isSeller && order.status === 'PENDING' && (
          <>
            <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
              onClick={() => act('accept')} disabled={acting === 'accept'}>
              {acting === 'accept' ? 'Accepting…' : 'Accept Order'}
            </button>
            <button className="trip-btn trip-btn--ghost" style={{ fontSize: 12, padding: '5px 14px', color: '#dc2626' }}
              onClick={() => act('cancel')} disabled={acting === 'cancel'}>
              {acting === 'cancel' ? 'Declining…' : 'Decline'}
            </button>
          </>
        )}

        {/* VENDOR on PENDING → cancel */}
        {isBuyer && order.status === 'PENDING' && (
          <button className="trip-btn trip-btn--ghost" style={{ fontSize: 12, padding: '5px 14px', color: '#dc2626' }}
            onClick={() => act('cancel')} disabled={acting === 'cancel'}>
            {acting === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}

        {/* CONFIRMED + no handoff yet → either party can record handoff */}
        {order.status === 'CONFIRMED' && !h && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
            onClick={() => setModal('handoff')}>
            Record Handoff
          </button>
        )}

        {/* Handoff exists + PENDING + this party hasn't confirmed */}
        {sellerNeedsConfirm && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
            onClick={() => setModal('confirm-weight')}>
            Confirm Weight
          </button>
        )}
        {buyerNeedsConfirm && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
            onClick={() => setModal('confirm-weight')}>
            Confirm Weight
          </button>
        )}

        {/* VENDOR: handoff confirmed, no payment yet → record payment */}
        {isBuyer && h?.status === 'CONFIRMED' && !p && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
            onClick={() => setModal('payment')}>
            Record Payment
          </button>
        )}

        {/* FISHERMAN: payment exists + PENDING → confirm receipt */}
        {isSeller && p?.status === 'PENDING' && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
            onClick={() => act('confirm-payment')} disabled={acting === 'confirm-payment'}>
            {acting === 'confirm-payment' ? 'Confirming…' : 'Confirm Receipt'}
          </button>
        )}
      </div>

      {/* Modals */}
      {modal === 'handoff' && (
        <HandoffModal order={order} token={token}
          onSuccess={() => { setModal(null); onReload() }}
          onClose={() => setModal(null)} />
      )}
      {modal === 'confirm-weight' && (
        <ConfirmWeightModal order={order} role={role} token={token}
          onSuccess={() => { setModal(null); onReload() }}
          onClose={() => setModal(null)} />
      )}
      {modal === 'payment' && (
        <PaymentModal order={order} token={token}
          onSuccess={() => { setModal(null); onReload() }}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export default function Orders({ token, role }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
      const data = await apiGet(`/orders/mine${qs}`, token)
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: '32px 36px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardIcon />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>My Orders</h2>
        </div>
        <button className="trip-btn trip-btn--ghost" style={{ fontSize: 13 }} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(s => (
          <button key={s}
            style={{
              padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: statusFilter === s ? '#2563eb' : '#f1f5f9',
              color: statusFilter === s ? '#fff' : '#64748b',
            }}
            onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="trip-err" style={{ marginBottom: 16 }}>
          {error} <button className="trip-btn trip-btn--ghost" style={{ marginLeft: 8, fontSize: 12 }} onClick={load}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div style={{
          background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12,
          padding: '40px 20px', textAlign: 'center', color: '#94a3b8',
        }}>
          {statusFilter === 'ALL'
            ? 'No orders yet.'
            : `No ${statusFilter.toLowerCase()} orders.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(o => (
            <OrderCard key={o.id} order={o} role={role} token={token} onReload={load} />
          ))}
        </div>
      )}
    </div>
  )
}
