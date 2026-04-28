import { useState, useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import './design-system.css'
import './light-compat.css'
import './buyer.css'
import { apiGet, apiPost } from './api'
import { I } from './icons'
import Messages from './Messages'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtPrice(p) {
  if (p == null) return '—'
  return `₱${Number(p).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusToStep(status) {
  switch (status) {
    case 'PENDING':   return 0
    case 'CONFIRMED': return 1
    case 'COMPLETED': return 2
    default:          return 0
  }
}

function getHour() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

// ── Step Tracker ──────────────────────────────────────────────────────────────

const STEPS = ['Placed', 'Confirmed', 'Completed']

function StepTracker({ status }) {
  const current = statusToStep(status)
  const isFailed = status === 'CANCELLED' || status === 'DISPUTED'

  return (
    <div className="buyer-step-track">
      {STEPS.map((label, i) => {
        const done    = !isFailed && current > i
        const active  = !isFailed && current === i
        const cls     = done ? 'buyer-step--done' : active ? 'buyer-step--current' : ''
        return (
          <div key={label} className={`buyer-step ${cls}`} style={{ flex: 1, position: 'relative' }}>
            {i < STEPS.length - 1 && <div className="buyer-step__connector" />}
            <div className="buyer-step__dot">
              {done ? <I.Check size={11} /> : i + 1}
            </div>
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Status Chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    PENDING:   { cls: 'buyer-chip-pending',   label: 'Pending'   },
    CONFIRMED: { cls: 'buyer-chip-confirmed', label: 'Confirmed' },
    COMPLETED: { cls: 'buyer-chip-completed', label: 'Completed' },
    CANCELLED: { cls: 'buyer-chip-cancelled', label: 'Cancelled' },
    DISPUTED:  { cls: 'buyer-chip-disputed',  label: 'Disputed'  },
  }
  const { cls = '', label = status } = map[status] || {}
  const chipStyle = {
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-block',
  }
  const colorMap = {
    PENDING:   { background: 'oklch(0.93 0.07 70)',  color: 'oklch(0.42 0.18 70)'  },
    CONFIRMED: { background: 'oklch(0.93 0.05 240)', color: 'oklch(0.38 0.16 240)' },
    COMPLETED: { background: 'oklch(0.93 0.07 145)', color: 'oklch(0.38 0.18 145)' },
    CANCELLED: { background: 'oklch(0.93 0.03 0)',   color: 'oklch(0.40 0.10 0)'   },
    DISPUTED:  { background: 'oklch(0.93 0.06 25)',  color: 'oklch(0.42 0.18 25)'  },
  }
  return <span style={{ ...chipStyle, ...(colorMap[status] || {}) }}>{label}</span>
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
    <div className="buyer-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="buyer-modal">
        <div className="buyer-modal__head">
          <div className="buyer-modal__title">
            {done ? 'Order Placed!' : `Order — ${listing.fishSpecies?.commonName || 'Listing'}`}
          </div>
          <button className="buyer-modal__close" onClick={onClose}><I.X size={16} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
            <p style={{ color: 'var(--ink-2)', fontSize: '0.9rem' }}>
              Your order has been placed successfully. The vendor will confirm soon.
            </p>
            <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="buyer-form-group">
              <label className="buyer-form-label">Dispatch Mode</label>
              <div className="buyer-dispatch-row">
                {['PICKUP', 'DELIVERY'].map(m => (
                  <div
                    key={m}
                    className={`buyer-dispatch-radio${dispatch === m ? ' buyer-dispatch-radio--on' : ''}`}
                    onClick={() => setDispatch(m)}
                  >
                    {m === 'PICKUP' ? '🏪 Pickup' : '🚚 Delivery'}
                  </div>
                ))}
              </div>
            </div>

            {dispatch === 'DELIVERY' && (
              <div className="buyer-form-group">
                <label className="buyer-form-label">Delivery Address *</label>
                <input
                  className="buyer-form-input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter full delivery address"
                  required
                />
              </div>
            )}

            <div className="buyer-form-group">
              <label className="buyer-form-label">
                Quantity (kg){listing.quantityKg ? ` — available: ${listing.quantityKg} kg` : ''}
              </label>
              <input
                className="buyer-form-input"
                type="number"
                min="0.1"
                step="0.1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">Notes (optional)</label>
              <textarea
                className="buyer-form-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value.slice(0, 300))}
                placeholder="Any special instructions…"
                maxLength={300}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', textAlign: 'right' }}>
                {notes.length}/300
              </div>
            </div>

            {error && <div className="buyer-modal__err">{error}</div>}

            <div className="buyer-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
                {loading ? 'Placing…' : 'Place Order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Browse View ───────────────────────────────────────────────────────────────

function BrowseView() {
  const [listings, setListings]       = useState([])
  const [species, setSpecies]         = useState([])
  const [locations, setLocations]     = useState([])
  const [filterSpecies, setFilterSpecies]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [minPrice, setMinPrice]       = useState('')
  const [maxPrice, setMaxPrice]       = useState('')
  const [showMap, setShowMap]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [orderListing, setOrderListing] = useState(null)
  const [highlighted, setHighlighted] = useState(null)
  const debounceRef = useRef(null)
  const cardRefs = useRef({})

  useEffect(() => {
    apiGet('/fish-species').then(d => setSpecies(d?.content || d || [])).catch(() => {})
    apiGet('/market-locations').then(d => setLocations(d?.content || d || [])).catch(() => {})
    loadListings()
  }, [])

  function loadListings(params = {}) {
    setLoading(true)
    const q = new URLSearchParams()
    if (params.speciesId)     q.set('speciesId', params.speciesId)
    if (params.locationId)    q.set('locationId', params.locationId)
    if (params.minOfferPrice) q.set('minOfferPrice', params.minOfferPrice)
    if (params.maxOfferPrice) q.set('maxOfferPrice', params.maxOfferPrice)
    apiGet(`/buyer/marketplace/listings?${q}`)
      .then(d => setListings(d?.content || d || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }

  const debouncedLoad = useCallback((params) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadListings(params), 300)
  }, [])

  function updateFilter(key, val) {
    const params = {
      speciesId:    filterSpecies,
      locationId:   filterLocation,
      minOfferPrice: minPrice,
      maxOfferPrice: maxPrice,
      [key]: val,
    }
    if (key === 'speciesId')     setFilterSpecies(val)
    if (key === 'locationId')    setFilterLocation(val)
    if (key === 'minOfferPrice') setMinPrice(val)
    if (key === 'maxOfferPrice') setMaxPrice(val)
    debouncedLoad(params)
  }

  function handleMarkerClick(listing) {
    setHighlighted(listing.id)
    const el = cardRefs.current[listing.id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const mapListings = listings.filter(l => l.marketLocation?.lat && l.marketLocation?.lng)

  return (
    <div className="content-body">
      <div className="buyer-filter-bar">
        <select value={filterSpecies} onChange={e => updateFilter('speciesId', e.target.value)}>
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
        </select>
        <select value={filterLocation} onChange={e => updateFilter('locationId', e.target.value)}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min ₱"
          value={minPrice}
          onChange={e => updateFilter('minOfferPrice', e.target.value)}
          style={{ width: 90 }}
        />
        <input
          type="number"
          placeholder="Max ₱"
          value={maxPrice}
          onChange={e => updateFilter('maxOfferPrice', e.target.value)}
          style={{ width: 90 }}
        />
        <button
          className={`buyer-map-btn${showMap ? ' buyer-map-btn--on' : ''}`}
          onClick={() => setShowMap(v => !v)}
        >
          <I.MapPin size={14} />
          Map
        </button>
      </div>

      {showMap && (
        <div className="buyer-map-panel">
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

      {loading ? (
        <div className="buyer-listings-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="buyer-listing-card">
              <div className="skeleton" style={{ height: 18, width: '60%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%', marginTop: 6 }} />
              <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 4 }} />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="buyer-empty">
          <I.Store size={36} />
          <span>No listings found for these filters.</span>
        </div>
      ) : (
        <div className="buyer-listings-grid">
          {listings.map(l => {
            const overdue = l.neededBy && new Date(l.neededBy) < new Date()
            return (
              <div
                key={l.id}
                ref={el => { cardRefs.current[l.id] = el }}
                className={`buyer-listing-card${highlighted === l.id ? ' buyer-listing-card--highlighted' : ''}`}
              >
                <div className="buyer-listing-card__species">{l.fishSpecies?.commonName || '—'}</div>
                <div className="buyer-listing-card__price">{fmtPrice(l.offerPricePerKg)}<span style={{ fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--ink-3)' }}>/kg</span></div>
                <div className="buyer-listing-card__meta">
                  <I.Store size={12} style={{ marginRight: 4 }} />
                  {l.vendorName || '—'}
                </div>
                <div className="buyer-listing-card__meta">
                  <I.MapPin size={12} style={{ marginRight: 4 }} />
                  {l.marketLocation?.name}{l.marketLocation?.municipality ? `, ${l.marketLocation.municipality}` : ''}
                </div>
                {l.quantityKg != null && (
                  <div className="buyer-listing-card__meta">Qty: {l.quantityKg} kg</div>
                )}
                <div className="buyer-listing-card__footer">
                  {l.neededBy ? (
                    <span className={overdue ? 'chip--deadline' : 'chip--deadline-ok'}>
                      {overdue ? 'Overdue' : `By ${fmt(l.neededBy)}`}
                    </span>
                  ) : <span />}
                  <button
                    className="btn btn--primary"
                    style={{ fontSize: '0.82rem', padding: '5px 12px' }}
                    onClick={() => setOrderListing(l)}
                    disabled={l.status !== 'OPEN' && l.status !== undefined}
                  >
                    Order
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orderListing && (
        <OrderModal
          listing={orderListing}
          onClose={() => setOrderListing(null)}
          onSuccess={() => setOrderListing(null)}
        />
      )}
    </div>
  )
}

// ── Orders View ───────────────────────────────────────────────────────────────

const STATUS_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

function OrdersView() {
  const [tab, setTab]         = useState('ALL')
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    setLoading(true)
    const q = tab !== 'ALL' ? `?status=${tab}` : ''
    apiGet(`/buyer/orders${q}`)
      .then(d => setOrders(d?.content || d || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [tab])

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="content-body">
      <div className="trips-tabs" style={{ marginBottom: 16 }}>
        {STATUS_TABS.map(t => (
          <button
            key={t}
            className={`trips-tab${tab === t ? ' trips-tab--on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="buyer-order-card">
              <div className="skeleton" style={{ height: 16, width: '40%' }} />
              <div className="skeleton" style={{ height: 12, width: '60%', marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="buyer-empty">
          <I.Clipboard size={36} />
          <span>No orders here yet.</span>
        </div>
      ) : (
        orders.map(o => (
          <div key={o.id} className="buyer-order-card">
            <div className="buyer-order-card__main">
              <div className="buyer-order-card__info">
                <div className="buyer-order-card__species">{o.species?.commonName || '—'}</div>
                <div className="buyer-order-card__vendor">{o.seller?.fullName || '—'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: 2 }}>{fmt(o.createdAt)}</div>
              </div>
              <div className="buyer-order-card__tracker">
                <StepTracker status={o.status} />
              </div>
              <div className="buyer-order-card__meta">
                <span className="buyer-order-card__price">{fmtPrice(o.agreedPricePerKg)}/kg</span>
                {o.orderedQtyKg != null && <span>{o.orderedQtyKg} kg</span>}
                <span className={`chip chip--sm ${o.dispatchMode === 'PICKUP' ? 'chip--pickup' : 'chip--delivery'}`}>
                  {o.dispatchMode}
                </span>
                <StatusChip status={o.status} />
              </div>
              <button className="buyer-order-card__expand" onClick={() => toggle(o.id)}>
                <I.ChevD size={16} style={{ transform: expanded[o.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>
            {expanded[o.id] && (
              <div className="buyer-order-detail">
                <div><strong>Order ID:</strong> {o.id}</div>
                {o.deliveryAddress && <div><strong>Delivery Address:</strong> {o.deliveryAddress}</div>}
                {o.notes && <div><strong>Notes:</strong> {o.notes}</div>}
                <div><strong>Buyer:</strong> {o.buyer?.fullName || '—'}</div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ user, onNavigate, onOrderListing }) {
  const [pendingCount, setPendingCount]     = useState(null)
  const [recentOrders, setRecentOrders]     = useState([])
  const [featuredListings, setFeaturedListings] = useState([])
  const [listingCount, setListingCount]     = useState(null)

  useEffect(() => {
    apiGet('/buyer/orders?status=PENDING')
      .then(d => { const arr = d?.content || d || []; setPendingCount(arr.length) })
      .catch(() => setPendingCount(0))

    apiGet('/buyer/orders')
      .then(d => { const arr = d?.content || d || []; setRecentOrders(arr.slice(0, 3)) })
      .catch(() => setRecentOrders([]))

    apiGet('/buyer/marketplace/listings')
      .then(d => {
        const arr = d?.content || d || []
        setFeaturedListings(arr.slice(0, 4))
        setListingCount(arr.length)
      })
      .catch(() => { setFeaturedListings([]); setListingCount(0) })
  }, [])

  const firstName = user?.fullName?.split(' ')[0] || 'Buyer'
  const confirmedCount = recentOrders.filter(o => o.status === 'CONFIRMED').length

  return (
    <div className="content-body">
      <div className="buyer-hero">
        <div className="buyer-hero__greeting">Good {getHour()}, {firstName} 👋</div>
        <div className="buyer-hero__sub">
          {pendingCount != null
            ? `You have ${pendingCount} pending order${pendingCount !== 1 ? 's' : ''}. ${listingCount ?? '—'} fresh listings available.`
            : 'Loading your market overview…'}
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 'var(--gap)' }}>
        <div className="kpi">
          <div className="kpi__val">{pendingCount ?? '—'}</div>
          <div className="kpi__label">Pending Orders</div>
        </div>
        <div className="kpi">
          <div className="kpi__val">{confirmedCount}</div>
          <div className="kpi__label">Pending Pickup/Delivery</div>
        </div>
        <div className="kpi">
          <div className="kpi__val">{listingCount ?? '—'}</div>
          <div className="kpi__label">Listings Available</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--gap)' }}>
        <div className="card__head">
          <span className="card__title">Recent Orders</span>
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('orders')}>View All</button>
        </div>
        <div className="card__body">
          {recentOrders.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: '0.88rem', padding: '12px 0', textAlign: 'center' }}>
              No orders yet.
            </div>
          ) : recentOrders.map(o => (
            <div key={o.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: '1px solid var(--line)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.species?.commonName || '—'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>{o.seller?.fullName || '—'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                {fmtPrice(o.agreedPricePerKg)}/kg
              </div>
              <StatusChip status={o.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <span className="card__title">Fresh Listings</span>
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('browse')}>Browse All</button>
        </div>
        <div className="card__body">
          {featuredListings.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: '0.88rem', padding: '12px 0', textAlign: 'center' }}>
              No listings available.
            </div>
          ) : (
            <div className="buyer-featured-grid">
              {featuredListings.map(l => (
                <div key={l.id} className="buyer-listing-card">
                  <div className="buyer-listing-card__species">{l.fishSpecies?.commonName || '—'}</div>
                  <div className="buyer-listing-card__price">{fmtPrice(l.offerPricePerKg)}<span style={{ fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--ink-3)' }}>/kg</span></div>
                  <div className="buyer-listing-card__meta">
                    <I.MapPin size={12} style={{ marginRight: 4 }} />
                    {l.marketLocation?.name || '—'}
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <button
                      className="btn btn--primary"
                      style={{ fontSize: '0.8rem', padding: '4px 10px', width: '100%' }}
                      onClick={() => onOrderListing(l)}
                    >
                      Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Rail ──────────────────────────────────────────────────────────────────────

function Rail({ page, setPage, user, onLogout, badges = {} }) {
  const items = [
    { id: 'dashboard', icon: 'Dashboard', label: 'Dashboard' },
    { id: 'browse',    icon: 'Store',     label: 'Browse Market' },
    { id: 'orders',    icon: 'Clipboard', label: 'My Orders',  badge: badges.orders },
    { id: 'messages',  icon: 'Message',   label: 'Messages',   badge: badges.messages },
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
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => setPage(it.id)}
              data-tip={it.label}
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
            </div>
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

function Topbar({ page }) {
  const labels = {
    dashboard: 'Dashboard',
    browse:    'Browse Market',
    orders:    'My Orders',
    messages:  'Messages',
  }
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <strong>{labels[page] || page}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search listings, orders…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} />
      </button>
      <button className="topbar__icon-btn" title="Help">
        <I.Help size={16} />
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function BuyerDashboard({ user, onLogout }) {
  const [page, setPage]           = useState('dashboard')
  const [badges, setBadges]       = useState({ orders: 0, messages: 0 })
  const [quickOrderListing, setQuickOrderListing] = useState(null)

  useEffect(() => {
    apiGet('/buyer/orders?status=PENDING')
      .then(d => {
        const arr = d?.content || d || []
        setBadges(prev => ({ ...prev, orders: arr.length }))
      })
      .catch(() => {})
  }, [])

  function handleOrderSuccess() {
    setQuickOrderListing(null)
    apiGet('/buyer/orders?status=PENDING')
      .then(d => {
        const arr = d?.content || d || []
        setBadges(prev => ({ ...prev, orders: arr.length }))
      })
      .catch(() => {})
  }

  return (
    <div className="app" data-density="balanced">
      <Rail page={page} setPage={setPage} user={user} onLogout={onLogout} badges={badges} />
      <div className="main">
        <Topbar page={page} />
        <div className="content">
          {page === 'dashboard' && (
            <DashboardView
              user={user}
              onNavigate={setPage}
              onOrderListing={setQuickOrderListing}
            />
          )}
          {page === 'browse'   && <BrowseView />}
          {page === 'orders'   && <OrdersView />}
          {page === 'messages' && <Messages user={user} />}
        </div>
      </div>

      {quickOrderListing && (
        <OrderModal
          listing={quickOrderListing}
          onClose={() => setQuickOrderListing(null)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  )
}
