import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { apiGet } from '../api'
import { I } from '../icons'
import { fmt, fmtPrice } from './utils/format'
import { useCart } from '../context/CartContext'
import FavoriteHeart, { SavedCountBadge } from './components/FavoriteHeart'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

export default function Marketplace() {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [listings, setListings]       = useState([])
  const [species, setSpecies]         = useState([])
  const [locations, setLocations]     = useState([])
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [addingId, setAddingId]       = useState(null)
  const [addNotice, setAddNotice]     = useState('')
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

  // Segment filters stay client-side — no server equivalent.
  const filtered = listings.filter(l => {
    const available = l.quantityKg || 0
    return (
      filter === 'all' ? true :
      filter === 'available' ? available > 0 :
      filter === 'urgent' ? (l.urgent || (l.neededBy && new Date(l.neededBy) < new Date(Date.now() + 3 * 86400000))) :
      true
    )
  })

  async function handleAddToCart(l, opts = {}) {
    const { goToCheckout = false } = opts
    setAddingId(l.id); setAddNotice('')
    const defaultQty = Math.min(1, l.quantityKg || 1)
    const res = await addItem({ listingId: l.id, quantityKg: defaultQty })
    setAddingId(null)
    if (!res?.ok) {
      setAddNotice(res?.error || 'Could not add to cart.')
      setTimeout(() => setAddNotice(''), 2500)
      return
    }
    if (goToCheckout) {
      navigate('/buyer/checkout')
    } else {
      setAddNotice('Added to cart.')
      setTimeout(() => setAddNotice(''), 1800)
    }
  }

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
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={!inStock || addingId === l.id}
                    onClick={e => { e.stopPropagation(); handleAddToCart(l) }}
                  >
                    {addingId === l.id ? 'Adding…' : 'Add to cart'}
                  </button>
                  <button
                    className="btn btn--accent btn--sm"
                    disabled={!inStock}
                    onClick={e => {
                      e.stopPropagation()
                      navigate('/buyer/instant-checkout', { state: { listing: l } })
                    }}
                  >
                    {inStock ? 'Order now' : 'Notify me'}
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

      {addNotice && (
        <div
          role="status"
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--paper, #fff)',
            padding: '10px 18px', borderRadius: 999,
            fontSize: 13, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', zIndex: 200,
          }}
        >{addNotice}</div>
      )}
    </div>
  )
}
