import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
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
const CheckIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const ChevronDownIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const EmptyBoxIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const CreditCardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
)

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Map order status → step index (0-based)
function statusToStep(status) {
  switch (status) {
    case 'PENDING':   return 0
    case 'CONFIRMED': return 1
    case 'COMPLETED': return 2
    case 'CANCELLED': return -1
    case 'DISPUTED':  return -1
    default:          return 0
  }
}

// ── Step Tracker ───────────────────────────────────────────────────────────────

const STEPS = ['Order Placed', 'Confirmed', 'Handoff', 'Payment']

function StepTracker({ order }) {
  const current = statusToStep(order.status)
  const isFailed = order.status === 'CANCELLED' || order.status === 'DISPUTED'

  // Determine logical step: handoff and payment advance the step index further
  let logicalStep = current
  if (order.status === 'CONFIRMED') {
    if (order.handoff?.status === 'CONFIRMED') logicalStep = 2
    if (order.payment) logicalStep = 3
    if (order.payment?.status === 'CONFIRMED') logicalStep = 3
  }
  if (order.status === 'COMPLETED') logicalStep = 3

  return (
    <div className="ord-step-track">
      {STEPS.map((label, i) => {
        const done    = !isFailed && logicalStep > i
        const current = !isFailed && logicalStep === i
        const cls = done ? 'ord-step--done' : current ? 'ord-step--current' : ''
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
            <div className={`ord-step ${cls}`}>
              <div className="ord-step__dot">
                {done ? <CheckIcon size={12} /> : i + 1}
              </div>
              <div className="ord-step__label">{label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`ord-step__connector${done ? ' ord-step__connector--done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Status Chip ────────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    PENDING:   'ord-chip--pending',
    CONFIRMED: 'ord-chip--confirmed',
    COMPLETED: 'ord-chip--completed',
    CANCELLED: 'ord-chip--cancelled',
    DISPUTED:  'ord-chip--disputed',
  }
  return (
    <span className={`ord-chip ${map[status] ?? 'ord-chip--pending'}`}>
      {status}
    </span>
  )
}

// ── Handoff Modal ──────────────────────────────────────────────────────────────

function HandoffModal({ order, token, onSuccess, onClose }) {
  const [actualKg,    setActualKg]    = useState('')
  const [finalPrice,  setFinalPrice]  = useState(order.agreedPricePerKg ?? '')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState(null)

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

  const total = actualKg && finalPrice ? (Number(actualKg) * Number(finalPrice)).toFixed(2) : null

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
            <input className="trip-form__input" type="number" min="0.1" step="0.01" required inputMode="decimal"
              value={actualKg} onChange={e => setActualKg(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Final Price (₱/kg) *</label>
            <input className="trip-form__input" type="number" min="0" step="0.01" required inputMode="decimal"
              value={finalPrice} onChange={e => setFinalPrice(e.target.value)} />
          </div>
          {total && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--text-2)' }}>
              Total: <strong style={{ color: 'var(--safe)', fontSize: 16 }}>₱{total}</strong>
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
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
            <div>Actual weight: <strong style={{ color: 'var(--text-1)' }}>{h?.actualQtyKg} kg</strong></div>
            <div>Final price: <strong style={{ color: 'var(--text-1)' }}>₱{h?.finalPricePerKg}/kg</strong></div>
            <div>Total: <strong style={{ color: 'var(--safe)', fontSize: 16 }}>₱{h?.totalAmount?.toFixed(2)}</strong></div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
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
  const [amount,     setAmount]     = useState(total != null ? String(total.toFixed(2)) : '')
  const [method,     setMethod]     = useState('CASH')
  const [proof,      setProof]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

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
            <input className="trip-form__input" type="number" min="0" step="0.01" required inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Payment Method *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['CASH', 'GCASH', 'MAYA', 'COD', 'BANK_TRANSFER'].map(m => (
                <label key={m} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  background: method === m ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  border: `1.5px solid ${method === m ? 'var(--accent)' : 'var(--border-2)'}`,
                  borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: 13, color: 'var(--text-1)',
                }}>
                  <input type="radio" name="method" value={m} checked={method === m}
                    onChange={() => setMethod(m)} style={{ accentColor: 'var(--accent)' }} />
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
  const [modal,        setModal]       = useState(null)
  const [acting,       setActing]      = useState(null)
  const [handoffOpen,  setHandoffOpen] = useState(false)

  async function act(action) {
    setActing(action)
    try {
      if (action === 'accept')           await apiPut(`/orders/${order.id}/confirm`, token)
      else if (action === 'cancel')      await apiPut(`/orders/${order.id}/cancel`, token)
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

  const handoffPending     = h && h.status !== 'CONFIRMED'
  const sellerNeedsConfirm = isSeller && handoffPending && !h.confirmedBySeller
  const buyerNeedsConfirm  = isBuyer  && handoffPending && !h.confirmedByBuyer

  const buyerInitials  = (order.buyer?.name  ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const sellerInitials = (order.seller?.name ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="ord-card">
      {/* Step tracker */}
      <StepTracker order={order} />

      {/* Header */}
      <div className="ord-card__header">
        <div>
          <div className="ord-card__species">{speciesName}</div>
          <div className="ord-card__date">{fmt(order.createdAt)}</div>
        </div>
        <StatusChip status={order.status} />
      </div>

      {/* Parties row */}
      <div className="ord-card__parties">
        <div className="ord-party">
          <div className="ord-party__avatar ord-party__avatar--buyer">{buyerInitials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="ord-party__label">Buyer</div>
            <div className="ord-party__name">{order.buyer?.name ?? '—'}</div>
          </div>
        </div>
        <div className="ord-party__sep">→</div>
        <div className="ord-party">
          <div className="ord-party__avatar ord-party__avatar--seller">{sellerInitials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="ord-party__label">Seller</div>
            <div className="ord-party__name">{order.seller?.name ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="ord-card__price-row">
        <span className="ord-price-main">₱{order.agreedPricePerKg}/kg</span>
        {order.orderedQtyKg != null && (
          <span className="ord-price-sub">{order.orderedQtyKg} kg ordered</span>
        )}
        {order.orderedQtyEstimate && (
          <span className="ord-price-sub">~{order.orderedQtyEstimate}</span>
        )}
        <span className="ord-badge-bfar">
          <ShieldIcon />
          BFAR ref: {order.bfarReferencePrice ? `₱${order.bfarReferencePrice}/kg` : '—'}
        </span>
        {order.dispatchMode && (
          <span className="ord-dispatch-chip">{order.dispatchMode}</span>
        )}
      </div>

      {/* Handoff section (collapsible) */}
      {h && (
        <div className="ord-handoff">
          <button className="ord-handoff__toggle" onClick={() => setHandoffOpen(o => !o)}>
            <span className="ord-handoff__toggle-label">Handoff Details</span>
            <ChevronDownIcon open={handoffOpen} />
          </button>
          {handoffOpen && (
            <div className="ord-handoff__body">
              <div className="ord-handoff__row">
                <span>Actual weight</span>
                <strong>{h.actualQtyKg} kg</strong>
              </div>
              <div className="ord-handoff__row">
                <span>Final price</span>
                <strong>₱{h.finalPricePerKg}/kg</strong>
              </div>
              <div className="ord-handoff__row">
                <span>Total</span>
                <strong className="ord-handoff__total">₱{h.totalAmount?.toFixed(2)}</strong>
              </div>
              <div className="ord-handoff__confirms">
                <span className={`ord-confirm-badge ${h.confirmedBySeller ? 'ord-confirm-badge--yes' : 'ord-confirm-badge--no'}`}>
                  {h.confirmedBySeller ? <CheckIcon size={11} /> : null}
                  Seller {h.confirmedBySeller ? 'confirmed' : 'pending'}
                </span>
                <span className={`ord-confirm-badge ${h.confirmedByBuyer ? 'ord-confirm-badge--yes' : 'ord-confirm-badge--no'}`}>
                  {h.confirmedByBuyer ? <CheckIcon size={11} /> : null}
                  Buyer {h.confirmedByBuyer ? 'confirmed' : 'pending'}
                </span>
                <StatusChip status={h.status} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment receipt */}
      {p && (
        <div className={`ord-payment${p.status === 'PENDING' ? ' ord-payment--pending' : ''}`}>
          <div className="ord-payment__label">
            <CreditCardIcon />
            {p.status === 'PENDING' ? 'Payment Pending' : 'Payment Confirmed'}
          </div>
          <div className="ord-payment__amount">₱{p.amount?.toFixed(2)}</div>
          <div className="ord-payment__row">
            <span className="ord-method-chip">{p.method}</span>
            {p.proofReference && <span>Ref: {p.proofReference}</span>}
            {p.paidAt && <span>{fmt(p.paidAt)}</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="ord-actions">
        {isSeller && order.status === 'PENDING' && (
          <>
            <button className="trip-btn trip-btn--primary" style={{ fontSize: 13 }}
              onClick={() => act('accept')} disabled={acting === 'accept'}>
              {acting === 'accept' ? 'Accepting…' : 'Accept Order'}
            </button>
            <button className="trip-btn trip-btn--ghost" style={{ fontSize: 13, color: 'var(--unsafe)' }}
              onClick={() => act('cancel')} disabled={acting === 'cancel'}>
              {acting === 'cancel' ? 'Declining…' : 'Decline'}
            </button>
          </>
        )}

        {isBuyer && order.status === 'PENDING' && (
          <button className="trip-btn trip-btn--ghost" style={{ fontSize: 13, color: 'var(--unsafe)' }}
            onClick={() => act('cancel')} disabled={acting === 'cancel'}>
            {acting === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}

        {order.status === 'CONFIRMED' && !h && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 13 }}
            onClick={() => setModal('handoff')}>
            Record Handoff
          </button>
        )}

        {sellerNeedsConfirm && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 13 }}
            onClick={() => setModal('confirm-weight')}>
            Confirm Weight
          </button>
        )}

        {buyerNeedsConfirm && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 13 }}
            onClick={() => setModal('confirm-weight')}>
            Confirm Weight
          </button>
        )}

        {isBuyer && h?.status === 'CONFIRMED' && !p && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 13 }}
            onClick={() => setModal('payment')}>
            Record Payment
          </button>
        )}

        {isSeller && p?.status === 'PENDING' && (
          <button className="trip-btn trip-btn--primary" style={{ fontSize: 13 }}
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

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="ord-list">
      {[1, 2, 3].map(i => (
        <div key={i} className="ord-card" style={{ gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[0, 1, 2, 3].map(j => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                {j < 3 && <div className="skeleton" style={{ flex: 1, height: 2, marginLeft: 0 }} />}
              </div>
            ))}
          </div>
          <div className="skeleton" style={{ height: 20, width: '45%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '65%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 44, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  )
}

// ── Orders Right Panel ─────────────────────────────────────────────────────────

function OrdersPanel({ orders, role }) {
  const counts = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, DISPUTED: 0 }
  let totalValue = 0
  orders.forEach(o => {
    counts[o.status] = (counts[o.status] || 0) + 1
    if (o.status === 'COMPLETED' && o.handoff?.totalAmount) {
      totalValue += o.handoff.totalAmount
    }
  })

  const pipeline = [
    { label: 'Pending',   count: counts.PENDING,   color: 'var(--caution)', dot: '#F59E0B' },
    { label: 'Confirmed', count: counts.CONFIRMED, color: 'var(--accent)',  dot: '#00C9D4' },
    { label: 'Completed', count: counts.COMPLETED, color: 'var(--safe)',    dot: '#00E5A0' },
    { label: 'Cancelled', count: counts.CANCELLED, color: 'var(--unsafe)',  dot: '#FF3D5A' },
    { label: 'Disputed',  count: counts.DISPUTED,  color: 'var(--amber)',   dot: '#FF7B3A' },
  ].filter(p => p.count > 0 || p.label === 'Pending' || p.label === 'Confirmed')

  return (
    <aside className="ord-panel">
      <div className="ord-panel-card">
        <div className="ord-panel-card__title">Order Pipeline</div>
        {pipeline.map(p => (
          <div key={p.label} className="ord-pipeline-row">
            <div className="ord-pipeline-label">
              <span className="ord-pipeline-dot" style={{ background: p.dot }} />
              {p.label}
            </div>
            <span className="ord-pipeline-count" style={{ color: p.count > 0 ? p.color : 'var(--text-3)' }}>{p.count}</span>
          </div>
        ))}
      </div>

      {totalValue > 0 && (
        <div className="ord-panel-card">
          <div className="ord-panel-card__title">Completed Value</div>
          <div className="ord-panel-total">₱{totalValue.toFixed(2)}</div>
          <div className="ord-panel-sub">
            From {counts.COMPLETED} completed order{counts.COMPLETED !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {counts.PENDING > 0 && role === 'FISHERMAN' && (
        <div className="ord-panel-card" style={{ borderColor: 'var(--caution-border)', background: 'var(--caution-dim)' }}>
          <div className="ord-panel-card__title" style={{ color: 'var(--caution)' }}>Action Needed</div>
          <p className="ord-panel-tip" style={{ color: 'var(--caution)' }}>
            You have {counts.PENDING} pending order{counts.PENDING !== 1 ? 's' : ''} waiting for your acceptance.
          </p>
        </div>
      )}

      <div className="ord-panel-card">
        <div className="ord-panel-card__title">Order Flow</div>
        <p className="ord-panel-tip">
          Vendor makes offer → Fisherman accepts → Both confirm handoff weight & price → Vendor records payment → Fisherman confirms receipt.
        </p>
      </div>
    </aside>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DISPUTED']

function stepLabel(status) {
  switch (status) {
    case 'PENDING':   return 'Awaiting'
    case 'CONFIRMED': return 'Confirmed'
    case 'COMPLETED': return 'Delivered'
    case 'CANCELLED': return 'Cancelled'
    case 'DISPUTED':  return 'Disputed'
    default:          return 'Awaiting'
  }
}

export default function Orders({ token, role }) {
  const [orders,       setOrders]      = useState([])
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [openOrder,    setOpenOrder]   = useState(null)

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

  const allOrders = orders
  const pending   = allOrders.filter(o => o.status === 'PENDING').length
  const confirmed = allOrders.filter(o => o.status === 'CONFIRMED').length
  const inTransit = allOrders.filter(o => o.status === 'CONFIRMED' && o.handoff?.status === 'CONFIRMED').length
  const completed = allOrders.filter(o => o.status === 'COMPLETED').length
  const totalValue = allOrders.filter(o => !['CANCELLED', 'DISPUTED'].includes(o.status))
    .reduce((a, o) => a + (o.handoff?.totalAmount ?? (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)), 0)

  const filtered = statusFilter === 'ALL' ? allOrders : allOrders.filter(o => o.status === statusFilter)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            <em>Orders</em>
          </h1>
          <p className="page__sub">Track every confirmed sale from matched alert to delivery.</p>
        </div>
        <div className="page__actions">
          <button className="btn" disabled title="Coming soon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
            </svg>
            Export
          </button>
          <button className="btn" onClick={load} disabled={loading}>
            <RefreshIcon /> {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat"><div className="l">Pending</div><div className="v">{pending}</div><div className="s">Awaiting confirmation</div></div>
        <div className="stat"><div className="l">Confirmed</div><div className="v">{confirmed}</div><div className="s">Ready for handoff</div></div>
        <div className="stat"><div className="l">In transit</div><div className="v">{inTransit}</div><div className="s">Handoff in progress</div></div>
        <div className="stat"><div className="l">Completed</div><div className="v">{completed}</div><div className="s">Fully settled</div></div>
        <div className="stat"><div className="l">Open value</div><div className="v">₱{(totalValue / 1000).toFixed(1)}k</div><div className="s">Across {allOrders.length} orders</div></div>
      </div>

      {/* Pipeline */}
      <div className="pipeline">
        <div className="card__head" style={{ marginBottom: 0 }}>
          <div>
            <div className="card__title">Pipeline this week</div>
            <div className="card__sub">Distribution of open orders across stages</div>
          </div>
          <span className="chip chip--ink">₱{(totalValue / 1000).toFixed(1)}k open</span>
        </div>
        <div className="pipeline__bars">
          <div className="pipeline__bar" style={{ flex: Math.max(pending, 1) }} />
          <div className="pipeline__bar" style={{ flex: Math.max(confirmed, 1) }} />
          <div className="pipeline__bar" style={{ flex: Math.max(inTransit, 1) }} />
          <div className="pipeline__bar" style={{ flex: Math.max(completed, 1) }} />
        </div>
        <div className="pipeline__labels">
          <span><strong>{pending}</strong> Awaiting</span>
          <span><strong>{confirmed}</strong> Confirmed</span>
          <span><strong>{inTransit}</strong> In transit</span>
          <span><strong>{completed}</strong> Delivered</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s}
            className={`chip ${statusFilter === s ? 'chip--ink' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter(s)}>
            {s === 'ALL' ? 'All orders' : s.charAt(0) + s.slice(1).toLowerCase()}
            <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              {s === 'ALL' ? allOrders.length : allOrders.filter(o => o.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--unsafe-soft)', border: '1px solid var(--unsafe)', borderRadius: 'var(--r-md)', marginBottom: 14, fontSize: 13, color: 'var(--unsafe)' }}>
          {error} <button className="btn btn--sm" style={{ marginLeft: 8 }} onClick={load}>Retry</button>
        </div>
      )}

      {/* Orders list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card__title">All orders</div>
            <div className="card__sub">{filtered.length} matching · sorted newest first</div>
          </div>
          <button className="btn btn--sm btn--ghost">
            Sort: Date <ChevronDownIcon open={false} />
          </button>
        </div>
        {loading && filtered.length === 0 ? (
          <div style={{ padding: 18 }}><Skeleton /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--ink-4)' }}>
            <EmptyBoxIcon />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>
              {statusFilter === 'ALL' ? 'No orders yet' : `No ${statusFilter.toLowerCase()} orders`}
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {statusFilter === 'ALL'
                ? 'Orders appear when vendors make offers on catch alerts.'
                : 'Try a different filter.'}
            </div>
          </div>
        ) : (
          filtered.map(o => {
            const step = statusToStep(o.status)
            const failed = step === -1
            return (
              <div key={o.id} className="order-row">
                <div className="order-row__id" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>#{o.id}</div>
                <div className="order-row__party">
                  {role === 'FISHERMAN' ? (o.buyer?.fullName ?? 'Buyer') : (o.seller?.fullName ?? 'Seller')}
                  <small>{o.dispatchMode ?? ''}</small>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{o.species?.commonName ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {o.orderedQtyKg != null ? `${o.orderedQtyKg}kg` : o.orderedQtyEstimate ?? '—'}
                    {o.agreedPricePerKg != null ? ` · ₱${o.agreedPricePerKg}/kg` : ''}
                  </div>
                </div>
                <div className="order-row__total">
                  {o.handoff?.totalAmount != null
                    ? `₱${o.handoff.totalAmount.toLocaleString()}`
                    : o.orderedQtyKg && o.agreedPricePerKg
                      ? `₱${(o.orderedQtyKg * o.agreedPricePerKg).toLocaleString()}`
                      : '—'}
                </div>
                <div>
                  <div className="order-row__steps">
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} className={`order-row__step ${
                        failed ? 'order-row__step--fail' :
                        i < step ? 'order-row__step--done' :
                        i === step ? 'order-row__step--cur' : ''
                      }`} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {failed ? o.status : stepLabel(o.status)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {fmt(o.createdAt)}
                </div>
                <button className="btn btn--sm" onClick={() => setOpenOrder(o)}>
                  Open <span style={{ fontSize: 11 }}>→</span>
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Order detail modal */}
      {openOrder && (
        <div className="modal-backdrop" onClick={() => setOpenOrder(null)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Order #{openOrder.id}</h3>
              <button className="modal__close" onClick={() => setOpenOrder(null)}><XIcon /></button>
            </div>
            <div className="modal__body">
              <OrderCard
                order={openOrder}
                role={role}
                token={token}
                onReload={() => { load(); setOpenOrder(null) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
