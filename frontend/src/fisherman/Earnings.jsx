import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

// ── Inline mock data ─────────────────────────────────────────────────────────

const FISHERMAN_EARNINGS = {
  range: 'Last 30 days',
  totalGross: 184320,
  cashCollected: 142500,
  outstandingUtang: 41820,
  ordersCount: 28,
  ledger: [
    { id: 9008, date: 'Apr 23', code: 'VO-9008', species: 'Grouper',          qty: 4,  gross: 2160,  payment: 'UTANG' },
    { id: 9001, date: 'Apr 22', code: 'VO-9001', species: 'Skipjack',         qty: 32, gross: 5440,  payment: 'CASH' },
    { id: 8987, date: 'Apr 20', code: 'VO-8987', species: 'Spanish Mackerel', qty: 14, gross: 4480,  payment: 'CASH' },
    { id: 8980, date: 'Apr 19', code: 'VO-8980', species: 'Yellowfin Tuna',   qty: 21, gross: 7980,  payment: 'CASH' },
    { id: 8975, date: 'Apr 19', code: 'VO-8975', species: 'Squid',            qty: 22, gross: 4620,  payment: 'UTANG' },
    { id: 8961, date: 'Apr 17', code: 'VO-8961', species: 'Skipjack',         qty: 40, gross: 6800,  payment: 'CASH' },
    { id: 8954, date: 'Apr 16', code: 'VO-8954', species: 'Mahi-mahi',        qty: 8,  gross: 2080,  payment: 'UTANG' },
  ],
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const e = FISHERMAN_EARNINGS
  const [range, setRange] = useState('30')
  const ranges = [{ id: '7', label: '7d' }, { id: '30', label: '30d' }, { id: '90', label: '90d' }, { id: '365', label: '1y' }]

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Money</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>earnings</em></h1>
          <p className="page__sub">Track every kilo sold and what's still on utang.</p>
        </div>
        <div className="seg" style={{alignSelf: 'flex-end'}}>
          {ranges.map(r => (
            <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid--kpi" style={{marginTop: 18}}>
        <div className="kpi"><div className="kpi__label">Total gross</div><div className="kpi__value">₱{(e.totalGross/1000).toFixed(1)}k</div><div className="kpi__foot">{e.range}</div></div>
        <div className="kpi"><div className="kpi__label">Cash collected</div><div className="kpi__value" style={{color: 'var(--safe)'}}>₱{(e.cashCollected/1000).toFixed(1)}k</div><div className="kpi__foot">{Math.round(e.cashCollected/e.totalGross*100)}% of gross</div></div>
        <div className="kpi"><div className="kpi__label">Outstanding utang</div><div className="kpi__value" style={{color: 'var(--caution)'}}>₱{(e.outstandingUtang/1000).toFixed(1)}k</div><div className="kpi__foot">across 6 vendors</div></div>
        <div className="kpi"><div className="kpi__label">Orders</div><div className="kpi__value">{e.ordersCount}</div><div className="kpi__foot">{Math.round(e.totalGross/e.ordersCount).toLocaleString()} avg</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="card__title">Order ledger</div>
          <div className="row" style={{gap: 8}}>
            <button className="btn btn--sm"><I.Filter size={12} /> Payment</button>
            <button className="btn btn--sm"><I.Filter size={12} /> Species</button>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Date</th><th>Species</th><th>Qty</th><th>Gross</th><th>Payment</th><th></th></tr></thead>
          <tbody>
            {e.ledger.map(r => (
              <tr key={r.id}>
                <td><span className="kbd">{r.code}</span></td>
                <td className="muted-data">{r.date}</td>
                <td>{r.species}</td>
                <td>{r.qty} kg</td>
                <td><span className="data" style={{fontFamily: 'var(--font-mono)'}}>₱{r.gross.toLocaleString()}</span></td>
                <td><span className={`chip ${r.payment === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>{r.payment}</span></td>
                <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
