# Agent 5 — Frontend: Fisherman Profile eWallet & Vendor Payout UI

**Your role:** Add GCash/Maya phone number fields to the fisherman's Profile page, and add a "Pay Fisherman" payout section to the vendor's Procurement Orders page for COMPLETED procurement orders.

**Prerequisite:** Agent 1 must have added `gcashNumber`/`mayaNumber` to the backend and api.yaml. Agent 3 must have created `OrderPayoutController` with `POST /orders/{orderId}/payout`.

**Full plan:** `docs/superpowers/plans/2026-05-10-xendit-payment-integration.md`

---

## Codebase Context

- **Stack:** React 18, Vite, no TypeScript. API calls use `apiGet`/`apiPost`/`apiPut` from `../../api`.
- **Fisherman profile API:** `frontend/src/fisherman/api/profile.js` — `getProfile()` → `apiGet('/fisherman/profile')`, `updateProfile(body)` → `apiPut('/fisherman/profile', null, body)`
- **Vendor procurement orders:** `frontend/src/vendor/ProcurementOrders.jsx` — renders PROCUREMENT orders in buckets. The "Mark as Paid" modal (`settleModal`) is already present for cash settlement. Add a separate payout UI.
- **Vendor api helper:** `frontend/src/vendor/api/procurement.js` — add `initiateOrderPayout` here.
- **Working dir:** `C:\Users\Zaimond\Documents\mermaid`

---

## Task 14 — Fisherman Profile: eWallet Fields

**Files:**
- Modify: `frontend/src/fisherman/Profile.jsx`
- Modify: `frontend/src/fisherman/api/profile.js` (verify field names pass through)

### Step 1: Add eWallet fields to the form state

Open `frontend/src/fisherman/Profile.jsx`.

Find the `useState` for `form` (line 5):

```js
  const [form, setForm] = useState({
    vesselName: '', landingSite: '', emergencyContactName: '', emergencyContactPhone: '',
  })
```

Add the new fields:

```js
  const [form, setForm] = useState({
    vesselName: '', landingSite: '', emergencyContactName: '', emergencyContactPhone: '',
    gcashNumber: '', mayaNumber: '',
  })
```

### Step 2: Populate from profile response

Find where `getProfile()` populates the form (around line 17–26):

```js
        setForm({
          vesselName:            p.vesselName || '',
          landingSite:           p.landingSite || '',
          emergencyContactName:  p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
        })
```

Add the new fields:

```js
        setForm({
          vesselName:            p.vesselName || '',
          landingSite:           p.landingSite || '',
          emergencyContactName:  p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
          gcashNumber:           p.gcashNumber || '',
          mayaNumber:            p.mayaNumber || '',
        })
```

### Step 3: Add warning banner if no eWallet numbers are set

After the `success` / `error` banners (around line 66–75) and before the grid, add a warning when both numbers are empty:

```jsx
      {!loading && !form.gcashNumber && !form.mayaNumber && (
        <div style={{ background: 'var(--caution-soft, #fff9e6)', color: 'var(--caution, #b45309)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>⚠️</span>
          <span>Add a GCash or Maya number to receive vendor payouts directly to your e-wallet.</span>
        </div>
      )}
```

Place this immediately before the `<div style={{ display: 'grid', ...` line.

### Step 4: Add eWallet card to the grid

After the existing "Safety Contact" card (which ends around line 121), add a new card **inside** the same grid wrapper:

```jsx
        <div className="card">
          <div className="card__title" style={{ marginBottom: 16 }}>E-Wallet for Payouts</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>
            Vendors can pay you directly to your GCash or Maya account after a PROCUREMENT order is completed.
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>GCash number</label>
              <input
                className="input"
                type="tel"
                value={form.gcashNumber}
                onChange={e => f('gcashNumber', e.target.value)}
                placeholder="09XX XXX XXXX"
                maxLength={11}
              />
            </div>
            <div className="form-row">
              <label>Maya number</label>
              <input
                className="input"
                type="tel"
                value={form.mayaNumber}
                onChange={e => f('mayaNumber', e.target.value)}
                placeholder="09XX XXX XXXX"
                maxLength={11}
              />
            </div>
          </div>
        </div>
```

The grid currently has 2 columns. Add this as a third card — it will wrap to the next row automatically.

### Step 5: Verify save includes new fields

The existing `save` function calls `updateProfile(form)`. Since the form state now includes `gcashNumber` and `mayaNumber`, they will be sent automatically — no change needed to the save function.

### Step 6: Manual test

1. Start dev server: `cd frontend && npm run dev`
2. Log in as a fisherman
3. Navigate to Profile
4. Confirm the warning banner appears when no eWallet numbers are set
5. Enter a GCash number and save — confirm success banner appears
6. Reload — confirm the GCash number persists (it's stored in DB via Agent 1's V47 migration)

---

## Task 15 — Vendor ProcurementOrders: Pay Fisherman Section

**Files:**
- Modify: `frontend/src/vendor/api/procurement.js`
- Modify: `frontend/src/vendor/ProcurementOrders.jsx`

### Step 1: Add initiateOrderPayout to procurement API helper

Open `frontend/src/vendor/api/procurement.js`. At the end of the file, add:

```js
export const initiateOrderPayout = (orderId, channel) =>
  apiPost(`/orders/${orderId}/payout`, null, { channel })
```

Note the path is `/orders/{orderId}/payout` — this matches `OrderPayoutController` implemented by Agent 3.

### Step 2: Import the new function in ProcurementOrders.jsx

Open `frontend/src/vendor/ProcurementOrders.jsx`. Update the import at line 2:

```js
import { listProcurementOrders, cancelProcurementOrder, settleOrder, raiseDisputeVendor, getDisputeVendor, resolveDisputeVendor, initiateOrderPayout } from './api/procurement'
```

### Step 3: Add payout state variables

In the `ProcurementOrders` component, after the existing state declarations (after `resolving` and `resolveError`), add:

```js
  const [payoutModal, setPayoutModal] = useState(null)     // order being paid out
  const [payoutChannel, setPayoutChannel] = useState('PH_GCASH')
  const [payingOut, setPayingOut] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [payoutSuccess, setPayoutSuccess] = useState(null) // orderId of successful payout
```

### Step 4: Add handlePayout function

After the `handleResolve` function (around line 114), add:

```js
  const handlePayout = async () => {
    setPayingOut(true)
    setPayoutError('')
    try {
      await initiateOrderPayout(payoutModal.id, payoutChannel)
      setPayoutSuccess(payoutModal.id)
      setPayoutModal(null)
      refetch()
    } catch (e) {
      setPayoutError(e?.message || 'Payout failed. Check that the fisherman has an e-wallet number on file.')
    } finally {
      setPayingOut(false)
    }
  }
```

### Step 5: Add "Pay Fisherman" button to each order card

In the `orders.map(order => ...)` block, find the actions row that starts around line 191:

```jsx
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {order.status === 'COMPLETED' && !order.settledAt && (
                <button className="btn btn--accent btn--sm" onClick={() => { setSettleModal(order); setSettlePayment('CASH') }}>
                  Mark as Paid
                </button>
              )}
```

Add the "Pay Fisherman" button after the "Mark as Paid" button block:

```jsx
              {order.status === 'COMPLETED' && !order.payoutId && (
                <button
                  className="btn btn--accent btn--sm"
                  style={{ background: 'var(--safe)', borderColor: 'var(--safe)' }}
                  onClick={() => { setPayoutModal(order); setPayoutChannel('PH_GCASH'); setPayoutError('') }}
                >
                  Pay Fisherman
                </button>
              )}
              {order.payoutId && (
                <span style={{ fontSize: 12, color: 'var(--safe)', fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>
                  ✓ Payout sent
                </span>
              )}
              {payoutSuccess === order.id && !order.payoutId && (
                <span style={{ fontSize: 12, color: 'var(--safe)', alignSelf: 'center' }}>
                  ✓ Payout initiated
                </span>
              )}
```

### Step 6: Add the Pay Fisherman modal

Find the end of the existing modals, just before the closing `</div>` of the component return (around line 401). Add the payout modal before the final `</div>`:

```jsx
      {/* Pay Fisherman modal */}
      {payoutModal && (
        <div className="modal-overlay" onClick={() => setPayoutModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal__head">
              <div className="modal__title">Pay Fisherman</div>
              <div className="modal__sub">
                Order #{payoutModal.id} · {payoutModal.speciesName}
              </div>
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 13, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ink-4)' }}>Fisherman</span>
                  <span style={{ fontWeight: 500 }}>{payoutModal.fishermanName ?? `#${payoutModal.fishermanId}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ink-4)' }}>Amount</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    ₱{((payoutModal.qtyKg || 0) * (payoutModal.pricePerKg || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                Send via
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['PH_GCASH', 'GCash'], ['PH_PAYMAYA', 'Maya']].map(([code, label]) => (
                  <label key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="payoutChannel"
                      value={code}
                      checked={payoutChannel === code}
                      onChange={() => setPayoutChannel(code)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-4)' }}>
                The fisherman must have their {payoutChannel === 'PH_GCASH' ? 'GCash' : 'Maya'} number saved in their profile.
              </div>
              {payoutError && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--unsafe)', background: 'var(--unsafe-soft)', padding: '8px 10px', borderRadius: 6 }}>
                  {payoutError}
                </div>
              )}
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setPayoutModal(null)}>Cancel</button>
              <button
                className="btn btn--primary btn--sm"
                disabled={payingOut}
                onClick={handlePayout}
              >
                {payingOut ? 'Sending…' : `Send payment`}
              </button>
            </div>
          </div>
        </div>
      )}
```

### Step 7: Manual test

1. Start dev server: `cd frontend && npm run dev`
2. Log in as a vendor
3. Navigate to Procurement → Orders, switch to COMPLETED bucket
4. Confirm a completed order shows "Pay Fisherman" button (if no payoutId)
5. Click it — confirm the modal opens with fisherman name, amount, GCash/Maya selector
6. Confirm the cancel button closes the modal

---

## Checklist

- [ ] `fisherman/Profile.jsx` state includes `gcashNumber` and `mayaNumber`
- [ ] Profile `getProfile()` populates both new fields
- [ ] Warning banner shown when both fields are empty
- [ ] New "E-Wallet for Payouts" card added to profile grid
- [ ] `save()` automatically includes `gcashNumber`/`mayaNumber` (no extra change needed)
- [ ] `initiateOrderPayout` function added to `vendor/api/procurement.js`
- [ ] Payout state variables added to `ProcurementOrders.jsx`
- [ ] `handlePayout` function implemented
- [ ] "Pay Fisherman" button appears on COMPLETED orders without a `payoutId`
- [ ] "✓ Payout sent" indicator shown on orders with a `payoutId`
- [ ] Pay Fisherman modal renders fisherman name, amount, GCash/Maya selector
- [ ] Manual test: profile warning banner visible, vendor payout modal opens
