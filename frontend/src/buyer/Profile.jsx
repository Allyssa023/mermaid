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

export default function Profile({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>profile</em></h1>
        </div>
      </div>
      <div className="orders-strip orders-strip--4" style={{marginTop: 18}}>
        <div className="stat"><div className="l">Member since</div><div className="v" style={{fontSize: 26}}>Jan 2024</div><div className="s">1y 3mo</div></div>
        <div className="stat"><div className="l">Total orders</div><div className="v">42</div><div className="s">across 8 vendors</div></div>
        <div className="stat"><div className="l">Saved vendors</div><div className="v">6</div></div>
        <div className="stat"><div className="l">Saved listings</div><div className="v">11</div></div>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <div className="row" style={{gap: 20, alignItems: 'flex-start'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
            <div style={{width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 600}}>SM</div>
            <button className="btn btn--ghost btn--sm"><I.Camera size={11} /> Upload</button>
          </div>
          <div style={{flex: 1}}>
            <div className="form-grid">
              <div className="form-row"><label>Full name</label><input className="input" defaultValue={BUYER_USER.fullName} /></div>
              <div className="form-row"><label>Display name</label><input className="input" defaultValue="Sofia M." /></div>
              <div className="form-row"><label>Email</label><input className="input" defaultValue={BUYER_USER.email} disabled /></div>
              <div className="form-row"><label>Phone</label><input className="input" defaultValue="+63 917 555 0042" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Business name</label><input className="input" defaultValue={BUYER_USER.business} /></div>
            </div>
            <div className="row" style={{gap: 8, marginTop: 14, justifyContent: 'flex-end'}}>
              <button className="btn">Cancel</button>
              <button className="btn btn--primary">Save profile</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
