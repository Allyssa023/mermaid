import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const BUYER_FAVORITES = [
  { id: 210, name: 'Marina Seafoods', port: 'Pinagbayanan · Quezon', rating: 4.8, trades: 184, lastBought: '2 days ago' },
  { id: 213, name: 'Puerto Azul Resto', port: 'Anilao · Batangas', rating: 4.9, trades: 31, lastBought: '5 days ago' },
  { id: 214, name: 'Del Mar Cold Chain', port: 'Batangas Port', rating: 4.7, trades: 215, lastBought: '9 days ago' },
]

const BUYER_ACTIVITY = [
  { ts: '12 min ago', who: 'Marina Seafoods',  what: 'confirmed your order ORD-8412 (6kg Mahi-mahi)', type: 'order' },
  { ts: '2 hr ago',   who: 'Bay City Market',  what: 'replied to your message about Grouper availability', type: 'message' },
  { ts: '4 hr ago',   who: 'Marina Seafoods',  what: 'posted new listing — Yellowfin Tuna ₱400/kg × 60kg', type: 'listing' },
  { ts: 'Yesterday',  who: 'You',              what: 'placed order ORD-8409 — Lapu-lapu 3kg × ₱560', type: 'order' },
  { ts: 'Yesterday',  who: 'Del Mar',          what: 'completed delivery for ORD-8387 · ₱1,744', type: 'order' },
]

export default function Favorites({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Network</div>
          <h1 className="page__title" style={{marginTop: 4}}>Saved <em>Vendors</em></h1>
          <p className="page__sub">{BUYER_FAVORITES.length} vendors you trust. Quick access to their listings and message threads.</p>
        </div>
      </div>

      <div className="vendor-grid" style={{marginTop: 18}}>
        {BUYER_FAVORITES.map(v => (
          <div key={v.id} className="vendor-card">
            <div className="vendor-card__head">
              <div className="vendor-card__avatar">{v.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
              <button className="btn btn--ghost btn--sm"><I.Star size={12} /></button>
            </div>
            <h3 className="vendor-card__name">{v.name}</h3>
            <div className="muted-data" style={{marginBottom: 12}}><I.MapPin size={11} /> {v.port}</div>
            <div className="vendor-card__stats">
              <div><div className="l">Rating</div><div className="v">★ {v.rating}</div></div>
              <div><div className="l">Trades</div><div className="v">{v.trades}</div></div>
              <div><div className="l">Last buy</div><div className="v" style={{fontSize: 13}}>{v.lastBought}</div></div>
            </div>
            <div className="vendor-card__foot">
              <button className="btn btn--ghost btn--sm" style={{flex: 1}}>Message</button>
              <button className="btn btn--accent btn--sm" style={{flex: 1}} onClick={() => setPage('bbrowse')}>View listings</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="card__title">Activity from saved vendors</div>
        </div>
        <ul className="activity">
          {BUYER_ACTIVITY.map((a, i) => (
            <li key={i} className="activity__item">
              <span className={`activity__dot activity__dot--${a.type}`} />
              <div className="activity__body">
                <div className="activity__line"><strong>{a.who}</strong> <span>{a.what}</span></div>
                <div className="activity__time">{a.ts}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
