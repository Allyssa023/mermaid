import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

// ── Inline mock data ─────────────────────────────────────────────────────────

const SPECIES = [
  { id: 1, commonName: 'Yellowfin Tuna',      tag: 'YT' },
  { id: 2, commonName: 'Skipjack',            tag: 'SK' },
  { id: 3, commonName: 'Mahi-mahi',           tag: 'MM' },
  { id: 4, commonName: 'Red Snapper',         tag: 'RS' },
  { id: 5, commonName: 'Grouper (Lapu-lapu)', tag: 'LL' },
  { id: 6, commonName: 'Spanish Mackerel',    tag: 'SM' },
  { id: 7, commonName: 'Squid (Pusit)',        tag: 'PS' },
  { id: 8, commonName: 'Blue Marlin',         tag: 'BM' },
]
const sp = (name) => SPECIES.find(s => s.commonName === name || s.commonName.startsWith(name))

const CATCH_ALERTS = [
  { id: 841, alertCode: 'CA-841', species: sp('Yellowfin'),
    quantityKg: 42, landingSite: 'Verde Passage', askingPricePerKg: 380,
    status: 'ACTIVE', matchedListingIds: [512, 497, 504, 509, 501], urgent: false,
    postedLabel: '09:14', expires: '13:14 today',
    kg: 42, pieces: 4, askPrice: 380, site: 'Verde Passage', postedAt: '09:14', offers: 5 },
  { id: 840, alertCode: 'CA-840', species: sp('Mahi'),
    quantityKg: 9, landingSite: 'Verde Passage', askingPricePerKg: 260,
    status: 'MATCHED', matchedListingIds: [510, 501, 504], urgent: false, buyer: 'Marina Seafoods',
    postedLabel: '08:42', expires: '12:42 today',
    kg: 9, pieces: 2, askPrice: 260, site: 'Verde Passage', postedAt: '08:42', offers: 3 },
  { id: 839, alertCode: 'CA-839', species: sp('Grouper'),
    quantityKg: 3.2, landingSite: 'Verde Passage', askingPricePerKg: 420,
    status: 'ACTIVE', matchedListingIds: [505, 501, 497, 512, 510, 504, 509], urgent: true,
    postedLabel: '09:58', expires: '10:39 today',
    kg: 3.2, pieces: 1, askPrice: 420, site: 'Verde Passage', postedAt: '09:58', offers: 7 },
  { id: 838, alertCode: 'CA-838', species: sp('Squid'),
    quantityKg: 8, landingSite: 'Verde Passage', askingPricePerKg: 220,
    status: 'ACTIVE', matchedListingIds: [501, 497], urgent: false,
    postedLabel: '08:22', expires: '10:22 today',
    kg: 8, pieces: null, askPrice: 220, site: 'Verde Passage', postedAt: '08:22', offers: 2 },
  { id: 832, alertCode: 'CA-832', species: sp('Skipjack'),
    quantityKg: 34, landingSite: 'Balayan Bay', askingPricePerKg: 180,
    status: 'EXPIRED', matchedListingIds: [497], urgent: false,
    postedLabel: 'Yest.', expires: 'Expired',
    kg: 34, pieces: 12, askPrice: 180, site: 'Balayan Bay', postedAt: 'Yest.', offers: 1 },
  { id: 828, alertCode: 'CA-828', species: sp('Spanish'),
    quantityKg: 18, landingSite: 'Tayabas Bay', askingPricePerKg: 340,
    status: 'MATCHED', matchedListingIds: [509, 504, 497, 510], urgent: false, buyer: 'Bay City Market',
    postedLabel: 'Yest.', expires: 'Expired',
    kg: 18, pieces: 3, askPrice: 340, site: 'Tayabas Bay', postedAt: 'Yest.', offers: 4 },
  { id: 825, alertCode: 'CA-825', species: sp('Red Snapper'),
    quantityKg: 11, landingSite: 'Verde Passage', askingPricePerKg: 380,
    status: 'CANCELLED', matchedListingIds: [], urgent: false,
    postedLabel: 'Apr 21', expires: 'Expired',
    kg: 11, pieces: 5, askPrice: 380, site: 'Verde Passage', postedAt: 'Apr 21', offers: 0 },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const active  = CATCH_ALERTS.filter(a => a.status === 'ACTIVE')
  const matched = CATCH_ALERTS.filter(a => a.status === 'MATCHED')
  const expired = CATCH_ALERTS.filter(a => a.status === 'EXPIRED')

  const totalKg = active.reduce((a, c) => a + c.kg, 0)
  const potentialRevenue = active.reduce((a, c) => a + c.kg * c.askPrice, 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market-side</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Catch <em>Alerts</em>
          </h1>
          <p className="page__sub">Post what you've caught · let vendors come to you.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Filter</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Post alert</button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Active alerts</div>
          <div className="v">{active.length}</div>
          <div className="s">Posted to 14 nearby vendors</div>
        </div>
        <div className="stat">
          <div className="l">Total offered</div>
          <div className="v">{totalKg.toFixed(0)}<span style={{fontSize:16, color:'var(--ink-4)', marginLeft:2}}>kg</span></div>
          <div className="s">Across {active.length} listings</div>
        </div>
        <div className="stat">
          <div className="l">Potential revenue</div>
          <div className="v">₱{(potentialRevenue/1000).toFixed(1)}k</div>
          <div className="s">At asking price</div>
        </div>
        <div className="stat">
          <div className="l">Open offers</div>
          <div className="v">{active.reduce((a,c)=>a+c.offers,0)}</div>
          <div className="s">From 9 vendors</div>
        </div>
        <div className="stat">
          <div className="l">Match rate</div>
          <div className="v">82<span style={{fontSize:16, color:'var(--ink-4)', marginLeft:2}}>%</span></div>
          <div className="s">Last 30 days</div>
        </div>
      </div>

      {/* Active alerts grid */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Active alerts</div>
            <div className="card__sub">{active.length} live · buyers notified in real-time</div>
          </div>
          <div className="row" style={{gap: 4}}>
            <button className="btn btn--sm">Sort: Newest</button>
          </div>
        </div>
        <div className="alerts-grid">
          {active.map(a => (
            <div key={a.id} className={`alert-card${a.urgent ? ' alert-card--urgent' : ''}`}>
              <div className="alert-card__head">
                <div>
                  <div className="row" style={{gap: 6}}>
                    <span className="kbd">{a.alertCode}</span>
                    {a.urgent && <span className="chip chip--unsafe chip--dot">Expires soon</span>}
                  </div>
                  <h3 className="alert-card__species">{a.species?.commonName || a.species}</h3>
                  <div className="alert-card__sub">Posted {a.postedAt} · {a.site}</div>
                </div>
                <button className="btn btn--sm btn--ghost"><I.Dots size={14} /></button>
              </div>
              <div className="alert-card__stats">
                <div>
                  <div className="l">Qty</div>
                  <div className="v">{a.kg}<small>kg</small></div>
                </div>
                <div>
                  <div className="l">Pieces</div>
                  <div className="v">{a.pieces ?? '—'}</div>
                </div>
                <div>
                  <div className="l">Asking</div>
                  <div className="v">₱{a.askPrice}<small>/kg</small></div>
                </div>
              </div>
              <div className="alert-card__foot">
                <div className="row" style={{gap: 6}}>
                  <I.Clock size={12} style={{color: a.urgent ? 'var(--unsafe)' : 'var(--ink-4)'}} />
                  <span style={{color: a.urgent ? 'var(--unsafe)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12}}>
                    {a.expires}
                  </span>
                </div>
                <div className="row" style={{gap: 8}}>
                  <div className="alert-card__offers">
                    {['MS', 'BC', 'JA'].slice(0, Math.min(3, a.offers)).map((n, i) => (
                      <div key={i} className="alert-card__offer-avatar" style={{marginLeft: i === 0 ? 0 : -6}}>{n}</div>
                    ))}
                    {a.offers > 3 && <div className="alert-card__offer-avatar">+{a.offers - 3}</div>}
                  </div>
                  <button className="btn btn--accent btn--sm">{a.offers} offers</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matched alerts */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Matched · waiting to finalize</div>
            <div className="card__sub">{matched.length} ready to convert to orders</div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Species</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Buyer</th>
              <th>Site</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matched.map(a => (
              <tr key={a.id} className="row--link">
                <td><span className="kbd">{a.alertCode}</span></td>
                <td style={{fontWeight: 500, color: 'var(--ink)'}}>{a.species?.commonName || a.species}</td>
                <td className="data">{a.kg}kg · {a.pieces ?? '—'} pcs</td>
                <td className="data">₱{a.askPrice}/kg</td>
                <td>{a.buyer}</td>
                <td>{a.site}</td>
                <td><button className="btn btn--sm btn--accent">Create order</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expired */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Expired</div>
            <div className="card__sub">Past alerts · relist with one click</div>
          </div>
        </div>
        {expired.length === 0 ? (
          <div className="empty">No expired alerts yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Species</th><th>Qty</th><th>Ask</th><th>Site</th><th>Posted</th><th></th></tr>
            </thead>
            <tbody>
              {expired.map(a => (
                <tr key={a.id}>
                  <td><span className="kbd">{a.alertCode}</span></td>
                  <td style={{fontWeight: 500}}>{a.species?.commonName || a.species}</td>
                  <td className="data">{a.kg}kg</td>
                  <td className="data">₱{a.askPrice}/kg</td>
                  <td>{a.site}</td>
                  <td style={{color: 'var(--ink-4)'}}>{a.postedAt}</td>
                  <td><button className="btn btn--sm">Relist</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
