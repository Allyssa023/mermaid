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
  const [listings, setListings]           = useState([])
  const [species, setSpecies]             = useState([])
  const [locations, setLocations]         = useState([])
  const [myInterests, setMyInterests]     = useState([])
  const [interestedSet, setInterestedSet] = useState(new Set())
  const [sentMessages, setSentMessages]   = useState({})
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [interestModal, setInterestModal] = useState(null)
  const [sort, setSort]                   = useState('priceDesc')
  const [filterSpeciesId, setFilterSp]   = useState('')
  const [filterLocationId, setFilterLoc] = useState('')
  const [maxPrice, setMaxPrice]           = useState('')

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
      { id: result.id, message: result.message, createdAt: result.createdAt, listing: listings.find(l => l.id === result.listingId) },
      ...prev,
    ])
    setInterestModal(null)
  }

  let filtered = listings.filter(l => {
    if (filterSpeciesId  && String(l.fishSpecies?.id)    !== filterSpeciesId)  return false
    if (filterLocationId && String(l.marketLocation?.id) !== filterLocationId) return false
    if (maxPrice         && l.offerPricePerKg > Number(maxPrice))              return false
    return true
  })
  if (sort === 'priceDesc') filtered = [...filtered].sort((a, b) => b.offerPricePerKg - a.offerPricePerKg)
  if (sort === 'qtyDesc')   filtered = [...filtered].sort((a, b) => b.quantityKg - a.quantityKg)
  if (sort === 'date')      filtered = [...filtered].sort((a, b) => (a.neededBy ?? '').localeCompare(b.neededBy ?? ''))

  const topPrice    = listings.length ? Math.max(...listings.map(l => l.offerPricePerKg ?? 0)) : 0
  const matchRate   = listings.length > 0 ? Math.round((myInterests.length / listings.length) * 100) : 0
  const openCount   = listings.filter(l => l.status === 'OPEN').length

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Vendor <em>demand</em>
          </h1>
          <p className="page__sub">{openCount} active vendor listings</p>
        </div>
        <div className="page__actions">
          <div className="topbar__search" style={{ width: 200 }}>
            <input placeholder="Search species, vendor…" style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 13 }} />
          </div>
        </div>
      </div>

      {/* Insight strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Best price today</div>
          <div className="v">₱{topPrice > 0 ? topPrice : '—'}<span style={{ fontSize: 14, color: 'var(--ink-4)' }}>/kg</span></div>
          <div className="s">Top offering</div>
        </div>
        <div className="stat">
          <div className="l">Open listings</div>
          <div className="v">{openCount}</div>
          <div className="s">Available now</div>
        </div>
        <div className="stat">
          <div className="l">Species variety</div>
          <div className="v">{new Set(listings.map(l => l.fishSpecies?.id).filter(Boolean)).size}</div>
          <div className="s">Unique species</div>
        </div>
        <div className="stat">
          <div className="l">Locations</div>
          <div className="v">{new Set(listings.map(l => l.marketLocation?.id).filter(Boolean)).size}</div>
          <div className="s">Market areas</div>
        </div>
        <div className="stat">
          <div className="l">My match rate</div>
          <div className="v">{myInterests.length > 0 ? `${matchRate}%` : '—'}</div>
          <div className="s">{myInterests.length} interests / {listings.length} listings</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--unsafe-soft)', border: '1px solid var(--unsafe)', borderRadius: 'var(--r-md)', marginBottom: 14, fontSize: 13, color: 'var(--unsafe)' }}>
          {error} <button className="btn btn--sm" style={{ marginLeft: 8 }} onClick={load}>Retry</button>
        </div>
      )}

      <div className="mkt-grid">
        {/* Filter sidebar */}
        <div className="mkt-filter">
          <h4>Species</h4>
          {species.slice(0, 10).map(s => {
            const count = listings.filter(l => l.fishSpecies?.id === s.id).length
            return (
              <label key={s.id} className="mkt-check">
                <span>
                  <input type="checkbox"
                    checked={filterSpeciesId === String(s.id)}
                    onChange={e => setFilterSp(e.target.checked ? String(s.id) : '')}
                  />
                  {s.commonName}
                </span>
                <span className="count">{count}</span>
              </label>
            )
          })}

          <h4>Location</h4>
          {locations.slice(0, 6).map(l => {
            const count = listings.filter(li => li.marketLocation?.id === l.id).length
            return (
              <label key={l.id} className="mkt-check">
                <span>
                  <input type="checkbox"
                    checked={filterLocationId === String(l.id)}
                    onChange={e => setFilterLoc(e.target.checked ? String(l.id) : '')}
                  />
                  {l.name}
                </span>
                <span className="count">{count}</span>
              </label>
            )
          })}

          <h4>Max price / kg</h4>
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)' }}>
              <span>₱0</span>
              <span>{maxPrice ? `₱${maxPrice}` : 'Any'}</span>
            </div>
            <input type="range" min="0" max="1000" step="50"
              value={maxPrice || 1000}
              onChange={e => setMaxPrice(e.target.value === '1000' ? '' : e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          {(filterSpeciesId || filterLocationId || maxPrice) && (
            <button className="btn btn--sm btn--ghost" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
              onClick={() => { setFilterSp(''); setFilterLoc(''); setMaxPrice('') }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Listings column */}
        <div>
          <div className="row" style={{ marginBottom: 10, gap: 6 }}>
            <span className="chip chip--ink">{filtered.length} results</span>
            <div className="spacer" />
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sort by</span>
            <button className={`btn btn--sm ${sort === 'priceDesc' ? '' : 'btn--ghost'}`} onClick={() => setSort('priceDesc')}>Highest price</button>
            <button className={`btn btn--sm ${sort === 'qtyDesc' ? '' : 'btn--ghost'}`} onClick={() => setSort('qtyDesc')}>Largest qty</button>
            <button className={`btn btn--sm ${sort === 'date' ? '' : 'btn--ghost'}`} onClick={() => setSort('date')}>Soonest needed</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton /><Skeleton /><Skeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--ink-4)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No listings match your filters</div>
            </div>
          ) : (
            <div className="mkt-listings">
              {filtered.map(l => {
                const deadline = fmtDeadline(l.neededBy)
                const interested = interestedSet.has(l.id)
                return (
                  <div key={l.id} className="mkt-row">
                    <div className="mkt-row__icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/>
                        <path d="M18 12h.01"/><path d="M6.5 12C4 12 2.5 13.5 2 16c1-1 2.5-1.5 4.5-1.5"/>
                      </svg>
                    </div>
                    <div>
                      <div className="mkt-row__name">{l.fishSpecies?.commonName ?? '—'}</div>
                      <div className="mkt-row__vendor">{l.vendorName ?? '—'} · #{l.id}</div>
                    </div>
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        {deadline?.urgent && <span className="chip chip--unsafe chip--dot">Urgent</span>}
                        {interested && <span className="chip chip--accent chip--dot">Interested</span>}
                      </div>
                      <div className="mkt-row__loc" style={{ marginTop: 4 }}>
                        📍 {l.marketLocation?.name ?? '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="mkt-row__price" style={{ textAlign: 'center' }}>
                        {l.quantityKg}<small>kg</small>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Wanted</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        {deadline ? deadline.label : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>Deadline</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mkt-row__price">₱{l.offerPricePerKg}<small>/kg</small></div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Offered</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {l.status !== 'OPEN' ? (
                        <span className="chip" style={{ justifyContent: 'center', fontSize: 11 }}>Closed</span>
                      ) : interested ? (
                        <span className="chip chip--accent" style={{ justifyContent: 'center', fontSize: 11 }}>✓ Interested</span>
                      ) : (
                        <button className="btn btn--accent btn--sm" style={{ justifyContent: 'center' }} onClick={() => setInterestModal(l)}>
                          I'm Interested
                        </button>
                      )}
                      {l.notes && (
                        <button className="btn btn--ghost btn--sm" style={{ justifyContent: 'center', fontSize: 11 }} title={l.notes}>
                          Note
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {myInterests.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                My Interests · {myInterests.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myInterests.map(i => (
                  <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '10px 14px', background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{i.listing?.fishSpecies?.commonName ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {i.listing?.vendorName ?? '—'} · ₱{i.listing?.offerPricePerKg}/kg
                      </div>
                      {i.message && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontStyle: 'italic' }}>"{i.message}"</div>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmtDate(i.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
