import { useState, useEffect } from 'react'

const API_BASE = '/api'

async function fetchPublicShop(vendorIdOrSlug) {
  const res = await fetch(`${API_BASE}/public/shop/${encodeURIComponent(vendorIdOrSlug)}`)
  if (res.status === 404) throw Object.assign(new Error('Shop not found'), { status: 404 })
  if (!res.ok) throw new Error(`Failed to load shop (${res.status})`)
  return res.json()
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

function Stars({ rating }) {
  if (!rating) return null
  const full = Math.round(rating)
  return (
    <span style={{ color: '#f59e0b' }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

function HoursTable({ hours }) {
  if (!hours || typeof hours !== 'object') return null
  const entries = DAYS.filter(d => hours[d])
  if (!entries.length) return null
  return (
    <div style={{ marginTop: 12 }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>Hours</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 13 }}>
        {entries.map(d => {
          const h = hours[d]
          return [
            <span key={`${d}-k`} style={{ color: '#6b7280', fontWeight: 500 }}>{DAY_LABELS[d]}</span>,
            <span key={`${d}-v`} style={{ color: h.closed ? '#9ca3af' : '#111827' }}>
              {h.closed ? 'Closed' : `${h.open || '?'} – ${h.close || '?'}`}
            </span>,
          ]
        })}
      </div>
    </div>
  )
}

function ListingCard({ listing }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      {listing.photoUrl && (
        <img src={listing.photoUrl} alt={listing.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
      )}
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{listing.title}</div>
        {listing.speciesName && (
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{listing.speciesName}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>
            ₱{Number(listing.pricePerKg).toFixed(2)}/kg
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {Number(listing.availableKg || 0).toFixed(1)} kg avail.
          </span>
        </div>
      </div>
    </div>
  )
}

function ReviewItem({ review }) {
  const full = Math.max(0, Math.min(5, review.rating || 0))
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', marginBottom: 10, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: '#e0e7ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#4f46e5',
        }}>
          {(review.reviewerName || '?')[0].toUpperCase()}
        </div>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{review.reviewerName || 'Customer'}</span>
          <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: 13 }}>
            {'★'.repeat(full)}{'☆'.repeat(5 - full)}
          </span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>
      {review.comment && (
        <p style={{ margin: '4px 0', fontSize: 13, color: '#374151' }}>{review.comment}</p>
      )}
      {review.vendorReply && (
        <div style={{
          marginTop: 8, background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#166534',
        }}>
          <strong>Shop reply:</strong> {review.vendorReply}
        </div>
      )}
    </div>
  )
}

export default function PublicShop({ vendorIdOrSlug }) {
  const slug = vendorIdOrSlug || window.location.pathname.split('/shop/')[1]
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return }
    fetchPublicShop(slug)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => {
        if (e.status === 404) setNotFound(true)
        else setError(e.message || 'Failed to load shop')
        setLoading(false)
      })
  }, [slug])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Loading shop…
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🐠</div>
        <h2 style={{ margin: '0 0 8px', color: '#374151' }}>Shop not found</h2>
        <p style={{ margin: 0 }}>The shop you're looking for doesn't exist.</p>
        <button onClick={() => window.history.back()} style={{ marginTop: 20, padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
          Go back
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
        {error}
      </div>
    )
  }

  const { profile, avgRating, reviewCount, listings, recentReviews } = data

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {profile.bannerUrl && (
        <div style={{ width: '100%', height: 200, overflow: 'hidden' }}>
          <img src={profile.bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px 40px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 16,
          background: '#fff', borderRadius: 12, padding: 20, marginTop: profile.bannerUrl ? -32 : 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', position: 'relative', zIndex: 1,
        }}>
          {profile.logoUrl && (
            <img
              src={profile.logoUrl}
              alt="Logo"
              style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '2px solid #e5e7eb' }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>{profile.displayName}</h1>
            {avgRating != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Stars rating={avgRating} />
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  {Number(avgRating).toFixed(1)} ({reviewCount || 0} review{reviewCount !== 1 ? 's' : ''})
                </span>
              </div>
            )}
            {profile.bio && (
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>{profile.bio}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginTop: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>
              Available Listings {listings?.length ? `(${listings.length})` : ''}
            </h2>
            {(!listings || listings.length === 0) ? (
              <div style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>No active listings right now.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {listings.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}

            {recentReviews && recentReviews.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>Customer Reviews</h2>
                {recentReviews.map(r => <ReviewItem key={r.id} review={r} />)}
              </div>
            )}
          </div>

          <div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {profile.pickupLocationName && (
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: 14, color: '#374151' }}>Pickup at</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>📍 {profile.pickupLocationName}</p>
                </div>
              )}
              <HoursTable hours={profile.hoursJson} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
