import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_WATCHLIST = [
  { id: 1, species: 'Yellowfin Tuna', location: 'Verde Passage', radius: 25 },
  { id: 2, species: 'Grouper',        location: 'Anilao Landing', radius: 15 },
  { id: 3, species: 'Skipjack',       location: 'Lucena Port',    radius: 30 },
]

export default function Watchlist() {
  const [open, setOpen] = useState(false)
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Sourcing</div>
          <h1 className="page__title" style={{marginTop: 4}}>Catch <em>watchlist</em></h1>
          <p className="page__sub">We'll notify you when a matching catch alert is posted near you.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setOpen(true)}><I.Plus size={12} /> Add subscription</button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 18}}>
        {V_WATCHLIST.map(s => (
          <div key={s.id} className="card">
            <div className="card__head">
              <div>
                <div className="card__title" style={{fontSize: 17}}>{s.species}</div>
                <div className="card__sub"><I.MapPin size={11} /> {s.location}</div>
              </div>
              <button className="btn btn--ghost btn--sm"><I.Trash size={11} /></button>
            </div>
            <div className="muted-data" style={{fontSize: 12, marginTop: -6}}>Radius: <strong style={{color: 'var(--ink)'}}>{s.radius} km</strong></div>
            <div className="row" style={{gap: 8, marginTop: 14}}>
              <button className="btn btn--ghost btn--sm" style={{flex: 1}}>Edit</button>
              <button className="btn btn--accent btn--sm" style={{flex: 1}}>View matches</button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 460}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Watchlist</div>
                <h2 className="modal__title">Add subscription</h2>
                <p className="modal__sub">Get notified when matching catch is posted.</p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Species</label><input className="input" placeholder="Yellowfin Tuna" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Market location</label><input className="input" placeholder="Verde Passage" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Radius (km)</label><input className="input" placeholder="25" /></div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setOpen(false)}>Subscribe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
