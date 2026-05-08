import { useState, useEffect, useCallback } from 'react'
import { I } from '../icons'
import { apiGet, apiPost } from '../api'
import InterestModal from '../components/InterestModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const diffDays = Math.ceil((d - now) / 86400000)
  if (diffDays < 0)   return { label: 'Overdue', urgent: true }
  if (diffDays === 0) return { label: 'Today',   urgent: true }
  return { label: fmtDate(iso), urgent: false }
}

function SkeletonRow() {
  return <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const topPrice  = listings.length ? Math.max(...listings.map(l => l.offerPricePerKg ?? 0)) : 0
  const openCount = listings.filter(l => l.status === 'OPEN').length

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Browse</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Buyer <em>Marketplace.</em>
          </h1>
          <p className="page__sub">{openCount} active vendor listings</p>
        </div>
        <div className="page__actions">
          <div className="topbar__search" style={{ width: 240 }}>
            <I.Search size={14} />
            <input placeholder="Search species, vendor…" style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 13 }} />
          </div>
          <button className="btn btn--primary">
            <I.Plus size={14} />
            Post alert
          </button>
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
          <div className="l">My interests</div>
          <div className="v">{myInterests.length}</div>
          <div className="s">Listings I responded to</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--unsafe-soft)', border: '1px solid var(--unsafe)', borderRadius: 8, marginBottom: 14, fontSize: 13, color: 'var(--unsafe)' }}>
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

          <h4>Urgency</h4>
          <label className="mkt-check"><span><input type="checkbox" />Deadline within 48h</span></label>
          <label className="mkt-check"><span><input type="checkbox" />New this week</span></label>

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
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <I.Fish size={40} />
              <div className="empty__title">No listings match your filters</div>
            </div>
          ) : (
            <div className="mkt-listings">
              {filtered.map(l => {
                const deadline = fmtDeadline(l.neededBy)
                const interested = interestedSet.has(l.id)
                return (
                  <div key={l.id} className="mkt-row">
                    <div className="mkt-row__icon">
                      <I.Fish size={20} />
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
                        <I.MapPin size={12} /> {l.marketLocation?.name ?? '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="mkt-row__price" style={{ textAlign: 'center' }}>
                        {l.quantityKg}<small>kg</small>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Wanted</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
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
                        <span className="chip chip--accent" style={{ justifyContent: 'center', fontSize: 11 }}>
                          <I.Check size={11} /> Interested
                        </span>
                      ) : (
                        <button className="btn btn--primary btn--sm" style={{ justifyContent: 'center' }} onClick={() => setInterestModal(l)}>
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
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
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
                      {i.message && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, fontStyle: 'italic' }}>"{i.message}"</div>}
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
