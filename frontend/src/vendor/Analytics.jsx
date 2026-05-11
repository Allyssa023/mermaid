import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_ANALYTICS = {
  totalOrders: 142,
  revenue: 487600,
  volumeKg: 1820,
  aov: 3434,
  uniqueBuyers: 38,
  bySpecies: [
    { species: 'Yellowfin Tuna', revenue: 184200 },
    { species: 'Grouper',        revenue: 112800 },
    { species: 'Mahi-mahi',      revenue: 76400 },
    { species: 'Skipjack',       revenue: 58200 },
    { species: 'Squid',          revenue: 36400 },
    { species: 'Red Snapper',    revenue: 19600 },
  ],
  procurement: [
    { species: 'Yellowfin Tuna', spend: 78400 },
    { species: 'Skipjack',       spend: 42000 },
    { species: 'Grouper',        spend: 38600 },
    { species: 'Mahi-mahi',      spend: 24500 },
    { species: 'Squid',          spend: 18900 },
  ],
  repeatBuyers: [
    { name: 'Casa Mendez Kitchen', orders: 18, total: 84200 },
    { name: 'Hotel Sorrento',      orders: 14, total: 61400 },
    { name: 'Anilao Beach Resort', orders: 11, total: 48600 },
    { name: 'Puerto Azul Resto',   orders: 9,  total: 32100 },
  ],
}

function BarRow({ label, value, max, color = 'var(--accent)' }) {
  const pct = Math.round(value / max * 100)
  return (
    <div style={{display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: 12, alignItems: 'center', fontSize: 13}}>
      <span>{label}</span>
      <div style={{height: 22, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${pct}%`, background: color, borderRadius: 4}} />
      </div>
      <span style={{fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right'}}>₱{value.toLocaleString()}</span>
    </div>
  )
}

export default function Analytics() {
  const a = V_ANALYTICS
  const revMax = Math.max(...a.bySpecies.map(s => s.revenue))
  const procMax = Math.max(...a.procurement.map(s => s.spend))
  const [range, setRange] = useState('30')
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Analytics</div>
          <h1 className="page__title" style={{marginTop: 4}}>How your shop is <em>performing</em></h1>
          <p className="page__sub">Revenue, volume, and repeat-buyer signal.</p>
        </div>
        <div className="seg" style={{alignSelf: 'flex-end'}}>
          {['7', '30', '90', '365'].map(r => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === '365' ? '1y' : r + 'd'}</button>)}
        </div>
      </div>

      <div className="orders-strip orders-strip--4" style={{marginTop: 18, gridTemplateColumns: 'repeat(5, 1fr)'}}>
        <div className="stat"><div className="l">Total orders</div><div className="v">{a.totalOrders}</div><div className="s">across {a.uniqueBuyers} buyers</div></div>
        <div className="stat"><div className="l">Revenue</div><div className="v">₱{(a.revenue/1000).toFixed(0)}k</div><div className="s">last 30d</div></div>
        <div className="stat"><div className="l">Volume</div><div className="v">{a.volumeKg}<small>kg</small></div><div className="s">sold</div></div>
        <div className="stat"><div className="l">AOV</div><div className="v">₱{a.aov.toLocaleString()}</div><div className="s">avg order value</div></div>
        <div className="stat"><div className="l">Unique buyers</div><div className="v">{a.uniqueBuyers}</div><div className="s">62% repeat</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Revenue by species</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {a.bySpecies.map(s => <BarRow key={s.species} label={s.species} value={s.revenue} max={revMax} />)}
          </div>
        </div>
        <div className="card">
          <div className="card__head"><div className="card__title">Procurement spend</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {a.procurement.map(s => <BarRow key={s.species} label={s.species} value={s.spend} max={procMax} color="oklch(0.65 0.12 220)" />)}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head"><div className="card__title">Repeat buyers</div><div className="card__sub">Top customers by order count</div></div>
        <table className="tbl">
          <thead><tr><th>Buyer</th><th>Orders</th><th>Total spent</th><th></th></tr></thead>
          <tbody>
            {a.repeatBuyers.map(b => (
              <tr key={b.name}>
                <td><strong>{b.name}</strong></td>
                <td>{b.orders}</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{b.total.toLocaleString()}</td>
                <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">View orders</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
