import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import { apiGet, apiPost } from './api'
import InterestModal from './components/InterestModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtDeadline(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d - now
  const diffDays = Math.ceil(diffMs / 86400000)
  if (diffDays < 0)  return { label: 'Overdue', urgent: true }
  if (diffDays === 0) return { label: 'Today',  urgent: true }
  return { label: fmtDate(iso), urgent: false }
}

function Skeleton({ height = '48px', radius = '12px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

// ─── MarketplaceTabs ──────────────────────────────────────────────────────────

function MarketplaceTabs({ active, onChange, interestCount }) {
  return (
    <div className="trips-tabs">
      <button
        className={`trips-tab${active === 'browse' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('browse')}
      >
        Browse
      </button>
      <button
        className={`trips-tab${active === 'interests' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('interests')}
      >
        My Interests
        {interestCount > 0 && (
          <span style={{
            marginLeft: 6,
            background: 'rgba(125,211,252,0.15)',
            color: '#7DD3FC',
            borderRadius: 99,
            fontSize: 11,
            padding: '1px 7px',
            fontWeight: 600,
          }}>{interestCount}</span>
        )}
      </button>
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({ species, locations, filters, onChange, onClear, count }) {
  return (
    <div className="mkt-filter-bar">
      <select
        className="mkt-filter-select"
        value={filters.speciesId}
        onChange={e => onChange({ ...filters, speciesId: e.target.value })}
      >
        <option value="">All Species</option>
        {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
      </select>
      <select
        className="mkt-filter-select"
        value={filters.locationId}
        onChange={e => onChange({ ...filters, locationId: e.target.value })}
      >
        <option value="">All Locations</option>
        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <div className="mkt-price-range">
        <span className="mkt-price-range__peso">₱</span>
        <input
          className="mkt-price-range__input"
          type="number"
          placeholder="Min"
          min="0"
          value={filters.minPrice}
          onChange={e => onChange({ ...filters, minPrice: e.target.value })}
        />
        <span className="mkt-price-range__sep">–</span>
        <input
          className="mkt-price-range__input"
          type="number"
          placeholder="Max"
          min="0"
          value={filters.maxPrice}
          onChange={e => onChange({ ...filters, maxPrice: e.target.value })}
        />
      </div>
      <button className="mkt-filter-clear" onClick={onClear}>Clear</button>
      <span className="mkt-filter-count">{count} listing{count !== 1 ? 's' : ''}</span>
    </div>
  )
}



// ─── ListingRow ───────────────────────────────────────────────────────────────

function ListingRow({ listing, isInterested, sentMessage, onInterest }) {
  const [open, setOpen] = useState(false)
  const deadline = fmtDeadline(listing.neededBy)

  return (
    <div className={`mkt-row${open ? ' mkt-row--open' : ''}${isInterested ? ' mkt-row--interested' : ''}`}>
      {/* ── Summary row ── */}
      <div className="mkt-row__summary" onClick={() => setOpen(o => !o)}>
        <div className="mkt-row__species-col">
          <span className="mkt-row__chevron">{open ? '▾' : '▸'}</span>
          <div>
            <p className="mkt-row__species">{listing.fishSpecies?.commonName}</p>
            <p className="mkt-row__vendor">{listing.vendorName || '—'}</p>
          </div>
        </div>
        <div className="mkt-row__location">📍 {listing.marketLocation?.name}</div>
        <div className="mkt-row__price">₱{listing.offerPricePerKg}</div>
        <div className="mkt-row__qty">{listing.quantityKg} kg</div>
        <div className={`mkt-row__deadline${deadline?.urgent ? ' mkt-row__deadline--urgent' : ''}`}>
          {deadline ? deadline.label : '—'}
        </div>
        <div onClick={e => e.stopPropagation()}>
          {listing.status !== 'OPEN' ? (
            <span className="mkt-btn mkt-btn--closed">Closed</span>
          ) : isInterested ? (
            <span className="mkt-btn mkt-btn--interested">✓ Interested</span>
          ) : (
            <button
              className="mkt-btn mkt-btn--cta"
              onClick={() => onInterest(listing)}
            >
              I'm Interested
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded section ── */}
      {open && (
        <div className="mkt-row__detail">
          <div className="mkt-row__detail-grid">
            <div>
              <p className="mkt-row__detail-label">Vendor Note</p>
              <p className="mkt-row__detail-text">
                {listing.notes || <span style={{ color: 'rgba(255,255,255,0.25)' }}>No notes provided.</span>}
              </p>
            </div>
            {isInterested && sentMessage && (
              <div>
                <p className="mkt-row__detail-label">Your Message</p>
                <p className="mkt-row__detail-text" style={{ fontStyle: 'italic' }}>
                  "{sentMessage}"
                </p>
                <p style={{ fontSize: 11, color: 'rgba(125,211,252,0.5)', marginTop: 4 }}>
                  Chat coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BrowseTab ────────────────────────────────────────────────────────────────

function BrowseTab({ listings, species, locations, interestedSet, sentMessages, loading, error, onLoad, onInterest }) {
  const [filters, setFilters] = useState({
    speciesId: '', locationId: '', minPrice: '', maxPrice: '',
  })

  const filtered = listings.filter(l => {
    if (filters.speciesId  && String(l.fishSpecies?.id)   !== filters.speciesId)  return false
    if (filters.locationId && String(l.marketLocation?.id) !== filters.locationId) return false
    if (filters.minPrice   && l.offerPricePerKg < Number(filters.minPrice))       return false
    if (filters.maxPrice   && l.offerPricePerKg > Number(filters.maxPrice))       return false
    return true
  })

  if (error) return (
    <div className="db-error">
      <span>{error}</span>
      <button className="db-error__retry" onClick={onLoad}>Retry</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <FilterBar
        species={species}
        locations={locations}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters({ speciesId: '', locationId: '', minPrice: '', maxPrice: '' })}
        count={filtered.length}
      />
      <div className="mkt-col-headers">
        <span>Species · Vendor</span>
        <span>Location</span>
        <span style={{ textAlign: 'right' }}>Price/kg</span>
        <span style={{ textAlign: 'right' }}>Quantity</span>
        <span style={{ textAlign: 'center' }}>Needed By</span>
        <span />
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
          <Skeleton /><Skeleton /><Skeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="db-empty">
          <p>No listings match your filters.</p>
          <button
            className="trip-btn trip-btn--ghost"
            style={{ marginTop: 4, fontSize: 13 }}
            onClick={() => setFilters({ speciesId: '', locationId: '', minPrice: '', maxPrice: '' })}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="mkt-list">
          {filtered.map(l => (
            <ListingRow
              key={l.id}
              listing={l}
              isInterested={interestedSet.has(l.id)}
              sentMessage={sentMessages[l.id]}
              onInterest={onInterest}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MyInterestsTab ───────────────────────────────────────────────────────────

function MyInterestsTab({ interests }) {
  if (interests.length === 0) return (
    <div className="trip-empty">
      <span className="trip-empty__icon">🤝</span>
      <p className="trip-empty__msg">No interests yet. Browse listings to find buyers.</p>
    </div>
  )

  return (
    <div className="mkt-list">
      {interests.map(i => (
        <div key={i.id} className="mkt-interest-row">
          <div className="mkt-interest-row__main">
            <p className="mkt-row__species">{i.listing?.fishSpecies?.commonName}</p>
            <p className="mkt-row__vendor">
              {i.listing?.vendorName || '—'} · 📍 {i.listing?.marketLocation?.name}
            </p>
          </div>
          <div className="mkt-interest-row__price">
            ₱{i.listing?.offerPricePerKg}/kg
          </div>
          <div className="mkt-interest-row__msg">
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Your message</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
              "{i.message}"
            </p>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', alignSelf: 'flex-end' }}>
            {fmtDate(i.createdAt)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Marketplace root ─────────────────────────────────────────────────────────

export default function Marketplace({ token }) {
  const [activeTab, setActiveTab]         = useState('browse')
  const [listings, setListings]           = useState([])
  const [species, setSpecies]             = useState([])
  const [locations, setLocations]         = useState([])
  const [myInterests, setMyInterests]     = useState([])
  const [interestedSet, setInterestedSet] = useState(new Set())
  const [sentMessages, setSentMessages]   = useState({})   // { [listingId]: message }
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [interestModal, setInterestModal] = useState(null) // listing object or null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [l, s, loc, mi] = await Promise.all([
        apiGet('/marketplace/listings', token),
        apiGet('/lookups/fish-species', token),
        apiGet('/lookups/market-locations', token),
        apiGet('/marketplace/my-interests', token),
      ])
      setListings(l)
      setSpecies(s)
      setLocations(loc)
      setMyInterests(mi)
      const ids = new Set(mi.map(i => i.listing?.id))
      setInterestedSet(ids)
      const msgs = {}
      mi.forEach(i => { if (i.listing?.id) msgs[i.listing.id] = i.message })
      setSentMessages(msgs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function handleInterestSuccess(result) {
    setInterestedSet(prev => new Set([...prev, result.listingId]))
    setSentMessages(prev => ({ ...prev, [result.listingId]: result.message }))
    setMyInterests(prev => [
      {
        id: result.id,
        message: result.message,
        createdAt: result.createdAt,
        listing: listings.find(l => l.id === result.listingId),
      },
      ...prev,
    ])
    setInterestModal(null)
  }

  return (
    <div className="trips-page">
      <div className="trips-page-header">
        <div>
          <h2 className="trips-page-header__title">Marketplace</h2>
          <p className="trips-page-header__sub">Demand listings from La Union vendors</p>
        </div>
        {myInterests.length > 0 && (
          <span className="trips-page-header__active-chip">
            {myInterests.length} interest{myInterests.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <MarketplaceTabs
        active={activeTab}
        onChange={setActiveTab}
        interestCount={myInterests.length}
      />

      {activeTab === 'browse' ? (
        <BrowseTab
          listings={listings}
          species={species}
          locations={locations}
          interestedSet={interestedSet}
          sentMessages={sentMessages}
          loading={loading}
          error={error}
          onLoad={load}
          onInterest={setInterestModal}
        />
      ) : (
        <MyInterestsTab interests={myInterests} />
      )}

      {interestModal && (
        <InterestModal
          listing={interestModal}
          token={token}
          onSuccess={handleInterestSuccess}
          onClose={() => setInterestModal(null)}
        />
      )}
    </div>
  )
}
