import { useState, useEffect, useCallback } from 'react'
import { I } from '../icons'
import { apiGet, apiPost, apiPut } from '../api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

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

// ── Step Tracker ───────────────────────────────────────────────────────────────

const STEPS = ['Order Placed', 'Confirmed', 'Handoff', 'Payment']

function StepTracker({ order }) {
  const current = statusToStep(order.status)
  const isFailed = order.status === 'CANCELLED' || order.status === 'DISPUTED'

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
        const cur     = !isFailed && logicalStep === i
        const cls = done ? 'ord-step--done' : cur ? 'ord-step--current' : ''
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
            <div className={`ord-step ${cls}`}>
              <div className="ord-step__dot">
                {done ? <I.Check size={12} /> : i + 1}
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
  const [actualKg,   setActualKg]   = useState('')
  const [finalPrice, setFinalPrice] = useState(order.agreedPricePerKg ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!actualKg || !finalPrice) return setError('Both fields are required.')
    setSubmitting(true)
    setError(null)
    try {
      await apiPost(`/orders/${order.id}/handoff`, null, {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Record Handoff</h3>
          <button className="modal__close" onClick={onClose}><I.X size={16} /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="trip-err">{error}</div>}
          <div className="form-row">
            <label className="form-row__label">Actual Weight (kg) *</label>
            <input className="input" type="number" min="0.1" step="0.01" required inputMode="decimal"
              value={actualKg} onChange={e => setActualKg(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-row__label">Final Price (₱/kg) *</label>
            <input className="input" type="number" min="0" step="0.01" required inputMode="decimal"
              value={finalPrice} onChange={e => setFinalPrice(e.target.value)} />
          </div>
          {total && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--ink-2)' }}>
              Total: <strong style={{ color: 'var(--safe)', fontSize: 16 }}>₱{total}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Record Handoff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Confirm Weight Modal ───────────────────────────────────────────────────────

function ConfirmWeightModal({ order, role, onSuccess, onClose }) {
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
      await apiPut(path, null)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Confirm Weight & Price</h3>
          <button className="modal__close" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div className="trip-err">{error}</div>}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
            <div>Actual weight: <strong style={{ color: 'var(--ink)' }}>{h?.actualQtyKg} kg</strong></div>
            <div>Final price: <strong style={{ color: 'var(--ink)' }}>₱{h?.finalPricePerKg}/kg</strong></div>
            <div>Total: <strong style={{ color: 'var(--safe)', fontSize: 16 }}>₱{h?.totalAmount?.toFixed(2)}</strong></div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>
            By confirming, you acknowledge that the weight and price above are correct.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary" onClick={confirm} disabled={submitting}>
              {submitting ? 'Confirming…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Payment Modal ──────────────────────────────────────────────────────────────

function PaymentModal({ order, onSuccess, onClose }) {
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
      await apiPost(`/orders/${order.id}/payment`, null, body)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Record Payment</h3>
          <button className="modal__close" onClick={onClose}><I.X size={16} /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="trip-err">{error}</div>}
          <div className="form-row">
            <label className="form-row__label">Amount (₱) *</label>
            <input className="input" type="number" min="0" step="0.01" required inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-row__label">Payment Method *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['CASH', 'GCASH', 'MAYA', 'COD', 'BANK_TRANSFER'].map(m => (
                <label key={m} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  background: method === m ? 'var(--surface)' : 'var(--paper)',
                  border: `1.5px solid ${method === m ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'var(--ink)',
                }}>
                  <input type="radio" name="method" value={m} checked={method === m}
                    onChange={() => setMethod(m)} style={{ accentColor: 'var(--accent)' }} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-row__label">Proof / Reference</label>
            <input className="input" placeholder="GCash ref #, receipt #, etc." value={proof} onChange={e => setProof(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Order Card ─────────────────────────────────────────────────────────────────

function OrderCard({ order, role, onReload }) {
  const [modal,       setModal]      = useState(null)
  const [acting,      setActing]     = useState(null)
  const [handoffOpen, setHandoffOpen] = useState(false)

  async function act(action) {
    setActing(action)
    try {
      if (action === 'accept')              await apiPut(`/orders/${order.id}/confirm`, null)
      else if (action === 'cancel')         await apiPut(`/orders/${order.id}/cancel`, null)
      else if (action === 'confirm-payment') await apiPut(`/orders/${order.id}/payment/confirm`, null)
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
      <StepTracker order={order} />

      <div className="ord-card__header">
        <div>
          <div className="ord-card__species">{speciesName}</div>
          <div className="ord-card__date">{fmt(order.createdAt)}</div>
        </div>
        <StatusChip status={order.status} />
      </div>

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

      <div className="ord-card__price-row">
        <span className="ord-price-main">₱{order.agreedPricePerKg}/kg</span>
        {order.orderedQtyKg != null && (
          <span className="ord-price-sub">{order.orderedQtyKg} kg ordered</span>
        )}
        {order.orderedQtyEstimate && (
          <span className="ord-price-sub">~{order.orderedQtyEstimate}</span>
        )}
        <span className="ord-badge-bfar">
          <I.Shield size={11} />
          BFAR ref: {order.bfarReferencePrice ? `₱${order.bfarReferencePrice}/kg` : '—'}
        </span>
        {order.dispatchMode && (
          <span className="ord-dispatch-chip">{order.dispatchMode}</span>
        )}
      </div>

      {h && (
        <div className="ord-handoff">
          <button className="ord-handoff__toggle" onClick={() => setHandoffOpen(o => !o)}>
            <span className="ord-handoff__toggle-label">Handoff Details</span>
            <I.ChevD size={16} style={{ transition: 'transform 0.2s', transform: handoffOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
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
                  {h.confirmedBySeller ? <I.Check size={11} /> : null}
                  Seller {h.confirmedBySeller ? 'confirmed' : 'pending'}
                </span>
                <span className={`ord-confirm-badge ${h.confirmedByBuyer ? 'ord-confirm-badge--yes' : 'ord-confirm-badge--no'}`}>
                  {h.confirmedByBuyer ? <I.Check size={11} /> : null}
                  Buyer {h.confirmedByBuyer ? 'confirmed' : 'pending'}
                </span>
                <StatusChip status={h.status} />
              </div>
            </div>
          )}
        </div>
      )}

      {p && (
        <div className={`ord-payment${p.status === 'PENDING' ? ' ord-payment--pending' : ''}`}>
          <div className="ord-payment__label">
            <I.Receipt size={14} />
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

      <div className="ord-actions">
        {isSeller && order.status === 'PENDING' && (
          <>
            <button className="btn btn--primary btn--sm"
              onClick={() => act('accept')} disabled={acting === 'accept'}>
              {acting === 'accept' ? 'Accepting…' : 'Accept Order'}
            </button>
            <button className="btn btn--ghost btn--sm" style={{ color: 'var(--unsafe)' }}
              onClick={() => act('cancel')} disabled={acting === 'cancel'}>
              {acting === 'cancel' ? 'Declining…' : 'Decline'}
            </button>
          </>
        )}

        {isBuyer && order.status === 'PENDING' && (
          <button className="btn btn--ghost btn--sm" style={{ color: 'var(--unsafe)' }}
            onClick={() => act('cancel')} disabled={acting === 'cancel'}>
            {acting === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}

        {order.status === 'CONFIRMED' && !h && (
          <button className="btn btn--primary btn--sm"
            onClick={() => setModal('handoff')}>
            Record Handoff
          </button>
        )}

        {sellerNeedsConfirm && (
          <button className="btn btn--primary btn--sm"
            onClick={() => setModal('confirm-weight')}>
            Confirm Weight
          </button>
        )}

        {buyerNeedsConfirm && (
          <button className="btn btn--primary btn--sm"
            onClick={() => setModal('confirm-weight')}>
            Confirm Weight
          </button>
        )}

        {isBuyer && h?.status === 'CONFIRMED' && !p && (
          <button className="btn btn--primary btn--sm"
            onClick={() => setModal('payment')}>
            Record Payment
          </button>
        )}

        {isSeller && p?.status === 'PENDING' && (
          <button className="btn btn--primary btn--sm"
            onClick={() => act('confirm-payment')} disabled={acting === 'confirm-payment'}>
            {acting === 'confirm-payment' ? 'Confirming…' : 'Confirm Receipt'}
          </button>
        )}
      </div>

      {modal === 'handoff' && (
        <HandoffModal order={order}
          onSuccess={() => { setModal(null); onReload() }}
          onClose={() => setModal(null)} />
      )}
      {modal === 'confirm-weight' && (
        <ConfirmWeightModal order={order} role={role}
          onSuccess={() => { setModal(null); onReload() }}
          onClose={() => setModal(null)} />
      )}
      {modal === 'payment' && (
        <PaymentModal order={order}
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

// ── Status Filters ─────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DISPUTED']

// ── Main Component ─────────────────────────────────────────────────────────────

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
          <div className="eyebrow">Fisherman · Sales</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Marketplace <em>Orders.</em>
          </h1>
          <p className="page__sub">Track every confirmed sale from matched alert to delivery.</p>
        </div>
        <div className="page__actions">
          <button className="btn" disabled title="Coming soon">
            <I.Receipt size={14} />
            Export
          </button>
          <button className="btn" onClick={load} disabled={loading}>
            <I.Refresh size={14} /> {loading ? '…' : 'Refresh'}
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
        <div style={{ padding: '12px 16px', background: 'var(--unsafe-soft)', border: '1px solid var(--unsafe)', borderRadius: 8, marginBottom: 14, fontSize: 13, color: 'var(--unsafe)' }}>
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
            Sort: Date <I.ChevD size={14} />
          </button>
        </div>
        {loading && filtered.length === 0 ? (
          <div style={{ padding: 18 }}><Skeleton /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <I.Box size={40} />
            <div className="empty__title">
              {statusFilter === 'ALL' ? 'No orders yet' : `No ${statusFilter.toLowerCase()} orders`}
            </div>
            <div style={{ fontSize: 13, marginTop: 6, color: 'var(--ink-4)' }}>
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
                <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                  {fmt(o.createdAt)}
                </div>
                <button className="btn btn--sm" onClick={() => setOpenOrder(o)}>
                  Open <I.Arrow size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Order detail modal */}
      {openOrder && (
        <div className="modal-overlay" onClick={() => setOpenOrder(null)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Order #{openOrder.id}</h3>
              <button className="modal__close" onClick={() => setOpenOrder(null)}><I.X size={16} /></button>
            </div>
            <div className="modal__body">
              <OrderCard
                order={openOrder}
                role={role}
                onReload={() => { load(); setOpenOrder(null) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
