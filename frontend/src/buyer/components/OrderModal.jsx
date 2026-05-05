import { useState, useEffect } from 'react'
import { apiPost } from '../../api'
import { fmt, fmtPrice } from '../utils/format'
import { I } from '../../icons'

export function useEscapeToClose(onClose) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

export default function OrderModal({ listing, onClose, onSuccess }) {
  const [dispatch, setDispatch]   = useState('PICKUP')
  const [address, setAddress]     = useState('')
  const [qty, setQty]             = useState('')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  useEscapeToClose(onClose)

  const addressRequired = dispatch === 'DELIVERY'
  const canSubmit = !loading && !(addressRequired && !address.trim())

  const speciesName = listing.fishSpecies?.commonName || listing.species?.commonName || 'Listing'
  const vendorName = listing.vendorName || listing.seller?.fullName || '—'
  const vendorRating = listing.vendorRating || '—'
  const price = listing.offerPricePerKg || listing.pricePerKg || 0
  const available = listing.quantityKg || listing.available || 0
  const location = listing.marketLocation?.name || listing.location || '—'

  async function handleSubmit(e) {
    e.preventDefault()
    if (addressRequired && !address.trim()) {
      setError('Delivery address is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await apiPost('/buyer/orders', null, {
        listingId: listing.id,
        dispatchMode: dispatch,
        deliveryAddress: dispatch === 'DELIVERY' ? address.trim() : undefined,
        orderedQtyKg: qty ? Number(qty) : undefined,
        notes: notes.trim() || undefined,
      })
      setDone(true)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to place order.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">{vendorName}</div>
            <h2 id="order-modal-title" className="modal__title" style={{ marginTop: 4 }}>
              {done ? 'Order Placed!' : speciesName}
            </h2>
            {!done && (
              <div className="muted-data">★ {vendorRating} · {location}</div>
            )}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close order modal"><I.X size={14} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5 }}>
              Your order has been placed successfully.<br />The vendor will confirm soon.
            </p>
            <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Detail grid */}
            <div className="detail-grid">
              <div><div className="l">Price</div><div className="v">{fmtPrice(price)}<small>/kg</small></div></div>
              <div><div className="l">Available</div><div className="v">{available}<small>kg</small></div></div>
              <div><div className="l">Total batch</div><div className="v">{listing.quantityKg || '—'}<small>kg</small></div></div>
              <div><div className="l">Ready by</div><div className="v" style={{ fontSize: 14 }}>{listing.neededBy ? fmt(listing.neededBy) : '—'}</div></div>
            </div>

            {listing.notes && (
              <div className="detail-notes">"{listing.notes}"</div>
            )}

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-row form-row--2col">
                <div>
                  <label>Quantity (kg)</label>
                  <input
                    className="input"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label>Pickup or delivery</label>
                  <select className="input" value={dispatch} onChange={e => setDispatch(e.target.value)}>
                    <option value="PICKUP">Pickup</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
              </div>

              {dispatch === 'DELIVERY' && (
                <div>
                  <label>Delivery Address *</label>
                  <input
                    className="input"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Enter full delivery address"
                    required
                  />
                </div>
              )}

              <div>
                <label>Notes for vendor</label>
                <textarea
                  className="input"
                  rows="2"
                  value={notes}
                  onChange={e => setNotes(e.target.value.slice(0, 300))}
                  placeholder="Optional — quality requests, packaging…"
                  maxLength={300}
                />
              </div>
            </div>

            {error && <div style={{ color: 'var(--unsafe)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>{error}</div>}

            <div className="modal__foot">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn--ghost">Message vendor</button>
              <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
                {loading ? 'Placing…' : 'Place order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
