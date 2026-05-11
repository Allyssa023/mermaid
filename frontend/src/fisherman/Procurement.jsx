import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

// ── Inline mock data ─────────────────────────────────────────────────────────

const FISHERMAN_PROCUREMENT_ORDERS = [
  { id: 9012, code: 'VO-9012', vendor: 'Marina Seafoods',    species: 'Yellowfin Tuna',        qtyKg: 18, pricePerKg: 380, total: 6840,  payment: 'CASH',  preorder: false, status: 'PENDING',   placedAt: 'Apr 23, 08:12', readyBy: 'Apr 23, 16:00', note: 'Export-grade, ice at sea.' },
  { id: 9008, code: 'VO-9008', vendor: 'Bay City Market',    species: 'Grouper (Lapu-lapu)',   qtyKg: 4,  pricePerKg: 540, total: 2160,  payment: 'UTANG', preorder: false, status: 'ACCEPTED',  placedAt: 'Apr 23, 06:40', readyBy: 'Apr 24, 09:00', note: 'Live, 1.5kg+' },
  { id: 9001, code: 'VO-9001', vendor: 'Marina Seafoods',    species: 'Skipjack',              qtyKg: 32, pricePerKg: 170, total: 5440,  payment: 'CASH',  preorder: true,  status: 'READY',     placedAt: 'Apr 22, 14:30', readyBy: 'Apr 24, 10:00', note: '' },
  { id: 8987, code: 'VO-8987', vendor: 'J. Aquino & Sons',   species: 'Spanish Mackerel',     qtyKg: 14, pricePerKg: 320, total: 4480,  payment: 'CASH',  preorder: false, status: 'COMPLETED', placedAt: 'Apr 20, 11:00', readyBy: 'Apr 21, 09:00', note: '' },
  { id: 8975, code: 'VO-8975', vendor: 'Del Mar Cold Chain', species: 'Squid',                qtyKg: 22, pricePerKg: 210, total: 4620,  payment: 'UTANG', preorder: false, status: 'DISPUTED',  placedAt: 'Apr 19, 07:15', readyBy: 'Apr 19, 16:00', note: 'Buyer claims short-weight; 1.4kg gap reported.' },
  { id: 8950, code: 'VO-8950', vendor: 'Marina Seafoods',    species: 'Mahi-mahi',            qtyKg: 12, pricePerKg: 250, total: 3000,  payment: 'CASH',  preorder: false, status: 'CANCELLED', placedAt: 'Apr 18, 17:20', readyBy: 'Apr 19, 10:00', note: 'Vendor cancelled — supply found elsewhere.' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProcurementPage({ setPage }) {
  const [tab, setTab] = useState('PENDING')
  const buckets = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED', 'DISPUTED']
  const counts = buckets.reduce((a, b) => ({ ...a, [b]: FISHERMAN_PROCUREMENT_ORDERS.filter(o => o.status === b).length }), {})
  const orders = FISHERMAN_PROCUREMENT_ORDERS.filter(o => o.status === tab)

  const statusActions = {
    PENDING:   [{ label: 'Accept', kind: 'accent' }, { label: 'Decline', kind: 'ghost' }],
    ACCEPTED:  [{ label: 'Mark ready', kind: 'accent' }, { label: 'Message vendor', kind: 'ghost' }],
    READY:     [{ label: 'Mark completed', kind: 'accent' }, { label: 'Report dispute', kind: 'ghost' }],
    COMPLETED: [{ label: 'View receipt', kind: 'ghost' }],
    CANCELLED: [{ label: 'View reason', kind: 'ghost' }],
    DISPUTED:  [{ label: 'Open case', kind: 'accent' }],
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor orders</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>procurement</em> inbox</h1>
          <p className="page__sub">Orders vendors placed against your catch. Confirm, prepare, complete.</p>
        </div>
      </div>

      <div className="seg" style={{marginTop: 14, alignSelf: 'flex-start'}}>
        {buckets.map(b => (
          <button key={b} className={tab === b ? 'on' : ''} onClick={() => setTab(b)}>
            {b[0] + b.slice(1).toLowerCase()} ({counts[b]})
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty" style={{marginTop: 32}}>
          <div className="empty__title">No {tab.toLowerCase()} orders</div>
          <p>Vendors who place orders against your catch will appear here.</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12, marginTop: 18}}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{display: 'flex', flexDirection: 'column'}}>
              <div className="card__head">
                <div>
                  <div className="row" style={{gap: 6, alignItems: 'center'}}>
                    <span className="kbd">{o.code}</span>
                    <span className={`chip ${o.payment === 'CASH' ? 'chip--safe' : 'chip--caution'}`} style={{fontSize: 10}}>{o.payment}</span>
                    {o.preorder && <span className="chip chip--accent" style={{fontSize: 10}}>Pre-order</span>}
                  </div>
                  <div className="card__title" style={{fontSize: 18, marginTop: 6}}>{o.species}</div>
                  <div className="card__sub">{o.vendor}</div>
                </div>
                <span className={`status status--${o.status === 'PENDING' ? 'pending' : o.status === 'ACCEPTED' ? 'confirmed' : o.status === 'READY' ? 'active' : o.status === 'COMPLETED' ? 'completed' : o.status === 'DISPUTED' ? 'disputed' : 'cancelled'}`}>
                  <span className="status__dot" /> {o.status}
                </span>
              </div>
              <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                <div className="kpi"><div className="kpi__label">Quantity</div><div className="kpi__value">{o.qtyKg}<small>kg</small></div></div>
                <div className="kpi"><div className="kpi__label">Price/kg</div><div className="kpi__value">₱{o.pricePerKg}</div></div>
                <div className="kpi"><div className="kpi__label">Total</div><div className="kpi__value" style={{color: 'var(--accent)'}}>₱{o.total.toLocaleString()}</div></div>
              </div>
              <div className="muted-data" style={{fontSize: 12, marginTop: 8}}>
                Ready by <strong style={{color: 'var(--ink)'}}>{o.readyBy}</strong> · placed {o.placedAt}
              </div>
              {o.note && <div style={{marginTop: 8, fontSize: 13, color: 'var(--ink-2)', borderLeft: '2px solid var(--line)', paddingLeft: 10}}>{o.note}</div>}
              <div className="row" style={{gap: 8, marginTop: 14}}>
                {statusActions[o.status].map((a, i) => (
                  <button key={i} className={`btn btn--sm btn--${a.kind}`} style={{flex: 1}}>{a.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
