import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { I } from '../icons'
import { fmtPrice } from './utils/format'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const navigate = useNavigate()
  const onContinueShopping = () => navigate('/buyer/browse')
  const onCheckout = () => navigate('/buyer/checkout')
  const { cart, loading, error, updateItem, removeItem, clearCart } = useCart()
  const [busy, setBusy] = useState(null)

  async function handleQty(itemId, newQty) {
    if (newQty <= 0) return
    setBusy(itemId)
    await updateItem(itemId, { quantityKg: newQty })
    setBusy(null)
  }

  async function handleRemove(itemId) {
    setBusy(itemId)
    await removeItem(itemId)
    setBusy(null)
  }

  if (loading && (!cart || cart.itemCount === 0)) {
    return (
      <div className="page">
        <div className="card" style={{ marginTop: 18, padding: 24 }}>
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
          <div className="skeleton" style={{ height: 80, marginTop: 12 }} />
          <div className="skeleton" style={{ height: 80, marginTop: 8 }} />
        </div>
      </div>
    )
  }

  if (cart.itemCount === 0) {
    return (
      <div className="page">
        <div className="page__head">
          <div>
            <div className="eyebrow">Cart</div>
            <h1 className="page__title" style={{ marginTop: 4 }}>Your cart is <em>empty</em></h1>
            <p className="page__sub">Browse the marketplace and add fresh catch from verified vendors.</p>
          </div>
        </div>
        <div className="buyer-empty" style={{ marginTop: 40 }}>
          <I.Receipt size={36} />
          <span>No items yet. Add listings to your cart from the marketplace or a listing detail page.</span>
          <button className="btn btn--accent" style={{ marginTop: 18 }} onClick={onContinueShopping}>
            Browse marketplace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Cart</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} ready to <em>order</em></h1>
          <p className="page__sub">Items are grouped by vendor — each group will become its own order at checkout.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={onContinueShopping}>Continue shopping</button>
          <button className="btn btn--ghost" onClick={() => clearCart()}>Clear cart</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, padding: 12, borderColor: 'var(--unsafe)' }}>
          <span style={{ color: 'var(--unsafe)' }}>{error}</span>
        </div>
      )}

      {cart.warnings && cart.warnings.length > 0 && (
        <div className="card" style={{ marginTop: 14, padding: 14, borderLeft: '3px solid var(--warn, #f5a524)' }}>
          <div className="label" style={{ color: 'var(--warn)', marginBottom: 8 }}>Heads up</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cart.warnings.filter(Boolean).map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
                <I.Alert size={13} />
                <span style={{ flex: 1 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cart.groups.map(group => (
          <div key={group.vendor.id} className="card" style={{ padding: 16 }}>
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {(group.vendor.fullName || '?').slice(0, 1)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{group.vendor.fullName || '—'}</div>
                  <div className="muted-data" style={{ fontSize: 12 }}>{group.items.length} item{group.items.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>Subtotal {fmtPrice(group.subtotal)}</div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.items.map(item => (
                <div key={item.id} className="row" style={{ alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.speciesName}</div>
                    <div className="muted-data" style={{ fontSize: 12 }}>
                      {fmtPrice(item.unitPriceSnapshot)}/kg
                      {item.locationName ? ` · ${item.locationName}` : ''}
                    </div>
                    {item.warning && (
                      <div style={{ color: 'var(--warn)', fontSize: 12, marginTop: 4 }}>⚠ {item.warning}</div>
                    )}
                  </div>
                  <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={busy === item.id || item.quantityKg <= 0.1}
                      onClick={() => handleQty(item.id, +(item.quantityKg - 0.5).toFixed(2))}
                      aria-label="Decrease quantity"
                    >−</button>
                    <span style={{ minWidth: 50, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {item.quantityKg}kg
                    </span>
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={busy === item.id}
                      onClick={() => handleQty(item.id, +(item.quantityKg + 0.5).toFixed(2))}
                      aria-label="Increase quantity"
                    >+</button>
                  </div>
                  <div style={{ minWidth: 90, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtPrice(item.lineTotal)}
                  </div>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busy === item.id}
                    onClick={() => handleRemove(item.id)}
                    aria-label="Remove item"
                    title="Remove from cart"
                    style={{ color: 'var(--unsafe)' }}
                  ><I.Trash size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18, padding: 18, position: 'sticky', bottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="label">Grand total</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtPrice(cart.grandTotal)}</div>
          </div>
          <button
            className="btn btn--accent"
            onClick={onCheckout}
            disabled={!onCheckout || cart.itemCount === 0}
            style={{ minWidth: 240 }}
          >
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  )
}
