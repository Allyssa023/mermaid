import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_LOTS = [
  { lot: 'LOT-2218', species: 'Yellowfin Tuna',  received: 'Apr 23, 05:40', initial: 60, remaining: 4.2,  cost: 380, low: true  },
  { lot: 'LOT-2214', species: 'Grouper',         received: 'Apr 22, 07:15', initial: 18, remaining: 1.8,  cost: 540, low: true  },
  { lot: 'LOT-2210', species: 'Mahi-mahi',       received: 'Apr 22, 06:20', initial: 30, remaining: 8.1,  cost: 250, low: true  },
  { lot: 'LOT-2207', species: 'Yellowfin Tuna',  received: 'Apr 21, 17:05', initial: 24, remaining: 16.0, cost: 395, low: false },
  { lot: 'LOT-2202', species: 'Skipjack',        received: 'Apr 21, 06:00', initial: 80, remaining: 22.0, cost: 170, low: false },
  { lot: 'LOT-2198', species: 'Squid',           received: 'Apr 20, 18:30', initial: 40, remaining: 28.5, cost: 210, low: false },
]

export default function Inventory() {
  const [thr, setThr] = useState(10)
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inventory</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>lots</em></h1>
          <p className="page__sub">Every batch received, with remaining weight and cost basis.</p>
        </div>
        <button className="btn btn--primary"><I.Plus size={12} /> Receive lot</button>
      </div>
      <div className="row" style={{gap: 12, marginTop: 14, alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}>Low-stock threshold</span>
          <input className="input" style={{width: 80}} type="number" value={thr} onChange={e => setThr(+e.target.value)} />
          <span className="muted-data" style={{fontSize: 12}}>kg</span>
        </div>
        <button className="btn btn--sm"><I.Filter size={12} /> Species</button>
      </div>
      <div className="card" style={{marginTop: 14}}>
        <table className="tbl">
          <thead><tr><th>Lot</th><th>Species</th><th>Received</th><th>Initial</th><th>Remaining</th><th>Cost/kg</th><th></th></tr></thead>
          <tbody>
            {V_LOTS.map(l => {
              const low = l.remaining < thr
              return (
                <tr key={l.lot}>
                  <td><span className="kbd">{l.lot}</span></td>
                  <td><strong>{l.species}</strong></td>
                  <td className="muted-data">{l.received}</td>
                  <td>{l.initial} kg</td>
                  <td>
                    <span style={{fontFamily: 'var(--font-mono)'}}>{l.remaining} kg</span>
                    {low && <span className="chip chip--caution" style={{marginLeft: 6, fontSize: 10}}>Low</span>}
                  </td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.cost}</td>
                  <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">Adjust</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
