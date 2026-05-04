import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import './design-system.css'
import './light-compat.css'
import './handoff.css'
import './buyer.css'
import { apiGet, apiPost, apiPatch, apiPut, apiUpload } from './api'
import { I } from './icons'
import Messages from './Messages'
import { useCart } from './context/CartContext'
import { useFavorites } from './context/FavoritesContext'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtPrice(p) {
  if (p == null) return '—'
  return `₱${Number(p).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Order Modal ───────────────────────────────────────────────────────────────

function OrderModal({ listing, onClose, onSuccess }) {
  const [dispatch, setDispatch]   = useState('PICKUP')
  const [address, setAddress]     = useState('')
  const [qty, setQty]             = useState('')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">{vendorName}</div>
            <h2 className="modal__title" style={{ marginTop: 4 }}>
              {done ? 'Order Placed!' : speciesName}
            </h2>
            {!done && (
              <div className="muted-data">★ {vendorRating} · {location}</div>
            )}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose}><I.X size={14} /></button>
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

// ── Review Modal ──────────────────────────────────────────────────────────────

function StarPicker({ value, onChange, size = 28 }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: n <= value ? 'var(--accent, #f5a524)' : 'var(--ink-4, #999)',
          }}
        >
          <I.Star size={size} />
        </button>
      ))}
    </div>
  )
}

function ReviewModal({ order, existing, onClose, onSubmitted }) {
  const [rating, setRating]   = useState(existing?.rating || 5)
  const [comment, setComment] = useState(existing?.comment || '')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  const isEdit = Boolean(existing?.id)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const path = `/buyer/orders/${order.id}/review`
      const body = { rating, comment: comment.trim() || undefined }
      if (isEdit) {
        await apiPatch(path, null, body)
      } else {
        await apiPost(path, null, body)
      }
      onSubmitted && onSubmitted()
      onClose()
    } catch (err) {
      setError(err?.message || 'Could not save review.')
    } finally {
      setBusy(false)
    }
  }

  const speciesName = order.species?.commonName || 'this order'
  const sellerName  = order.sellerName || order.seller?.fullName || 'the vendor'

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel" style={{ maxWidth: 520 }}>
        <div className="modal__head">
          <h2>{isEdit ? 'Edit review' : 'Rate your order'}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '0 18px 18px' }}>
          <div className="muted-data" style={{ fontSize: 13, marginBottom: 12 }}>
            How was your <strong>{speciesName}</strong> from <strong>{sellerName}</strong>?
          </div>

          <div className="label" style={{ marginTop: 4 }}>Your rating</div>
          <StarPicker value={rating} onChange={setRating} />

          <div className="label" style={{ marginTop: 18 }}>Comment (optional)</div>
          <textarea
            className="input"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anything other buyers should know about this vendor?"
            rows={4}
            maxLength={2000}
          />

          {error && (
            <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 10 }}>{error}</div>
          )}

          <div className="row" style={{ gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--accent" disabled={busy || rating < 1}>
              {busy ? 'Saving…' : isEdit ? 'Update review' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Favorite heart toggle (shared) ────────────────────────────────────────────

function FavoriteHeart({ targetType, targetId, size = 14, label = 'Save', stopPropagation = true }) {
  const { isFavorited, toggle } = useFavorites()
  const [busy, setBusy] = useState(false)
  const active = isFavorited(targetType, targetId)
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={async (e) => {
        if (stopPropagation) e.stopPropagation()
        if (busy) return
        setBusy(true)
        await toggle(targetType, targetId)
        setBusy(false)
      }}
      aria-label={active ? `Remove ${label}` : `Save ${label}`}
      title={active ? 'Saved' : 'Save'}
      style={{
        color: active ? 'var(--accent, #f5a524)' : 'var(--ink-4, #999)',
        padding: '4px 8px',
      }}
    >
      <I.Star size={size} />
    </button>
  )
}

function SavedCountBadge() {
  const { favorites } = useFavorites()
  return (
    <button className="btn btn--ghost">
      {favorites.length} saved <I.Star size={12} />
    </button>
  )
}

// ── Vendor Storefront View ────────────────────────────────────────────────────

function VendorStorefrontView() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const onBack = () => navigate(-1)
  const onSelectListing = (id) => navigate(`/buyer/listing/${id}`)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    apiGet(`/vendors/${vendorId}/storefront`)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e?.message || 'Failed to load vendor.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vendorId])

  if (loading) {
    return (
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back</button>
        </div>
        <div className="card" style={{ marginTop: 18, padding: 24 }}>
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
          <div className="skeleton" style={{ height: 120, marginTop: 12 }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back</button>
        </div>
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Alert size={36} />
          <span>{error || 'Vendor unavailable.'}</span>
        </div>
      </div>
    )
  }

  const vendor   = data.vendor || {}
  const listings = data.listings || []
  const reviews  = data.recentReviews || []
  const initials = (vendor.fullName || '?').split(' ').map(s => s[0]).join('').slice(0, 2)

  return (
    <div className="page">
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back</button>
      </div>

      {/* Hero */}
      <div className="card" style={{ marginTop: 14, padding: 20 }}>
        <div className="row" style={{ alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22,
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Vendor</div>
            <h1 className="page__title" style={{ marginTop: 2, fontSize: 28 }}>{vendor.fullName || '—'}</h1>
            <div className="muted-data" style={{ fontSize: 13, marginTop: 4 }}>
              {vendor.avgRating != null ? (
                <span style={{ color: 'var(--accent, #f5a524)' }}>★ {vendor.avgRating}</span>
              ) : 'New vendor'}
              {vendor.reviewCount ? ` · ${vendor.reviewCount} review${vendor.reviewCount === 1 ? '' : 's'}` : ''}
              {vendor.joinedDate ? ` · joined ${fmt(vendor.joinedDate)}` : ''}
            </div>
          </div>
          <FavoriteHeart targetType="VENDOR" targetId={vendor.id} label="vendor" stopPropagation={false} />
        </div>
      </div>

      {/* Listings */}
      <div style={{ marginTop: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page__title" style={{ fontSize: 20 }}>Open listings ({listings.length})</h2>
        </div>
        {listings.length === 0 ? (
          <div className="muted-data" style={{ fontSize: 13, marginTop: 8 }}>
            No open listings from this vendor right now.
          </div>
        ) : (
          <div className="buyer-grid" style={{ marginTop: 12 }}>
            {listings.map(l => {
              const tag = l.fishSpecies?.tag || (l.fishSpecies?.commonName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={l.id} className="buyer-card" onClick={() => onSelectListing && onSelectListing(l.id)}>
                  <div className="buyer-card__hero" data-tag={tag} style={{ position: 'relative' }}>
                    <div className="buyer-card__species-tag">{tag}</div>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <FavoriteHeart targetType="LISTING" targetId={l.id} />
                    </div>
                  </div>
                  <div className="buyer-card__body">
                    <h3 className="buyer-card__species">{l.fishSpecies?.commonName || '—'}</h3>
                    <div className="buyer-card__location"><I.MapPin size={11} /> {l.marketLocation?.name || '—'}</div>
                    <div className="buyer-card__price">
                      <span className="big">{fmtPrice(l.offerPricePerKg)}</span>
                      <span>/kg</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      <div style={{ marginTop: 32 }}>
        <h2 className="page__title" style={{ fontSize: 20 }}>Recent reviews</h2>
        {reviews.length === 0 ? (
          <div className="muted-data" style={{ fontSize: 13, marginTop: 8 }}>
            No reviews yet — be the first to share your experience after a completed order.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.map(r => (
              <div key={r.id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600 }}>{r.reviewerName || 'Buyer'}</div>
                  <div style={{ color: 'var(--accent, #f5a524)', fontFamily: 'var(--font-mono)' }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                </div>
                {r.comment && (
                  <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{r.comment}</div>
                )}
                <div className="muted-data" style={{ fontSize: 11, marginTop: 6 }}>{fmt(r.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Listing Detail View ───────────────────────────────────────────────────────

function ListingDetailView() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [adding, setAdding]   = useState(false)
  const [addNotice, setAddNotice] = useState('')
  const [orderListing, setOrderListing] = useState(null)
  const { addItem } = useCart()
  const onBack = () => navigate('/buyer/browse')
  const onOrder = (l) => setOrderListing(l)
  const onSelectRelated = (id) => navigate(`/buyer/listing/${id}`)
  const onSelectVendor = (id) => navigate(`/buyer/vendor/${id}`)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    apiGet(`/buyer/marketplace/listings/${listingId}`)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e?.message || 'Failed to load listing.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [listingId])

  if (loading) {
    return (
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back</button>
        </div>
        <div className="card" style={{ marginTop: 18, padding: 24 }}>
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
          <div className="skeleton" style={{ height: 16, width: '60%', marginTop: 12 }} />
          <div className="skeleton" style={{ height: 200, marginTop: 18 }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back</button>
        </div>
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Alert size={36} />
          <span>{error || 'Listing unavailable.'}</span>
        </div>
      </div>
    )
  }

  const listing = data.listing || {}
  const vendor  = data.vendor || {}
  const photos  = data.photoUrls || []
  const related = data.relatedListings || []
  const price = listing.offerPricePerKg || 0
  const available = listing.quantityKg || 0
  const inStock = available > 0
  const speciesName = listing.fishSpecies?.commonName || 'Listing'
  const tag = listing.fishSpecies?.tag || speciesName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="page">
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}><I.ChevL size={12} /> Back to marketplace</button>
      </div>

      <div className="row" style={{ gap: 24, marginTop: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Photos */}
        <div style={{ flex: '1 1 360px', minWidth: 280 }}>
          <div className="buyer-card__hero" data-tag={tag} style={{ height: 320, borderRadius: 16, position: 'relative' }}>
            <div className="buyer-card__species-tag" style={{ fontSize: 56 }}>{tag}</div>
          </div>
          {photos.length === 0 ? (
            <p className="muted-data" style={{ marginTop: 8, fontSize: 12 }}>
              Photos coming soon — vendors will be able to upload images of their catch.
            </p>
          ) : (
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              {photos.slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div className="eyebrow">{listing.marketLocation?.name || '—'}</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>{speciesName}</h1>

          <div className="buyer-card__price" style={{ marginTop: 14 }}>
            <span className="big" style={{ fontSize: 36 }}>{fmtPrice(price)}</span>
            <span>/kg</span>
          </div>

          <div className="row" style={{ gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <span className={inStock ? '' : 'muted-data'} style={{ color: inStock ? 'var(--safe)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              {inStock ? `● ${available}kg available` : '● Out of stock'}
            </span>
            {listing.neededBy && (
              <span className="muted-data" style={{ fontSize: 13 }}>
                Needed by {fmt(listing.neededBy)}
              </span>
            )}
          </div>

          {data.description && (
            <div style={{ marginTop: 18 }}>
              <div className="label">Description</div>
              <p style={{ marginTop: 6, lineHeight: 1.6 }}>{data.description}</p>
            </div>
          )}

          <div
            className="card"
            style={{ marginTop: 18, padding: 14, cursor: vendor.id && onSelectVendor ? 'pointer' : 'default' }}
            onClick={() => { if (vendor.id && onSelectVendor) onSelectVendor(vendor.id) }}
          >
            <div className="row" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                {(vendor.fullName || '?').slice(0, 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {vendor.fullName || '—'}
                  {vendor.id && onSelectVendor && (
                    <span className="muted-data" style={{ fontSize: 11, marginLeft: 8 }}>· View storefront →</span>
                  )}
                </div>
                <div className="muted-data" style={{ fontSize: 12 }}>
                  {vendor.avgRating != null ? `★ ${vendor.avgRating}` : 'New vendor'}
                  {vendor.reviewCount ? ` · ${vendor.reviewCount} reviews` : ''}
                  {vendor.joinedDate ? ` · joined ${fmt(vendor.joinedDate)}` : ''}
                </div>
              </div>
              {vendor.id && (
                <FavoriteHeart targetType="VENDOR" targetId={vendor.id} label="vendor" stopPropagation={true} />
              )}
            </div>
          </div>

          <div className="row" style={{ gap: 10, marginTop: 18 }}>
            <button
              className="btn btn--accent"
              disabled={!inStock}
              onClick={() => onOrder(listing)}
              style={{ flex: 2 }}
            >
              {inStock ? 'Buy now' : 'Notify me'}
            </button>
            <button
              className="btn btn--ghost"
              disabled={adding || !inStock}
              onClick={async () => {
                setAdding(true); setAddNotice('')
                const defaultQty = Math.min(1, available || 1)
                const res = await addItem({ listingId: listing.id, quantityKg: defaultQty })
                setAdding(false)
                if (res?.ok) {
                  setAddNotice('Added to cart.')
                  setTimeout(() => setAddNotice(''), 2000)
                } else {
                  setAddNotice(res?.error || 'Could not add to cart.')
                }
              }}
              style={{ flex: 1 }}
            >
              {adding ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
          {addNotice && (
            <div style={{ marginTop: 10, fontSize: 13, color: addNotice.includes('Could') || addNotice.includes('not') ? 'var(--unsafe)' : 'var(--safe)' }}>
              {addNotice}
            </div>
          )}
        </div>
      </div>

      {orderListing && (
        <OrderModal
          listing={orderListing}
          onClose={() => setOrderListing(null)}
          onSuccess={() => { setOrderListing(null); navigate('/buyer/orders') }}
        />
      )}

      {/* Related listings */}
      {related.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="page__title" style={{ fontSize: 20 }}>You might also like</h3>
          <div className="buyer-grid" style={{ marginTop: 12 }}>
            {related.map(r => {
              const rTag = r.fishSpecies?.tag || (r.fishSpecies?.commonName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div
                  key={r.id}
                  className="buyer-card"
                  onClick={() => onSelectRelated(r.id)}
                >
                  <div className="buyer-card__hero" data-tag={rTag}>
                    <div className="buyer-card__species-tag">{rTag}</div>
                  </div>
                  <div className="buyer-card__body">
                    <h3 className="buyer-card__species">{r.fishSpecies?.commonName || '—'}</h3>
                    <div className="buyer-card__vendor"><span>{r.vendorName || '—'}</span></div>
                    <div className="buyer-card__price">
                      <span className="big">{fmtPrice(r.offerPricePerKg)}</span>
                      <span>/kg</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Browse View ───────────────────────────────────────────────────────────────

function BrowseView() {
  const navigate = useNavigate()
  const [listings, setListings]       = useState([])
  const [species, setSpecies]         = useState([])
  const [locations, setLocations]     = useState([])
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [speciesId, setSpeciesId]     = useState('')
  const [locationId, setLocationId]   = useState('')
  const [minPrice, setMinPrice]       = useState('')
  const [maxPrice, setMaxPrice]       = useState('')
  const [sort, setSort]               = useState('RECENT')
  const [page, setPage]               = useState(0)
  const [pageSize]                    = useState(20)
  const [refreshTick, setRefreshTick] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages]   = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showMap, setShowMap]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [orderListing, setOrderListing] = useState(null)
  const [highlighted, setHighlighted] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const cardRefs = useRef({})

  // Lookups load once
  useEffect(() => {
    apiGet('/fish-species').then(d => setSpecies(d?.content || d || [])).catch(() => {})
    apiGet('/market-locations').then(d => setLocations(d?.content || d || [])).catch(() => {})
  }, [])

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset to first page when any server-side filter changes
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, speciesId, locationId, minPrice, maxPrice, sort])

  // Server-side load whenever any active filter / page changes
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (speciesId) params.set('speciesId', speciesId)
    if (locationId) params.set('locationId', locationId)
    if (minPrice) params.set('minOfferPrice', minPrice)
    if (maxPrice) params.set('maxOfferPrice', maxPrice)
    if (sort && sort !== 'RECENT') params.set('sort', sort)
    params.set('page', String(page))
    params.set('size', String(pageSize))

    apiGet(`/buyer/marketplace/listings?${params.toString()}`)
      .then(d => {
        if (d && Array.isArray(d.content)) {
          // Page envelope shape
          setListings(prev => page === 0 ? d.content : [...prev, ...d.content])
          setTotalElements(d.totalElements ?? d.content.length)
          setTotalPages(d.totalPages ?? 1)
        } else {
          // Fallback: legacy array shape
          const arr = Array.isArray(d) ? d : []
          setListings(arr)
          setTotalElements(arr.length)
          setTotalPages(1)
        }
      })
      .catch(() => {
        if (page === 0) setListings([])
        setTotalElements(0)
        setTotalPages(0)
      })
      .finally(() => setLoading(false))
  }, [debouncedSearch, speciesId, locationId, minPrice, maxPrice, sort, page, pageSize, refreshTick])

  function clearAdvanced() {
    setSpeciesId(''); setLocationId(''); setMinPrice(''); setMaxPrice(''); setSort('RECENT')
  }

  // Segment filters (all/available/premium/urgent) stay client-side — no server equivalent.
  const filtered = listings.filter(l => {
    const available = l.quantityKg || 0
    return (
      filter === 'all' ? true :
      filter === 'available' ? available > 0 :
      filter === 'premium' ? (l.tag === 'Premium' || l.fishSpecies?.tag === 'YT' || l.fishSpecies?.tag === 'LL' || l.fishSpecies?.tag === 'RS') :
      filter === 'urgent' ? (l.urgent || (l.neededBy && new Date(l.neededBy) < new Date(Date.now() + 3 * 86400000))) :
      true
    )
  })

  const advancedActive = speciesId || locationId || minPrice || maxPrice || (sort && sort !== 'RECENT')
  const canLoadMore = !loading && page + 1 < totalPages


  function handleMarkerClick(listing) {
    setHighlighted(listing.id)
    const el = cardRefs.current[listing.id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const mapListings = listings.filter(l => l.marketLocation?.lat && l.marketLocation?.lng)

  // Derive a 2-letter tag from species name if not available
  function getTag(l) {
    if (l.fishSpecies?.tag) return l.fishSpecies.tag
    const name = l.fishSpecies?.commonName || ''
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Marketplace</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Fresh from the <em>coast</em></h1>
          <p className="page__sub">Browse {totalElements || listings.length} active listings from verified vendors. Place an order and pick up or have it delivered.</p>
        </div>
        <div className="page__actions">
          <button className={`btn${showMap ? ' btn--accent' : ''}`} onClick={() => setShowMap(v => !v)}>
            <I.MapPin size={14} /> {showMap ? 'Hide map' : 'Map view'}
          </button>
          <SavedCountBadge />
        </div>
      </div>

      {/* Search + filter row */}
      <div className="card" style={{ marginTop: 18, padding: '14px 18px' }}>
        <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ flex: 1, minWidth: 220 }}>
            <I.Search size={14} />
            <input placeholder="Search species, vendor, or notes…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="seg">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'available' ? 'on' : ''} onClick={() => setFilter('available')}>In stock</button>
            <button className={filter === 'premium' ? 'on' : ''} onClick={() => setFilter('premium')}>Premium</button>
            <button className={filter === 'urgent' ? 'on' : ''} onClick={() => setFilter('urgent')}>Last chance</button>
          </div>
          <button
            className={`btn btn--ghost${advancedActive ? ' btn--accent' : ''}`}
            onClick={() => setShowAdvanced(v => !v)}
            aria-expanded={showAdvanced}
          >
            <I.Filter size={12} /> {showAdvanced ? 'Hide filters' : 'Filters'}{advancedActive ? ' •' : ''}
          </button>
        </div>

        {showAdvanced && (
          <div className="row" style={{ gap: 12, alignItems: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 180px', minWidth: 160 }}>
              <span className="label">Species</span>
              <select value={speciesId} onChange={e => setSpeciesId(e.target.value)} className="input">
                <option value="">All species</option>
                {species.map(s => (
                  <option key={s.id} value={s.id}>{s.commonName}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: '1 1 180px', minWidth: 160 }}>
              <span className="label">Market location</span>
              <select value={locationId} onChange={e => setLocationId(e.target.value)} className="input">
                <option value="">All locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: '0 1 120px', minWidth: 100 }}>
              <span className="label">Min ₱/kg</span>
              <input type="number" min="0" placeholder="0" value={minPrice}
                onChange={e => setMinPrice(e.target.value)} className="input" />
            </label>
            <label style={{ flex: '0 1 120px', minWidth: 100 }}>
              <span className="label">Max ₱/kg</span>
              <input type="number" min="0" placeholder="∞" value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)} className="input" />
            </label>
            <label style={{ flex: '0 1 160px', minWidth: 140 }}>
              <span className="label">Sort by</span>
              <select value={sort} onChange={e => setSort(e.target.value)} className="input">
                <option value="RECENT">Most recent</option>
                <option value="PRICE_ASC">Price: low to high</option>
                <option value="PRICE_DESC">Price: high to low</option>
              </select>
            </label>
            {advancedActive && (
              <button className="btn btn--ghost" onClick={clearAdvanced} style={{ height: 36 }}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map panel */}
      {showMap && (
        <div className="buyer-map-panel" style={{ marginTop: 14 }}>
          <MapContainer center={[16.62, 120.32]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {mapListings.map(l => (
              <Marker
                key={l.id}
                position={[l.marketLocation.lat, l.marketLocation.lng]}
                eventHandlers={{ click: () => handleMarkerClick(l) }}
              >
                <Popup>
                  <strong>{l.fishSpecies?.commonName}</strong><br />
                  {fmtPrice(l.offerPricePerKg)}/kg<br />
                  {l.marketLocation?.name}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Listings grid */}
      {loading ? (
        <div className="buyer-grid" style={{ marginTop: 18 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="buyer-card" style={{ pointerEvents: 'none' }}>
              <div className="buyer-card__hero"><div className="skeleton" style={{ width: '60%', height: 20 }} /></div>
              <div className="buyer-card__body">
                <div className="skeleton" style={{ height: 18, width: '70%' }} />
                <div className="skeleton" style={{ height: 12, width: '50%', marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Store size={36} />
          <span>No listings found. Try adjusting your filters.</span>
        </div>
      ) : (
        <div className="buyer-grid" style={{ marginTop: 18 }}>
          {filtered.map(l => {
            const tag = getTag(l)
            const price = l.offerPricePerKg || l.pricePerKg || 0
            const available = l.quantityKg || 0
            const totalBatch = l.originalQtyKg || l.quantityKg || 0
            const inStock = available > 0
            const lowStock = inStock && available < totalBatch * 0.4
            const overdue = l.neededBy && new Date(l.neededBy) < new Date()

            // Determine listing tag label
            let tagLabel = l.tag || ''
            if (!tagLabel && price >= 400) tagLabel = 'Premium'

            return (
              <div
                key={l.id}
                ref={el => { cardRefs.current[l.id] = el }}
                className={`buyer-card${highlighted === l.id ? ' buyer-card--highlighted' : ''}`}
                onClick={() => navigate(`/buyer/listing/${l.id}`)}
              >
                <div className="buyer-card__hero" data-tag={tag} style={{ position: 'relative' }}>
                  <div className="buyer-card__species-tag">{tag}</div>
                  {tagLabel ? (
                    <span className={`buyer-card__chip buyer-card__chip--${tagLabel.toLowerCase()}`}>{tagLabel}</span>
                  ) : null}
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <FavoriteHeart targetType="LISTING" targetId={l.id} />
                  </div>
                </div>
                <div className="buyer-card__body">
                  <h3 className="buyer-card__species">{l.fishSpecies?.commonName || '—'}</h3>
                  <div className="buyer-card__vendor">
                    <span>{l.vendorName || '—'}</span>
                    <span className="muted-data">★ {l.vendorRating || '—'}</span>
                  </div>
                  <div className="buyer-card__location"><I.MapPin size={11} /> {l.marketLocation?.name || l.location || '—'}</div>
                  <div className="buyer-card__price">
                    <span className="big">{fmtPrice(price)}</span>
                    <span>/kg</span>
                  </div>
                  <div className="buyer-card__stock">
                    {!inStock ? (
                      <span className="muted-data" style={{ color: 'var(--ink-4)' }}>Pre-order · landing {l.neededBy ? fmt(l.neededBy) : 'soon'}</span>
                    ) : lowStock ? (
                      <span style={{ color: 'var(--warn)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>● Low stock · {available}kg left</span>
                    ) : (
                      <span style={{ color: 'var(--safe)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>● {available}kg available</span>
                    )}
                  </div>
                </div>
                <div className="buyer-card__foot">
                  <button className="btn btn--ghost btn--sm" onClick={e => { e.stopPropagation(); navigate(`/buyer/listing/${l.id}`) }}>Details</button>
                  <button
                    className="btn btn--accent btn--sm"
                    disabled={!inStock}
                    onClick={e => { e.stopPropagation(); setOrderListing(l) }}
                  >
                    {inStock ? 'Order' : 'Notify me'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && canLoadMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <button className="btn btn--ghost" onClick={() => setPage(p => p + 1)}>
            Load more · showing {listings.length} of {totalElements}
          </button>
        </div>
      )}

      {/* Order modal */}
      {orderListing && (
        <OrderModal
          listing={orderListing}
          onClose={() => setOrderListing(null)}
          onSuccess={() => { setOrderListing(null); setPage(0); setRefreshTick(t => t + 1) }}
        />
      )}
    </div>
  )
}

// ── Order Timeline Modal ──────────────────────────────────────────────────────

const STATUS_META = {
  PENDING:          { label: 'Order placed',       icon: 'Clipboard' },
  CONFIRMED:        { label: 'Vendor confirmed',   icon: 'Check' },
  PROCESSING:       { label: 'Being prepared',     icon: 'Box' },
  READY_FOR_PICKUP: { label: 'Ready for pickup',   icon: 'Store' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery',   icon: 'Truck' },
  COMPLETED:        { label: 'Order completed',    icon: 'CheckCircle' },
  CANCELLED:        { label: 'Order cancelled',    icon: 'Alert' },
  DISPUTED:         { label: 'Order disputed',     icon: 'Alert' },
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function OrderTimelineModal({ order, onClose }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  function load() {
    setLoading(true)
    apiGet(`/buyer/orders/${order.id}/timeline`)
      .then(d => { setEvents(Array.isArray(d) ? d : []); setError('') })
      .catch(e => setError(e?.message || 'Failed to load timeline.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Light polling so buyers see vendor-driven status changes without WebSocket.
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const speciesName = order.species?.commonName || order.fishSpecies?.commonName || `Order #${order.id}`
  const orderCode   = order.orderCode || `ORD-${order.id}`

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel" style={{ maxWidth: 560 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">{orderCode}</div>
            <h2 style={{ marginTop: 2 }}>Order timeline</h2>
            <div className="muted-data" style={{ fontSize: 12 }}>{speciesName}</div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div style={{ padding: '0 18px 18px' }}>
          {loading && events.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : error ? (
            <div style={{ color: 'var(--unsafe)', fontSize: 13, padding: '8px 0' }}>{error}</div>
          ) : events.length === 0 ? (
            <div className="muted-data" style={{ fontSize: 13, padding: '8px 0' }}>
              No timeline events recorded yet.
            </div>
          ) : (
            <ol style={{
              listStyle: 'none', padding: 0, margin: '4px 0 0',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}>
              {events.map((ev, idx) => {
                const meta   = STATUS_META[ev.status] || { label: ev.status, icon: 'Clock' }
                const Icon   = I[meta.icon] || I.Clock
                const isLast = idx === events.length - 1
                const isCurrent = isLast
                return (
                  <li key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      alignSelf: 'stretch', minWidth: 28,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isCurrent ? 'var(--accent, #f5a524)' : 'var(--surface-2)',
                        color: isCurrent ? '#fff' : 'var(--ink-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={14} />
                      </div>
                      {!isLast && (
                        <div style={{
                          flex: 1, width: 2, background: 'var(--border, #e5e5e5)',
                          marginTop: 2, marginBottom: 2,
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                      <div className="muted-data" style={{ fontSize: 11, marginTop: 2 }}>
                        {fmtDateTime(ev.createdAt)}
                        {ev.actorName ? ` · ${ev.actorName}` : ''}
                      </div>
                      {ev.note && (
                        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--ink-2)' }}>
                          {ev.note}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Orders View ───────────────────────────────────────────────────────────────

function OrdersView() {
  const navigate = useNavigate()
  const onNavigate = (id) => navigate(`/buyer/${id}`)
  const { orderId: orderIdParam } = useParams()
  const { addItem } = useCart()
  const [tab, setTab]         = useState('active')
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(false)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())
  const [reviewOrder, setReviewOrder] = useState(null)
  const [reviewExisting, setReviewExisting] = useState(null)
  const [timelineOrder, setTimelineOrder] = useState(null)
  const [reorderingId, setReorderingId] = useState(null)
  const [reorderError, setReorderError] = useState('')

  async function handleReorder(o) {
    if (!o.demandListingId && !o.listingId) {
      setReorderError('Original listing reference is missing on this order.')
      return
    }
    const listingId = o.demandListingId || o.listingId
    const qty = o.orderedQtyKg || o.qtyKg || 1
    setReorderingId(o.id); setReorderError('')
    const res = await addItem({ listingId, quantityKg: Number(qty) })
    setReorderingId(null)
    if (res?.ok) {
      onNavigate?.('cart')
    } else {
      // Listing likely closed — fall back to species-filtered browse
      setReorderError(res?.error || 'Listing no longer available. Browse similar items.')
    }
  }

  function loadOrders() {
    setLoading(true)
    apiGet('/buyer/orders')
      .then(d => {
        const arr = d?.content || d || []
        setOrders(arr)
        // Probe each completed order for an existing review (best-effort).
        const completed = arr.filter(o => o.status === 'COMPLETED')
        Promise.all(completed.map(o =>
          apiGet(`/buyer/orders/${o.id}/review`).then(r => r ? o.id : null).catch(() => null)
        )).then(ids => setReviewedOrderIds(new Set(ids.filter(Boolean))))
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  // Deep-link: /buyer/orders/:orderId opens the timeline modal for that order
  useEffect(() => {
    if (!orderIdParam) return
    const id = Number(orderIdParam)
    if (Number.isNaN(id)) return
    const found = orders.find(o => o.id === id)
    if (found) {
      setTimelineOrder(found)
    } else {
      // Order not in current list — fetch directly so modal still opens
      apiGet(`/buyer/orders/${id}`)
        .then(o => o && setTimelineOrder(o))
        .catch(() => {})
    }
  }, [orderIdParam, orders])

  const filtered = orders.filter(o => {
    if (tab === 'active') return ['PENDING', 'CONFIRMED'].includes(o.status)
    if (tab === 'completed') return o.status === 'COMPLETED'
    if (tab === 'cancelled') return o.status === 'CANCELLED'
    return true
  })

  const totals = {
    active: orders.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  }
  const totalSpent = orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + (o.agreedPricePerKg || 0) * (o.orderedQtyKg || 0), 0)
  const totalKg = orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + (o.orderedQtyKg || 0), 0)

  // Map status to 4-step progress
  function getSteps(o) {
    const steps = [
      { label: 'Placed', done: true },
      { label: 'Confirmed', done: ['CONFIRMED', 'COMPLETED'].includes(o.status) },
      { label: 'Handoff', done: o.handoff?.status === 'CONFIRMED' || o.status === 'COMPLETED' },
      { label: 'Paid', done: o.payment?.status === 'CONFIRMED' || o.status === 'COMPLETED' },
    ]
    if (o.status === 'CANCELLED') {
      return steps.map(s => ({ ...s, cancelled: true }))
    }
    return steps
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchases</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Orders</em></h1>
          <p className="page__sub">
            {orders.length} total orders · {fmtPrice(totalSpent)} spent on {totalKg}kg of fish.
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="orders-strip orders-strip--4">
        <div className="stat">
          <div className="l">Active orders</div>
          <div className="v">{loading ? '—' : totals.active}</div>
          <div className="s">{orders.filter(o => o.status === 'PENDING').length} awaiting confirmation</div>
        </div>
        <div className="stat">
          <div className="l">Completed</div>
          <div className="v">{loading ? '—' : totals.completed}</div>
          <div className="s">All time</div>
        </div>
        <div className="stat">
          <div className="l">Total spent</div>
          <div className="v">{loading ? '—' : totalSpent > 1000 ? `₱${(totalSpent / 1000).toFixed(1)}` : fmtPrice(totalSpent)}{totalSpent > 1000 && <small>k</small>}</div>
          <div className="s">Lifetime value</div>
        </div>
        <div className="stat">
          <div className="l">Total received</div>
          <div className="v">{loading ? '—' : totalKg}<small>kg</small></div>
          <div className="s">Across {totals.completed} orders</div>
        </div>
      </div>

      {reorderError && (
        <div className="card" style={{ marginTop: 12, padding: 12, color: 'var(--unsafe)', fontSize: 13 }}>
          {reorderError}
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 12 }}
            onClick={() => { setReorderError(''); onNavigate?.('browse') }}
          >Browse similar</button>
        </div>
      )}

      {/* Orders table with tabs */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active ({totals.active})</button>
            <button className={tab === 'completed' ? 'on' : ''} onClick={() => setTab('completed')}>Completed ({totals.completed})</button>
            <button className={tab === 'cancelled' ? 'on' : ''} onClick={() => setTab('cancelled')}>Cancelled ({totals.cancelled})</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="buyer-empty" style={{ padding: '40px 20px' }}>
            <I.Clipboard size={28} />
            <span>No orders in this category yet.</span>
          </div>
        ) : (
          <div className="orders-list">
            {filtered.map(o => {
              const speciesName = o.species?.commonName || o.fishSpecies?.commonName || '—'
              const vendor = o.seller?.fullName || o.vendorName || '—'
              const orderCode = o.orderCode || `ORD-${o.id}`
              const listingCode = o.listingCode || `L-${o.listingId || '?'}`
              const pricePerKg = o.agreedPricePerKg || o.pricePerKg || 0
              const qtyKg = o.orderedQtyKg || o.qtyKg || 0
              const total = pricePerKg * qtyKg
              const steps = getSteps(o)

              return (
                <div key={o.id} className="order-row">
                  {/* Header: species + vendor + status */}
                  <div className="order-row__head">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
                        <span className="kbd">{orderCode}</span>
                        <span className={`status status--${o.status?.toLowerCase()}`}>
                          <span className="status__dot" /> {o.status}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.1 }}>
                        {speciesName}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span>from <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{vendor}</strong></span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                          {fmt(o.createdAt || o.placedAt)}
                        </span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                          {o.dispatchMode || 'PICKUP'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="order-row__stats">
                    <div>
                      <div className="l">Quantity</div>
                      <div className="v">{qtyKg}<small>kg</small></div>
                    </div>
                    <div>
                      <div className="l">Price / kg</div>
                      <div className="v">{fmtPrice(pricePerKg)}</div>
                    </div>
                    <div>
                      <div className="l">Total</div>
                      <div className="v">{fmtPrice(total)}</div>
                    </div>
                    <div>
                      <div className="l">Listing</div>
                      <div className="v" style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{listingCode}</div>
                    </div>
                  </div>

                  {/* 4-step progress */}
                  <div className="order-row__progress">
                    {steps.map((s, i) => (
                      <div key={i} className={`step${s.done ? ' step--done' : ''}${s.cancelled ? ' step--cancelled' : ''}`}>
                        <div className="step__dot" />
                        <span>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer: info + action buttons */}
                  <div className="order-row__foot">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                      <span className="muted-data">
                        {o.payment?.method ? `Paid via ${o.payment.method.replace('_', ' ')}` :
                         o.cancelReason ? o.cancelReason : 'Awaiting next step'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => setTimelineOrder(o)}>Timeline</button>
                        <button className="btn btn--ghost btn--sm">Message vendor</button>
                        {o.status === 'PENDING' && <button className="btn btn--ghost btn--sm">Cancel</button>}
                        {o.status === 'CONFIRMED' && <button className="btn btn--accent btn--sm">Confirm receipt</button>}
                        {o.status === 'COMPLETED' && (
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={reorderingId === o.id}
                            onClick={() => handleReorder(o)}
                          >{reorderingId === o.id ? 'Adding…' : 'Re-order'}</button>
                        )}
                        {o.status === 'COMPLETED' && (
                          reviewedOrderIds.has(o.id) ? (
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={async () => {
                                try {
                                  const r = await apiGet(`/buyer/orders/${o.id}/review`)
                                  setReviewExisting(r)
                                  setReviewOrder(o)
                                } catch { /* fall through */ }
                              }}
                            >Edit review</button>
                          ) : (
                            <button
                              className="btn btn--accent btn--sm"
                              onClick={() => { setReviewExisting(null); setReviewOrder(o) }}
                            >Leave review</button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          existing={reviewExisting}
          onClose={() => { setReviewOrder(null); setReviewExisting(null) }}
          onSubmitted={() => {
            setReviewedOrderIds(prev => new Set([...prev, reviewOrder.id]))
            loadOrders()
          }}
        />
      )}

      {timelineOrder && (
        <OrderTimelineModal
          order={timelineOrder}
          onClose={() => {
            setTimelineOrder(null)
            if (orderIdParam) navigate('/buyer/orders', { replace: true })
          }}
        />
      )}
    </div>
  )
}

// ── Saved Vendors View ────────────────────────────────────────────────────────

function SavedVendorsView() {
  const navigate = useNavigate()
  const onNavigate = (id) => navigate(`/buyer/${id}`)
  const { vendorFavorites, listingFavorites, loading } = useFavorites()
  const [tab, setTab] = useState('vendors')

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Network</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Your <em>saved</em> items</h1>
          <p className="page__sub">
            {vendorFavorites.length} vendor{vendorFavorites.length === 1 ? '' : 's'} ·{' '}
            {listingFavorites.length} listing{listingFavorites.length === 1 ? '' : 's'} saved.
          </p>
        </div>
      </div>

      <div className="seg" style={{ marginTop: 14, alignSelf: 'flex-start' }}>
        <button className={tab === 'vendors' ? 'on' : ''} onClick={() => setTab('vendors')}>
          Vendors ({vendorFavorites.length})
        </button>
        <button className={tab === 'listings' ? 'on' : ''} onClick={() => setTab('listings')}>
          Listings ({listingFavorites.length})
        </button>
      </div>

      {loading && (
        <div className="muted-data" style={{ marginTop: 18 }}>Loading…</div>
      )}

      {tab === 'vendors' && !loading && (
        vendorFavorites.length === 0 ? (
          <div className="buyer-empty" style={{ marginTop: 40 }}>
            <I.Star size={36} />
            <span>No saved vendors yet. Tap the star icon on any vendor to save them.</span>
            <button className="btn btn--accent" style={{ marginTop: 18 }} onClick={() => onNavigate('browse')}>
              Browse marketplace
            </button>
          </div>
        ) : (
          <div className="vendor-grid" style={{ marginTop: 18 }}>
            {vendorFavorites.map(f => {
              const v = f.vendor
              if (!v) return null
              return (
                <div key={f.id} className="vendor-card">
                  <div className="vendor-card__head">
                    <div className="vendor-card__avatar">
                      {(v.fullName || '?').split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </div>
                    <FavoriteHeart targetType="VENDOR" targetId={v.id} label="vendor" stopPropagation={false} />
                  </div>
                  <h3 className="vendor-card__name">{v.fullName}</h3>
                  <div className="muted-data" style={{ marginBottom: 12 }}>
                    {v.joinedDate ? `Joined ${fmt(v.joinedDate)}` : 'Vendor'}
                  </div>
                  <div className="vendor-card__stats">
                    <div><div className="l">Rating</div><div className="v">★ {v.avgRating ?? '—'}</div></div>
                    <div><div className="l">Reviews</div><div className="v">{v.reviewCount ?? 0}</div></div>
                    <div><div className="l">Trades</div><div className="v" style={{ fontSize: 13 }}>{v.totalCompletedTrades ?? '—'}</div></div>
                  </div>
                  <div className="vendor-card__foot">
                    <button className="btn btn--ghost btn--sm" style={{ flex: 1 }}>Message</button>
                    <button className="btn btn--accent btn--sm" style={{ flex: 1 }} onClick={() => navigate(`/buyer/vendor/${v.id}`)}>View storefront</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'listings' && !loading && (
        listingFavorites.length === 0 ? (
          <div className="buyer-empty" style={{ marginTop: 40 }}>
            <I.Star size={36} />
            <span>No saved listings yet. Tap the star icon on any listing card.</span>
            <button className="btn btn--accent" style={{ marginTop: 18 }} onClick={() => onNavigate('browse')}>
              Browse marketplace
            </button>
          </div>
        ) : (
          <div className="buyer-grid" style={{ marginTop: 18 }}>
            {listingFavorites.map(f => {
              const l = f.listing
              if (!l) {
                return (
                  <div key={f.id} className="buyer-card" style={{ opacity: 0.5 }}>
                    <div className="buyer-card__body">
                      <div className="muted-data">Listing no longer available</div>
                      <FavoriteHeart targetType="LISTING" targetId={f.targetId} stopPropagation={false} />
                    </div>
                  </div>
                )
              }
              const tag = l.fishSpecies?.tag || (l.fishSpecies?.commonName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={f.id} className="buyer-card" onClick={() => navigate(`/buyer/listing/${l.id}`)}>
                  <div className="buyer-card__hero" data-tag={tag} style={{ position: 'relative' }}>
                    <div className="buyer-card__species-tag">{tag}</div>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <FavoriteHeart targetType="LISTING" targetId={l.id} />
                    </div>
                  </div>
                  <div className="buyer-card__body">
                    <h3 className="buyer-card__species">{l.fishSpecies?.commonName || '—'}</h3>
                    <div className="buyer-card__vendor"><span>{l.vendorName || '—'}</span></div>
                    <div className="buyer-card__price">
                      <span className="big">{fmtPrice(l.offerPricePerKg)}</span>
                      <span>/kg</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

// ── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ user, onOrderListing }) {
  const navigate = useNavigate()
  const onNavigate = (id) => navigate(`/buyer/${id}`)
  const [pendingCount,   setPendingCount]   = useState(null)
  const [confirmedCount, setConfirmedCount] = useState(null)
  const [recentOrders,   setRecentOrders]   = useState([])
  const [featuredListings, setFeaturedListings] = useState([])
  const [listingCount,   setListingCount]   = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [activity,       setActivity]       = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [recommendations, setRecommendations] = useState([])
  const [recsLoading,    setRecsLoading]    = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiGet('/buyer/orders?status=PENDING').then(d => d?.content || d || []).catch(() => []),
      apiGet('/buyer/orders?status=CONFIRMED').then(d => d?.content || d || []).catch(() => []),
      apiGet('/buyer/orders').then(d => d?.content || d || []).catch(() => []),
      apiGet('/buyer/marketplace/listings').then(d => d?.content || d || []).catch(() => []),
    ]).then(([pending, confirmed, all, listings]) => {
      setPendingCount(pending.length)
      setConfirmedCount(confirmed.length)
      setRecentOrders(all.slice(0, 5))
      setFeaturedListings(listings.slice(0, 4))
      setListingCount(listings.length)
    }).finally(() => setLoading(false))

    // Phase 4.1 — activity feed sourced from notifications stream
    setActivityLoading(true)
    apiGet('/notifications?size=15')
      .then(d => setActivity(Array.isArray(d) ? d : []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false))

    // Phase 4.3 — personalized recommendations
    setRecsLoading(true)
    apiGet('/buyer/recommendations?limit=6')
      .then(d => setRecommendations(Array.isArray(d) ? d : []))
      .catch(() => setRecommendations([]))
      .finally(() => setRecsLoading(false))
  }, [])

  const firstName = user?.fullName?.split(' ')[0] || 'Buyer'
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Buyer · Marketplace</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            {greet}, <em>{firstName}</em>
          </h1>
          <p className="page__sub">
            {pendingCount != null
              ? `${pendingCount} pending order${pendingCount !== 1 ? 's' : ''} · ${listingCount ?? '—'} listings available`
              : 'Loading your market overview…'}
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={() => onNavigate('browse')}>
            <I.Store size={14} /> Browse Listings
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip orders-strip--4">
        <div className="stat">
          <div className="l">Pending Orders</div>
          <div className="v">{loading ? '—' : (pendingCount ?? '—')}</div>
          <div className="s">Awaiting confirmation</div>
        </div>
        <div className="stat">
          <div className="l">Confirmed</div>
          <div className="v">{loading ? '—' : (confirmedCount ?? '—')}</div>
          <div className="s">Ready for pickup / delivery</div>
        </div>
        <div className="stat">
          <div className="l">Recent Orders</div>
          <div className="v">{loading ? '—' : recentOrders.length}</div>
          <div className="s">Loaded most recent</div>
        </div>
        <div className="stat">
          <div className="l">Listings Available</div>
          <div className="v">{loading ? '—' : (listingCount ?? '—')}</div>
          <div className="s">Open demand listings</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid--2-1" style={{ marginTop: 18 }}>
        {/* LEFT: Recent Orders table */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Orders</div>
              <div className="card__sub">Your latest purchases</div>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => onNavigate('orders')}>
              View All <I.Arrow size={11} />
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
              No orders yet.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Species</th>
                  <th>Vendor</th>
                  <th>Price / kg</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{o.species?.commonName || o.fishSpecies?.commonName || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--ink-3)' }}>{o.seller?.fullName || '—'}</td>
                    <td className="data">{fmtPrice(o.agreedPricePerKg)}/kg</td>
                    <td>
                      <span className={`status status--${o.status?.toLowerCase()}`}>
                        <span className="status__dot" /> {o.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ink-4)' }}>{fmt(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT: Fresh Listings */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Fresh Listings</div>
              <div className="card__sub">Available now</div>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => onNavigate('browse')}>
              Browse All <I.Arrow size={11} />
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 6 }} />
              ))}
            </div>
          ) : featuredListings.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
              No listings available.
            </div>
          ) : (
            <div>
              {featuredListings.map(l => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
                      {l.fishSpecies?.commonName || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      <I.MapPin size={10} style={{ marginRight: 3 }} />
                      {l.marketLocation?.name || '—'}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>
                    {fmtPrice(l.offerPricePerKg)}
                    <small style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>/kg</small>
                  </div>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => onOrderListing(l)}
                  >
                    Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity + Recommendations (Phase 4.1 + 4.3) */}
      <div className="grid--2-1" style={{ marginTop: 18 }}>
        {/* LEFT: Activity feed */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Activity</div>
              <div className="card__sub">Updates across your orders & saved vendors</div>
            </div>
          </div>
          {activityLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
              You're all caught up — activity will appear here as your orders progress.
            </div>
          ) : (
            <div>
              {activity.slice(0, 8).map(a => {
                const isUnread = !a.readAt
                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid var(--line-soft)',
                      cursor: a.link ? 'pointer' : 'default',
                    }}
                    onClick={() => { if (a.link) navigate(a.link) }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isUnread ? 'var(--accent, #f5a524)' : 'var(--ink-4, #ccc)',
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isUnread ? 600 : 500, fontSize: 13 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {a.body}
                      </div>
                      <div className="muted-data" style={{ fontSize: 11, marginTop: 4 }}>
                        {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Recommendations */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recommended for you</div>
              <div className="card__sub">Based on what you've bought before</div>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => onNavigate('browse')}>
              Browse All <I.Arrow size={11} />
            </button>
          </div>
          {recsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 6 }} />
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
              No recommendations yet — place your first order to personalize this feed.
            </div>
          ) : (
            <div>
              {recommendations.slice(0, 5).map(l => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
                      {l.fishSpecies?.commonName || l.species?.commonName || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      <I.MapPin size={10} style={{ marginRight: 3 }} />
                      {l.marketLocation?.name || l.location?.name || '—'}
                      {l.vendorName ? ` · ${l.vendorName}` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>
                    {fmtPrice(l.offerPricePerKg)}
                    <small style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>/kg</small>
                  </div>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => onOrderListing(l)}
                  >
                    Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cart View ─────────────────────────────────────────────────────────────────

function CartView() {
  const navigate = useNavigate()
  const onContinueShopping = () => navigate('/buyer/browse')
  const onCheckout = () => navigate('/buyer/checkout')
  const { cart, loading, error, updateItem, removeItem, clearCart } = useCart()
  const [busy, setBusy] = useState(null)

  async function handleQty(itemId, newQty) {
    if (newQty <= 0) return
    setBusy(itemId)
    await updateItem(itemId, { quantityKg: newQty })
    setBusy(null)
  }

  async function handleRemove(itemId) {
    setBusy(itemId)
    await removeItem(itemId)
    setBusy(null)
  }

  if (loading && (!cart || cart.itemCount === 0)) {
    return (
      <div className="page">
        <div className="card" style={{ marginTop: 18, padding: 24 }}>
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
          <div className="skeleton" style={{ height: 80, marginTop: 12 }} />
          <div className="skeleton" style={{ height: 80, marginTop: 8 }} />
        </div>
      </div>
    )
  }

  if (cart.itemCount === 0) {
    return (
      <div className="page">
        <div className="page__head">
          <div>
            <div className="eyebrow">Cart</div>
            <h1 className="page__title" style={{ marginTop: 4 }}>Your cart is <em>empty</em></h1>
            <p className="page__sub">Browse the marketplace and add fresh catch from verified vendors.</p>
          </div>
        </div>
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Receipt size={36} />
          <span>No items yet. Add listings to your cart from the marketplace or a listing detail page.</span>
          <button className="btn btn--accent" style={{ marginTop: 18 }} onClick={onContinueShopping}>
            Browse marketplace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Cart</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} ready to <em>order</em></h1>
          <p className="page__sub">Items are grouped by vendor — each group will become its own order at checkout.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={onContinueShopping}>Continue shopping</button>
          <button className="btn btn--ghost" onClick={() => clearCart()}>Clear cart</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, padding: 12, borderColor: 'var(--unsafe)' }}>
          <span style={{ color: 'var(--unsafe)' }}>{error}</span>
        </div>
      )}

      {cart.warnings && cart.warnings.length > 0 && (
        <div className="card" style={{ marginTop: 14, padding: 12 }}>
          <div className="label" style={{ color: 'var(--warn)' }}>Heads up</div>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {cart.warnings.map((w, i) => <li key={i} style={{ fontSize: 13 }}>{w}</li>)}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cart.groups.map(group => (
          <div key={group.vendor.id} className="card" style={{ padding: 16 }}>
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {(group.vendor.fullName || '?').slice(0, 1)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{group.vendor.fullName || '—'}</div>
                  <div className="muted-data" style={{ fontSize: 12 }}>{group.items.length} item{group.items.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>Subtotal {fmtPrice(group.subtotal)}</div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.items.map(item => (
                <div key={item.id} className="row" style={{ alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.speciesName}</div>
                    <div className="muted-data" style={{ fontSize: 12 }}>
                      {fmtPrice(item.unitPriceSnapshot)}/kg
                      {item.locationName ? ` · ${item.locationName}` : ''}
                    </div>
                    {item.warning && (
                      <div style={{ color: 'var(--warn)', fontSize: 12, marginTop: 4 }}>⚠ {item.warning}</div>
                    )}
                  </div>
                  <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={busy === item.id || item.quantityKg <= 0.1}
                      onClick={() => handleQty(item.id, +(item.quantityKg - 0.5).toFixed(2))}
                      aria-label="Decrease quantity"
                    >−</button>
                    <span style={{ minWidth: 50, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {item.quantityKg}kg
                    </span>
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={busy === item.id}
                      onClick={() => handleQty(item.id, +(item.quantityKg + 0.5).toFixed(2))}
                      aria-label="Increase quantity"
                    >+</button>
                  </div>
                  <div style={{ minWidth: 90, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtPrice(item.lineTotal)}
                  </div>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busy === item.id}
                    onClick={() => handleRemove(item.id)}
                    aria-label="Remove item"
                  ><I.Dots size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18, padding: 16, position: 'sticky', bottom: 12 }}>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label">Grand total</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtPrice(cart.grandTotal)}</div>
          </div>
          <button
            className="btn btn--accent"
            onClick={onCheckout}
            disabled={!onCheckout || cart.itemCount === 0}
            style={{ minWidth: 200 }}
          >
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Checkout View ─────────────────────────────────────────────────────────────

function CheckoutView() {
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
        paymentMethod: 'CASH',
      }
      const result = await apiPost('/buyer/checkout', null, payload)
      await refresh()
      onSuccess(result)
    } catch (e) {
      setError(e?.message || 'Could not place order.')
    } finally {
      setSubmitting(false)
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
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <button className="btn btn--accent btn--sm" disabled>Cash on handoff (selected)</button>
            <button className="btn btn--ghost btn--sm" disabled title="Online payments coming with PayMongo in Phase 3">
              Online (coming soon)
            </button>
          </div>
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
            disabled={submitting || cart.itemCount === 0}
            style={{ minWidth: 200 }}
          >
            {submitting ? 'Placing…' : `Place ${cart.groups.length} order${cart.groups.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Image Upload (Phase 3.3) ──────────────────────────────────────────────────

function ImageUpload({ value, onChange, subDir = 'general', label = 'Upload image', size = 96 }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file) {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError('Only JPEG, PNG, or WebP images.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Max 5MB.')
      return
    }
    setBusy(true); setError('')
    try {
      const res = await apiUpload('/uploads', file, { subDir })
      onChange?.(res?.url || null)
    } catch (e) {
      setError(e?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--surface-2)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer', border: '1px dashed var(--border, #d4d4d4)',
          flexShrink: 0,
        }}
        title={label}
      >
        {value ? (
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <I.Plus size={20} />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : value ? 'Change image' : label}
        </button>
        {value && !busy && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onChange?.(null)}
            style={{ color: 'var(--unsafe)' }}
          >Remove</button>
        )}
        {error && <div style={{ color: 'var(--unsafe)', fontSize: 12 }}>{error}</div>}
      </div>
    </div>
  )
}

// ── Notifications Bell (Phase 3.2) ────────────────────────────────────────────

function timeAgo(dt) {
  if (!dt) return ''
  const diff = (Date.now() - new Date(dt).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function NotificationsBell() {
  const navigate = useNavigate()
  const [open, setOpen]         = useState(false)
  const [items, setItems]       = useState([])
  const [unread, setUnread]     = useState(0)
  const [loading, setLoading]   = useState(false)
  const wrapRef = useRef(null)

  async function refreshCount() {
    try {
      const r = await apiGet('/notifications/unread-count')
      setUnread(r?.count || 0)
    } catch { /* ignore */ }
  }

  async function loadList() {
    setLoading(true)
    try {
      const list = await apiGet('/notifications?size=10')
      setItems(Array.isArray(list) ? list : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshCount()
    const t = setInterval(refreshCount, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (open) loadList()
  }, [open])

  // Click-outside to close
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function handleClickItem(n) {
    if (!n.readAt) {
      try {
        await apiPut(`/notifications/${n.id}/read`)
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
        setUnread(c => Math.max(0, c - 1))
      } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link)
    setOpen(false)
  }

  async function handleMarkAll() {
    try {
      await apiPut('/notifications/read-all')
      setItems(prev => prev.map(x => ({ ...x, readAt: x.readAt || new Date().toISOString() })))
      setUnread(0)
    } catch { /* ignore */ }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button className="topbar__icon-btn" title="Notifications" onClick={() => setOpen(o => !o)}>
        <I.Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 14, height: 14, borderRadius: 99,
            background: 'var(--unsafe)', color: '#fff',
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="card" style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 360, maxHeight: 480, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid var(--border, #eee)',
          }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {unread > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
              </div>
            ) : items.length === 0 ? (
              <div className="muted-data" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
                You're all caught up.
              </div>
            ) : (
              items.map(n => {
                const isUnread = !n.readAt
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border, #eee)',
                      cursor: 'pointer',
                      background: isUnread ? 'var(--surface-2, #fafafa)' : 'transparent',
                      display: 'flex', gap: 10,
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isUnread ? 'var(--accent, #f5a524)' : 'transparent',
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isUnread ? 600 : 500, fontSize: 13 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                      <div className="muted-data" style={{ fontSize: 11, marginTop: 4 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile View (Phase 3.4) ──────────────────────────────────────────────────

function ProfileView({ user, onProfileUpdated }) {
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)

  function load() {
    setLoading(true)
    apiGet('/buyer/profile')
      .then(p => {
        setProfile(p)
        setFullName(p.fullName || '')
        setAvatarUrl(p.avatarUrl || null)
      })
      .catch(e => setError(e?.message || 'Failed to load profile.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = await apiPatch('/buyer/profile', null, {
        fullName: fullName.trim() || undefined,
        avatarUrl,
      })
      setProfile(updated)
      setSuccess('Profile saved.')
      onProfileUpdated?.(updated)
      setTimeout(() => setSuccess(''), 2500)
    } catch (e) {
      setError(e?.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(url) {
    setAvatarUrl(url)
    // Auto-persist avatar so the upload feels immediate.
    setSaving(true); setError('')
    try {
      const updated = await apiPatch('/buyer/profile', null, { avatarUrl: url })
      setProfile(updated)
      onProfileUpdated?.(updated)
    } catch (e) {
      setError(e?.message || 'Could not update avatar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page__head">
          <div>
            <div className="eyebrow">Account</div>
            <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Profile</em></h1>
          </div>
        </div>
        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
          <div className="skeleton" style={{ height: 96, marginTop: 12, width: 96, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 16, marginTop: 16 }} />
        </div>
      </div>
    )
  }

  const dirty = (fullName.trim() !== (profile?.fullName || '').trim())

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Profile</em></h1>
          <p className="page__sub">
            Member since {profile?.memberSince ? fmt(profile.memberSince) : '—'} · {profile?.totalOrders || 0} orders ·{' '}
            {profile?.totalReviews || 0} reviews · {profile?.totalFavorites || 0} saved
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, padding: 20 }}>
        <div className="label">Avatar</div>
        <div style={{ marginTop: 8 }}>
          <ImageUpload
            value={avatarUrl}
            onChange={handleAvatarChange}
            subDir="avatars"
            label="Upload avatar"
          />
        </div>

        <div className="label" style={{ marginTop: 18 }}>Full name</div>
        <input
          className="input"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          maxLength={200}
          style={{ marginTop: 6 }}
        />

        <div className="label" style={{ marginTop: 14 }}>Email</div>
        <input
          className="input"
          value={profile?.email || ''}
          disabled
          style={{ marginTop: 6, opacity: 0.65 }}
        />
        <div className="muted-data" style={{ fontSize: 11, marginTop: 4 }}>
          Email changes are not supported yet.
        </div>

        {error && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 12 }}>{error}</div>}
        {success && <div style={{ color: 'var(--safe, #22a37e)', fontSize: 13, marginTop: 12 }}>{success}</div>}

        <div className="row" style={{ gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button className="btn btn--accent" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Rail ──────────────────────────────────────────────────────────────────────

function Rail({ user, onLogout, badges = {} }) {
  const items = [
    { to: '/buyer/dashboard', icon: 'Dashboard', label: 'Dashboard' },
    { to: '/buyer/browse',    icon: 'Store',     label: 'Browse Market' },
    { to: '/buyer/cart',      icon: 'Receipt',   label: 'Cart',           badge: badges.cart },
    { to: '/buyer/orders',    icon: 'Clipboard', label: 'My Orders',      badge: badges.orders },
    { to: '/buyer/saved',     icon: 'Star',      label: 'Saved Vendors' },
    { to: '/buyer/messages',  icon: 'Message',   label: 'Messages',       badge: badges.messages },
    { to: '/buyer/profile',   icon: 'Settings',  label: 'My Profile' },
  ]

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BU'
  const firstName = user?.fullName?.split(' ')[0] || 'Buyer'

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>

      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {items.map(it => {
          const Icon = I[it.icon]
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => `rail-item${isActive ? ' rail-item--on' : ''}`}
              data-tip={it.label}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="rail-item__icon" style={{ position: 'relative' }}>
                <Icon size={18} />
                {it.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 99,
                    background: 'var(--unsafe)', color: '#fff',
                    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1,
                  }}>
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </div>
              <div className="rail-item__text">{it.label}</div>
            </NavLink>
          )
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onLogout} data-tip="Sign out">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Sign Out</div>
        </div>
        <div className="rail-item" data-tip="Help">
          <div className="rail-item__icon"><I.Help size={18} /></div>
          <div className="rail-item__text">Help</div>
        </div>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{firstName}</span>
            <span className="rail__user-role">BUYER</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  browse:    'Browse Market',
  cart:      'Cart',
  checkout:  'Checkout',
  orders:    'My Orders',
  saved:     'Saved Vendors',
  messages:  'Messages',
  profile:   'My Profile',
  listing:   'Listing',
  vendor:    'Vendor',
}

function Topbar() {
  const location = useLocation()
  const segment = location.pathname.split('/')[2] || 'dashboard'
  const label = PAGE_LABELS[segment] || segment
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search listings, orders…" />
        <kbd>⌘K</kbd>
      </div>
      <NotificationsBell />
      <button className="topbar__icon-btn" title="Help">
        <I.Help size={16} />
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

function BuyerLayout({ user, onLogout, badges, quickOrderListing, setQuickOrderListing, onOrderSuccess }) {
  const location = useLocation()

  // Scroll content to top on every route change
  useEffect(() => {
    const el = document.querySelector('.content')
    if (el) el.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [location.pathname])

  return (
    <div className="app" data-density="balanced" data-accent="sage">
      <Rail user={user} onLogout={onLogout} badges={badges} />
      <div className="main">
        <Topbar />
        <div className="content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet context={{ setQuickOrderListing }} />
        </div>
      </div>

      {quickOrderListing && (
        <OrderModal
          listing={quickOrderListing}
          onClose={() => setQuickOrderListing(null)}
          onSuccess={onOrderSuccess}
        />
      )}
    </div>
  )
}

export default function BuyerDashboard({ user, onLogout }) {
  const [badges, setBadges]       = useState({ orders: 0, messages: 0 })
  const [quickOrderListing, setQuickOrderListing] = useState(null)
  const { cart } = useCart()
  const railBadges = { ...badges, cart: cart.itemCount }

  function loadPendingBadge() {
    apiGet('/buyer/orders?status=PENDING')
      .then(d => {
        const arr = d?.content || d || []
        setBadges(prev => ({ ...prev, orders: arr.length }))
      })
      .catch(() => {})
  }

  useEffect(() => { loadPendingBadge() }, [])

  function handleOrderSuccess() {
    setQuickOrderListing(null)
    loadPendingBadge()
  }

  return (
    <Routes>
      <Route element={
        <BuyerLayout
          user={user}
          onLogout={onLogout}
          badges={railBadges}
          quickOrderListing={quickOrderListing}
          setQuickOrderListing={setQuickOrderListing}
          onOrderSuccess={handleOrderSuccess}
        />
      }>
        <Route path="/buyer" element={<Navigate to="/buyer/dashboard" replace />} />
        <Route path="/buyer/dashboard" element={
          <DashboardView user={user} onOrderListing={setQuickOrderListing} />
        } />
        <Route path="/buyer/browse" element={<BrowseView />} />
        <Route path="/buyer/listing/:listingId" element={<ListingDetailView />} />
        <Route path="/buyer/vendor/:vendorId" element={<VendorStorefrontView />} />
        <Route path="/buyer/cart" element={<CartView />} />
        <Route path="/buyer/checkout" element={<CheckoutView />} />
        <Route path="/buyer/orders" element={<OrdersView />} />
        <Route path="/buyer/orders/:orderId" element={<OrdersView />} />
        <Route path="/buyer/saved" element={<SavedVendorsView />} />
        <Route path="/buyer/messages" element={<Messages user={user} />} />
        <Route path="/buyer/profile" element={<ProfileView user={user} />} />
        <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
