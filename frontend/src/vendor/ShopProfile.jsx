import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const DAYS = [
  { k: 'mon', label: 'Mon' },
  { k: 'tue', label: 'Tue' },
  { k: 'wed', label: 'Wed' },
  { k: 'thu', label: 'Thu' },
  { k: 'fri', label: 'Fri' },
  { k: 'sat', label: 'Sat' },
  { k: 'sun', label: 'Sun' },
]

export default function ShopProfile() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Shop</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>public shop</em></h1>
          <p className="page__sub">This is what buyers see at <span style={{fontFamily: 'var(--font-mono)', color: 'var(--accent)'}}>mermaid.ph/shop/marina-seafoods</span></p>
        </div>
        <div className="row" style={{gap: 8}}>
          <button className="btn"><I.Eye size={12} /> Preview</button>
          <button className="btn btn--primary"><I.Check size={12} /> Save changes</button>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Basic info</div></div>
          <div className="form-grid">
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Display name</label><input className="input" defaultValue="Marina Seafoods" /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Public slug</label><input className="input" defaultValue="marina-seafoods" /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Bio</label><textarea className="input" rows="3" defaultValue="Family-run seafood wholesaler serving Quezon since 1998. Sashimi-grade tuna and live grouper our specialty."></textarea></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Pickup location</label><input className="input" defaultValue="Pinagbayanan Depot, Quezon" /></div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <div className="card">
            <div className="card__head"><div className="card__title">Media</div></div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Logo URL</label><input className="input" defaultValue="https://cdn.mermaid.ph/v/210/logo.jpg" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Banner URL</label><input className="input" defaultValue="https://cdn.mermaid.ph/v/210/banner.jpg" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card__head"><div className="card__title">Business hours</div></div>
            <div style={{display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'center', fontSize: 12}}>
              {DAYS.map(d => (
                <div key={d.k} style={{display: 'contents'}}>
                  <strong>{d.label}</strong>
                  <input className="input" defaultValue="06:00" />
                  <input className="input" defaultValue="18:00" />
                  <label style={{display: 'flex', alignItems: 'center', gap: 4}}><input type="checkbox" /> closed</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
