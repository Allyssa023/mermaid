import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'
import { I } from '../icons'
import { fmt, fmtPrice, timeAgo } from './utils/format'
import { useCart } from '../context/CartContext'

export default function Home({ user, onOrderListing }) {
  const navigate = useNavigate()
  const onNavigate = (id) => navigate(`/buyer/${id}`)
  const { addItem } = useCart()
  const [orderingId, setOrderingId] = useState(null)
  const orderNow = (l) => {
    if (!l?.id) return
    navigate('/buyer/instant-checkout', { state: { listing: l } })
  }
  // Backwards compat: parent still passes onOrderListing for the legacy modal,
  // but we override the click handlers below to send the buyer through cart → checkout.
  void onOrderListing
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

    // Phase 4.1 — unified activity feed (notifications + order events + messages)
    setActivityLoading(true)
    apiGet('/buyer/activity?limit=15')
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true" aria-label="Loading recent orders">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="buyer-empty" style={{ padding: '24px 12px', gap: 8 }}>
              <I.Clipboard size={24} />
              <span>No orders yet — your purchases will land here.</span>
              <button className="btn btn--accent btn--sm" style={{ marginTop: 4 }} onClick={() => onNavigate('browse')}>
                Browse listings
              </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading fresh listings">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 6 }} />
              ))}
            </div>
          ) : featuredListings.length === 0 ? (
            <div className="buyer-empty" style={{ padding: '24px 12px', gap: 8 }}>
              <I.Store size={24} />
              <span>No open listings right now — check back soon.</span>
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
                    disabled={orderingId === l.id}
                    onClick={() => orderNow(l)}
                  >
                    {orderingId === l.id ? '…' : 'Order now'}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true" aria-label="Loading recent activity">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="buyer-empty" style={{ padding: '24px 12px', gap: 8 }}>
              <I.Bell size={24} />
              <span>You're all caught up — activity will appear here as orders progress.</span>
              <button className="btn btn--ghost btn--sm" style={{ marginTop: 4 }} onClick={() => onNavigate('orders')}>
                View orders
              </button>
            </div>
          ) : (
            <div>
              {activity.slice(0, 8).map(a => {
                const isUnread = !!a.unread
                const dotColor = a.kind === 'ORDER_STATUS'
                  ? 'var(--brand, #2d7ef7)'
                  : a.kind === 'MESSAGE'
                    ? 'var(--success, #22c55e)'
                    : (isUnread ? 'var(--accent, #f5a524)' : 'var(--ink-4, #ccc)')
                return (
                  <div
                    key={a.id}
                    role={a.link ? 'button' : undefined}
                    tabIndex={a.link ? 0 : undefined}
                    aria-label={a.link ? `${a.title} — open` : a.title}
                    style={{
                      display: 'flex', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid var(--line-soft)',
                      cursor: a.link ? 'pointer' : 'default',
                    }}
                    onClick={() => { if (a.link) navigate(a.link) }}
                    onKeyDown={(e) => {
                      if (a.link && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        navigate(a.link)
                      }
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: dotColor,
                      marginTop: 6, flexShrink: 0,
                    }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isUnread ? 600 : 500, fontSize: 13 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {a.body}
                      </div>
                      <div className="muted-data" style={{ fontSize: 11, marginTop: 4 }}>
                        {timeAgo(a.occurredAt || a.createdAt)}
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
                    disabled={orderingId === l.id}
                    onClick={() => orderNow(l)}
                  >
                    {orderingId === l.id ? '…' : 'Order now'}
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
