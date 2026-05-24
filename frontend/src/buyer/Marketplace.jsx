import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { I } from '../icons'
import { fetchListings } from './api/marketplace'
import AddToCartModal from '../components/modals/AddToCartModal'
import { PageHead } from './components/PageHead'

const AVATAR_GRADS = [
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#5eead4,#38bdf8)',
  'linear-gradient(135deg,#a78bfa,#6a5fc1)',
  'linear-gradient(135deg,#fa7faa,#c4326a)',
  'linear-gradient(135deg,#46d39a,#14b8a6)',
  'linear-gradient(135deg,#60a5fa,#3b82f6)',
  'linear-gradient(135deg,#3ee2ff,#84cc16)',
]

const SORT_OPTIONS = ['Freshness', 'Price ↑', 'Price ↓', 'Trending']
const FRESH_OPTIONS = ['Any', "Today's haul", 'Within 24h', 'Within 48h']
const RATING_OPTIONS = ['4.5+ stars', '4.0+ stars', '3.5+ stars', 'Any']
const QUICK_TAGS = ['BFAR-priced', 'Cold-chain', 'Pickup', 'Delivery', 'Bulk', 'Premium']

function hoursAgo(createdAt) {
  if (!createdAt) return null
  return Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 3_600_000))
}

function calcFreshness(listing) {
  const h = hoursAgo(listing.createdAt) ?? 4
  return Math.max(10, Math.min(100, Math.round(96 - h * 1.8)))
}

function listingInitials(name = '') {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??'
}

/* ── Hero strip — pinned top listing ── */
function HeroStrip({ listing, onDetail, onCart }) {
  if (!listing) return null
  const name     = listing.speciesName ?? listing.title ?? 'Fresh Catch'
  const vendor   = listing.vendorName ?? 'Vendor'
  const availKg  = listing.availableKg ?? 0
  const price    = listing.pricePerKg ?? 0
  const grad     = AVATAR_GRADS[listing.id % AVATAR_GRADS.length]
  const fresh    = calcFreshness(listing)
  const h        = hoursAgo(listing.createdAt) ?? 0
  const hasDelivery = (listing.deliveryFee ?? 0) > 0

  return (
    <div className="mkt-hero" style={{ cursor: 'pointer' }} onClick={() => onDetail(listing)}>
      <div className="mkt-hero__main">
        <div className="page-head__eyebrow">
          Pinned · best match for you
          <span className="page-head__count">{fresh} score</span>
        </div>
        <div className="mkt-hero__title">
          <span className="species-mark" style={{ background: grad, color: '#150f23' }}>
            <I.Fish size={18} />
          </span>
          {name} · <span style={{ color: 'var(--on-dark-muted)', fontWeight: 500 }}>{vendor}</span>
        </div>
        <div className="mkt-hero__sub">
          {h > 0 ? `Listed ${h}h ago` : 'Just listed'} · {hasDelivery ? `Delivery ₱${listing.deliveryFee}` : 'Pickup only'} · {availKg}kg available
        </div>
        <div className="balance-actions">
          <button
            className="btn btn--lime"
            style={{ padding: '8px 18px' }}
            disabled={availKg <= 0}
            onClick={e => { e.stopPropagation(); onCart(listing) }}
          >
            Add to cart · ₱{price}/kg
          </button>
          <button className="btn" onClick={e => { e.stopPropagation(); onDetail(listing) }}>
            <I.Eye size={11} /> Quick view
          </button>
        </div>
      </div>
      <div className="mkt-hero__price">
        <div className="balance-label">Per kilo</div>
        <div className="balance-value" style={{ fontSize: 48 }}>₱{price}</div>
        <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', marginTop: 4 }}>
          Freshness score · {fresh}/100
        </div>
      </div>
    </div>
  )
}

/* ── Catch card — reference-style ── */
function CatchCard({ listing, onDetail, onCart }) {
  const name    = listing.speciesName ?? listing.title ?? 'Fish'
  const vendor  = listing.vendorName ?? 'Vendor'
  const availKg = listing.availableKg ?? 0
  const price   = listing.pricePerKg ?? 0
  const grad    = AVATAR_GRADS[listing.id % AVATAR_GRADS.length]
  const initials = listingInitials(name)
  const fresh   = calcFreshness(listing)
  const hasDelivery = (listing.deliveryFee ?? 0) > 0

  return (
    <article
      className="catch-card catch-card--big"
      onClick={() => onDetail(listing)}
      style={{ cursor: 'pointer' }}
    >
      <div className="catch-card__head">
        <div
          className="cell-species__avatar"
          style={{ background: grad, width: 34, height: 34, borderRadius: 8, fontSize: 11, display: 'grid', placeItems: 'center', flexShrink: 0 }}
        >
          {initials}
        </div>
        <span className="catch-card__id">LST-{listing.id}</span>
        <div className="spacer" style={{ flex: 1 }} />
      </div>

      <div className="catch-card__species">{name}</div>
      <div className="catch-card__fisherman"><I.Store size={11} /> {vendor}</div>
      <div className="catch-card__zone">
        <I.MapPin size={10} /> {hasDelivery ? `Delivery ₱${listing.deliveryFee}` : 'Pickup only'}
      </div>

      <div className="catch-card__freshness">
        <div className="catch-card__fresh-label">
          <span>Freshness</span><strong>{fresh}/100</strong>
        </div>
        <div className="catch-card__fresh-bar">
          <div className="catch-card__fresh-fill" style={{ width: `${fresh}%` }} />
        </div>
      </div>

      <div className="catch-card__bottom">
        <span className="catch-card__qty">
          {availKg > 0 ? availKg : 0}<small> kg left</small>
        </span>
        <span className="catch-card__price">₱{price}/kg</span>
      </div>

      <div className="catch-card__cta">
        <button
          className="btn btn--sm btn--lime"
          style={{ flex: 1, padding: '7px 10px' }}
          disabled={availKg <= 0}
          onClick={e => { e.stopPropagation(); onCart(listing) }}
        >
          <I.Cart size={11} /> Add
        </button>
        <button
          className="btn btn--sm"
          style={{ flex: 1, padding: '7px 10px' }}
          onClick={e => { e.stopPropagation(); onDetail(listing) }}
        >
          Quick view
        </button>
      </div>
    </article>
  )
}

/* ── Main page ── */
export default function Marketplace({ setPage, setBuyNow, setListingId }) {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null)
  const [freshFilter, setFreshFilter] = useState('Any')
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState('Freshness')
  const [cartModal, setCartModal] = useState(null)
  const gridRef = useRef(null)

  const listingsQ = useQuery({
    queryKey: ['buyerListings'],
    queryFn: () => fetchListings({ size: 100 }),
    staleTime: 10_000,
  })

  const allListings = useMemo(
    () => listingsQ.data?.content ?? listingsQ.data ?? [],
    [listingsQ.data],
  )

  /* species chips from actual data */
  const speciesItems = useMemo(() => {
    const map = new Map()
    for (const l of allListings) {
      if (!map.has(l.speciesId))
        map.set(l.speciesId, { id: l.speciesId, label: l.speciesName ?? 'Unknown', count: 0 })
      map.get(l.speciesId).count++
    }
    return [{ id: null, label: 'All species', count: allListings.length }, ...Array.from(map.values())]
  }, [allListings])

  /* price range extremes */
  const [minPrice, maxPrice] = useMemo(() => {
    if (!allListings.length) return [0, 500]
    const prices = allListings.map(l => l.pricePerKg ?? 0)
    return [Math.min(...prices), Math.max(...prices)]
  }, [allListings])

  /* filtered + sorted listings */
  const listings = useMemo(() => {
    let r = allListings.filter(l => (l.availableKg ?? 0) > 0)
    if (selectedSpeciesId) r = r.filter(l => l.speciesId === selectedSpeciesId)
    if (freshFilter === "Today's haul") r = r.filter(l => (hoursAgo(l.createdAt) ?? 99) <= 12)
    if (freshFilter === 'Within 24h')   r = r.filter(l => (hoursAgo(l.createdAt) ?? 99) <= 24)
    if (freshFilter === 'Within 48h')   r = r.filter(l => (hoursAgo(l.createdAt) ?? 99) <= 48)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.speciesName?.toLowerCase().includes(q) ||
        l.vendorName?.toLowerCase().includes(q)
      )
    }
    if (sort === 'Price ↑')  r = [...r].sort((a, b) => (a.pricePerKg ?? 0) - (b.pricePerKg ?? 0))
    if (sort === 'Price ↓')  r = [...r].sort((a, b) => (b.pricePerKg ?? 0) - (a.pricePerKg ?? 0))
    if (sort === 'Freshness' || sort === 'Trending') r = [...r].sort((a, b) => calcFreshness(b) - calcFreshness(a))
    return r
  }, [allListings, selectedSpeciesId, freshFilter, search, sort])

  /* GSAP on filter change */
  useEffect(() => {
    if (!gridRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cards = gridRef.current.querySelectorAll('.catch-card')
    if (cards.length) {
      gsap.from(cards, { opacity: 0, y: 16, stagger: 0.04, duration: 0.25, ease: 'power2.out', clearProps: 'all' })
    }
  }, [listings])

  const handleDetail = (l)  => { setListingId(l.id); setPage('blisting') }
  const handleCart   = (l)  => setCartModal(l)
  const clearFilters = ()   => { setSearch(''); setSelectedSpeciesId(null); setFreshFilter('Any') }

  return (
    <div className="page-wrap">
      <PageHead
        eyebrow="Browse · marketplace"
        title="Today's freshest"
        lime="haul"
        sub={listingsQ.isLoading ? '—' : `${listings.length} listings live`}
        tools={
          <>
            <button className={`filter-pill${freshFilter === 'Within 24h' ? ' filter-pill--on' : ''}`} onClick={() => setFreshFilter(freshFilter === 'Within 24h' ? 'Any' : 'Within 24h')}>
              <I.Refresh size={11} /> <strong>Within 24h</strong>
            </button>
            <button className="filter-pill">
              <I.Fish size={11} /> <strong>{selectedSpeciesId ? (speciesItems.find(s => s.id === selectedSpeciesId)?.label ?? 'Species') : 'All species'}</strong>
            </button>
            <button className={`filter-pill${sort === 'Trending' ? ' filter-pill--on' : ''}`} onClick={() => setSort('Trending')}>
              <strong>Trending</strong>
            </button>
          </>
        }
      />

      <div className="mkt-shell" style={{ marginTop: 20 }}>
        {/* ── Left filter rail ── */}
        <aside className="mkt-side">
          {/* Search */}
          <div className="mkt-side__search">
            <I.Search size={13} />
            <input
              placeholder="Search species, vendors…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 2 }}>
                <I.X size={11} />
              </button>
            )}
          </div>

          {/* Species */}
          <div className="filter-block">
            <div className="filter-block__title">Species</div>
            <div className="filter-block__list">
              {speciesItems.map(sp => (
                <button
                  key={sp.id ?? 'all'}
                  className={`filter-row${selectedSpeciesId === sp.id ? ' filter-row--on' : ''}`}
                  onClick={() => setSelectedSpeciesId(sp.id)}
                >
                  <span className="filter-row__dot" />
                  {sp.label}
                  <span className="filter-row__count">{sp.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Freshness */}
          <div className="filter-block">
            <div className="filter-block__title">Freshness</div>
            <div className="filter-block__list">
              {FRESH_OPTIONS.map(f => (
                <button
                  key={f}
                  className={`filter-row${freshFilter === f ? ' filter-row--on' : ''}`}
                  onClick={() => setFreshFilter(f)}
                >
                  <span className="filter-row__dot" />{f}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="filter-block">
            <div className="filter-block__title">Price · ₱/kg</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="range-track">
                <div className="range-track__fill" style={{ left: '15%', right: '35%' }} />
                <div className="range-track__pin" style={{ left: '15%' }} />
                <div className="range-track__pin" style={{ left: '65%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--on-dark-muted)' }}>
                <span>₱{minPrice}</span><span>₱{maxPrice}+</span>
              </div>
            </div>
          </div>

          {/* Vendor rating */}
          <div className="filter-block">
            <div className="filter-block__title">Vendor rating</div>
            <div className="filter-block__list">
              {RATING_OPTIONS.map((r, i) => (
                <button key={i} className={`filter-row${i === 0 ? ' filter-row--on' : ''}`}>
                  <span className="filter-row__dot" />{r}
                </button>
              ))}
            </div>
          </div>

          {/* Quick filters */}
          <div className="filter-block">
            <div className="filter-block__title">Quick filters</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_TAGS.map(t => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="mkt-main">
          {/* Sort + view bar */}
          <div className="mkt-bar">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--on-dark-muted)', marginRight: 4 }}>Sort</span>
              {SORT_OPTIONS.map(s => (
                <button
                  key={s}
                  className={`filter-pill${sort === s ? ' filter-pill--on' : ''}`}
                  style={{ padding: '5px 12px', fontSize: 11 }}
                  onClick={() => setSort(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" title="Grid view"><I.Dashboard size={14} /></button>
              <button className="icon-btn" title="List view"><I.Layers size={14} /></button>
              <button className="icon-btn" title="Map view"><I.MapPin size={14} /></button>
            </div>
          </div>

          {/* Loading skeletons */}
          {listingsQ.isLoading ? (
            <div className="catch-grid catch-grid--big">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: 'var(--layer-2)', borderRadius: 14, height: 260, border: '1px solid var(--hairline)' }} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 48 }}>
              <I.Fish size={36} />
              <div>No listings found</div>
              {(search || selectedSpeciesId || freshFilter !== 'Any') && (
                <button className="btn btn--ghost btn--sm" onClick={clearFilters}>Clear filters</button>
              )}
            </div>
          ) : (
            <>
              {/* Hero strip */}
              <HeroStrip listing={listings[0]} onDetail={handleDetail} onCart={handleCart} />

              {/* Catch grid */}
              <div ref={gridRef} className="catch-grid catch-grid--big">
                {listings.map(l => (
                  <CatchCard
                    key={l.id}
                    listing={l}
                    onDetail={handleDetail}
                    onCart={handleCart}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {cartModal && <AddToCartModal listing={cartModal} onClose={() => setCartModal(null)} />}
    </div>
  )
}
