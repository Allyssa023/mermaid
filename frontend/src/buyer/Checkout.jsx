import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const B_CART = [
  { vendor: 'Marina Seafoods', items: [
    { id: 612, species: 'Yellowfin Tuna', price: 400, qty: 8, available: 42 },
    { id: 624, species: 'Blue Marlin',    price: 620, qty: 2, available: 12 },
  ]},
  { vendor: 'Bay City Market', items: [
    { id: 615, species: 'Grouper (Lapu-lapu)', price: 560, qty: 3, available: 12 },
  ]},
]

export default function Checkout({ setPage }) {
  const cart = B_CART
  const grand = cart.reduce((a, g) => a + g.items.reduce((s, i) => s + i.price * i.qty, 0), 0)
  const [pay, setPay] = useState('GCASH')
  const [addr, setAddr] = useState('1')
  const [addrModal, setAddrModal] = useState(false)
  const [dispatch, setDispatch] = useState(() => Object.fromEntries(cart.map(g => [g.vendor, 'PICKUP'])))

  const PAY = [
    { id: 'CASH',  label: 'Cash on handoff', icon: 'Wallet' },
    { id: 'GCASH', label: 'GCash',           icon: 'Phone' },
    { id: 'MAYA',  label: 'Maya',            icon: 'Phone' },
    { id: 'CARD',  label: 'Card',            icon: 'Card' },
  ]

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <button className="btn btn--ghost btn--sm" onClick={() => setPage('bcart')}><I.ChevL size={11} /> Back to cart</button>
          <h1 className="page__title" style={{marginTop: 10}}>Checkout</h1>
          <p className="page__sub">One submit, separate orders per vendor.</p>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18, gap: 18}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          {cart.map(g => (
            <div key={g.vendor} className="card">
              <div className="card__head">
                <div>
                  <div className="eyebrow">Vendor order</div>
                  <div className="card__title" style={{fontSize: 17}}>{g.vendor}</div>
                </div>
                <span style={{fontFamily: 'var(--font-mono)'}}>₱{g.items.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}</span>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14}}>
                {g.items.map(it => (
                  <div key={it.id} className="row" style={{gap: 8, fontSize: 13, padding: '4px 0'}}>
                    <span style={{flex: 1}}>{it.species}</span>
                    <span className="muted-data">{it.qty} kg × ₱{it.price}</span>
                    <span style={{fontFamily: 'var(--font-mono)', minWidth: 70, textAlign: 'right'}}>₱{(it.qty * it.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="eyebrow" style={{marginBottom: 6}}>Dispatch</div>
              <div className="seg" style={{marginBottom: 14}}>
                {['PICKUP', 'DELIVERY'].map(d => (
                  <button key={d} className={dispatch[g.vendor] === d ? 'on' : ''} onClick={() => setDispatch(x => ({ ...x, [g.vendor]: d }))}>
                    {d === 'PICKUP' ? <><I.MapPin size={11} /> Pickup</> : <><I.Truck size={11} /> Delivery</>}
                  </button>
                ))}
              </div>

              {dispatch[g.vendor] === 'DELIVERY' && (
                <div style={{marginBottom: 14}}>
                  <div className="eyebrow" style={{marginBottom: 6}}>Delivery address</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    {[
                      { id: '1', label: 'Casa Mendez Kitchen', addr: '12 Roxas St., Tagaytay City, Cavite' },
                      { id: '2', label: 'Sofia (home)',        addr: '88 Sampaguita Lane, Silang, Cavite' },
                    ].map(a => (
                      <label key={a.id} className="row" style={{gap: 8, padding: 10, border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', background: addr === a.id ? 'var(--accent-soft)' : 'transparent'}}>
                        <input type="radio" checked={addr === a.id} onChange={() => setAddr(a.id)} />
                        <div style={{flex: 1}}>
                          <strong>{a.label}</strong>
                          <div className="muted-data" style={{fontSize: 12, marginTop: 2}}>{a.addr}</div>
                        </div>
                      </label>
                    ))}
                    <button className="btn btn--ghost btn--sm" style={{alignSelf: 'flex-start'}} onClick={() => setAddrModal(true)}><I.Plus size={11} /> Add new address</button>
                  </div>
                </div>
              )}

              <div className="eyebrow" style={{marginBottom: 6}}>Note for vendor (optional)</div>
              <textarea className="input" rows="2" placeholder="Any preparation requests…" />
            </div>
          ))}

          <div className="card">
            <div className="card__head"><div className="card__title">Payment method</div></div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10}}>
              {PAY.map(p => {
                const Icon = I[p.icon] || I.Wallet
                return (
                  <button key={p.id} className="card" style={{padding: 14, cursor: 'pointer', border: `1px solid ${pay === p.id ? 'var(--accent)' : 'var(--line)'}`, background: pay === p.id ? 'var(--accent-soft)' : 'var(--surface)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10}} onClick={() => setPay(p.id)}>
                    <Icon size={20} />
                    <strong>{p.label}</strong>
                    {pay === p.id && <I.Check size={14} style={{marginLeft: 'auto', color: 'var(--accent)'}} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 16, alignSelf: 'flex-start'}}>
          <div className="card">
            <div className="card__head"><div className="card__title">Summary</div></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13}}>
              {cart.map(g => (
                <div key={g.vendor} className="row" style={{justifyContent: 'space-between'}}>
                  <span>{g.vendor}</span>
                  <span style={{fontFamily: 'var(--font-mono)'}}>₱{g.items.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="row" style={{justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4}}>
                <strong>Grand total</strong>
                <strong style={{fontSize: 22, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{grand.toLocaleString()}</strong>
              </div>
            </div>
            <button className="btn btn--primary" style={{marginTop: 14, width: '100%'}}>Place orders <I.Arrow size={12} /></button>
            <div className="muted-data" style={{fontSize: 11, textAlign: 'center', marginTop: 8}}>You'll be redirected to {pay} to complete payment.</div>
          </div>
        </div>
      </div>

      {addrModal && (
        <div className="modal-overlay" onClick={() => setAddrModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__head">
              <h2 className="modal__title">Add new address</h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setAddrModal(false)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Label</label><input className="input" placeholder="Home, Restaurant…" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Street</label><input className="input" /></div>
              <div className="form-row"><label>City</label><input className="input" /></div>
              <div className="form-row"><label>Province</label><input className="input" /></div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setAddrModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setAddrModal(false)}>Save address</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
