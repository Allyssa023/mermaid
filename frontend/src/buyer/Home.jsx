import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const BUYER_USER = {
  id: 401,
  fullName: 'Sofia Mendez',
  first: 'Sofia',
  email: 'sofia.m@example.ph',
  role: 'BUYER',
  business: 'Casa Mendez Kitchen',
  port: 'Tagaytay · Cavite',
}

const B_HOME = {
  stats: { pending: 2, confirmed: 1, recent: 8, available: 24 },
  recentOrders: [
    { id: 8412, code: 'ORD-8412', vendor: 'Marina Seafoods', species: 'Mahi-mahi', qty: 6, total: 1560, status: 'CONFIRMED', date: 'Apr 23' },
    { id: 8409, code: 'ORD-8409', vendor: 'Bay City Market', species: 'Grouper',   qty: 3, total: 1680, status: 'PENDING',   date: 'Apr 23' },
    { id: 8398, code: 'ORD-8398', vendor: 'Puerto Azul',     species: 'Snapper',   qty: 4, total: 1520, status: 'COMPLETED', date: 'Apr 19' },
  ],
  fresh: [
    { id: 612, species: 'Yellowfin Tuna', vendor: 'Marina Seafoods', price: 400, tag: 'YT' },
    { id: 615, species: 'Grouper',        vendor: 'Bay City Market', price: 560, tag: 'LL' },
    { id: 622, species: 'Squid',          vendor: 'Del Mar',         price: 218, tag: 'PS' },
  ],
  activity: [
    { who: 'Marina Seafoods', what: 'posted a new Yellowfin listing',  when: '2h ago' },
    { who: 'Bay City Market', what: 'confirmed your order ORD-8409',    when: '5h ago' },
    { who: 'Puerto Azul',     what: 'requested a review',                when: '1d ago' },
    { who: 'Mermaid',         what: 'flagged a price drop on Snapper',   when: '2d ago' },
  ],
  recommended: [
    { id: 624, species: 'Blue Marlin', vendor: 'Marina Seafoods', price: 620 },
    { id: 619, species: 'Red Snapper', vendor: 'Puerto Azul',     price: 380 },
    { id: 618, species: 'Spanish Mackerel', vendor: 'J. Aquino',  price: 340 },
  ],
}

export default function Home({ setPage }) {
  const h = B_HOME
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Welcome back</div>
          <h1 className="page__title" style={{marginTop: 4}}>Hello, <em>{BUYER_USER.first}</em></h1>
          <p className="page__sub">{BUYER_USER.business} · {h.stats.available} fresh listings near you</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => setPage('bcart')}><I.Cart size={12} /> Cart</button>
          <button className="btn btn--primary" onClick={() => setPage('bbrowse')}><I.Store size={12} /> Browse listings</button>
        </div>
      </div>

      <div className="orders-strip orders-strip--4" style={{marginTop: 18}}>
        <div className="stat"><div className="l">Pending orders</div><div className="v">{h.stats.pending}</div><div className="s">awaiting vendor confirm</div></div>
        <div className="stat"><div className="l">Confirmed</div><div className="v">{h.stats.confirmed}</div><div className="s">prep in progress</div></div>
        <div className="stat"><div className="l">Recent orders</div><div className="v">{h.stats.recent}</div><div className="s">last 30 days</div></div>
        <div className="stat"><div className="l">Listings available</div><div className="v">{h.stats.available}</div><div className="s">within 50km</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Recent orders</div>
            <button className="btn btn--sm" onClick={() => setPage('borders')}>All orders <I.Arrow size={11} /></button>
          </div>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {h.recentOrders.map(o => {
                const st = o.status === 'CONFIRMED' ? 'confirmed' : o.status === 'PENDING' ? 'pending' : 'completed'
                return (
                  <tr key={o.id}>
                    <td><span className="kbd">{o.code}</span></td>
                    <td>{o.vendor}</td>
                    <td>{o.species}</td>
                    <td>{o.qty} kg</td>
                    <td style={{fontFamily: 'var(--font-mono)'}}>₱{o.total.toLocaleString()}</td>
                    <td><span className={`status status--${st}`}><span className="status__dot" /> {o.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Fresh listings</div>
            <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>See all <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.fresh.map(f => (
              <div key={f.id} className="row" style={{gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, alignItems: 'center'}}>
                <div style={{width: 36, height: 36, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12, letterSpacing: '0.5px'}}>{f.tag}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontWeight: 500, fontSize: 13}}>{f.species}</div>
                  <div className="muted-data" style={{fontSize: 11}}>{f.vendor}</div>
                </div>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 13}}>₱{f.price}/kg</span>
                <button className="btn btn--accent btn--sm">Order now</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Recent activity</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.activity.map((a, i) => (
              <div key={i} className="row" style={{gap: 10, padding: '8px 0', borderBottom: i < h.activity.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center'}}>
                <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600}}>{a.who[0]}</div>
                <div style={{flex: 1, fontSize: 13}}><strong>{a.who}</strong> {a.what}</div>
                <span className="muted-data" style={{fontSize: 11}}>{a.when}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card__head"><div className="card__title">Recommended for you</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.recommended.map(r => (
              <div key={r.id} className="row" style={{gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, alignItems: 'center'}}>
                <div style={{flex: 1, fontSize: 13}}>
                  <div style={{fontWeight: 500}}>{r.species}</div>
                  <div className="muted-data" style={{fontSize: 11}}>{r.vendor}</div>
                </div>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 12}}>₱{r.price}/kg</span>
                <button className="btn btn--ghost btn--sm">View</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
