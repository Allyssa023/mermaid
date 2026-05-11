import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_PAYOUTS = {
  pending: 38420,
  paid: 412800,
  ledger: [
    { id: 8412, code: 'ORD-8412', date: 'Apr 23', buyer: 'Casa Mendez',     species: 'Mahi-mahi', qty: 6,  gross: 1560, status: 'Pending' },
    { id: 8409, code: 'ORD-8409', date: 'Apr 23', buyer: 'Bay City',        species: 'Grouper',   qty: 3,  gross: 1680, status: 'Pending' },
    { id: 8398, code: 'ORD-8398', date: 'Apr 19', buyer: 'Puerto Azul',     species: 'Snapper',   qty: 4,  gross: 1520, status: 'Paid'    },
    { id: 8387, code: 'ORD-8387', date: 'Apr 18', buyer: 'Del Mar',         species: 'Squid',     qty: 8,  gross: 1744, status: 'Paid'    },
    { id: 8375, code: 'ORD-8375', date: 'Apr 17', buyer: 'Hotel Sorrento',  species: 'Yellowfin', qty: 12, gross: 4560, status: 'Paid'    },
  ],
}

export default function Payouts() {
  const p = V_PAYOUTS
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Money</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>payouts</em></h1>
          <p className="page__sub">What's owed to you and what's already been settled.</p>
        </div>
      </div>
      <div className="grid grid--kpi" style={{marginTop: 18, gridTemplateColumns: '1fr 1fr'}}>
        <div className="kpi" style={{padding: 22}}>
          <div className="kpi__label">Pending payout</div>
          <div className="kpi__value" style={{color: 'var(--caution)', fontSize: 38}}>₱{p.pending.toLocaleString()}</div>
          <div className="kpi__foot">2 orders awaiting handoff</div>
        </div>
        <div className="kpi" style={{padding: 22}}>
          <div className="kpi__label">Total paid out</div>
          <div className="kpi__value" style={{color: 'var(--safe)', fontSize: 38}}>₱{p.paid.toLocaleString()}</div>
          <div className="kpi__foot">lifetime · 142 orders</div>
        </div>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <div className="card__head"><div className="card__title">Settlement ledger</div></div>
        <table className="tbl">
          <thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Species</th><th>Qty</th><th>Gross</th><th>Status</th></tr></thead>
          <tbody>
            {p.ledger.map(r => (
              <tr key={r.id}>
                <td><span className="kbd">{r.code}</span></td>
                <td className="muted-data">{r.date}</td>
                <td>{r.buyer}</td>
                <td>{r.species}</td>
                <td>{r.qty} kg</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{r.gross.toLocaleString()}</td>
                <td><span className={`chip ${r.status === 'Paid' ? 'chip--safe' : 'chip--caution'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
