# Plan 2: Ordering Flow Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete ordering flow UI — action-driven modals, visual timeline, and a shared `OrderCard` component — then wire `fisherman/Orders.jsx` and `vendor/OrdersInbox.jsx` to the real API. This unlocks the full PENDING → COMPLETED lifecycle for both order types.

**Architecture:** All modals are in `frontend/src/components/modals/`. `OrderCard` is a shared component that renders differently per role + status. `OrderTimeline` reads `OrderStatusEvent[]` from the backend timeline endpoint. `fisherman/api/orders.js` covers all order actions; vendor orders use the existing `vendor/api/orders.js`.

**Tech Stack:** React 18, @tanstack/react-query v5, @testing-library/react, Vitest

**Spec:** `docs/superpowers/specs/2026-05-11-mock-to-real-data-integration-design.md` — Section 5

**Prerequisite:** Plan 1 must be complete (Skeleton, ApiError, QueryClientProvider must exist).

---

## File Map

| Action | File |
|---|---|
| Create | `frontend/src/components/modals/CrudModal.jsx` |
| Create | `frontend/src/components/OrderTimeline.jsx` |
| Create | `frontend/src/components/modals/ConfirmOrderModal.jsx` |
| Create | `frontend/src/components/modals/InitiateHandoffModal.jsx` |
| Create | `frontend/src/components/modals/ConfirmHandoffModal.jsx` |
| Create | `frontend/src/components/modals/RecordPaymentModal.jsx` |
| Create | `frontend/src/components/modals/ConfirmPaymentModal.jsx` |
| Create | `frontend/src/components/modals/CancelOrderModal.jsx` |
| Create | `frontend/src/components/modals/DisputeModal.jsx` |
| Create | `frontend/src/fisherman/api/orders.js` |
| Create | `frontend/src/components/OrderCard.jsx` |
| Modify | `frontend/src/fisherman/Orders.jsx` |
| Modify | `frontend/src/vendor/OrdersInbox.jsx` |
| Create | `frontend/src/components/__tests__/OrderCard.test.jsx` |
| Create | `frontend/src/components/__tests__/modals.test.jsx` |

---

### Task 1: Create CrudModal (generic reusable modal)

**Files:**
- Create: `frontend/src/components/modals/CrudModal.jsx`

This is the base modal used for all CRUD operations (create listing, edit catch alert, delete inventory lot, etc.).

- [ ] **Step 1: Create CrudModal.jsx**

```jsx
// frontend/src/components/modals/CrudModal.jsx
import { useEffect, useRef } from 'react'

export default function CrudModal({
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmDestructive = false,
  loading = false,
  disabled = false,
  children,
}) {
  const overlayRef = useRef()

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <span className="modal__title">{title}</span>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal__body">{children}</div>
        {onConfirm && (
          <div className="modal__foot">
            <button className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={`btn ${confirmDestructive ? 'btn--danger' : 'btn--primary'}`}
              onClick={onConfirm}
              disabled={disabled || loading}
            >
              {loading ? <span className="spinner" /> : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

Add modal CSS to `design-system.css` (append):

```css
/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 16px;
}
.modal {
  background: var(--surface-1); border-radius: 14px;
  width: 100%; max-width: 480px; max-height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--border);
}
.modal__title { font-weight: 600; font-size: 15px; }
.modal__close { background: none; border: none; cursor: pointer; font-size: 18px; color: var(--text-2); }
.modal__body { padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; }
.modal__foot { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--border); }
.spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid currentColor; border-top-color: transparent;
  border-radius: 50%; animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/modals/CrudModal.jsx frontend/src/design-system.css
git commit -m "feat: add CrudModal base component"
```

---

### Task 2: Create OrderTimeline component

**Files:**
- Create: `frontend/src/components/OrderTimeline.jsx`

- [ ] **Step 1: Create OrderTimeline.jsx**

```jsx
// frontend/src/components/OrderTimeline.jsx

// steps for Type A (catch alert orders)
const TYPE_A_STEPS = ['Created', 'Confirmed', 'Handoff', 'Paid', 'Completed']
// steps for Type B (storefront orders)
const TYPE_B_STEPS = ['New', 'Preparing', 'Ready', 'Completed']

const STATUS_TO_STEP_A = {
  PENDING: 0, CONFIRMED: 1,
  HANDOFF_PENDING: 2, HANDOFF_CONFIRMED: 2,
  PAYMENT_PENDING: 3, PAYMENT_CONFIRMED: 3,
  COMPLETED: 4, CANCELLED: -1, DISPUTED: 2,
}
const STATUS_TO_STEP_B = {
  NEW: 0, PREPARING: 1, READY: 2, COMPLETED: 3, CANCELLED: -1,
}

export default function OrderTimeline({ events = [], orderType = 'A', currentStatus }) {
  const steps = orderType === 'A' ? TYPE_A_STEPS : TYPE_B_STEPS
  const stepMap = orderType === 'A' ? STATUS_TO_STEP_A : STATUS_TO_STEP_B
  const currentStep = stepMap[currentStatus] ?? 0
  const isCancelled = currentStatus === 'CANCELLED'

  return (
    <div className="order-timeline">
      {steps.map((label, i) => {
        const done    = !isCancelled && i < currentStep
        const active  = !isCancelled && i === currentStep
        const event   = events.find(e => stepMap[e.status] === i)
        return (
          <div key={label} className={`timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="timeline-step__dot">{done ? '✓' : i + 1}</div>
            <div className="timeline-step__label">{label}</div>
            {event && <div className="timeline-step__ts">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
            {i < steps.length - 1 && <div className="timeline-step__line" />}
          </div>
        )
      })}
      {isCancelled && <div className="timeline-cancelled">Cancelled</div>}
    </div>
  )
}
```

Add CSS to `design-system.css`:

```css
/* Order Timeline */
.order-timeline {
  display: flex; align-items: flex-start; gap: 0; overflow-x: auto; padding: 12px 0;
}
.timeline-step {
  display: flex; flex-direction: column; align-items: center;
  flex: 1; position: relative; min-width: 64px;
}
.timeline-step__dot {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--surface-2); border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; z-index: 1;
}
.timeline-step.done .timeline-step__dot  { background: var(--accent); color: #fff; border-color: var(--accent); }
.timeline-step.active .timeline-step__dot { border-color: var(--accent); color: var(--accent); }
.timeline-step__label { font-size: 10px; margin-top: 4px; color: var(--text-2); text-align: center; }
.timeline-step.active .timeline-step__label { color: var(--text-1); font-weight: 600; }
.timeline-step__ts { font-size: 9px; color: var(--text-3); margin-top: 2px; }
.timeline-step__line {
  position: absolute; top: 14px; left: 50%; width: 100%;
  height: 2px; background: var(--border); z-index: 0;
}
.timeline-step.done .timeline-step__line { background: var(--accent); }
.timeline-cancelled { font-size: 12px; color: var(--danger); font-weight: 600; margin-left: 8px; align-self: center; }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/OrderTimeline.jsx frontend/src/design-system.css
git commit -m "feat: add OrderTimeline stepper component"
```

---

### Task 3: Create order action modals

**Files:**
- Create: `frontend/src/components/modals/ConfirmOrderModal.jsx`
- Create: `frontend/src/components/modals/InitiateHandoffModal.jsx`
- Create: `frontend/src/components/modals/ConfirmHandoffModal.jsx`
- Create: `frontend/src/components/modals/RecordPaymentModal.jsx`
- Create: `frontend/src/components/modals/ConfirmPaymentModal.jsx`
- Create: `frontend/src/components/modals/CancelOrderModal.jsx`
- Create: `frontend/src/components/modals/DisputeModal.jsx`
- Create: `frontend/src/components/__tests__/modals.test.jsx`

- [ ] **Step 1: Write failing tests for modals**

```jsx
// frontend/src/components/__tests__/modals.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmOrderModal from '../modals/ConfirmOrderModal'
import InitiateHandoffModal from '../modals/InitiateHandoffModal'
import CancelOrderModal from '../modals/CancelOrderModal'

const MOCK_ORDER = {
  id: 1, orderCode: 'ORD-001',
  buyer: { fullName: 'Marina Seafoods' },
  species: { commonName: 'Yellowfin Tuna' },
  orderedQtyKg: 42, agreedPricePerKg: 380, dispatchMode: 'DELIVERY',
}

describe('ConfirmOrderModal', () => {
  it('renders order details', () => {
    render(<ConfirmOrderModal order={MOCK_ORDER} onClose={vi.fn()} onConfirm={vi.fn()} onDecline={vi.fn()} />)
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
    expect(screen.getByText(/Yellowfin Tuna/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument()
  })
})

describe('InitiateHandoffModal', () => {
  it('confirm is disabled until actualKg is filled', () => {
    render(<InitiateHandoffModal order={MOCK_ORDER} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /confirm handoff/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/actual weight/i), { target: { value: '41' } })
    expect(screen.getByRole('button', { name: /confirm handoff/i })).not.toBeDisabled()
  })
})

describe('CancelOrderModal', () => {
  it('confirm is disabled until reason is provided', () => {
    render(<CancelOrderModal order={MOCK_ORDER} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'Changed my mind' } })
    expect(screen.getByRole('button', { name: /cancel order/i })).not.toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/__tests__/modals.test.jsx
```

- [ ] **Step 3: Create ConfirmOrderModal.jsx**

```jsx
// frontend/src/components/modals/ConfirmOrderModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmOrderModal({ order, onClose, onConfirm, onDecline, loading }) {
  const total = (order.orderedQtyKg * order.agreedPricePerKg).toLocaleString('en-PH')
  return (
    <CrudModal
      title={`Confirm Order ${order.orderCode}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Confirm Order"
      loading={loading}
    >
      <div className="order-modal-row"><span>From</span><strong>{order.buyer?.fullName}</strong></div>
      <div className="order-modal-row"><span>Species</span><strong>{order.species?.commonName}</strong></div>
      <div className="order-modal-row"><span>Quantity</span><strong>{order.orderedQtyKg} kg</strong></div>
      <div className="order-modal-row"><span>Price</span><strong>₱{order.agreedPricePerKg}/kg</strong></div>
      <div className="order-modal-row order-modal-row--total"><span>Total</span><strong>₱{total}</strong></div>
      <div className="order-modal-row"><span>Dispatch</span><strong>{order.dispatchMode}</strong></div>
      <button className="btn btn--ghost btn--danger" onClick={onDecline} disabled={loading} style={{ marginTop: 8 }}>
        Decline Order
      </button>
    </CrudModal>
  )
}
```

- [ ] **Step 4: Create InitiateHandoffModal.jsx**

```jsx
// frontend/src/components/modals/InitiateHandoffModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function InitiateHandoffModal({ order, onClose, onSubmit, loading }) {
  const [actualKg, setActualKg] = useState('')
  const [finalPrice, setFinalPrice] = useState(order.agreedPricePerKg ?? '')
  const total = actualKg && finalPrice ? (actualKg * finalPrice).toLocaleString('en-PH') : '—'
  const valid = actualKg > 0 && finalPrice > 0

  return (
    <CrudModal
      title={`Initiate Handoff — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ actualQtyKg: Number(actualKg), finalPricePerKg: Number(finalPrice) })}
      confirmLabel="Confirm Handoff"
      loading={loading}
      disabled={!valid}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Record what was actually handed over at the dock. Both parties will need to confirm.
      </p>
      <label className="field-label" htmlFor="actualKg">Actual Weight (kg)</label>
      <input id="actualKg" aria-label="actual weight" className="input" type="number" min="0" step="0.1"
        value={actualKg} onChange={e => setActualKg(e.target.value)} placeholder={`Agreed: ${order.orderedQtyKg} kg`} />
      <label className="field-label" htmlFor="finalPrice">Final Price / kg (₱)</label>
      <input id="finalPrice" className="input" type="number" min="0" step="0.5"
        value={finalPrice} onChange={e => setFinalPrice(e.target.value)} />
      <div className="order-modal-row order-modal-row--total"><span>Total</span><strong>₱{total}</strong></div>
    </CrudModal>
  )
}
```

- [ ] **Step 5: Create ConfirmHandoffModal.jsx**

```jsx
// frontend/src/components/modals/ConfirmHandoffModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmHandoffModal({ order, handoff, onClose, onConfirm, onDispute, loading }) {
  const total = (handoff.actualQtyKg * handoff.finalPricePerKg).toLocaleString('en-PH')
  return (
    <CrudModal
      title={`Confirm Handoff — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Confirm Receipt"
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Confirm that you received the following from {order.seller?.fullName ?? 'the fisherman'}:
      </p>
      <div className="order-modal-row"><span>Actual weight</span><strong>{handoff.actualQtyKg} kg</strong></div>
      <div className="order-modal-row"><span>Final price</span><strong>₱{handoff.finalPricePerKg}/kg</strong></div>
      <div className="order-modal-row order-modal-row--total"><span>Total owed</span><strong>₱{total}</strong></div>
      <button className="btn btn--ghost btn--danger" onClick={onDispute} disabled={loading} style={{ marginTop: 8 }}>
        Raise Dispute
      </button>
    </CrudModal>
  )
}
```

- [ ] **Step 6: Create RecordPaymentModal.jsx**

```jsx
// frontend/src/components/modals/RecordPaymentModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

const METHODS = ['GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER']

export default function RecordPaymentModal({ order, handoff, onClose, onSubmit, loading }) {
  const [method, setMethod]   = useState('GCASH')
  const [reference, setRef]   = useState('')
  const amount = handoff?.totalAmount ?? (order.orderedQtyKg * order.agreedPricePerKg)

  return (
    <CrudModal
      title={`Record Payment — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ method, reference, amount })}
      confirmLabel="Record Payment"
      loading={loading}
    >
      <div className="order-modal-row order-modal-row--total">
        <span>Amount</span><strong>₱{amount?.toLocaleString('en-PH')}</strong>
      </div>
      <label className="field-label">Payment Method</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {METHODS.map(m => (
          <button key={m} className={`btn btn--sm ${method === m ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setMethod(m)}>{m.replace('_', ' ')}</button>
        ))}
      </div>
      {(method === 'GCASH' || method === 'MAYA' || method === 'BANK_TRANSFER') && (
        <>
          <label className="field-label" htmlFor="ref">Reference Number</label>
          <input id="ref" className="input" value={reference} onChange={e => setRef(e.target.value)}
            placeholder="Transaction / reference #" />
        </>
      )}
    </CrudModal>
  )
}
```

- [ ] **Step 7: Create ConfirmPaymentModal.jsx**

```jsx
// frontend/src/components/modals/ConfirmPaymentModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmPaymentModal({ order, payment, onClose, onConfirm, loading }) {
  return (
    <CrudModal
      title={`Confirm Payment Received — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Yes, I Received Payment"
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Confirm that you have received payment for this order.
      </p>
      <div className="order-modal-row"><span>Amount</span><strong>₱{payment?.amount?.toLocaleString('en-PH')}</strong></div>
      <div className="order-modal-row"><span>Method</span><strong>{payment?.method?.replace('_', ' ')}</strong></div>
      {payment?.reference && <div className="order-modal-row"><span>Reference</span><strong>{payment.reference}</strong></div>}
    </CrudModal>
  )
}
```

- [ ] **Step 8: Create CancelOrderModal.jsx**

```jsx
// frontend/src/components/modals/CancelOrderModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function CancelOrderModal({ order, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  return (
    <CrudModal
      title={`Cancel Order ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
      confirmLabel="Cancel Order"
      confirmDestructive
      loading={loading}
      disabled={!reason.trim()}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        This cannot be undone. Both parties will be notified.
      </p>
      <label className="field-label" htmlFor="reason">Reason <span style={{color:'var(--danger)'}}>*</span></label>
      <textarea id="reason" aria-label="reason" className="input" rows={3}
        value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Explain why you are cancelling this order…" />
    </CrudModal>
  )
}
```

- [ ] **Step 9: Create DisputeModal.jsx**

```jsx
// frontend/src/components/modals/DisputeModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function DisputeModal({ order, onClose, onSubmit, loading }) {
  const [reason, setReason] = useState('')
  return (
    <CrudModal
      title={`Raise Dispute — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ reason })}
      confirmLabel="Raise Dispute"
      confirmDestructive
      loading={loading}
      disabled={!reason.trim()}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Describe the discrepancy — weight, quality, or price disagreement. This will be visible to the other party.
      </p>
      <label className="field-label" htmlFor="dispute-reason">Dispute Reason <span style={{color:'var(--danger)'}}>*</span></label>
      <textarea id="dispute-reason" aria-label="reason" className="input" rows={4}
        value={reason} onChange={e => setReason(e.target.value)}
        placeholder="e.g. Received 38kg but invoice says 42kg…" />
    </CrudModal>
  )
}
```

- [ ] **Step 10: Run tests — expect PASS**

```bash
npx vitest run src/components/__tests__/modals.test.jsx
```

- [ ] **Step 11: Commit**

```bash
git add frontend/src/components/modals/ frontend/src/components/__tests__/modals.test.jsx
git commit -m "feat: add all order action modals (confirm, handoff, payment, cancel, dispute)"
```

---

### Task 4: Create fisherman/api/orders.js

**Files:**
- Create: `frontend/src/fisherman/api/orders.js`

- [ ] **Step 1: Create orders.js**

```js
// frontend/src/fisherman/api/orders.js
import { apiGet, apiPost } from '../../api'

export const listOrders      = (status) => apiGet(`/orders${status ? `?status=${status}` : ''}`)
export const getOrder        = (id)     => apiGet(`/orders/${id}`)
export const confirmOrder    = (id)     => apiPost(`/orders/${id}/confirm`, null, {})
export const cancelOrder     = (id, reason) => apiPost(`/orders/${id}/cancel`, null, { reason })
export const initiateHandoff = (id, body)   => apiPost(`/orders/${id}/handoff`, null, body)
export const confirmHandoff  = (id)         => apiPost(`/orders/${id}/handoff/confirm`, null, {})
export const recordPayment   = (id, body)   => apiPost(`/orders/${id}/payment`, null, body)
export const confirmPayment  = (id)         => apiPost(`/orders/${id}/payment/confirm`, null, {})
export const getTimeline     = (id)         => apiGet(`/orders/${id}/timeline`)
export const raiseDispute    = (id, body)   => apiPost(`/orders/${id}/dispute`, null, body)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/api/orders.js
git commit -m "feat(fisherman): add orders.js API module with full order lifecycle calls"
```

---

### Task 5: Create OrderCard component

**Files:**
- Create: `frontend/src/components/OrderCard.jsx`
- Create: `frontend/src/components/__tests__/OrderCard.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/components/__tests__/OrderCard.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderCard from '../OrderCard'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const BASE_ORDER = {
  id: 1, orderCode: 'ORD-001',
  buyer: { fullName: 'Marina Seafoods' },
  seller: { fullName: 'Ramiro Delgado' },
  species: { commonName: 'Yellowfin Tuna' },
  orderedQtyKg: 42, agreedPricePerKg: 380,
  status: 'PENDING', handoff: null, payment: null,
}

describe('OrderCard — fisherman perspective', () => {
  it('shows Confirm Order button when PENDING + role=FISHERMAN', () => {
    wrap(<OrderCard order={BASE_ORDER} currentRole="FISHERMAN" onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument()
  })

  it('shows "Waiting" text when CONFIRMED + role=FISHERMAN', () => {
    wrap(<OrderCard order={{ ...BASE_ORDER, status: 'CONFIRMED' }} currentRole="FISHERMAN" onAction={vi.fn()} />)
    expect(screen.getByText(/waiting/i)).toBeInTheDocument()
  })

  it('shows order code', () => {
    wrap(<OrderCard order={BASE_ORDER} currentRole="FISHERMAN" onAction={vi.fn()} />)
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
  })
})

describe('OrderCard — vendor perspective', () => {
  it('shows Initiate Handoff when CONFIRMED + role=VENDOR', () => {
    wrap(<OrderCard order={{ ...BASE_ORDER, status: 'CONFIRMED' }} currentRole="VENDOR" onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /initiate handoff/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/__tests__/OrderCard.test.jsx
```

- [ ] **Step 3: Create OrderCard.jsx**

```jsx
// frontend/src/components/OrderCard.jsx
import { useState } from 'react'
import OrderTimeline from './OrderTimeline'
import ConfirmOrderModal   from './modals/ConfirmOrderModal'
import InitiateHandoffModal from './modals/InitiateHandoffModal'
import ConfirmHandoffModal  from './modals/ConfirmHandoffModal'
import RecordPaymentModal   from './modals/RecordPaymentModal'
import ConfirmPaymentModal  from './modals/ConfirmPaymentModal'
import CancelOrderModal     from './modals/CancelOrderModal'
import DisputeModal         from './modals/DisputeModal'

// Determine which primary action the current user can take.
// orderType 'A' = catch-alert (fisherman↔vendor), 'B' = storefront (vendor↔buyer)
function getPrimaryAction(order, role, orderType) {
  const { status, handoff, payment } = order
  if (orderType === 'B') {
    if (role === 'VENDOR') {
      if (status === 'NEW')       return 'ACCEPT'
      if (status === 'PREPARING') return 'MARK_READY'
      if (status === 'READY')     return 'COMPLETE'
      if (status === 'COMPLETED') return 'PAYOUT'
    }
    if (role === 'BUYER') {
      if (status === 'READY')     return 'CONFIRM_RECEIPT'
      if (status === 'COMPLETED') return 'LEAVE_REVIEW'
    }
    return null
  }
  // Type A
  if (role === 'FISHERMAN') {
    if (status === 'PENDING')                                                  return 'CONFIRM_ORDER'
    if (status === 'CONFIRMED' && handoff?.status === 'PENDING')               return 'CONFIRM_HANDOFF'
    if (status === 'CONFIRMED' && payment?.status === 'PENDING')               return 'CONFIRM_PAYMENT'
    if (status === 'COMPLETED')                                                return 'VIEW_EARNINGS'
  }
  if (role === 'VENDOR') {
    if (status === 'CONFIRMED' && !handoff)                                    return 'INITIATE_HANDOFF'
    if (status === 'CONFIRMED' && handoff?.status === 'CONFIRMED' && !payment) return 'RECORD_PAYMENT'
    if (status === 'COMPLETED')                                                return 'PAYOUT'
  }
  return null
}

function WhosTurnBanner({ order, role, orderType }) {
  const action = getPrimaryAction(order, role, orderType)
  if (action) return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (order.status === 'PENDING' && role !== 'FISHERMAN') return <div className="whos-turn">Waiting for fisherman to confirm</div>
  if (order.status === 'CONFIRMED' && role !== 'VENDOR')  return <div className="whos-turn">Waiting for vendor</div>
  return null
}

// mutations is an object of plain async functions; OrderCard tracks its own submitting state
// so modal spinners work without requiring useMutation objects from the caller.
export default function OrderCard({ order, currentRole, orderType = 'A', onAction, mutations = {} }) {
  const [modal, setModal]         = useState(null)
  const [expanded, setExpanded]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const action = getPrimaryAction(order, currentRole, orderType)

  async function runMutation(fn) {
    setSubmitting(true)
    try { await fn() }
    finally { setSubmitting(false); setModal(null) }
  }

  const statusChip = (
    <span className={`chip chip--${order.status.toLowerCase()}`}>{order.status}</span>
  )

  const canCancel = orderType === 'A'
    ? (order.status === 'PENDING' || order.status === 'CONFIRMED')
    : (order.status === 'NEW' || order.status === 'PREPARING')

  return (
    <div className="card order-card">
      {/* Header */}
      <div className="order-card__head" onClick={() => setExpanded(v => !v)}>
        <span className="order-card__code">{order.orderCode}</span>
        {statusChip}
      </div>

      {/* Summary */}
      <div className="order-card__summary">
        <span>{order.species?.commonName ?? order.listing?.title}</span>
        {orderType === 'A' && <span>{order.orderedQtyKg} kg · ₱{order.agreedPricePerKg}/kg</span>}
      </div>

      {/* Timeline (expanded) */}
      {expanded && (
        <OrderTimeline
          events={order.timeline ?? []}
          orderType={orderType}
          currentStatus={order.status}
        />
      )}

      {/* Whose turn banner + action button */}
      <WhosTurnBanner order={order} role={currentRole} orderType={orderType} />

      <div className="order-card__actions">
        {/* Type A actions */}
        {action === 'CONFIRM_ORDER'    && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_ORDER')}>Confirm Order</button>}
        {action === 'CONFIRM_HANDOFF'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_HANDOFF')}>Confirm Handoff</button>}
        {action === 'CONFIRM_PAYMENT'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_PAYMENT')}>Confirm Payment</button>}
        {action === 'INITIATE_HANDOFF' && <button className="btn btn--primary btn--sm" onClick={() => setModal('INITIATE_HANDOFF')}>Initiate Handoff</button>}
        {action === 'RECORD_PAYMENT'   && <button className="btn btn--primary btn--sm" onClick={() => setModal('RECORD_PAYMENT')}>Record Payment</button>}
        {action === 'VIEW_EARNINGS'    && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('EARNINGS')}>View in Earnings</button>}
        {/* Type B actions */}
        {action === 'ACCEPT'           && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.accept?.(order.id))}>Accept Order</button>}
        {action === 'MARK_READY'       && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.markReady?.(order.id))}>Mark Ready</button>}
        {action === 'COMPLETE'         && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.complete?.(order.id))}>Complete Order</button>}
        {action === 'CONFIRM_RECEIPT'  && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.confirmReceipt?.(order.id))}>Confirm Receipt</button>}
        {action === 'LEAVE_REVIEW'     && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('REVIEW', order)}>Leave a Review</button>}
        {/* Shared */}
        {action === 'PAYOUT'           && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('PAYOUT', order)}>Initiate Payout</button>}
        {canCancel && (
          <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setModal('CANCEL')}>Cancel</button>
        )}
      </div>

      {/* Modals (Type A only — Type B uses inline action buttons above) */}
      {modal === 'CONFIRM_ORDER'    && <ConfirmOrderModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmOrder?.(order.id))} onDecline={() => runMutation(() => mutations.cancelOrder?.(order.id, 'Declined by seller'))} />}
      {modal === 'INITIATE_HANDOFF' && <InitiateHandoffModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.initiateHandoff?.(order.id, body))} />}
      {modal === 'CONFIRM_HANDOFF'  && <ConfirmHandoffModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmHandoff?.(order.id))} onDispute={() => setModal('DISPUTE')} />}
      {modal === 'RECORD_PAYMENT'   && <RecordPaymentModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.recordPayment?.(order.id, body))} />}
      {modal === 'CONFIRM_PAYMENT'  && <ConfirmPaymentModal order={order} payment={order.payment} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmPayment?.(order.id))} />}
      {modal === 'CANCEL'           && <CancelOrderModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={(reason) => runMutation(() => mutations.cancelOrder?.(order.id, reason))} />}
      {modal === 'DISPUTE'          && <DisputeModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.raiseDispute?.(order.id, body))} />}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/__tests__/OrderCard.test.jsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OrderCard.jsx frontend/src/components/__tests__/OrderCard.test.jsx
git commit -m "feat: add OrderCard component with full action-modal wiring"
```

---

### Task 6: Wire fisherman/Orders.jsx

**Files:**
- Modify: `frontend/src/fisherman/Orders.jsx`

- [ ] **Step 1: Remove mock data and wire queries + mutations**

Open `frontend/src/fisherman/Orders.jsx`. Remove all inline mock constant blocks. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listOrders, confirmOrder, cancelOrder,
  initiateHandoff, confirmHandoff, recordPayment,
  confirmPayment, raiseDispute,
} from './api/orders'
import OrderCard from '../components/OrderCard'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace component body data section:

```jsx
const qc = useQueryClient()
const [statusFilter, setStatusFilter] = useState(null)

const ordersQ = useQuery({
  queryKey: ['fisherman', 'orders', statusFilter],
  queryFn: () => listOrders(statusFilter),
})

const invalidate = () => qc.invalidateQueries({ queryKey: ['fisherman', 'orders'] })

const mutations = {
  confirmOrder:   (id)       => confirmOrder(id).then(invalidate),
  cancelOrder:    (id, r)    => cancelOrder(id, r).then(invalidate),
  initiateHandoff:(id, body) => initiateHandoff(id, body).then(invalidate),
  confirmHandoff: (id)       => confirmHandoff(id).then(invalidate),
  recordPayment:  (id, body) => recordPayment(id, body).then(invalidate),
  confirmPayment: (id)       => confirmPayment(id).then(invalidate),
  raiseDispute:   (id, body) => raiseDispute(id, body).then(invalidate),
}

if (ordersQ.isLoading) return <div className="page"><OrderCardSkeleton /><OrderCardSkeleton /></div>
if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

const orders = ordersQ.data ?? []
```

Replace hardcoded order card JSX with:

```jsx
{orders.length === 0 && <p className="empty-state">No orders yet.</p>}
{orders.map(order => (
  <OrderCard key={order.id} order={order} currentRole="FISHERMAN" mutations={mutations} />
))}
```

- [ ] **Step 2: Manual test — full order flow**

Start backend. Open two browser tabs: one logged in as FISHERMAN, one as VENDOR. In vendor tab, create an order against a catch alert. In fisherman tab, navigate to Orders — confirm the order appears as PENDING with a "Confirm Order" button. Click it, confirm it, verify status changes to CONFIRMED.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/fisherman/Orders.jsx
git commit -m "feat(fisherman): wire Orders.jsx with full lifecycle modals"
```

---

### Task 7: Wire vendor/OrdersInbox.jsx (Type B storefront flow)

**Files:**
- Modify: `frontend/src/vendor/OrdersInbox.jsx`

Type B orders use the `VendorOrdersController` with status enum `[NEW, PREPARING, READY, COMPLETED, CANCELLED]`.

- [ ] **Step 1: Remove mock data and wire queries**

Open `frontend/src/vendor/OrdersInbox.jsx`. Remove all inline mock blocks. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listVendorOrders, acceptOrder, markReady, completeOrder, cancelVendorOrder } from './api/orders'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import CrudModal from '../components/modals/CrudModal'
import CancelOrderModal from '../components/modals/CancelOrderModal'
```

The vendor storefront orders use a different state machine than Type A. Build a simpler inline card (not `OrderCard` which is for Type A catch-alert orders):

```jsx
const qc = useQueryClient()
const ordersQ = useQuery({ queryKey: ['vendor', 'orders'], queryFn: () => listVendorOrders() })
const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'orders'] })

const acceptMut   = useMutation({ mutationFn: (id) => acceptOrder(id),   onSuccess: invalidate })
const readyMut    = useMutation({ mutationFn: (id) => markReady(id),     onSuccess: invalidate })
const completeMut = useMutation({ mutationFn: (id) => completeOrder(id), onSuccess: invalidate })
const cancelMut   = useMutation({ mutationFn: ({ id, reason }) => cancelVendorOrder(id, reason), onSuccess: invalidate })

if (ordersQ.isLoading) return <div className="page"><OrderCardSkeleton rows={4} /></div>
if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>
const orders = ordersQ.data ?? []
```

For each order card, render the right action button based on status:
- `NEW` → Accept button (calls `acceptMut.mutate(id)`)
- `PREPARING` → Mark Ready button
- `READY` → Complete button
- `COMPLETED` → done chip
- `CANCELLED` → cancelled chip

Include a "Whose turn" label: for NEW/PREPARING/READY the vendor acts; COMPLETED/CANCELLED is terminal.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/vendor/OrdersInbox.jsx
git commit -m "feat(vendor): wire OrdersInbox.jsx with Type B storefront order flow"
```

---

### Task 8: Final verification

- [ ] **Run all tests**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **End-to-end order flow test**

Two browser tabs (fisherman + vendor). Walk the full Type A path:
1. Vendor creates order on catch alert → fisherman sees PENDING → confirms → CONFIRMED
2. Vendor initiates handoff (enters actual kg/price) → fisherman sees numbers → confirms → HANDOFF_CONFIRMED
3. Vendor records payment → fisherman confirms receipt → COMPLETED
4. Fisherman sees "View in Earnings" link; vendor sees "Initiate Payout" button

- [ ] **Commit**

```bash
git add -A
git commit -m "feat: ordering flow complete — full Type A + Type B lifecycle with modals"
```
