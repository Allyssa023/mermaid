import { useState, useEffect } from 'react'
import { I } from '../icons'
import { useCart } from '../context/CartContext'
import { placeOrder } from './api/orders'
import { StatTileSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Checkout({ setPage, buyNow, setBuyNow }) {
  const { cart, loading, error, clearCart } = useCart()

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
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')

  const groupsKey = groups.map(g => g.vendor?.id).join(',')

  useEffect(() => {
    const init = {}
    groups.forEach(g => {
      const vid = String(g.vendor?.id)
      init[vid] = {
        dispatch: 'PICKUP',
        address: '',
        notes: '',
        qty: String(g.items?.[0]?.quantityKg ?? 1),
      }
    })
    setForms(init)
  }, [groupsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateForm = (vid, patch) =>
    setForms(prev => ({ ...prev, [String(vid)]: { ...prev[String(vid)], ...patch } }))

  const handleSubmit = async () => {
    for (const g of groups) {
      const f = forms[String(g.vendor?.id)] ?? {}
      if (f.dispatch === 'DELIVERY' && !f.address?.trim()) {
        setSubmitErr('Enter a delivery address for ' + (g.vendor?.fullName ?? 'a vendor'))
        return
      }
    }
    setSubmitting(true)
    setSubmitErr('')
    try {
      for (const g of groups) {
        const f = forms[String(g.vendor?.id)] ?? {}
        for (const item of g.items) {
          await placeOrder({
            listingId: item.listingId ?? item.id,
            orderedQtyKg: Number(f.qty) || undefined,
            dispatchMode: f.dispatch,
            deliveryAddress: f.dispatch === 'DELIVERY' ? f.address.trim() : null,
            notes: f.notes?.trim() || null,
          })
        }
      }
      if (!buyNow) await clearCart()
      setBuyNow(null)
      setPage('borders')
    } catch (e) {
      setSubmitErr(e?.message ?? 'Order placement failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!buyNow && loading) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">Checkout</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
          <StatTileSkeleton />
          <StatTileSkeleton />
        </div>
      </div>
    )
  }

  if (!buyNow && error) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">Checkout</h1>
        </div>
        <ApiError error={{ message: error }} />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">Checkout</h1>
        </div>
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <button className="btn btn--primary" onClick={() => setPage('bbrowse')}>Browse listings</button>
        </div>
      </div>
    )
  }

  const grandTotal = groups.reduce((sum, g) => {
    const f = forms[String(g.vendor?.id)] ?? {}
    const subtotal = (g.items ?? []).reduce(
      (s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0
    )
    const deliveryFee = f.dispatch === 'DELIVERY' ? (g.items?.[0]?.deliveryFee ?? 0) : 0
    return sum + subtotal + deliveryFee
  }, 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              if (!buyNow) setPage('bcart')
              else { setBuyNow(null); setPage('bbrowse') }
            }}
          >
            <I.ChevL size={11} /> Back
          </button>
          <h1 className="page__title" style={{ marginTop: 10 }}>Checkout</h1>
          <p className="page__sub">One submit, separate orders per vendor.</p>
        </div>
      </div>

      <div className="grid grid--2-1" style={{ marginTop: 18, gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map(g => {
            const vid = String(g.vendor?.id)
            const f = forms[vid] ?? {}
            const liveSubtotal = (g.items ?? []).reduce(
              (s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0
            )

            return (
              <div key={vid} className="card">
                <div className="card__head">
                  <div>
                    <div className="eyebrow">Vendor order</div>
                    <div className="card__title" style={{ fontSize: 17 }}>{g.vendor?.fullName}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₱{liveSubtotal.toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {g.items.map(it => (
                    <div key={it.id} className="row" style={{ gap: 8, fontSize: 13, padding: '4px 0' }}>
                      <span style={{ flex: 1 }}>{it.speciesName}</span>
                      <input
                        className="input"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={f.qty}
                        onChange={e => updateForm(vid, { qty: e.target.value })}
                        style={{ width: 72, textAlign: 'right' }}
                      />
                      <span className="muted-data" style={{ fontSize: 12 }}>kg</span>
                      <span style={{ fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right' }}>
                        ₱{((Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="eyebrow" style={{ marginBottom: 6 }}>Dispatch</div>
                <div className="seg" style={{ marginBottom: 14 }}>
                  {['PICKUP', 'DELIVERY'].map(d => (
                    <button
                      key={d}
                      className={f.dispatch === d ? 'on' : ''}
                      onClick={() => updateForm(vid, { dispatch: d })}
                    >
                      {d === 'PICKUP'
                        ? <><I.MapPin size={11} /> Pickup</>
                        : <><I.Truck size={11} /> Delivery</>}
                    </button>
                  ))}
                </div>

                {f.dispatch === 'DELIVERY' && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>Delivery address</div>
                    <input
                      className="input"
                      type="text"
                      placeholder="Street, City, Province"
                      value={f.address}
                      onChange={e => updateForm(vid, { address: e.target.value })}
                    />
                  </div>
                )}

                <div className="eyebrow" style={{ marginBottom: 6 }}>Note for vendor (optional)</div>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Any preparation requests…"
                  value={f.notes}
                  onChange={e => updateForm(vid, { notes: e.target.value })}
                />
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
          <div className="card">
            <div className="card__head">
              <div className="card__title">Summary</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              {groups.map(g => {
                const vid = String(g.vendor?.id)
                const f = forms[vid] ?? {}
                const liveSubtotal = (g.items ?? []).reduce(
                  (s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0
                )
                const deliveryFee = f.dispatch === 'DELIVERY' ? (g.items?.[0]?.deliveryFee ?? 0) : 0
                return (
                  <div key={vid}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span>{g.vendor?.fullName}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>₱{liveSubtotal.toLocaleString()}</span>
                    </div>
                    {deliveryFee > 0 && f.dispatch === 'DELIVERY' && (
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="muted-data">Delivery fee</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>₱{deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
                <strong>Grand total</strong>
                <strong style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>
                  ₱{grandTotal.toLocaleString()}
                </strong>
              </div>
            </div>
            <button
              className="btn btn--primary"
              style={{ marginTop: 14, width: '100%' }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Placing…' : 'Place orders'} <I.Arrow size={12} />
            </button>
            {submitErr && (
              <div className="muted-data" style={{ fontSize: 12, color: 'var(--error)', marginTop: 8, textAlign: 'center' }}>
                {submitErr}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
