import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { browseDemandListings } from './api/marketplace'
import { fetchSpecies } from '../api/lookup.js'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function MarketplacePage() {
  const [sort, setSort] = useState('priceDesc')
  const [speciesFilter, setSpeciesFilter] = useState(null)

  const listingsQ = useQuery({
    queryKey: ['fisherman', 'marketplace', speciesFilter],
    queryFn: () => browseDemandListings({ speciesId: speciesFilter ?? undefined }),
  })
  const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
  if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>

  const listings = listingsQ.data ?? []
  const species  = speciesQ.data ?? []

  let list = [...listings]
  if (sort === 'priceDesc') list.sort((a,b) => b.offerPricePerKg - a.offerPricePerKg)
  if (sort === 'qtyDesc')   list.sort((a,b) => b.quantityKg - a.quantityKg)
  if (sort === 'date')      list.sort((a,b) => new Date(a.neededBy ?? 0) - new Date(b.neededBy ?? 0))

  const topPrice = Math.max(...listings.map(l => l.offerPricePerKg), 0)
  const topPricedListing = listings.find(l => l.offerPricePerKg === topPrice)

  const urgentCount = listings.filter(l => l.neededBy && (new Date(l.neededBy).getTime() - Date.now() < 48 * 3600 * 1000)).length

  const distanceValues = listings.map(l => l.distanceKm).filter(Boolean)
  const nearestKm = distanceValues.length > 0 ? Math.min(...distanceValues).toFixed(1) : null

  const tunaListings = listings.filter(l => l.fishSpecies?.commonName?.toLowerCase().includes('tuna'))
  const avgTunaPrice = tunaListings.length > 0
    ? Math.round(tunaListings.reduce((s, l) => s + l.offerPricePerKg, 0) / tunaListings.length)
    : null

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Vendor <em>demand</em>
          </h1>
          <p className="page__sub">{listings.length} active vendor listings · updated 2 min ago</p>
        </div>
        <div className="page__actions">
          <div className="topbar__search" style={{width: 240}}>
            <I.Search size={14} />
            <input placeholder="Search species, vendor…" />
          </div>
          <button className="btn btn--primary"><I.Plus size={14} /> Post alert</button>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat">
          <div className="l">Best price today</div>
          <div className="v">₱{topPrice}<span style={{fontSize: 14, color: 'var(--ink-4)'}}> /kg</span></div>
          <div className="s">{topPricedListing?.fishSpecies?.commonName ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="l">Urgent listings</div>
          <div className="v">{urgentCount}</div>
          <div className="s">Deadline within 48h</div>
        </div>
        <div className="stat">
          <div className="l">Nearest vendor</div>
          <div className="v">
            {nearestKm
              ? <>{nearestKm}<span style={{fontSize: 14, color: 'var(--ink-4)'}}> km</span></>
              : '—'}
          </div>
          <div className="s">By distance</div>
        </div>
        <div className="stat">
          <div className="l">Avg tuna price</div>
          <div className="v">{avgTunaPrice !== null ? `₱${avgTunaPrice}` : '—'}</div>
          <div className="s">From current listings</div>
        </div>
        <div className="stat">
          <div className="l">Total listings</div>
          <div className="v">{listings.length}</div>
          <div className="s">Open vendor demand</div>
        </div>
      </div>

      <div className="mkt-grid">
        <div className="mkt-filter">
          <h4>Species</h4>
          {species.map(s => (
            <label key={s.id} className="mkt-check" style={{cursor: 'pointer'}} onClick={() => setSpeciesFilter(speciesFilter === s.id ? null : s.id)}>
              <span>
                <input type="checkbox" readOnly checked={speciesFilter === s.id} />
                {s.commonName}
              </span>
              <span className="count">{listings.filter(l => l.fishSpecies?.id === s.id).length}</span>
            </label>
          ))}
          <h4>Location</h4>
          {['Batangas', 'Quezon', 'Lucena', 'Anilao', 'Lipa'].map(l => (
            <label key={l} className="mkt-check">
              <span><input type="checkbox" />{l}</span>
            </label>
          ))}
          <h4>Price per kg</h4>
          <div style={{padding: '8px 0'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)'}}>
              <span>₱150</span><span>₱700</span>
            </div>
            <input type="range" min="150" max="700" defaultValue="350" style={{width: '100%', accentColor: 'var(--accent)'}} />
          </div>
          <h4>Urgency</h4>
          <label className="mkt-check"><span><input type="checkbox" />Deadline within 48h</span></label>
          <label className="mkt-check"><span><input type="checkbox" />New this week</span></label>
        </div>

        <div>
          <div className="row" style={{marginBottom: 10, gap: 6}}>
            <span className="chip chip--ink">{listings.length} results</span>
            <div className="spacer" />
            <span style={{fontSize: 12, color: 'var(--ink-4)'}}>Sort by</span>
            <button className={`btn btn--sm ${sort === 'priceDesc' ? '' : 'btn--ghost'}`} onClick={() => setSort('priceDesc')}>Highest price</button>
            <button className={`btn btn--sm ${sort === 'qtyDesc' ? '' : 'btn--ghost'}`} onClick={() => setSort('qtyDesc')}>Largest qty</button>
            <button className={`btn btn--sm ${sort === 'date' ? '' : 'btn--ghost'}`} onClick={() => setSort('date')}>Soonest needed</button>
          </div>

          <div className="mkt-listings">
            {list.map(l => {
              const isUrgent = l.neededBy && (new Date(l.neededBy).getTime() - Date.now() < 48 * 3600 * 1000)
              const isNew = l.postedAt && (Date.now() - new Date(l.postedAt).getTime() < 7 * 24 * 3600 * 1000)
              const neededByDisplay = l.neededBy
                ? new Date(l.neededBy).toLocaleDateString('en-PH', {month: '2-digit', day: '2-digit'})
                : '—'
              return (
                <div key={l.id} className="mkt-row">
                  <div className="mkt-row__icon"><I.Fish size={20} /></div>
                  <div>
                    <div className="mkt-row__name">{l.fishSpecies?.commonName ?? '—'}</div>
                    <div className="mkt-row__vendor">{l.vendorName ?? '—'} · {`L-${l.id}`}</div>
                  </div>
                  <div>
                    <div className="row" style={{gap: 6}}>
                      {isUrgent && <span className="chip chip--unsafe chip--dot">Urgent</span>}
                      {isNew && <span className="chip chip--accent chip--dot">New</span>}
                    </div>
                    <div className="mkt-row__loc" style={{marginTop: 4}}>
                      <I.MapPin size={11} style={{verticalAlign: -1, marginRight: 3}} />
                      {`${l.marketLocation?.name ?? '—'} · ${l.marketLocation?.municipality ?? ''}`}
                    </div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div className="mkt-row__price" style={{textAlign: 'center'}}>
                      {l.quantityKg}<small>kg</small>
                    </div>
                    <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Wanted</div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)'}}>
                      by {neededByDisplay}
                    </div>
                    <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2}}>Deadline</div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div className="mkt-row__price">₱{l.offerPricePerKg}<small>/kg</small></div>
                    <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Offered</div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                    <button className="btn btn--accent btn--sm" style={{justifyContent: 'center'}}>Make offer</button>
                    <button className="btn btn--ghost btn--sm" style={{justifyContent: 'center'}}><I.Message size={11} /> Message</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
