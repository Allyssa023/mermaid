import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiGet, apiPost } from '../api'
import { I } from '../icons'
import { fmtPrice } from './utils/format'
import { useCart } from '../context/CartContext'

export function InstantCheckoutView() {
  const navigate = useNavigate()
  const location = useLocation()
  const listing = location.state?.listing

  const [addresses, setAddresses]         = useState([])
  const [loadingAddrs, setLoadingAddrs]   = useState(true)
  const [dispatchMode, setDispatchMode]   = useState('PICKUP')
  const [addressId, setAddressId]         = useState(null)
  const [qty, setQty]                     = useState(listing?.quantityKg ? Math.min(1, listing.quantityKg) : 1)
  const [notes, setNotes]                 = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: 'Home', recipientName: '', phone: '',
    addressLine1: '', addressLine2: '', barangay: '',
    city: '', province: '', postalCode: '',
  })

  useEffect(() => {
    apiGet('/buyer/addresses')
      .then(d => { setAddresses(d || []); if (d?.length) setAddressId((d.find(a => a.isDefault) || d[0])?.id || null) })
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddrs(false))
  }, [])

  if (!listing) {
    return (
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/buyer/browse')}><I.ChevL size={12} /> Back to marketplace</button>
        </div>
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Alert size={36} />
          <span>No listing selected. Go back and click "Order now" on a listing.</span>
        </div>
      </div>
    )
  }

  const speciesName = listing.fishSpecies?.commonName || 'Listing'
  const price = listing.offerPricePerKg || listing.pricePerKg || 0
  const available = listing.quantityKg || 0
  const lineTotal = price * qty
  const vendorName = listing.vendorName || listing.vendor?.fullName || '—'
  const locationName = listing.marketLocation?.name || '—'
  const tag = listing.fishSpecies?.tag || speciesName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  async function handleAddAddress(e) {
    e.preventDefault()
    if (!newAddress.recipientName.trim() || !newAddress.addressLine1.trim() || !newAddress.city.trim()) {
      setError('Recipient name, address line 1, and city are required.')
      return
    }
    try {
      const created = await apiPost('/buyer/addresses', null, { ...newAddress, setAsDefault: addresses.length === 0 })
      setAddresses(prev => [...prev, created])
      setAddressId(created.id)
      setShowNewAddress(false)
      setError('')
      setNewAddress({ label: 'Home', recipientName: '', phone: '', addressLine1: '', addressLine2: '', barangay: '', city: '', province: '', postalCode: '' })
    } catch (e) {
      setError(e?.message || 'Could not save address.')
    }
  }

  async function handlePlace() {
    setError('')
    if (dispatchMode === 'DELIVERY') {
      const addr = addresses.find(a => a.id === addressId)
      if (!addr) { setError('Please select a delivery address.'); return }
    }
    setSubmitting(true)
    try {
      const deliveryAddr = dispatchMode === 'DELIVERY'
        ? (addresses.find(a => a.id === addressId)?.oneLine || addresses.find(a => a.id === addressId)?.addressLine1 || '')
        : undefined
      await apiPost('/buyer/orders', null, {
        listingId: listing.id,
        dispatchMode,
        orderedQtyKg: qty,
        deliveryAddress: deliveryAddr,
        notes: notes.trim() || undefined,
      })
      navigate('/buyer/orders')
    } catch (e) {
      setError(e?.message || 'Could not place order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}><I.ChevL size={12} /> Back</button>
      </div>

      <div className="page__head" style={{ marginTop: 6 }}>
        <div>
          <div className="eyebrow">Checkout</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Place your <em>order</em></h1>
          <p className="page__sub">Review your order details and confirm.</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, padding: 12, borderColor: 'var(--unsafe)' }}>
          <span style={{ color: 'var(--unsafe)' }}>{error}</span>
        </div>
      )}

      {/* Order item card */}
      <div className="card" style={{ marginTop: 18, padding: 16 }}>
        <div className="row" style={{ alignItems: 'center', gap: 14 }}>
          <div className="buyer-card__hero" data-tag={tag} style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, position: 'relative' }}>
            <div className="buyer-card__species-tag" style={{ fontSize: 18 }}>{tag}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{speciesName}</div>
            <div className="muted-data" style={{ fontSize: 13, marginTop: 2 }}>{vendorName}</div>
            <div className="muted-data" style={{ fontSize: 12, marginTop: 2 }}><I.MapPin size={10} /> {locationName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtPrice(price)}<small style={{ fontWeight: 400, fontSize: 12 }}>/kg</small></div>
            <div className="muted-data" style={{ fontSize: 12, marginTop: 2 }}>{available}kg available</div>
          </div>
        </div>

        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div className="label">Quantity (kg)</div>
          <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button
              className="btn btn--ghost btn--sm"
              disabled={qty <= 0.5}
              onClick={() => setQty(q => +(q - 0.5).toFixed(2))}
            >−</button>
            <input
              type="number"
              className="input"
              value={qty}
              min={0.1}
              max={available}
              step={0.5}
              onChange={e => setQty(Math.max(0.1, Math.min(available, Number(e.target.value) || 0.1)))}
              style={{ width: 80, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            />
            <button
              className="btn btn--ghost btn--sm"
              disabled={qty >= available}
              onClick={() => setQty(q => Math.min(available, +(q + 0.5).toFixed(2)))}
            >+</button>
            <span className="muted-data" style={{ fontSize: 12 }}>of {available}kg</span>
          </div>
        </div>
      </div>

      {/* Dispatch mode */}
      <div className="card" style={{ marginTop: 14, padding: 16 }}>
        <div className="label">How would you like to receive this?</div>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          <button
            className={`btn btn--sm ${dispatchMode === 'PICKUP' ? 'btn--accent' : 'btn--ghost'}`}
            onClick={() => { setDispatchMode('PICKUP'); setAddressId(null) }}
          >
            🏪 Pickup
          </button>
          <button
            className={`btn btn--sm ${dispatchMode === 'DELIVERY' ? 'btn--accent' : 'btn--ghost'}`}
            onClick={() => {
              setDispatchMode('DELIVERY')
              if (!addressId && addresses.length) setAddressId((addresses.find(a => a.isDefault) || addresses[0])?.id)
            }}
          >
            🚚 Delivery
          </button>
        </div>

        {dispatchMode === 'DELIVERY' && (
          <div style={{ marginTop: 14 }}>
            <div className="label">Delivery address</div>
            {loadingAddrs ? (
              <div className="muted-data" style={{ fontSize: 12 }}>Loading addresses…</div>
            ) : addresses.length === 0 ? (
              <div className="muted-data" style={{ fontSize: 13 }}>No saved addresses — add one below.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {addresses.map(a => (
                  <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: addressId === a.id ? 'var(--surface-2)' : 'transparent' }}>
                    <input
                      type="radio"
                      name="instant-addr"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {a.label} {a.isDefault && <span className="muted-data" style={{ fontSize: 11 }}>· Default</span>}
                      </div>
                      <div className="muted-data" style={{ fontSize: 12 }}>{a.recipientName}{a.phone ? ` · ${a.phone}` : ''}</div>
                      <div className="muted-data" style={{ fontSize: 12 }}>{a.oneLine || a.addressLine1}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={() => setShowNewAddress(v => !v)}>
              {showNewAddress ? 'Cancel' : '+ Add new address'}
            </button>
            {showNewAddress && (
              <form onSubmit={handleAddAddress} style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  <input className="input" placeholder="Label (Home, Office…)" value={newAddress.label} onChange={e => setNewAddress(p => ({ ...p, label: e.target.value }))} style={{ flex: 1 }} />
                  <input className="input" placeholder="Recipient name *" value={newAddress.recipientName} onChange={e => setNewAddress(p => ({ ...p, recipientName: e.target.value }))} style={{ flex: 2 }} />
                </div>
                <input className="input" placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))} />
                <input className="input" placeholder="Address line 1 *" value={newAddress.addressLine1} onChange={e => setNewAddress(p => ({ ...p, addressLine1: e.target.value }))} />
                <input className="input" placeholder="Address line 2" value={newAddress.addressLine2} onChange={e => setNewAddress(p => ({ ...p, addressLine2: e.target.value }))} />
                <div className="row" style={{ gap: 8 }}>
                  <input className="input" placeholder="Barangay" value={newAddress.barangay} onChange={e => setNewAddress(p => ({ ...p, barangay: e.target.value }))} style={{ flex: 1 }} />
                  <input className="input" placeholder="City *" value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <input className="input" placeholder="Province" value={newAddress.province} onChange={e => setNewAddress(p => ({ ...p, province: e.target.value }))} style={{ flex: 1 }} />
                  <input className="input" placeholder="Postal code" value={newAddress.postalCode} onChange={e => setNewAddress(p => ({ ...p, postalCode: e.target.value }))} style={{ flex: 1 }} />
                </div>
                <button type="submit" className="btn btn--accent btn--sm" style={{ alignSelf: 'flex-start' }}>Save address</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="card" style={{ marginTop: 14, padding: 16 }}>
        <div className="label">Order notes (optional)</div>
        <textarea
          className="input"
          placeholder="Quality requests, packaging preferences…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ marginTop: 6, minHeight: 60 }}
          maxLength={500}
        />
      </div>

      {/* Order summary + place */}
      <div className="card" style={{ marginTop: 14, padding: 18, position: 'sticky', bottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="muted-data" style={{ fontSize: 12 }}>{qty}kg × {fmtPrice(price)}/kg</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{dispatchMode === 'DELIVERY' ? '🚚 Delivery' : '🏪 Pickup'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label">Total</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtPrice(lineTotal)}</div>
          </div>
        </div>
        <button
          className="btn btn--accent"
          onClick={handlePlace}
          disabled={submitting || qty <= 0}
          style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px 0' }}
        >
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutView() {
  const navigate = useNavigate()
  const onBack = () => navigate('/buyer/cart')
  const onSuccess = () => navigate('/buyer/orders')
  const { cart, refresh } = useCart()
  const [addresses, setAddresses] = useState([])
  const [loadingAddrs, setLoadingAddrs] = useState(true)
  const [groupSpecs, setGroupSpecs] = useState({}) // vendorId -> { dispatchMode, addressId, notes }
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: 'Home', recipientName: '', phone: '',
    addressLine1: '', addressLine2: '', barangay: '',
    city: '', province: '', postalCode: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH') // 'CASH' | 'GCASH' | 'PAYMAYA' | 'CARD'
  const [payingOnline, setPayingOnline] = useState(false)
  const [payError, setPayError] = useState('')

  // Load addresses and seed group specs from cart
  useEffect(() => {
    apiGet('/buyer/addresses')
      .then(d => setAddresses(d || []))
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddrs(false))
  }, [])

  useEffect(() => {
    const seeded = {}
    for (const g of (cart.groups || [])) {
      seeded[g.vendor.id] = groupSpecs[g.vendor.id] || { dispatchMode: 'PICKUP', addressId: null, notes: '' }
    }
    setGroupSpecs(seeded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart])

  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0]

  function setSpec(vendorId, patch) {
    setGroupSpecs(prev => ({ ...prev, [vendorId]: { ...prev[vendorId], ...patch } }))
  }

  async function handleAddAddress(e) {
    e.preventDefault()
    if (!newAddress.recipientName.trim() || !newAddress.addressLine1.trim() || !newAddress.city.trim()) {
      setError('Recipient name, address line 1, and city are required.')
      return
    }
    try {
      const created = await apiPost('/buyer/addresses', null, { ...newAddress, setAsDefault: addresses.length === 0 })
      setAddresses(prev => [...prev, created])
      setShowNewAddress(false)
      setError('')
      setNewAddress({ label: 'Home', recipientName: '', phone: '', addressLine1: '', addressLine2: '', barangay: '', city: '', province: '', postalCode: '' })
    } catch (e) {
      setError(e?.message || 'Could not save address.')
    }
  }

  function validate() {
    for (const g of cart.groups || []) {
      const spec = groupSpecs[g.vendor.id] || {}
      if (spec.dispatchMode === 'DELIVERY' && !spec.addressId) {
        return `Pick a delivery address for ${g.vendor.fullName || 'vendor'}.`
      }
    }
    return null
  }

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

  async function handleOnlinePay(orderId) {
    setPayingOnline(true)
    setPayError('')
    try {
      const returnUrl = `${window.location.origin}/buyer/payment-return?orderId=${orderId}`
      const res = await apiPost(`/buyer/orders/${orderId}/payment-intent`, { method: paymentMethod, returnUrl })

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

  if (cart.itemCount === 0) {
    return (
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back</button>
        </div>
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Receipt size={36} />
          <span>Your cart is empty. Add items before checkout.</span>
        </div>
      </div>
    )
  }

  const grandTotal = cart.grandTotal || 0

  return (
    <div className="page">
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back to cart</button>
      </div>

      <div className="page__head" style={{ marginTop: 6 }}>
        <div>
          <div className="eyebrow">Checkout</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Confirm your <em>order</em></h1>
          <p className="page__sub">Each vendor group becomes its own order. Choose pickup or delivery per vendor.</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, padding: 12, borderColor: 'var(--unsafe)' }}>
          <span style={{ color: 'var(--unsafe)' }}>{error}</span>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(cart.groups || []).map(g => {
          const spec = groupSpecs[g.vendor.id] || { dispatchMode: 'PICKUP' }
          return (
            <div key={g.vendor.id} className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 600 }}>{g.vendor.fullName || '—'}</div>
              <div className="muted-data" style={{ fontSize: 12 }}>
                {g.items.length} item{g.items.length === 1 ? '' : 's'} · subtotal {fmtPrice(g.subtotal)}
              </div>

              <div className="row" style={{ gap: 10, marginTop: 12 }}>
                <button
                  className={`btn btn--sm ${spec.dispatchMode === 'PICKUP' ? 'btn--accent' : 'btn--ghost'}`}
                  onClick={() => setSpec(g.vendor.id, { dispatchMode: 'PICKUP', addressId: null })}
                >Pickup</button>
                <button
                  className={`btn btn--sm ${spec.dispatchMode === 'DELIVERY' ? 'btn--accent' : 'btn--ghost'}`}
                  onClick={() => setSpec(g.vendor.id, {
                    dispatchMode: 'DELIVERY',
                    addressId: spec.addressId || defaultAddress?.id || null,
                  })}
                >Delivery</button>
              </div>

              {spec.dispatchMode === 'DELIVERY' && (
                <div style={{ marginTop: 12 }}>
                  <div className="label">Delivery address</div>
                  {loadingAddrs ? (
                    <div className="muted-data" style={{ fontSize: 12 }}>Loading addresses…</div>
                  ) : addresses.length === 0 ? (
                    <div className="muted-data" style={{ fontSize: 13 }}>No saved addresses yet — add one below.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {addresses.map(a => (
                        <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: spec.addressId === a.id ? 'var(--surface-2)' : 'transparent' }}>
                          <input
                            type="radio"
                            name={`addr-${g.vendor.id}`}
                            checked={spec.addressId === a.id}
                            onChange={() => setSpec(g.vendor.id, { addressId: a.id })}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>
                              {a.label} {a.isDefault && <span className="muted-data" style={{ fontSize: 11 }}>· Default</span>}
                            </div>
                            <div className="muted-data" style={{ fontSize: 12 }}>{a.recipientName}{a.phone ? ` · ${a.phone}` : ''}</div>
                            <div className="muted-data" style={{ fontSize: 12 }}>{a.oneLine || a.addressLine1}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <textarea
                className="input"
                placeholder="Notes for this vendor (optional)"
                value={spec.notes || ''}
                onChange={e => setSpec(g.vendor.id, { notes: e.target.value })}
                style={{ marginTop: 12, minHeight: 60 }}
              />
            </div>
          )
        })}

        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="label">Address book</div>
              <div className="muted-data" style={{ fontSize: 12 }}>{addresses.length} saved</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowNewAddress(v => !v)}>
              {showNewAddress ? 'Cancel' : 'Add new address'}
            </button>
          </div>
          {showNewAddress && (
            <form onSubmit={handleAddAddress} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <input className="input" placeholder="Label (Home, Restaurant)" value={newAddress.label}
                  onChange={e => setNewAddress({ ...newAddress, label: e.target.value })} style={{ flex: '1 1 140px' }} />
                <input className="input" placeholder="Recipient name *" value={newAddress.recipientName}
                  onChange={e => setNewAddress({ ...newAddress, recipientName: e.target.value })} style={{ flex: '1 1 200px' }} required />
                <input className="input" placeholder="Phone" value={newAddress.phone}
                  onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} style={{ flex: '1 1 140px' }} />
              </div>
              <input className="input" placeholder="Address line 1 *" value={newAddress.addressLine1}
                onChange={e => setNewAddress({ ...newAddress, addressLine1: e.target.value })} required />
              <input className="input" placeholder="Address line 2 (optional)" value={newAddress.addressLine2}
                onChange={e => setNewAddress({ ...newAddress, addressLine2: e.target.value })} />
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <input className="input" placeholder="Barangay" value={newAddress.barangay}
                  onChange={e => setNewAddress({ ...newAddress, barangay: e.target.value })} style={{ flex: '1 1 140px' }} />
                <input className="input" placeholder="City *" value={newAddress.city}
                  onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} style={{ flex: '1 1 140px' }} required />
                <input className="input" placeholder="Province" value={newAddress.province}
                  onChange={e => setNewAddress({ ...newAddress, province: e.target.value })} style={{ flex: '1 1 140px' }} />
                <input className="input" placeholder="Postal" value={newAddress.postalCode}
                  onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })} style={{ flex: '0 1 100px' }} />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button type="submit" className="btn btn--accent btn--sm">Save address</button>
              </div>
            </form>
          )}
        </div>

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
      </div>

      <div className="card" style={{ marginTop: 18, padding: 16, position: 'sticky', bottom: 12 }}>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label">Grand total</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtPrice(grandTotal)}</div>
          </div>
          <button
            className="btn btn--accent"
            onClick={handlePlace}
            disabled={submitting || payingOnline || cart.itemCount === 0}
            style={{ minWidth: 200 }}
          >
            {payingOnline ? 'Redirecting to payment…' : submitting ? 'Placing…' : `Place ${cart.groups.length} order${cart.groups.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
