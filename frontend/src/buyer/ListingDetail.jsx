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
]

const V_REVIEWS = [
  { id: 1, buyer: 'Sofia Mendez',   rating: 5, comment: 'Sashimi-grade for real. Iced perfectly — delivered exactly on time.', date: 'Apr 20' },
  { id: 2, buyer: 'Carlo Aquino',   rating: 4, comment: 'Good fish. Pickup was a bit slow, maybe 20 min wait.', date: 'Apr 18' },
  { id: 3, buyer: 'Lisa Tan',       rating: 5, comment: 'Best mahi-mahi in the bay. Will order again.', date: 'Apr 16' },
]

// ─── BuyerVendorStorefrontPage (inline) ──────────────────────────────────────
function VendorStorefront({ setPage }) {
  const vendorName = 'Marina Seafoods'
  const listings = BUYER_LISTINGS.filter(l => l.vendorName === vendorName)
  const reviews = V_REVIEWS.slice(0, 3)

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}><I.ChevL size={11} /> Back to marketplace</button>
      <div className="card" style={{marginTop: 14, padding: 0, overflow: 'hidden'}}>
        <div style={{height: 140, background: 'linear-gradient(135deg, oklch(0.7 0.1 220), oklch(0.6 0.12 200))'}} />
        <div style={{padding: '0 24px 22px', marginTop: -36}}>
          <div className="row" style={{gap: 18, alignItems: 'flex-end'}}>
            <div style={{width: 88, height: 88, borderRadius: 16, background: 'var(--surface)', border: '3px solid var(--surface)', display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 600, color: 'var(--accent)'}}>M</div>
            <div style={{flex: 1, paddingBottom: 8}}>
              <h1 style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 30}}>{vendorName}</h1>
              <div className="muted-data" style={{fontSize: 13, marginTop: 4}}>
                <span style={{color: 'oklch(0.65 0.15 80)'}}>★ 4.8</span> · 184 trades · joined Jan 2022 · Pinagbayanan Depot
              </div>
            </div>
            <button className="btn"><I.Heart size={12} /> Save</button>
            <button className="btn btn--primary"><I.Message size={12} /> Message</button>
          </div>
          <p style={{margin: '14px 0 0', maxWidth: 620, lineHeight: 1.6, color: 'var(--ink-2)'}}>Family-run seafood wholesaler serving Quezon since 1998. Sashimi-grade tuna and live grouper our specialty.</p>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 24, gap: 24, alignItems: 'flex-start'}}>
        <div>
          <h2 style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 22}}>Open listings <span className="muted-data" style={{fontSize: 16}}>({listings.length})</span></h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 14}}>
            {listings.map(l => (
              <div key={l.id} className="card" style={{padding: 0, overflow: 'hidden', cursor: 'pointer'}} onClick={() => setPage('blisting')}>
                <div style={{height: 120, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 600, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{l.species.tag}</div>
                <div style={{padding: 12}}>
                  <strong style={{fontSize: 14}}>{l.species.commonName}</strong>
                  <div className="muted-data" style={{fontSize: 11, marginTop: 2}}>{l.available} kg available</div>
                  <div style={{marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)'}}>₱{l.pricePerKg}<span style={{fontSize: 11, color: 'var(--ink-3)'}}>/ kg</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card__head"><div className="card__title">Pickup & hours</div></div>
            <div style={{fontSize: 13, lineHeight: 1.7}}>
              <div><I.MapPin size={12} /> Pinagbayanan Depot, Quezon</div>
              <div style={{marginTop: 10, display: 'grid', gridTemplateColumns: '40px 1fr', gap: '4px 14px'}}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                  <span key={d} style={{display: 'contents'}}>
                    <strong>{d}</strong>
                    <span className="muted-data">{i === 6 ? 'Closed' : '06:00 – 18:00'}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{marginTop: 14}}>
            <div className="card__head"><div className="card__title">Recent reviews</div></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {reviews.map(r => (
                <div key={r.id}>
                  <div className="row" style={{gap: 8, alignItems: 'center'}}>
                    <strong style={{fontSize: 13}}>{r.buyer}</strong>
                    <span style={{color: 'oklch(0.65 0.15 80)', fontSize: 12}}>{'★'.repeat(r.rating)}</span>
                    <span className="muted-data" style={{fontSize: 11, marginLeft: 'auto'}}>{r.date}</span>
                  </div>
                  <p style={{margin: '4px 0 0', fontSize: 13, lineHeight: 1.5}}>{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ListingDetail (default export) ──────────────────────────────────────────
export default function ListingDetail({ setPage, vendorView }) {
  if (vendorView) return <VendorStorefront setPage={setPage} />

  const listing = BUYER_LISTINGS[0]
  const tag = listing.species.tag
  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}><I.ChevL size={11} /> Back to marketplace</button>
      <div className="grid grid--2-1" style={{marginTop: 18, gap: 24, alignItems: 'flex-start'}}>
        <div>
          <div style={{borderRadius: 16, height: 360, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 96, fontWeight: 600, letterSpacing: '2px', fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{tag}</div>
          <div className="row" style={{gap: 8, marginTop: 10}}>
            {['', '', '', ''].map((_, i) => (
              <div key={i} style={{width: 72, height: 72, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', fontSize: 10}}>photo</div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow">{listing.vendorName}</div>
          <h1 className="page__title" style={{marginTop: 4, fontSize: 32}}>{listing.species.commonName}</h1>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14}}>
            <span style={{fontSize: 38, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{listing.pricePerKg}</span>
            <span className="muted-data">/kg</span>
          </div>
          <div className="muted-data" style={{marginTop: 8, fontFamily: 'var(--font-mono)', color: 'var(--safe)'}}>● {listing.available} kg available</div>
          <p style={{marginTop: 16, lineHeight: 1.6}}>{listing.notes}</p>

          <div className="card" style={{marginTop: 18, padding: 14}}>
            <div className="row" style={{gap: 10, alignItems: 'center'}}>
              <div style={{width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600}}>{listing.vendorName[0]}</div>
              <div style={{flex: 1}}>
                <strong>{listing.vendorName}</strong>
                <div className="muted-data" style={{fontSize: 12}}>★ {listing.vendorRating} · {listing.vendorTrades} trades · {listing.location}</div>
              </div>
              <button className="btn btn--sm" onClick={() => setPage('bvendor')}>View storefront</button>
            </div>
          </div>

          <div className="row" style={{gap: 10, marginTop: 18}}>
            <button className="btn btn--accent" style={{flex: 2}} onClick={() => setPage('bcheckout')}>Order now</button>
            <button className="btn" style={{flex: 1}}>Add to cart</button>
          </div>
        </div>
      </div>
    </div>
  )
}
