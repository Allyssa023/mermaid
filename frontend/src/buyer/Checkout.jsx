import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { I } from '../icons'
import { useCart } from '../context/CartContext'
import { placeOrder, createPaymentIntent } from './api/orders'

const PAYMENT_METHODS = [
  { id: 'COD',     label: 'Cash on Delivery', sub: 'Pay when you receive',       icon: '💵' },
  { id: 'GCASH',   label: 'GCash',            sub: 'Redirect to GCash app',      icon: '📱' },
  { id: 'PAYMAYA', label: 'PayMaya',           sub: 'Redirect to Maya app',       icon: '💳' },
]

export default function Checkout({ setPage, buyNow, setBuyNow }) {
  const { cart, loading, error, clearCart } = useCart()
  const addrRefs = useRef({})

  const buyNowGroup = buyNow ? [{
    vendor: { id: buyNow.listing.vendorId, fullName: buyNow.listing.vendorName },
    items: [{
      id: buyNow.listing.id,
      listingId: buyNow.listing.id,
      speciesName: buyNow.listing.speciesName,
      unitPriceSnapshot: buyNow.listing.pricePerKg,
      deliveryFee: buyNow.listing.deliveryFee ?? 0,
      quantityKg: 1,
      lineTotal: buyNow.listing.pricePerKg,
    }],
    subtotal: buyNow.listing.pricePerKg,
  }] : null

  const groups = buyNowGroup ?? cart.groups ?? []
  const [forms, setForms] = useState({})
  const [payMethod, setPayMethod] = useState('COD')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')

  const deliveryAllowed = (g) =>
    (g.items ?? []).some(it => Number(it.deliveryFee ?? 0) > 0)

  const groupsKey = groups.map(g => g.vendor?.id).join(',')

  useEffect(() => {
    const init = {}
    groups.forEach(g => {
      const vid = String(g.vendor?.id)
      init[vid] = { dispatch: 'PICKUP', address: '', notes: '', qty: String(g.items?.[0]?.quantityKg ?? 1) }
    })
    setForms(init)
  }, [groupsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateForm = (vid, patch) =>
    setForms(prev => ({ ...prev, [String(vid)]: { ...prev[String(vid)], ...patch } }))

  const handleDispatchChange = (vid, mode) => {
    updateForm(vid, { dispatch: mode })
    const el = addrRefs.current[vid]
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (mode === 'DELIVERY') {
      gsap.fromTo(el, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' })
    } else {
      gsap.to(el, { opacity: 0, y: -8, duration: 0.15, ease: 'power2.in' })
    }
  }

  const handleSubmit = async () => {
    for (const g of groups) {
      const f = forms[String(g.vendor?.id)] ?? {}
      if (f.dispatch === 'DELIVERY' && !f.address?.trim()) {
        setSubmitErr('Enter a delivery address for ' + (g.vendor?.fullName ?? 'vendor'))
        return
      }
    }
    setSubmitting(true)
    setSubmitErr('')
    const placedIds = []
    try {
      for (const g of groups) {
        const f = forms[String(g.vendor?.id)] ?? {}
        for (const item of g.items) {
          const placed = await placeOrder({
            listingId: item.listingId ?? item.id,
            orderedQtyKg: Number(f.qty) || undefined,
            dispatchMode: f.dispatch,
            deliveryAddress: f.dispatch === 'DELIVERY' ? f.address.trim() : null,
            notes: f.notes?.trim() || null,
          })
          if (placed?.id) placedIds.push(placed.id)
        }
      }

      if (!buyNow) await clearCart()
      setBuyNow(null)

      if (payMethod === 'COD') {
        setPage('borders')
        return
      }

      // Online payment — redirect to Xendit for the first order
      // (multi-vendor carts: buyer pays each order from Orders page)
      if (placedIds.length === 1) {
        const intent = await createPaymentIntent(placedIds[0], payMethod)
        if (intent?.redirectUrl) {
          window.location.href = intent.redirectUrl
          return
        }
      }

      // Multiple orders or no redirect URL — go to orders page
      setPage('borders')
    } catch (e) {
      setSubmitErr(e?.message ?? 'Order placement failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!buyNow && loading) {
    return (
      <div className="page-wrap">
        <div className="section-head"><div><h2 className="section-head__title">Checkout</h2></div></div>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-2)', fontSize: 12 }}>Loading…</div>
      </div>
    )
  }

  if (!buyNow && error) {
    return (
      <div className="page-wrap">
        <div className="empty-state">
          <I.Cart size={32} />
          <div style={{ color: 'var(--coral)' }}>{error}</div>
        </div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="page-wrap">
        <div className="empty-state" style={{ marginTop: 64 }}>
          <I.Cart size={36} />
          <div>Your cart is empty</div>
          <button className="btn btn--primary" onClick={() => setPage('bbrowse')}>Browse listings</button>
        </div>
      </div>
    )
  }

  const grandTotal = groups.reduce((sum, g) => {
    const f = forms[String(g.vendor?.id)] ?? {}
    const sub = (g.items ?? []).reduce((s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0)
    const fee = f.dispatch === 'DELIVERY' ? (g.items?.[0]?.deliveryFee ?? 0) : 0
    return sum + sub + fee
  }, 0)

  const multipleOrders = groups.reduce((n, g) => n + (g.items ?? []).length, 0) > 1

  return (
    <div className="page-wrap">
      <div className="section-head">
        <div>
          <button className="btn btn--ghost btn--sm" onClick={() => { if (!buyNow) setPage('bcart'); else { setBuyNow(null); setPage('bbrowse') } }}>
            <I.ChevL size={11} /> Back
          </button>
          <div className="eyebrow" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: 10 }}>CHECKOUT</div>
          <h2 className="section-head__title">Place Order</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>One submit, separate orders per vendor.</p>
        </div>
      </div>

      <div className="checkout-layout">
        {/* Order forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(g => {
            const vid = String(g.vendor?.id)
            const f = forms[vid] ?? {}
            const liveSub = (g.items ?? []).reduce((s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0)

            return (
              <div key={vid} className="panel">
                <div className="panel__head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="topbar__avatar" style={{ width: 32, height: 32, fontSize: 12, borderRadius: 8 }}>
                      {(g.vendor?.fullName || 'V')[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendor order</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.vendor?.fullName}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)' }}>
                    ₱{liveSub.toLocaleString()}
                  </span>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {g.items.map(it => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '6px 0', borderTop: '1px solid var(--hairline)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {(it.speciesName || 'F')[0]}
                      </div>
                      <span style={{ flex: 1, fontWeight: 500 }}>{it.speciesName}</span>
                      <input
                        style={{
                          width: 72, textAlign: 'right', background: 'var(--panel-3)',
                          border: '1px solid var(--hairline)', borderRadius: 7,
                          color: 'var(--ink-on-dark)', padding: '6px 10px', fontSize: 13,
                          fontFamily: 'var(--font-mono)'
                        }}
                        type="number" min="0.1" step="0.1"
                        value={f.qty}
                        onChange={e => updateForm(vid, { qty: e.target.value })}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>kg</span>
                      <span style={{ fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right', color: 'var(--muted)' }}>
                        ₱{((Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dispatch toggle */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Dispatch mode
                    {!deliveryAllowed(g) && (
                      <span style={{ marginLeft: 8, color: 'var(--warning)', fontWeight: 600, textTransform: 'none' }}>· Pickup only</span>
                    )}
                  </div>
                  <div className="dispatch-toggle">
                    <button
                      className={f.dispatch === 'PICKUP' ? 'on' : ''}
                      onClick={() => handleDispatchChange(vid, 'PICKUP')}
                    >
                      <I.MapPin size={12} /> Pickup
                    </button>
                    {deliveryAllowed(g) && (
                      <button
                        className={f.dispatch === 'DELIVERY' ? 'on' : ''}
                        onClick={() => handleDispatchChange(vid, 'DELIVERY')}
                      >
                        <I.Truck size={12} /> Delivery
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery address */}
                {f.dispatch === 'DELIVERY' && (
                  <div ref={el => { addrRefs.current[vid] = el }} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Delivery address</div>
                    <input
                      style={{
                        width: '100%', background: 'var(--panel-3)', border: '1px solid var(--hairline)',
                        borderRadius: 8, color: 'var(--ink-on-dark)', padding: '9px 12px',
                        fontSize: 13, fontFamily: 'var(--font-ui)'
                      }}
                      type="text"
                      placeholder="Street, City, Province"
                      value={f.address}
                      onChange={e => updateForm(vid, { address: e.target.value })}
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Note for vendor (optional)</div>
                  <textarea
                    style={{
                      width: '100%', background: 'var(--panel-3)', border: '1px solid var(--hairline)',
                      borderRadius: 8, color: 'var(--ink-on-dark)', padding: '9px 12px',
                      fontSize: 13, fontFamily: 'var(--font-ui)', resize: 'vertical', minHeight: 60
                    }}
                    rows={2}
                    placeholder="Any preparation requests…"
                    value={f.notes}
                    onChange={e => updateForm(vid, { notes: e.target.value })}
                  />
                </div>
              </div>
            )
          })}

          {/* Payment method selection */}
          <div className="panel">
            <div style={{ fontSize: 10, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Payment method</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PAYMENT_METHODS.map(pm => {
                const isOnline = pm.id !== 'COD'
                const blockedForMulti = isOnline && multipleOrders
                return (
                  <button
                    key={pm.id}
                    disabled={blockedForMulti}
                    onClick={() => !blockedForMulti && setPayMethod(pm.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10, border: '1px solid',
                      borderColor: payMethod === pm.id ? 'var(--accent)' : 'var(--hairline)',
                      background: payMethod === pm.id ? 'var(--accent-soft)' : 'var(--panel-3)',
                      cursor: blockedForMulti ? 'not-allowed' : 'pointer',
                      opacity: blockedForMulti ? 0.4 : 1,
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{pm.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-on-dark)' }}>{pm.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                        {blockedForMulti ? 'Pay each order separately from Orders page' : pm.sub}
                      </div>
                    </div>
                    {payMethod === pm.id && <I.Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
            {multipleOrders && payMethod === 'COD' && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted-2)', lineHeight: 1.4 }}>
                Online payment is available per-order from the Orders page after placing.
              </div>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="cart-summary">
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 14 }}>Order Summary</div>
          {groups.map(g => {
            const vid = String(g.vendor?.id)
            const f = forms[vid] ?? {}
            const liveSub = (g.items ?? []).reduce((s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0)
            const fee = f.dispatch === 'DELIVERY' ? (g.items?.[0]?.deliveryFee ?? 0) : 0
            return (
              <div key={vid} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
                  <span>{g.vendor?.fullName}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₱{liveSub.toLocaleString()}</span>
                </div>
                {fee > 0 && f.dispatch === 'DELIVERY' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted-2)', marginTop: 4 }}>
                    <span>Delivery fee</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>₱{fee.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ height: 1, background: 'var(--hairline)', margin: '14px 0' }} />

          {/* Selected payment method */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>Payment</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-dark)' }}>
              {PAYMENT_METHODS.find(p => p.id === payMethod)?.label}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontWeight: 600 }}>Grand Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
              ₱{grandTotal.toLocaleString()}
            </span>
          </div>

          <button
            className="btn btn--primary"
            style={{ width: '100%', justifyContent: 'center', padding: '13px 0' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? (payMethod === 'COD' ? 'Placing orders…' : 'Processing…')
              : payMethod === 'COD'
                ? 'Place orders'
                : `Pay ₱${grandTotal.toLocaleString()} via ${PAYMENT_METHODS.find(p => p.id === payMethod)?.label}`
            } <I.ChevR size={13} />
          </button>

          {submitErr && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--coral-soft)', border: '1px solid var(--coral)', borderRadius: 8, color: 'var(--coral)', fontSize: 12 }}>
              {submitErr}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
