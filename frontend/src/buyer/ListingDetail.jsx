import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { fetchListingDetail } from './api/marketplace'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
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
    <div style={{ marginTop: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Freshness check</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FRESHNESS_SLOTS.map(({ key, label, hint }, i) => {
          const url = listing[key]
          const isLast = i === FRESHNESS_SLOTS.length - 1
          return (
            <div
              key={key}
              style={{
                gridColumn: isLast ? '1 / -1' : undefined,
                maxWidth: isLast ? '50%' : undefined,
                margin: isLast ? '0 auto' : undefined,
                width: isLast ? '100%' : undefined,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
              <div className="muted-data" style={{ fontSize: 10, marginBottom: 6 }}>{hint}</div>
              {url ? (
                <img
                  src={url}
                  alt={label}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/3', borderRadius: 8,
                  background: 'var(--surface-2)', display: 'grid', placeItems: 'center',
                  color: 'var(--ink-4)', fontSize: 11,
                }}>
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

  if (!listingId) return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}>
        <I.ChevL size={11} /> Back to marketplace
      </button>
      <div className="empty" style={{ marginTop: 32 }}>No listing selected.</div>
    </div>
  )

  if (detailQ.isLoading) return <div className="page"><TableRowSkeleton /></div>
  if (detailQ.error)     return <div className="page"><ApiError error={detailQ.error} onRetry={detailQ.refetch} /></div>

  const { listing, vendor, relatedListings = [] } = detailQ.data ?? {}
  if (!listing) return null

  const dispatchInfo = (listing.deliveryFee ?? 0) > 0
    ? `Delivery available · ₱${listing.deliveryFee} fee`
    : 'Pickup only · Free'

  const vendorInitial = (vendor?.fullName || 'V')[0].toUpperCase()

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}>
        <I.ChevL size={11} /> Back to marketplace
      </button>

      <div className="grid grid--2-1" style={{ marginTop: 18, gap: 24, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div>
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl}
              alt={listing.title}
              style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: 360, borderRadius: 12, background: 'var(--accent-soft)',
              color: 'var(--accent)', display: 'grid', placeItems: 'center',
              fontSize: 72, fontWeight: 600, fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              {listing.speciesName?.[0] ?? '?'}
            </div>
          )}
          <FreshnessGrid listing={listing} />
        </div>

        {/* Right column */}
        <div>
          <div className="eyebrow">{vendor?.fullName}</div>
          <h1 className="page__title" style={{ marginTop: 4, fontSize: 32 }}>{listing.speciesName}</h1>
          {listing.title && listing.title !== listing.speciesName && (
            <div className="muted-data" style={{ marginTop: 2 }}>{listing.title}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
            <span style={{ fontSize: 38, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>
              ₱{listing.pricePerKg}
            </span>
            <span className="muted-data">/kg</span>
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`chip chip--${(listing.availableKg ?? 0) > 0 ? 'safe' : 'unsafe'}`}>
              {(listing.availableKg ?? 0) > 0 ? `${listing.availableKg} kg available` : 'Sold out'}
            </span>
            <span className="muted-data" style={{ fontSize: 12 }}>{dispatchInfo}</span>
          </div>

          {listing.minQtyKg && (
            <div className="muted-data" style={{ marginTop: 6, fontSize: 12 }}>
              Minimum order: {listing.minQtyKg} kg
            </div>
          )}

          {listing.description && (
            <p style={{ marginTop: 16, lineHeight: 1.6 }}>{listing.description}</p>
          )}

          <div className="row" style={{ gap: 10, marginTop: 22 }}>
            <button
              className="btn btn--primary"
              style={{ flex: 2 }}
              disabled={(listing.availableKg ?? 0) <= 0}
              onClick={() => { setBuyNow({ listing }); setPage('bcheckout') }}
            >
              Order now
            </button>
            <button
              className="btn"
              style={{ flex: 1 }}
              disabled={(listing.availableKg ?? 0) <= 0}
              onClick={() => setShowCart(true)}
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>

      {/* Vendor card */}
      <div className="card" style={{ marginTop: 28, padding: 18 }}>
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 20,
          }}>
            {vendorInitial}
          </div>
          <div style={{ flex: 1 }}>
            <strong>{vendor?.fullName}</strong>
            {vendor?.rating && (
              <div className="muted-data" style={{ fontSize: 12, marginTop: 2 }}>
                ★ {vendor.rating} · {vendor.tradeCount ?? 0} trades
              </div>
            )}
          </div>
          <button className="btn btn--sm" onClick={() => setPage('bvendor')}>View storefront</button>
        </div>
      </div>

      {/* Related listings */}
      {relatedListings.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>More like this</div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
            {relatedListings.map(r => (
              <div
                key={r.id}
                className="buyer-card"
                style={{ minWidth: 180, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setListingId(r.id)}
              >
                <div className="buyer-card__hero" style={r.photoUrl ? { backgroundImage: `url(${r.photoUrl})` } : {}}>
                  {!r.photoUrl && <I.Fish size={24} style={{ opacity: 0.3 }} />}
                </div>
                <div className="buyer-card__body">
                  <div className="buyer-card__species">{r.title ?? r.speciesName}</div>
                  <div className="buyer-card__vendor">{r.vendorName}</div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ₱{r.pricePerKg}<small>/kg</small>
                  </div>
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
