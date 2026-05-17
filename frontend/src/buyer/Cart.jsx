import { I } from '../icons'
import { useCart } from '../context/CartContext'
import { StatTileSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Cart({ setPage }) {
  const { cart, loading, error, refresh, updateItem, removeItem, clearCart } = useCart()

  if (loading) return <div className="page"><StatTileSkeleton /></div>
  if (error)   return <div className="page"><ApiError error={{ message: error }} onRetry={refresh} /></div>

  const groups = cart.groups ?? []
  const grand  = cart.grandTotal ?? 0

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Cart</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>cart</em></h1>
          <p className="page__sub">{groups.length} vendors · {cart.itemCount ?? 0} items</p>
        </div>
        <button className="btn" onClick={() => setPage('bbrowse')}><I.ChevL size={12} /> Continue shopping</button>
      </div>

      {groups.length === 0 ? (
        <div className="empty" style={{marginTop: 32}}>
          <I.Cart size={36} />
          <div className="empty__title">Your cart is empty</div>
          <p>Browse the marketplace to add listings.</p>
          <button className="btn btn--primary" style={{marginTop: 12}} onClick={() => setPage('bbrowse')}>Browse listings</button>
        </div>
      ) : (
        <>
          <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18}}>
            {groups.map((g) => {
              return (
                <div key={g.vendor?.id} className="card">
                  <div className="card__head">
                    <div>
                      <div className="eyebrow">Vendor</div>
                      <div className="card__title" style={{fontSize: 17, marginTop: 2}}>{g.vendor?.fullName ?? 'Vendor'}</div>
                    </div>
                    <span style={{fontFamily: 'var(--font-mono)', fontSize: 14}}>₱{Math.round(g.subtotal ?? 0).toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    {(g.items ?? []).map(it => (
                      <div key={it.id} className="row" style={{gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center'}}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontWeight: 500}}>{it.speciesName}</div>
                          <div className="muted-data" style={{fontSize: 12}}>₱{it.unitPriceSnapshot ?? it.currentPricePerKg}/kg</div>
                        </div>
                        <div className="row" style={{gap: 4, alignItems: 'center'}}>
                          <button className="btn btn--ghost btn--sm" style={{padding: '4px 8px'}}
                            onClick={() => updateItem(it.id, { quantityKg: Math.max(1, (it.quantityKg ?? 1) - 1) })}>−</button>
                          <span style={{width: 40, textAlign: 'center', fontSize: 14}}>{it.quantityKg}</span>
                          <button className="btn btn--ghost btn--sm" style={{padding: '4px 8px'}}
                            onClick={() => updateItem(it.id, { quantityKg: (it.quantityKg ?? 1) + 1 })}>+</button>
                          <span className="muted-data" style={{fontSize: 11, marginLeft: 4}}>kg</span>
                        </div>
                        <span style={{fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right'}}>
                          ₱{Math.round(it.lineTotal ?? 0).toLocaleString()}
                        </span>
                        <button className="btn btn--ghost btn--sm" onClick={() => removeItem(it.id)}><I.Trash size={11} /></button>
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
              <div style={{fontSize: 32, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{Math.round(grand).toLocaleString()}</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={clearCart}>Clear cart</button>
            <button className="btn btn--primary" onClick={() => setPage('bcheckout')}>Proceed to checkout <I.Arrow size={12} /></button>
          </div>
        </>
      )}
    </div>
  )
}
