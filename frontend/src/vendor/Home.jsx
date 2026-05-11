import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const VENDOR_USER = {
  id: 210,
  fullName: 'Inez Marina',
  first: 'Inez',
  email: 'inez@marinaseafoods.ph',
  role: 'VENDOR',
  business: 'Marina Seafoods',
  taxId: 'BIR-4421-MS',
  port: 'Pinagbayanan · Quezon',
}

const V_HOME = {
  todayRevenue: 24800,
  openOrders: 9,
  unread: 4,
  bucket: { new: 3, preparing: 4, ready: 2 },
  lowStock: [
    { lot: 'LOT-2218', species: 'Yellowfin Tuna', remaining: 4.2, threshold: 10 },
    { lot: 'LOT-2214', species: 'Grouper',        remaining: 1.8, threshold: 5 },
    { lot: 'LOT-2210', species: 'Mahi-mahi',      remaining: 8.1, threshold: 12 },
  ],
  matchedAlerts: [
    { id: 841, species: 'Yellowfin Tuna', fisher: 'Ramiro Delgado', qty: 42, when: 'Today · 4h ago', tag: 'YT' },
    { id: 833, species: 'Skipjack',       fisher: 'Tomas Reyes',    qty: 56, when: 'Today · 6h ago', tag: 'SK' },
    { id: 839, species: 'Grouper',        fisher: 'Ramiro Delgado', qty: 3.2, when: 'Today · 1h ago', tag: 'LL' },
    { id: 831, species: 'Mahi-mahi',      fisher: 'Helena Cruz',    qty: 16, when: 'Today · 8h ago', tag: 'MM' },
  ],
}

export default function Home({ setPage }) {
  const h = V_HOME
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · today</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{VENDOR_USER.first}</em></h1>
          <p className="page__sub">{VENDOR_USER.business} · Pinagbayanan Depot</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Plus size={12} /> New listing</button>
          <button className="btn btn--primary" onClick={() => setPage('vprocurement')}><I.Fish size={12} /> Browse catch</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{marginTop: 18}}>
        <div className="kpi"><div className="kpi__label">Today's revenue</div><div className="kpi__value">₱{(h.todayRevenue/1000).toFixed(1)}k</div><div className="kpi__foot">vs ₱18.4k yesterday</div></div>
        <div className="kpi"><div className="kpi__label">Open orders</div><div className="kpi__value">{h.openOrders}</div><div className="kpi__foot">{h.bucket.new} new · {h.bucket.preparing} prep · {h.bucket.ready} ready</div></div>
        <div className="kpi"><div className="kpi__label">Unread</div><div className="kpi__value">{h.unread}</div><div className="kpi__foot">messages + notices</div></div>
        <div className="kpi"><div className="kpi__label">Avg rating</div><div className="kpi__value">4.7<small style={{color: 'oklch(0.65 0.15 80)'}}>★</small></div><div className="kpi__foot">94 reviews</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Open orders</div>
              <div className="card__sub">{h.openOrders} need action</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vorders')}>All orders <I.Arrow size={11} /></button>
          </div>
          <div className="row" style={{gap: 8, flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--accent)'}}>New</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.bucket.new}</div>
              <div className="muted-data" style={{fontSize: 11}}>Awaiting confirm</div>
            </div>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--caution)'}}>Preparing</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.bucket.preparing}</div>
              <div className="muted-data" style={{fontSize: 11}}>In kitchen / packing</div>
            </div>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--safe-soft)', border: '1px solid var(--safe)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--safe)'}}>Ready</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.bucket.ready}</div>
              <div className="muted-data" style={{fontSize: 11}}>For pickup/handoff</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Low stock</div>
              <div className="card__sub">{h.lowStock.length} lots near threshold</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vinventory')}>Inventory <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.lowStock.map(l => (
              <div key={l.lot} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--paper-2)', borderRadius: 6}}>
                <span className="kbd">{l.lot}</span>
                <span style={{flex: 1, fontSize: 13}}>{l.species}</span>
                <span className="chip chip--caution" style={{fontSize: 10}}>{l.remaining} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">Recent matched catch alerts</div>
            <div className="card__sub">Based on your watchlist</div>
          </div>
          <button className="btn btn--sm" onClick={() => setPage('vprocurement')}>Browse all <I.Arrow size={11} /></button>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10}}>
          {h.matchedAlerts.map(a => (
            <div key={a.id} className="alert-card" style={{padding: 14}}>
              <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                <span className="kbd">CA-{a.id}</span>
                <span className="chip chip--accent" style={{fontSize: 10}}>match</span>
              </div>
              <div className="alert-card__species" style={{fontSize: 16}}>{a.species}</div>
              <div className="alert-card__sub">{a.fisher}</div>
              <div className="row" style={{marginTop: 10, justifyContent: 'space-between', alignItems: 'baseline'}}>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 14}}>{a.qty}<small> kg</small></span>
                <span className="muted-data" style={{fontSize: 11}}>{a.when}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
