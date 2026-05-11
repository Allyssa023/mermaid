import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const BUYER_ORDERS = [
  { id: 8412, orderCode: 'ORD-8412', listingCode: 'L-609',
    vendorName: 'Marina Seafoods',
    species: 'Mahi-mahi',
    qtyKg: 6, pricePerKg: 260, total: 1560,
    dispatchMode: 'PICKUP',
    status: 'CONFIRMED',
    placedAt: '2026-04-23', readyBy: 'Apr 24, 10:00',
    handoff: null, payment: null },
  { id: 8409, orderCode: 'ORD-8409', listingCode: 'L-615',
    vendorName: 'Bay City Market',
    species: 'Grouper (Lapu-lapu)',
    qtyKg: 3, pricePerKg: 560, total: 1680,
    dispatchMode: 'DELIVERY',
    status: 'PENDING',
    placedAt: '2026-04-23', readyBy: 'Apr 25, 14:00',
    handoff: null, payment: null },
  { id: 8398, orderCode: 'ORD-8398', listingCode: 'L-619',
    vendorName: 'Puerto Azul Resto',
    species: 'Red Snapper',
    qtyKg: 4, pricePerKg: 380, total: 1520,
    dispatchMode: 'PICKUP',
    status: 'COMPLETED',
    placedAt: '2026-04-19', readyBy: 'Apr 20, 09:00',
    handoff: { confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 1520, method: 'GCASH', status: 'CONFIRMED' } },
  { id: 8387, orderCode: 'ORD-8387', listingCode: 'L-622',
    vendorName: 'Del Mar Cold Chain',
    species: 'Squid (Pusit)',
    qtyKg: 8, pricePerKg: 218, total: 1744,
    dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    placedAt: '2026-04-15', readyBy: 'Apr 17, 11:00',
    handoff: { confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 1744, method: 'BANK_TRANSFER', status: 'CONFIRMED' } },
  { id: 8378, orderCode: 'ORD-8378', listingCode: 'L-611',
    vendorName: 'Marina Seafoods',
    species: 'Skipjack',
    qtyKg: 12, pricePerKg: 175, total: 2100,
    dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    placedAt: '2026-04-12', readyBy: 'Apr 13, 16:00',
    handoff: { confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 2100, method: 'CASH', status: 'CONFIRMED' } },
  { id: 8366, orderCode: 'ORD-8366', listingCode: 'L-612',
    vendorName: 'Marina Seafoods',
    species: 'Yellowfin Tuna',
    qtyKg: 5, pricePerKg: 395, total: 1975,
    dispatchMode: 'PICKUP',
    status: 'CANCELLED',
    placedAt: '2026-04-08', readyBy: 'Apr 09, 09:00',
    handoff: null, payment: null,
    cancelReason: 'Buyer cancelled — schedule conflict.' },
]

export default function Orders({ setPage }) {
  const [tab, setTab] = useState('active')
  const filtered = BUYER_ORDERS.filter(o =>
    tab === 'active'    ? ['PENDING','CONFIRMED'].includes(o.status) :
    tab === 'completed' ? o.status === 'COMPLETED' :
                          o.status === 'CANCELLED'
  )
  const totals = {
    active: BUYER_ORDERS.filter(o => ['PENDING','CONFIRMED'].includes(o.status)).length,
    completed: BUYER_ORDERS.filter(o => o.status === 'COMPLETED').length,
    cancelled: BUYER_ORDERS.filter(o => o.status === 'CANCELLED').length,
  }
  const totalSpent = BUYER_ORDERS.filter(o => o.status === 'COMPLETED').reduce((a,o) => a+o.total, 0)
  const totalKg = BUYER_ORDERS.filter(o => o.status === 'COMPLETED').reduce((a,o) => a+o.qtyKg, 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchases</div>
          <h1 className="page__title" style={{marginTop: 4}}>My <em>Orders</em></h1>
          <p className="page__sub">{BUYER_ORDERS.length} total orders · ₱{totalSpent.toLocaleString()} spent on {totalKg}kg of fish.</p>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Active orders</div><div className="v">{totals.active}</div><div className="s">{BUYER_ORDERS.filter(o=>o.status==='PENDING').length} awaiting confirmation</div></div>
        <div className="stat"><div className="l">Completed</div><div className="v">{totals.completed}</div><div className="s">All time</div></div>
        <div className="stat"><div className="l">Total spent</div><div className="v">₱{(totalSpent/1000).toFixed(1)}<small>k</small></div><div className="s">Lifetime value</div></div>
        <div className="stat"><div className="l">Total received</div><div className="v">{totalKg}<small>kg</small></div><div className="s">Across {totals.completed} orders</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({totals.active})</button>
            <button className={tab==='completed'?'on':''} onClick={()=>setTab('completed')}>Completed ({totals.completed})</button>
            <button className={tab==='cancelled'?'on':''} onClick={()=>setTab('cancelled')}>Cancelled ({totals.cancelled})</button>
          </div>
        </div>

        <div className="orders-list">
          {filtered.map(o => (
            <div key={o.id} className="order-row">
              <div className="order-row__head">
                <div>
                  <div className="row" style={{gap: 8, alignItems: 'baseline'}}>
                    <span className="kbd">{o.orderCode}</span>
                    <strong>{o.species}</strong>
                    <span className="muted-data">· from {o.vendorName}</span>
                  </div>
                  <div className="muted-data" style={{marginTop: 4}}>
                    Placed {o.placedAt} · Ready {o.readyBy} · {o.dispatchMode}
                  </div>
                </div>
                <span className={`status status--${o.status.toLowerCase()}`}>
                  <span className="status__dot" /> {o.status}
                </span>
              </div>
              <div className="order-row__stats">
                <div><div className="l">Quantity</div><div className="v">{o.qtyKg}<small>kg</small></div></div>
                <div><div className="l">Price/kg</div><div className="v">₱{o.pricePerKg}</div></div>
                <div><div className="l">Total</div><div className="v">₱{o.total.toLocaleString()}</div></div>
                <div><div className="l">Listing</div><div className="v" style={{fontFamily:'var(--font-mono)', fontSize: 14}}>{o.listingCode}</div></div>
              </div>
              <div className="order-row__progress">
                <div className={`step ${o.status === 'CANCELLED' ? 'step--cancelled' : 'step--done'}`}>
                  <div className="step__dot" /><span>Placed</span>
                </div>
                <div className={`step ${['CONFIRMED','COMPLETED'].includes(o.status) ? 'step--done' : o.status === 'CANCELLED' ? 'step--cancelled' : ''}`}>
                  <div className="step__dot" /><span>Confirmed</span>
                </div>
                <div className={`step ${o.handoff?.status === 'CONFIRMED' ? 'step--done' : ''}`}>
                  <div className="step__dot" /><span>Handoff</span>
                </div>
                <div className={`step ${o.payment?.status === 'CONFIRMED' ? 'step--done' : ''}`}>
                  <div className="step__dot" /><span>Paid</span>
                </div>
              </div>
              <div className="order-row__foot">
                <span className="muted-data">
                  {o.payment ? `Paid via ${o.payment.method.replace('_',' ')}` :
                   o.cancelReason ? o.cancelReason : 'Awaiting next step'}
                </span>
                <div className="row" style={{gap: 6}}>
                  <button className="btn btn--ghost btn--sm">Message vendor</button>
                  {o.status === 'PENDING' ? <button className="btn btn--ghost btn--sm">Cancel</button> : null}
                  {o.status === 'CONFIRMED' && o.handoff ? <button className="btn btn--accent btn--sm">Confirm receipt</button> : null}
                  {o.status === 'COMPLETED' ? <button className="btn btn--ghost btn--sm">Re-order</button> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
