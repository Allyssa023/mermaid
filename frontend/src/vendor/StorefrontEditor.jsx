import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_LISTINGS = [
  { id: 412, title: 'Sashimi-grade Yellowfin · whole', species: 'Yellowfin Tuna', price: 540, minQty: 2, status: 'Published', lots: ['LOT-2218', 'LOT-2207'] },
  { id: 411, title: 'Live Grouper · 1.5–3 kg',         species: 'Grouper',        price: 620, minQty: 1, status: 'Published', lots: ['LOT-2214'] },
  { id: 410, title: 'Frozen Skipjack · bulk',          species: 'Skipjack',       price: 220, minQty: 5, status: 'Sold Out',  lots: [] },
  { id: 409, title: 'Mahi-mahi · whole, gilled',       species: 'Mahi-mahi',      price: 340, minQty: 2, status: 'Draft',     lots: ['LOT-2210'] },
  { id: 408, title: 'Reef Snapper · restaurant grade', species: 'Red Snapper',    price: 460, minQty: 1, status: 'Unpublished', lots: [] },
]

const V_LOTS = [
  { lot: 'LOT-2218', species: 'Yellowfin Tuna',  received: 'Apr 23, 05:40', initial: 60, remaining: 4.2,  cost: 380, low: true  },
  { lot: 'LOT-2214', species: 'Grouper',         received: 'Apr 22, 07:15', initial: 18, remaining: 1.8,  cost: 540, low: true  },
  { lot: 'LOT-2210', species: 'Mahi-mahi',       received: 'Apr 22, 06:20', initial: 30, remaining: 8.1,  cost: 250, low: true  },
  { lot: 'LOT-2207', species: 'Yellowfin Tuna',  received: 'Apr 21, 17:05', initial: 24, remaining: 16.0, cost: 395, low: false },
  { lot: 'LOT-2202', species: 'Skipjack',        received: 'Apr 21, 06:00', initial: 80, remaining: 22.0, cost: 170, low: false },
  { lot: 'LOT-2198', species: 'Squid',           received: 'Apr 20, 18:30', initial: 40, remaining: 28.5, cost: 210, low: false },
]

export default function StorefrontEditor() {
  const [modal, setModal] = useState(null)
  const statusChip = { Published: 'safe', 'Sold Out': 'unsafe', Draft: 'caution', Unpublished: '' }
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Storefront</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>listings</em></h1>
          <p className="page__sub">What buyers see in your shop. Pull from inventory lots.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({ id: null })}><I.Plus size={12} /> New listing</button>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <table className="tbl">
          <thead><tr><th>Title</th><th>Species</th><th>Price/kg</th><th>Min qty</th><th>Lots</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {V_LISTINGS.map(l => (
              <tr key={l.id}>
                <td><strong>{l.title}</strong></td>
                <td className="muted-data">{l.species}</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.price}</td>
                <td className="muted-data">{l.minQty} kg</td>
                <td>{l.lots.length ? l.lots.map(x => <span key={x} className="kbd" style={{marginRight: 4}}>{x}</span>) : <span className="muted-data">—</span>}</td>
                <td><span className={`chip ${statusChip[l.status] ? `chip--${statusChip[l.status]}` : ''}`}>{l.status}</span></td>
                <td style={{textAlign: 'right'}}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setModal(l)}><I.Edit size={11} /> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">{modal.id ? 'Edit listing' : 'New listing'}</div>
                <h2 className="modal__title">{modal.title || 'Untitled listing'}</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setModal(null)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Title</label><input className="input" defaultValue={modal.title || ''} /></div>
              <div className="form-row"><label>Species</label><input className="input" defaultValue={modal.species || ''} /></div>
              <div className="form-row"><label>Price per kg</label><input className="input" defaultValue={modal.price || ''} /></div>
              <div className="form-row"><label>Minimum quantity</label><input className="input" defaultValue={modal.minQty || ''} /></div>
              <div className="form-row"><label>Status</label><input className="input" defaultValue={modal.status || 'Draft'} /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Pull from lots</label>
                <div className="row" style={{gap: 6, flexWrap: 'wrap', padding: '6px 0'}}>
                  {V_LOTS.map(l => {
                    const on = (modal.lots || []).includes(l.lot)
                    return <span key={l.lot} className={`chip ${on ? 'chip--accent' : ''}`} style={{cursor: 'pointer'}}>{l.lot} <span className="muted-data" style={{marginLeft: 4}}>{l.remaining}kg</span></span>
                  })}
                </div>
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setModal(null)}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
