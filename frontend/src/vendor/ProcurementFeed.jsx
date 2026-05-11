import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_PROC_FEED = [
  { id: 841, code: 'CA-841', species: 'Yellowfin Tuna', tag: 'YT', fisher: 'Ramiro Delgado',  qty: 42,  price: 380, expires: '3h 12m', match: 96 },
  { id: 839, code: 'CA-839', species: 'Grouper',        tag: 'LL', fisher: 'Ramiro Delgado',  qty: 3.2, price: 420, expires: '0h 41m', match: 88, urgent: true },
  { id: 833, code: 'CA-833', species: 'Skipjack',       tag: 'SK', fisher: 'Tomas Reyes',     qty: 56,  price: 170, expires: '1h 45m', match: 92, urgent: true },
  { id: 831, code: 'CA-831', species: 'Mahi-mahi',      tag: 'MM', fisher: 'Helena Cruz',     qty: 16,  price: 265, expires: '5h 20m', match: 78 },
]

const PROC_ORDERS = [
  { id: 7012, code: 'PO-7012', species: 'Yellowfin Tuna', fisher: 'Ramiro Delgado', qty: 20, total: 7600,  status: 'CONFIRMED', date: 'Apr 23' },
  { id: 7008, code: 'PO-7008', species: 'Skipjack',       fisher: 'Tomas Reyes',    qty: 30, total: 5100,  status: 'AT_SEA',    date: 'Apr 23' },
  { id: 6998, code: 'PO-6998', species: 'Grouper',        fisher: 'Helena Cruz',    qty: 4,  total: 2160,  status: 'COMPLETED', date: 'Apr 21' },
]

export default function ProcurementFeed() {
  const [tab, setTab] = useState('feed')
  const [cart, setCart] = useState([{ id: 841, qty: 20 }, { id: 833, qty: 30 }])
  const addToCart = id => setCart(c => c.find(x => x.id === id) ? c : [...c, { id, qty: 10 }])
  const tabs = [
    { id: 'feed',   label: 'Live feed' },
    { id: 'cart',   label: `Cart (${cart.length})` },
    { id: 'orders', label: 'My procurement orders' },
  ]
  const statusMap = { CONFIRMED: 'confirmed', AT_SEA: 'active', COMPLETED: 'completed' }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Procurement</div>
          <h1 className="page__title" style={{marginTop: 4}}>Source <em>fresh catch</em></h1>
          <p className="page__sub">Live alerts from fishermen, your watchlist matched first.</p>
        </div>
      </div>
      <div className="seg" style={{marginTop: 14, alignSelf: 'flex-start'}}>
        {tabs.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === 'feed' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginTop: 18}}>
          {V_PROC_FEED.map(a => {
            const inCart = cart.find(x => x.id === a.id)
            return (
              <div key={a.id} className={`alert-card${a.urgent ? ' alert-card--urgent' : ''}`}>
                <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                  <span className="kbd">{a.code}</span>
                  <span className="chip chip--accent" style={{fontSize: 10}}>{a.match}% match</span>
                  {a.urgent && <span className="chip chip--unsafe" style={{fontSize: 10}}>urgent</span>}
                </div>
                <div className="alert-card__species" style={{fontSize: 18}}>{a.species}</div>
                <div className="alert-card__sub">{a.fisher}</div>
                <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8}}>
                  <div className="kpi"><div className="kpi__label">Qty</div><div className="kpi__value">{a.qty}<small>kg</small></div></div>
                  <div className="kpi"><div className="kpi__label">Price</div><div className="kpi__value">₱{a.price}</div></div>
                  <div className="kpi"><div className="kpi__label">Expires</div><div className="kpi__value" style={{fontSize: 16}}>{a.expires}</div></div>
                </div>
                <div className="row" style={{gap: 6, marginTop: 12}}>
                  <button className="btn btn--ghost btn--sm" style={{flex: 1}}>View detail</button>
                  <button className={`btn btn--sm ${inCart ? '' : 'btn--accent'}`} style={{flex: 1}} onClick={() => addToCart(a.id)} disabled={!!inCart}>
                    {inCart ? <><I.Check size={11} /> In cart</> : <><I.Plus size={11} /> Add to cart</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'cart' && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head"><div className="card__title">Your cart</div><div className="card__sub">{cart.length} items pending order</div></div>
          {cart.length === 0 ? (
            <div className="empty"><div className="empty__title">Cart is empty</div><p>Add alerts from the live feed.</p></div>
          ) : (
            <>
              <table className="tbl">
                <thead><tr><th>Code</th><th>Species</th><th>Fisher</th><th>Qty (kg)</th><th>Price/kg</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {cart.map(c => {
                    const a = V_PROC_FEED.find(x => x.id === c.id)
                    if (!a) return null
                    return (
                      <tr key={c.id}>
                        <td><span className="kbd">{a.code}</span></td>
                        <td>{a.species}</td>
                        <td className="muted-data">{a.fisher}</td>
                        <td><input className="input" style={{width: 80}} defaultValue={c.qty} /></td>
                        <td style={{fontFamily: 'var(--font-mono)'}}>₱{a.price}</td>
                        <td style={{fontFamily: 'var(--font-mono)'}}>₱{(a.price * c.qty).toLocaleString()}</td>
                        <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm" onClick={() => setCart(x => x.filter(y => y.id !== c.id))}><I.Trash size={11} /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="row" style={{justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 14, padding: '14px 0 0', borderTop: '1px solid var(--line)'}}>
                <div>
                  <div className="eyebrow">Grand total</div>
                  <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>
                    ₱{cart.reduce((a, c) => a + (V_PROC_FEED.find(x => x.id === c.id)?.price || 0) * c.qty, 0).toLocaleString()}
                  </div>
                </div>
                <button className="btn btn--primary">Place procurement orders <I.Arrow size={12} /></button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head"><div className="card__title">Procurement orders</div></div>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Date</th><th>Species</th><th>Fisher</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {PROC_ORDERS.map(o => (
                <tr key={o.id}>
                  <td><span className="kbd">{o.code}</span></td>
                  <td className="muted-data">{o.date}</td>
                  <td>{o.species}</td>
                  <td>{o.fisher}</td>
                  <td>{o.qty} kg</td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>₱{o.total.toLocaleString()}</td>
                  <td><span className={`status status--${statusMap[o.status]}`}><span className="status__dot" /> {o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
