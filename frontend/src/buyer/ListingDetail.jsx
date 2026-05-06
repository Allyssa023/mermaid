import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../api'
import { I } from '../icons'
import { fmt, fmtPrice } from './utils/format'
import { useCart } from '../context/CartContext'
import FavoriteHeart from './components/FavoriteHeart'

export function VendorStorefrontView() {
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

export default function ListingDetailView() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [adding, setAdding]   = useState(false)
  const [addNotice, setAddNotice] = useState('')
  const { addItem } = useCart()
  const onBack = () => navigate('/buyer/browse')
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
  const related = data.relatedListings || []
  const price = listing.pricePerKg || 0
  const available = listing.availableKg || 0
  const inStock = available > 0
  const speciesName = listing.speciesName || listing.title || 'Listing'
  const tag = speciesName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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
          <div className="eyebrow">{listing.vendorName || '—'}</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>{speciesName}</h1>

          <div className="buyer-card__price" style={{ marginTop: 14 }}>
            <span className="big" style={{ fontSize: 36 }}>{fmtPrice(price)}</span>
            <span>/kg</span>
          </div>

          <div className="row" style={{ gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <span className={inStock ? '' : 'muted-data'} style={{ color: inStock ? 'var(--safe)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              {inStock ? `● ${available}kg available` : '● Out of stock'}
            </span>
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
              onClick={(e) => {
                e.stopPropagation()
                navigate('/buyer/instant-checkout', { state: { listing: { ...listing, vendor } } })
              }}
              style={{ flex: 2 }}
            >
              {inStock ? 'Order now' : 'Notify me'}
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

      {/* Related listings */}
      {related.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="page__title" style={{ fontSize: 20 }}>You might also like</h3>
          <div className="buyer-grid" style={{ marginTop: 12 }}>
            {related.map(r => {
              const rTag = (r.speciesName || r.title || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
                    <h3 className="buyer-card__species">{r.speciesName || r.title || '—'}</h3>
                    <div className="buyer-card__vendor"><span>{r.vendorName || '—'}</span></div>
                    <div className="buyer-card__price">
                      <span className="big">{fmtPrice(r.pricePerKg)}</span>
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
