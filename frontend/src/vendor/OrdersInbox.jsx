import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const ORDERS = [
  { id: 'ORD-8412', party: 'Casa Mendez Kitchen', partySub: 'Repeat buyer', species: 'Mahi-mahi',      qty: 6,  price: 260, total: 1560, step: 1, status: 'CONFIRMED', date: 'Apr 23' },
  { id: 'ORD-8409', party: 'Bay City Seafood',    partySub: 'First order',  species: 'Grouper',        qty: 3,  price: 560, total: 1680, step: 0, status: 'PENDING',   date: 'Apr 23' },
  { id: 'ORD-8401', party: 'Hotel Sorrento',      partySub: 'Repeat buyer', species: 'Yellowfin Tuna', qty: 12, price: 380, total: 4560, step: 2, status: 'CONFIRMED', date: 'Apr 22' },
  { id: 'ORD-8398', party: 'Puerto Azul Resto',   partySub: '',             species: 'Red Snapper',    qty: 4,  price: 380, total: 1520, step: 3, status: 'COMPLETED', date: 'Apr 19' },
  { id: 'ORD-8387', party: 'Del Mar Bistro',      partySub: '',             species: 'Squid',          qty: 8,  price: 218, total: 1744, step: 3, status: 'COMPLETED', date: 'Apr 18' },
  { id: 'ORD-8375', party: 'Hotel Sorrento',      partySub: 'Repeat buyer', species: 'Yellowfin Tuna', qty: 12, price: 380, total: 4560, step: 3, status: 'COMPLETED', date: 'Apr 17' },
  { id: 'ORD-8361', party: 'Anilao Beach Resort', partySub: '',             species: 'Mahi-mahi',      qty: 8,  price: 265, total: 2120, step: -1, status: 'CANCELLED', date: 'Apr 15' },
]

export default function OrdersInbox() {
  const [statusFilter, setStatusFilter] = useState('all')
  const pending   = ORDERS.filter(o => o.status === 'PENDING').length
  const confirmed = ORDERS.filter(o => o.status === 'CONFIRMED').length
  const inTransit = ORDERS.filter(o => o.step === 2).length
  const completed = ORDERS.filter(o => o.status === 'COMPLETED').length
  const totalValue = ORDERS.filter(o => !['CANCELLED', 'DISPUTED'].includes(o.status)).reduce((a, o) => a + o.total, 0)

  const filtered = statusFilter === 'all' ? ORDERS : ORDERS.filter(o => o.status === statusFilter)

  const stepLabel = (s) => ['Awaiting', 'Confirmed', 'In transit', 'Delivered'][s] || 'Issue'

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            <em>Orders</em>
          </h1>
          <p className="page__sub">Track every confirmed sale from matched alert to delivery.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Receipt size={14} /> Export</button>
          <button className="btn btn--primary"><I.Plus size={14} /> New order</button>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Pending</div><div className="v">{pending}</div><div className="s">Awaiting buyer confirm</div></div>
        <div className="stat"><div className="l">Confirmed</div><div className="v">{confirmed}</div><div className="s">Ready for pickup</div></div>
        <div className="stat"><div className="l">In transit</div><div className="v">{inTransit}</div><div className="s">En route to buyer</div></div>
        <div className="stat"><div className="l">Completed this week</div><div className="v">{completed}</div><div className="s">Last 7 days</div></div>
        <div className="stat"><div className="l">Open value</div><div className="v">₱{(totalValue/1000).toFixed(1)}k</div><div className="s">Across {ORDERS.length} orders</div></div>
      </div>

      <div className="pipeline">
        <div className="card__head" style={{marginBottom: 0}}>
          <div>
            <div className="card__title">Pipeline this week</div>
            <div className="card__sub">Distribution of open orders across stages</div>
          </div>
          <span className="chip chip--ink">₱{(totalValue/1000).toFixed(1)}k open</span>
        </div>
        <div className="pipeline__bars">
          <div className="pipeline__bar" style={{ flex: pending }} />
          <div className="pipeline__bar" style={{ flex: confirmed }} />
          <div className="pipeline__bar" style={{ flex: inTransit }} />
          <div className="pipeline__bar" style={{ flex: completed }} />
        </div>
        <div className="pipeline__labels">
          <span><strong>{pending}</strong> Awaiting</span>
          <span><strong>{confirmed}</strong> Confirmed</span>
          <span><strong>{inTransit}</strong> In transit</span>
          <span><strong>{completed}</strong> Delivered</span>
        </div>
      </div>

      <div className="row" style={{gap: 6, marginBottom: 12}}>
        {['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'DISPUTED', 'CANCELLED'].map(s => (
          <button key={s}
            className={`chip ${statusFilter === s ? 'chip--ink' : ''}`}
            style={{cursor: 'pointer', textTransform: s === 'all' ? 'capitalize' : 'none'}}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All orders' : s.charAt(0) + s.slice(1).toLowerCase()}
            <span style={{marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10}}>
              {s === 'all' ? ORDERS.length : ORDERS.filter(o => o.status === s).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        <div style={{padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div className="card__title">All orders</div>
            <div className="card__sub">{filtered.length} matching · sorted newest first</div>
          </div>
          <button className="btn btn--sm btn--ghost">Sort: Date <I.ChevD size={12} /></button>
        </div>
        {filtered.map(o => {
          const failed = o.step === -1
          return (
            <div key={o.id} className="order-row">
              <div className="order-row__id">{o.id}</div>
              <div className="order-row__party">
                {o.party}
                <small>{o.partySub}</small>
              </div>
              <div>
                <div style={{fontSize: 13, fontWeight: 500}}>{o.species}</div>
                <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2}}>
                  {o.qty}kg · ₱{o.price}/kg
                </div>
              </div>
              <div className="order-row__total">₱{o.total.toLocaleString()}</div>
              <div>
                <div className="order-row__steps">
                  {[0,1,2,3].map(i => (
                    <span key={i} className={`order-row__step ${
                      failed ? 'order-row__step--fail' :
                      i < o.step ? 'order-row__step--done' :
                      i === o.step ? 'order-row__step--cur' : ''
                    }`} />
                  ))}
                </div>
                <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                  {failed ? o.status : stepLabel(o.step)}
                </div>
              </div>
              <div style={{fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)'}}>
                {o.date}
              </div>
              <button className="btn btn--sm">Open <I.Arrow size={11} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
