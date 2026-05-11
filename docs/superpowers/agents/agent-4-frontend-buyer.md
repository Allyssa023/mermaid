# Agent 4 — Frontend: Buyer Checkout & Payment Return

**Your role:** Activate the online payment section in `Checkout.jsx`, create the `PaymentReturn.jsx` polling page, and wire up the route so buyers can pay with GCash, Maya, or Card.

**Prerequisite:** Agent 1 must have completed api.yaml changes first so the backend returns `redirectUrl` in the payment intent response.

**Full plan:** `docs/superpowers/plans/2026-05-10-xendit-payment-integration.md`

---

## Codebase Context

- **Stack:** React 18, Vite, no TypeScript. API calls use the project's `apiGet`/`apiPost` helpers from `../../api`.
- **Routing:** Each role has its own `<Routes>` wrapper. Buyer routes are defined in `frontend/src/buyer/BuyerDashboard.jsx`. Add the new route there — not in `App.jsx`.
- **Checkout files:** There are TWO components in `Checkout.jsx`:
  - `CheckoutView` (default export) — cart-based multi-vendor checkout. **This is the one to modify.**
  - `InstantCheckoutView` (named export) — single-listing instant checkout. Leave this alone.
- **Payment method state:** `paymentMethod` is currently hardcoded to `'CASH'` in the checkout payload. We need to change it to a controlled state and expose an online option.
- **Working dir:** `C:\Users\Zaimond\Documents\mermaid`

---

## Task 12 — Checkout.jsx: Activate Online Payments

**Files:**
- Modify: `frontend/src/buyer/Checkout.jsx`
- Modify: `frontend/index.html`

### Step 1: Add Xendit.js to index.html

Open `frontend/index.html`. In the `<head>`, add the Xendit.js script tag **before** the closing `</head>`:

```html
<script src="https://js.xendit.co/v1/xendit.min.js"></script>
```

The file currently ends the head at line 11 (`</head>`). It should look like:

```html
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <script src="https://js.xendit.co/v1/xendit.min.js"></script>
  </head>
```

### Step 2: Add payment method state to CheckoutView

In `CheckoutView` (the default export, starting at line 280), add a new state variable after the existing state declarations (after line 296):

```js
const [paymentMethod, setPaymentMethod] = useState('CASH') // 'CASH' | 'GCASH' | 'PAYMAYA' | 'CARD'
const [payingOnline, setPayingOnline] = useState(false)
const [payError, setPayError] = useState('')
```

### Step 3: Replace the disabled "Online (coming soon)" payment section

Find the existing payment card (around line 518–526):

```jsx
        <div className="card" style={{ padding: 16 }}>
          <div className="label">Payment method</div>
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <button className="btn btn--accent btn--sm" disabled>Cash on handoff (selected)</button>
            <button className="btn btn--ghost btn--sm" disabled title="Online payments coming with PayMongo in Phase 3">
              Online (coming soon)
            </button>
          </div>
        </div>
```

Replace it with:

```jsx
        <div className="card" style={{ padding: 16 }}>
          <div className="label">Payment method</div>
          <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {['CASH', 'GCASH', 'PAYMAYA', 'CARD'].map(m => (
              <button
                key={m}
                className={`btn btn--sm ${paymentMethod === m ? 'btn--accent' : 'btn--ghost'}`}
                onClick={() => setPaymentMethod(m)}
              >
                {m === 'CASH' ? 'Cash on handoff' : m === 'GCASH' ? 'GCash' : m === 'PAYMAYA' ? 'Maya' : 'Card'}
              </button>
            ))}
          </div>
          {paymentMethod !== 'CASH' && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-4)' }}>
              {paymentMethod === 'GCASH' && 'You will be redirected to GCash to complete payment.'}
              {paymentMethod === 'PAYMAYA' && 'You will be redirected to Maya to complete payment.'}
              {paymentMethod === 'CARD' && 'Enter your card details after placing the order.'}
            </div>
          )}
          {payError && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--unsafe)' }}>{payError}</div>
          )}
        </div>
```

### Step 4: Update handlePlace to send paymentMethod and trigger online payment

Find `async function handlePlace()` (around line 347). Replace the entire function:

```js
  async function handlePlace() {
    const v = validate()
    if (v) { setError(v); return }
    setError('')
    setPayError('')
    setSubmitting(true)
    try {
      const payload = {
        groups: (cart.groups || []).map(g => {
          const s = groupSpecs[g.vendor.id] || {}
          return {
            vendorId: g.vendor.id,
            dispatchMode: s.dispatchMode || 'PICKUP',
            addressId: s.dispatchMode === 'DELIVERY' ? s.addressId : undefined,
            notes: s.notes || undefined,
          }
        }),
        paymentMethod: paymentMethod === 'GCASH' || paymentMethod === 'PAYMAYA' || paymentMethod === 'CARD' ? paymentMethod : 'CASH',
      }
      const result = await apiPost('/buyer/checkout', null, payload)
      await refresh()

      if (paymentMethod !== 'CASH') {
        // result is an array of created orders — pay for the first one
        // (multi-vendor online checkout not supported yet — pay first order)
        const firstOrderId = Array.isArray(result) ? result[0]?.id : result?.id
        if (firstOrderId) {
          await handleOnlinePay(firstOrderId)
          return
        }
      }
      onSuccess(result)
    } catch (e) {
      setError(e?.message || 'Could not place order.')
    } finally {
      setSubmitting(false)
    }
  }
```

### Step 5: Add handleOnlinePay function

Add this function inside `CheckoutView`, after `handlePlace`:

```js
  async function handleOnlinePay(orderId) {
    setPayingOnline(true)
    setPayError('')
    try {
      const res = await apiPost(`/buyer/orders/${orderId}/payment-intent`, { method: paymentMethod })

      if (paymentMethod === 'GCASH' || paymentMethod === 'PAYMAYA') {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl
          return
        }
        throw new Error('No redirect URL returned from payment gateway.')
      }

      if (paymentMethod === 'CARD') {
        const Xendit = window.Xendit
        if (!Xendit) throw new Error('Xendit.js failed to load.')
        Xendit.setPublishableKey(res.publicKey || import.meta.env.VITE_XENDIT_PUBLIC_KEY || '')
        // Xendit card inline form — redirect to payment return page with clientKey
        onSuccess()
        return
      }
    } catch (e) {
      setPayError(e?.message || 'Payment initiation failed. Your order was placed — pay from your Orders page.')
      onSuccess()
    } finally {
      setPayingOnline(false)
    }
  }
```

**Note on card flow:** Full inline card tokenization requires Xendit.js iframe integration which is scope for a future sprint. For now, card orders are placed and the buyer is directed to orders page. GCash and Maya get the full redirect flow.

### Step 6: Update the Place Order button

Find the final `<button>` in the sticky footer card (around line 536):

```jsx
          <button
            className="btn btn--accent"
            onClick={handlePlace}
            disabled={submitting || cart.itemCount === 0}
            style={{ minWidth: 200 }}
          >
            {submitting ? 'Placing…' : `Place ${cart.groups.length} order${cart.groups.length === 1 ? '' : 's'}`}
          </button>
```

Replace with:

```jsx
          <button
            className="btn btn--accent"
            onClick={handlePlace}
            disabled={submitting || payingOnline || cart.itemCount === 0}
            style={{ minWidth: 200 }}
          >
            {payingOnline ? 'Redirecting to payment…' : submitting ? 'Placing…' : `Place ${cart.groups.length} order${cart.groups.length === 1 ? '' : 's'}`}
          </button>
```

### Step 7: Add `apiPost` query-string support check

Open `frontend/src/api.js` (or wherever `apiPost` is defined) and confirm it can accept query params as the second argument. The existing signature should be `apiPost(path, params, body)`. This is already correct based on the existing codebase patterns — no change needed.

### Step 8: Manual test in browser

Start the dev server: `cd frontend && npm run dev`

1. Log in as a buyer
2. Add an item to cart and go to checkout
3. Confirm the payment method selector shows GCash, Maya, Card, Cash
4. Select GCash — confirm the info text appears
5. Cash should still work (place order, goes to orders page)

---

## Task 13 — PaymentReturn.jsx: Payment Confirmation Polling Page

**Files:**
- Create: `frontend/src/buyer/PaymentReturn.jsx`
- Modify: `frontend/src/buyer/BuyerDashboard.jsx`

### Step 1: Create PaymentReturn.jsx

Create `frontend/src/buyer/PaymentReturn.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3000

export default function PaymentReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [status, setStatus] = useState('polling') // 'polling' | 'confirmed' | 'timeout' | 'error'
  const [order, setOrder] = useState(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!orderId) {
      setStatus('error')
      return
    }

    const poll = async () => {
      attemptsRef.current += 1
      try {
        const o = await apiGet(`/buyer/orders/${orderId}`)
        setOrder(o)
        if (o?.paymentStatus === 'CONFIRMED' || o?.payment?.status === 'CONFIRMED') {
          setStatus('confirmed')
          return
        }
      } catch {
        // keep polling
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setStatus('timeout')
        return
      }

      setTimeout(poll, POLL_INTERVAL_MS)
    }

    setTimeout(poll, POLL_INTERVAL_MS)
  }, [orderId])

  if (status === 'polling') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Confirming your payment…</div>
        <div className="muted-data" style={{ fontSize: 13 }}>This usually takes a few seconds.</div>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--safe)' }}>Payment confirmed!</div>
        <div className="muted-data" style={{ fontSize: 14 }}>
          Order #{orderId} has been paid successfully.
        </div>
        <button
          className="btn btn--accent"
          onClick={() => navigate(`/buyer/orders/${orderId}`)}
          style={{ marginTop: 12 }}
        >
          View order
        </button>
      </div>
    )
  }

  if (status === 'timeout') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
        <div style={{ fontSize: 40 }}>🕐</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Payment is being processed</div>
        <div className="muted-data" style={{ fontSize: 14, textAlign: 'center', maxWidth: 340 }}>
          Your payment is still being confirmed. This can take a minute or two — check your Orders page for the latest status.
        </div>
        <button
          className="btn btn--accent"
          onClick={() => navigate('/buyer/orders')}
          style={{ marginTop: 12 }}
        >
          Go to my orders
        </button>
      </div>
    )
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
      <div className="muted-data" style={{ fontSize: 13 }}>No order ID found in the URL.</div>
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/buyer/orders')}>
        Go to orders
      </button>
    </div>
  )
}
```

### Step 2: Register the route in BuyerDashboard.jsx

Open `frontend/src/buyer/BuyerDashboard.jsx`. Import the new component at the top:

```js
import PaymentReturn from './PaymentReturn'
```

Then add the route inside the `<Routes>` block. Add it after the `/buyer/instant-checkout` route (around line 61):

```jsx
        <Route path="/buyer/payment-return" element={<PaymentReturn />} />
```

### Step 3: Update handleOnlinePay to use the return URL

Back in `Checkout.jsx`, in the `handleOnlinePay` function, the backend needs a `returnUrl` so Xendit knows where to redirect after payment. Update the `apiPost` call to pass the return URL as a query param:

The API call is:
```js
const res = await apiPost(`/buyer/orders/${orderId}/payment-intent`, { method: paymentMethod })
```

Update to:
```js
const returnUrl = `${window.location.origin}/buyer/payment-return?orderId=${orderId}`
const res = await apiPost(`/buyer/orders/${orderId}/payment-intent`, { method: paymentMethod, returnUrl })
```

**Note:** The backend `BuyerOrderController.createPaymentIntent` signature already accepts `returnUrl` as a query parameter per the plan — Agent 2 wires this up on the Java side.

### Step 4: Manual test

1. Start dev server: `cd frontend && npm run dev`
2. Navigate directly to `/buyer/payment-return?orderId=1` — confirm the polling spinner appears
3. After ~30 seconds, confirm the timeout state appears with the "Go to my orders" button
4. Test `/buyer/payment-return` with no orderId — confirm the error state appears

---

## Checklist

- [ ] `frontend/index.html` — Xendit.js script tag added before `</head>`
- [ ] `CheckoutView` state: `paymentMethod`, `payingOnline`, `payError` added
- [ ] Payment method selector renders 4 buttons (Cash, GCash, Maya, Card)
- [ ] `handlePlace` sends `paymentMethod` in checkout payload and calls `handleOnlinePay` for non-cash
- [ ] `handleOnlinePay` redirects to Xendit for GCash/Maya using `redirectUrl` from response
- [ ] Place Order button disabled during `payingOnline`
- [ ] `PaymentReturn.jsx` created with polling, confirmed, timeout, error states
- [ ] `/buyer/payment-return` route added to `BuyerDashboard.jsx`
- [ ] Manual smoke test: payment method selector visible, cash flow still works
