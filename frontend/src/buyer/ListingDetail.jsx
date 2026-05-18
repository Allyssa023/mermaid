import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { fetchListingDetail } from './api/marketplace'
import AddToCartModal from '../components/modals/AddToCartModal'

const FRESHNESS_SLOTS = [
  { key: 'photoEyes',   label: 'Eyes',   hint: 'Clear, bright pupils' },
  { key: 'photoGills',  label: 'Gills',  hint: 'Bright red, not brown' },
  { key: 'photoScales', label: 'Scales', hint: 'Shiny, tight to skin' },
  { key: 'photoBelly',  label: 'Belly',  hint: 'Firm, not swollen' },
  { key: 'photoFlesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration' },
]

function FreshnessGrid({ listing }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 12 }}>
        Freshness check
      </div>
      <div className="freshness-grid">
        {FRESHNESS_SLOTS.map(({ key, label, hint }, i) => {
          const url = listing[key]
          const isLast = i === FRESHNESS_SLOTS.length - 1
          return (
            <div
              key={key}
              style={{ gridColumn: isLast ? '1 / -1' : undefined, maxWidth: isLast ? 'calc(50% - 6px)' : undefined }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-on-dark)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted-2)', marginBottom: 8 }}>{hint}</div>
              {url ? (
                <img
                  src={url} alt={label}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid var(--kelp)', boxShadow: '0 0 0 1px var(--kelp-soft)' }}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 8, background: 'var(--panel-3)', display: 'grid', placeItems: 'center', color: 'var(--muted-2)', fontSize: 11, border: '1px solid var(--hairline)' }}>
                  Not provided
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ListingDetail({ setPage, listingId, setBuyNow, setListingId }) {
  const [showCart, setShowCart] = useState(false)

  const detailQ = useQuery({
    queryKey: ['listingDetail', listingId],
    queryFn: () => fetchListingDetail(listingId),
    enabled: !!listingId,
    staleTime: 10_000,
  })

  if (!listingId) {
    return (
      <div className="page-wrap">
        <div className="empty-state">
          <I.Fish size={36} />
          <div>No listing selected</div>
          <button className="btn btn--primary" onClick={() => setPage('bbrowse')}>Browse marketplace</button>
        </div>
      </div>
    )
  }

  if (detailQ.isLoading) {
    return (
      <div className="page-wrap">
        <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')} style={{ marginBottom: 20 }}>
          <I.ChevL size={11} /> Back
        </button>
        <div className="listing-detail-layout">
          <div className="listing-card listing-card--skeleton" style={{ height: 320, borderRadius: 14 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="listing-card--skeleton" style={{ height: 36, borderRadius: 8 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (detailQ.error) {
    return (
      <div className="page-wrap">
        <div className="empty-state">
          <I.Fish size={36} />
          <div style={{ color: 'var(--coral)' }}>Failed to load listing</div>
          <button className="btn btn--primary btn--sm" onClick={detailQ.refetch}>Retry</button>
        </div>
      </div>
    )
  }

  const { listing, vendor, relatedListings = [] } = detailQ.data ?? {}
  if (!listing) return null

  const available   = listing.availableKg ?? 0
  const hasDelivery = (listing.deliveryFee ?? 0) > 0
  const vendorInitial = (vendor?.fullName || 'V')[0].toUpperCase()

  return (
    <div className="page-wrap">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')} style={{ marginBottom: 20 }}>
        <I.ChevL size={11} /> Back to marketplace
      </button>

      <div className="listing-detail-layout">
        {/* Left column — photo + freshness */}
        <div>
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl} alt={listing.title}
              style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 14, display: 'block', border: '1px solid var(--hairline)' }}
            />
          ) : (
            <div style={{ width: '100%', height: 300, borderRadius: 14, background: 'var(--panel-2)', display: 'grid', placeItems: 'center', border: '1px solid var(--hairline)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 700, color: 'rgba(255,255,255,0.08)' }}>
                {(listing.speciesName || '?')[0]}
              </span>
            </div>
          )}
          <FreshnessGrid listing={listing} />
        </div>

        {/* Right column — details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              {vendor?.fullName}
            </div>
            <h2 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0, color: 'var(--ink-on-dark)', lineHeight: 1.1 }}>
              {listing.speciesName}
            </h2>
            {listing.title && listing.title !== listing.speciesName && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{listing.title}</div>
            )}
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
              ₱{listing.pricePerKg}
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>/kg</span>
          </div>

          {/* Availability chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`chip ${available > 0 ? (available < 5 ? 'chip--new' : 'chip--kelp') : 'chip--muted'}`}>
              {available > 0 ? `${available} kg available` : 'Sold out'}
            </span>
            <span className="chip chip--tide">
              {hasDelivery ? `Delivery ₱${listing.deliveryFee}` : 'Pickup only'}
            </span>
            {listing.minQtyKg && (
              <span className="chip chip--muted" style={{ fontSize: 11 }}>Min {listing.minQtyKg} kg</span>
            )}
          </div>

          {listing.description && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
              {listing.description}
            </p>
          )}

          {/* Vendor card */}
          <div className="panel" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                {vendorInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{vendor?.fullName}</div>
                {vendor?.rating && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    ★ {vendor.rating} · {vendor.tradeCount ?? 0} trades
                  </div>
                )}
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setPage('bvendor')}>View shop</button>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn--primary"
              style={{ flex: 2, justifyContent: 'center', padding: '12px 0' }}
              disabled={available <= 0}
              onClick={() => { setBuyNow({ listing }); setPage('bcheckout') }}
            >
              Order now
            </button>
            <button
              className="btn btn--ghost"
              style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
              disabled={available <= 0}
              onClick={() => setShowCart(true)}
            >
              <I.Cart size={13} /> Cart
            </button>
          </div>
        </div>
      </div>

      {/* Related listings */}
      {relatedListings.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 14 }}>
            More like this
          </div>
          <div className="feed-row">
            {relatedListings.map(r => (
              <div key={r.id} className="listing-card" style={{ minWidth: 200, flexShrink: 0 }} onClick={() => { setListingId(r.id) }}>
                <div className="listing-card__photo" style={r.photoUrl ? { backgroundImage: `url(${r.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!r.photoUrl && <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>{(r.speciesName || 'F')[0]}</div>}
                </div>
                <div className="listing-card__body">
                  <div className="listing-card__name">{r.speciesName}</div>
                  <div className="listing-card__vendor">{r.vendorName}</div>
                  <div className="listing-card__price">₱{r.pricePerKg}<span>/kg</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCart && <AddToCartModal listing={listing} onClose={() => setShowCart(false)} />}
    </div>
  )
}
