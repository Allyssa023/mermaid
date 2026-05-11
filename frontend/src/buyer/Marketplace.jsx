import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const BUYER_LISTINGS = [
  { id: 612, listingCode: 'L-612', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Yellowfin Tuna', tag: 'YT' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 60, pricePerKg: 400, neededBy: 'Apr 25',
    notes: 'Export-grade, sashimi-quality. Iced at sea.',
    tag: 'Premium', urgent: false, available: 42 },
  { id: 611, listingCode: 'L-611', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Skipjack', tag: 'SK' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 100, pricePerKg: 175, neededBy: 'Apr 28',
    notes: 'Bulk weekly contract. Excellent for canning.',
    tag: 'Bulk', urgent: false, available: 58 },
  { id: 609, listingCode: 'L-609', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Mahi-mahi', tag: 'MM' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 30, pricePerKg: 260, neededBy: 'Apr 24',
    notes: 'Whole fish, 2kg+ pieces. Limited stock.',
    tag: 'Limited', urgent: true, available: 21 },
  { id: 615, listingCode: 'L-615', vendorName: 'Bay City Market', vendorRating: 4.6, vendorTrades: 92,
    species: { commonName: 'Grouper (Lapu-lapu)', tag: 'LL' },
    location: 'Lucena City · Quezon',
    quantityKg: 18, pricePerKg: 560, neededBy: 'Apr 25',
    notes: 'Live, 1.5–3kg individuals. Restaurant grade.',
    tag: 'Premium', urgent: false, available: 12 },
  { id: 618, listingCode: 'L-618', vendorName: 'J. Aquino & Sons', vendorRating: 4.5, vendorTrades: 47,
    species: { commonName: 'Spanish Mackerel', tag: 'SM' },
    location: 'Lipa · Batangas',
    quantityKg: 25, pricePerKg: 340, neededBy: 'Apr 26',
    notes: 'Whole fish, gilled and gutted on request.',
    tag: '', urgent: false, available: 25 },
  { id: 619, listingCode: 'L-619', vendorName: 'Puerto Azul Resto', vendorRating: 4.9, vendorTrades: 31,
    species: { commonName: 'Red Snapper', tag: 'RS' },
    location: 'Anilao · Batangas',
    quantityKg: 12, pricePerKg: 380, neededBy: 'Apr 24',
    notes: 'Reef-caught. Smaller individual portions available.',
    tag: 'Premium', urgent: false, available: 8 },
  { id: 622, listingCode: 'L-622', vendorName: 'Del Mar Cold Chain', vendorRating: 4.7, vendorTrades: 215,
    species: { commonName: 'Squid (Pusit)', tag: 'PS' },
    location: 'Batangas City · Batangas',
    quantityKg: 60, pricePerKg: 218, neededBy: 'Apr 27',
    notes: 'Frozen at sea. Mixed sizes.',
    tag: 'Bulk', urgent: false, available: 60 },
  { id: 624, listingCode: 'L-624', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Blue Marlin', tag: 'BM' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 20, pricePerKg: 620, neededBy: 'Apr 30',
    notes: 'Sashimi-grade. Pre-order — landing expected Thu.',
    tag: 'Premium', urgent: false, available: 0 },
]

const BUYER_FAVORITES = [
  { id: 210, name: 'Marina Seafoods', port: 'Pinagbayanan · Quezon', rating: 4.8, trades: 184, lastBought: '2 days ago' },
  { id: 213, name: 'Puerto Azul Resto', port: 'Anilao · Batangas', rating: 4.9, trades: 31, lastBought: '5 days ago' },
  { id: 214, name: 'Del Mar Cold Chain', port: 'Batangas Port', rating: 4.7, trades: 215, lastBought: '9 days ago' },
]

export default function Marketplace({ setPage }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = BUYER_LISTINGS.filter(l => {
    const matchesSearch = !search || l.species.commonName.toLowerCase().includes(search.toLowerCase()) || l.vendorName.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'available' ? l.available > 0 :
      filter === 'urgent' ? l.urgent :
      filter === 'premium' ? l.tag === 'Premium' : true
    return matchesSearch && matchesFilter
  })

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Marketplace</div>
          <h1 className="page__title" style={{marginTop: 4}}>Fresh from the <em>coast</em></h1>
          <p className="page__sub">Browse {BUYER_LISTINGS.length} active listings from verified vendors. Place an order and pick up or have it delivered.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.MapPin size={14} /> By location</button>
          <button className="btn btn--ghost">{BUYER_FAVORITES.length} saved <I.Star size={12} /></button>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="card" style={{marginTop: 18, padding: '14px 18px'}}>
        <div className="row" style={{gap: 12, alignItems: 'center'}}>
          <div className="search-input" style={{flex: 1}}>
            <I.Search size={14} />
            <input placeholder="Search species or vendor…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="seg">
            <button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>All</button>
            <button className={filter==='available'?'on':''} onClick={()=>setFilter('available')}>In stock</button>
            <button className={filter==='premium'?'on':''} onClick={()=>setFilter('premium')}>Premium</button>
            <button className={filter==='urgent'?'on':''} onClick={()=>setFilter('urgent')}>Last chance</button>
          </div>
          <button className="btn btn--ghost btn--sm">Sort: Recommended <I.ChevD size={11} /></button>
        </div>
      </div>

      {/* Listings grid */}
      <div className="buyer-grid" style={{marginTop: 18}}>
        {filtered.map(l => {
          const inStock = l.available > 0
          const lowStock = inStock && l.available < l.quantityKg * 0.4
          return (
            <div key={l.id} className="buyer-card" onClick={() => setSelected(l)}>
              <div className="buyer-card__hero" data-tag={l.species.tag}>
                <div className="buyer-card__species-tag">{l.species.tag}</div>
                {l.tag ? <span className={`buyer-card__chip buyer-card__chip--${l.tag.toLowerCase()}`}>{l.tag}</span> : null}
              </div>
              <div className="buyer-card__body">
                <h3 className="buyer-card__species">{l.species.commonName}</h3>
                <div className="buyer-card__vendor">
                  <span>{l.vendorName}</span>
                  <span className="muted-data">★ {l.vendorRating}</span>
                </div>
                <div className="buyer-card__location"><I.MapPin size={11} /> {l.location}</div>
                <div className="buyer-card__price">
                  <span className="big">₱{l.pricePerKg}</span>
                  <span>/kg</span>
                </div>
                <div className="buyer-card__stock">
                  {!inStock ? (
                    <span className="muted-data" style={{color:'var(--ink-4)'}}>Pre-order · landing {l.neededBy}</span>
                  ) : lowStock ? (
                    <span style={{color:'var(--warn)', fontSize: 12, fontFamily: 'var(--font-mono)'}}>● Low stock · {l.available}kg left</span>
                  ) : (
                    <span style={{color:'var(--safe)', fontSize: 12, fontFamily: 'var(--font-mono)'}}>● {l.available}kg available</span>
                  )}
                </div>
              </div>
              <div className="buyer-card__foot">
                <button className="btn btn--ghost btn--sm" onClick={(e)=>{e.stopPropagation();}}>Details</button>
                <button className="btn btn--accent btn--sm" disabled={!inStock} onClick={(e)=>{e.stopPropagation();}}>
                  {inStock ? 'Order' : 'Notify me'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail / order modal */}
      {selected ? (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">{selected.vendorName}</div>
                <h2 className="modal__title" style={{marginTop: 4}}>{selected.species.commonName}</h2>
                <div className="muted-data">★ {selected.vendorRating} · {selected.vendorTrades} trades · {selected.location}</div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}><I.X size={14} /></button>
            </div>

            <div className="detail-grid">
              <div><div className="l">Price</div><div className="v">₱{selected.pricePerKg}<small>/kg</small></div></div>
              <div><div className="l">Available</div><div className="v">{selected.available}<small>kg</small></div></div>
              <div><div className="l">Total batch</div><div className="v">{selected.quantityKg}<small>kg</small></div></div>
              <div><div className="l">Ready by</div><div className="v">{selected.neededBy}</div></div>
            </div>

            {selected.notes ? <div className="detail-notes">"{selected.notes}"</div> : null}

            <div className="form-grid" style={{marginTop: 14}}>
              <div className="form-row form-row--2col">
                <div><label>Quantity (kg)</label><input className="input" type="number" defaultValue={Math.min(selected.available || 5, 5)} /></div>
                <div><label>Pickup or delivery</label><select className="input"><option>Pickup</option><option>Delivery</option></select></div>
              </div>
              <div className="form-row"><label>Notes for vendor</label><textarea className="input" rows="2" placeholder="Optional — quality requests, packaging…" /></div>
            </div>

            <div className="modal__foot">
              <button className="btn" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn--ghost">Message vendor</button>
              <button className="btn btn--primary">Place order</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
