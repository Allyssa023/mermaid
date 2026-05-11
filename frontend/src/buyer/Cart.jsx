import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const B_CART_INIT = [
  { vendor: 'Marina Seafoods', items: [
    { id: 612, species: 'Yellowfin Tuna', price: 400, qty: 8, available: 42 },
    { id: 624, species: 'Blue Marlin',    price: 620, qty: 2, available: 12 },
  ]},
  { vendor: 'Bay City Market', items: [
    { id: 615, species: 'Grouper (Lapu-lapu)', price: 560, qty: 3, available: 12 },
  ]},
]

export default function Cart({ setPage }) {
  const [cart, setCart] = useState(B_CART_INIT)
  const grand = cart.reduce((a, g) => a + g.items.reduce((s, i) => s + i.price * i.qty, 0), 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Cart</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>cart</em></h1>
          <p className="page__sub">{cart.length} vendors · {cart.reduce((a, g) => a + g.items.length, 0)} items</p>
        </div>
        <button className="btn" onClick={() => setPage('bbrowse')}><I.ChevL size={12} /> Continue shopping</button>
      </div>

      {cart.length === 0 ? (
        <div className="empty" style={{marginTop: 32}}>
          <I.Cart size={36} />
          <div className="empty__title">Your cart is empty</div>
          <p>Browse the marketplace to add listings.</p>
        </div>
      ) : (
        <>
          <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18}}>
            {cart.map((g, gi) => {
              const sub = g.items.reduce((s, i) => s + i.price * i.qty, 0)
              return (
                <div key={g.vendor} className="card">
                  <div className="card__head">
                    <div>
                      <div className="eyebrow">Vendor</div>
                      <div className="card__title" style={{fontSize: 17, marginTop: 2}}>{g.vendor}</div>
                    </div>
                    <span style={{fontFamily: 'var(--font-mono)', fontSize: 14}}>₱{sub.toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    {g.items.map(it => (
                      <div key={it.id} className="row" style={{gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center'}}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontWeight: 500}}>{it.species}</div>
                          <div className="muted-data" style={{fontSize: 12}}>₱{it.price}/kg · {it.available} kg available</div>
                        </div>
                        <div className="row" style={{gap: 4, alignItems: 'center'}}>
                          <button className="btn btn--ghost btn--sm" style={{padding: '4px 8px'}} onClick={() => setCart(c => c.map((x, i) => i === gi ? { ...x, items: x.items.map(y => y.id === it.id ? { ...y, qty: Math.max(1, y.qty - 1) } : y) } : x))}>−</button>
                          <input className="input" style={{width: 56, textAlign: 'center'}} value={it.qty} readOnly />
                          <button className="btn btn--ghost btn--sm" style={{padding: '4px 8px'}} onClick={() => setCart(c => c.map((x, i) => i === gi ? { ...x, items: x.items.map(y => y.id === it.id ? { ...y, qty: y.qty + 1 } : y) } : x))}>+</button>
                          <span className="muted-data" style={{fontSize: 11, marginLeft: 4}}>kg</span>
                        </div>
                        <span style={{fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right'}}>₱{(it.price * it.qty).toLocaleString()}</span>
                        <button className="btn btn--ghost btn--sm" onClick={() => setCart(c => c.map((x, i) => i === gi ? { ...x, items: x.items.filter(y => y.id !== it.id) } : x).filter(x => x.items.length))}><I.Trash size={11} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{position: 'sticky', bottom: 16, marginTop: 18, padding: '16px 22px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(20, 30, 50, 0.08)', display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{flex: 1}}>
              <div className="eyebrow">Grand total</div>
              <div style={{fontSize: 32, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{grand.toLocaleString()}</div>
            </div>
            <button className="btn btn--primary" onClick={() => setPage('bcheckout')}>Proceed to checkout <I.Arrow size={12} /></button>
          </div>
        </>
      )}
    </div>
  )
}
