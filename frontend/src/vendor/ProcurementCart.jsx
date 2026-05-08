import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, updateCartItem, removeCartItem, checkout } from './api/procurement'

const php = (amount) =>
  Number(amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

export default function ProcurementCart() {
  const navigate = useNavigate()
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [editQty, setEditQty]         = useState('')

  const load = useCallback(async () => {
    try {
      const data = await getCart()
      setItems(data)
    } catch {
      setError('Failed to load cart.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRemove = async (itemId) => {
    try {
      await removeCartItem(itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch {
      setError('Failed to remove item.')
    }
  }

  const startEdit = (item) => { setEditingId(item.id); setEditQty(String(item.qtyKg)) }
  const cancelEdit = () => { setEditingId(null); setEditQty('') }

  const saveEdit = async (item) => {
    const qty = parseFloat(editQty)
    if (!qty || qty <= 0) return
    if (item.availableKg != null && qty > item.availableKg + item.qtyKg) {
      setError(`Max available: ${(item.availableKg + item.qtyKg).toFixed(1)} kg`)
      return
    }
    try {
      const updated = await updateCartItem(item.id, qty, item.offeredPricePerKg)
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setEditingId(null)
    } catch {
      setError('Failed to update quantity.')
    }
  }

  const handleCheckout = async () => {
    if (items.length === 0) return
    setCheckingOut(true)
    setError(null)
    try {
      await checkout()
      navigate('/procurement/orders')
    } catch (e) {
      const msg = e?.response?.data?.message || 'Checkout failed. Some items may no longer be available.'
      setError(msg)
      await load()
    } finally {
      setCheckingOut(false)
    }
  }

  const total = items.reduce((sum, i) => sum + (i.qtyKg * (i.offeredPricePerKg ?? 0)), 0)

  if (loading) {
    return (
      <div className="page">
        <div className="empty" style={{ padding: '60px 0' }}>
          <div className="empty__title">Loading cart…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Procurement</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Order <em>Cart</em>
          </h1>
          <p className="page__sub">Review and confirm your catch orders before submitting.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/vendor/procurement')}>
            ← Back to Feed
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--unsafe)', lineHeight: 1 }}>
            ×
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">Your cart is empty</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Add items from the procurement feed.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }}
            onClick={() => navigate('/vendor/procurement')}>
            Browse Feed
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {items.map(item => (
              <div key={item.id} className="card">
                <div className="card__head" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div className="card__title" style={{ fontSize: 15 }}>{item.speciesName}</div>
                    <div className="card__sub">from {item.fishermanName ?? `Fisherman #${item.fishermanId}`}</div>
                    {item.availableKg != null && (
                      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
                        Available: {item.availableKg.toFixed(1)} kg
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {editingId === item.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          className="input"
                          type="number"
                          value={editQty}
                          min="0.1"
                          step="0.1"
                          max={item.availableKg != null ? item.availableKg + item.qtyKg : undefined}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: 80 }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>kg</span>
                        <button className="btn btn--primary btn--sm" onClick={() => saveEdit(item)}>Save</button>
                        <button className="btn btn--ghost btn--sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15 }}>
                          {item.qtyKg.toFixed(1)} kg
                        </span>
                        {item.offeredPricePerKg != null && (
                          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                            @ ₱{item.offeredPricePerKg.toFixed(2)}/kg
                          </span>
                        )}
                        <button className="btn btn--ghost btn--sm" onClick={() => startEdit(item)}>Edit</button>
                      </div>
                    )}
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            {total > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)',
              }}>
                <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>Estimated total</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}>
                  {php(total)}
                </span>
              </div>
            )}
            <button
              className="btn btn--primary"
              style={{ width: '100%', justifyContent: 'center', opacity: checkingOut ? 0.6 : 1 }}
              onClick={handleCheckout}
              disabled={checkingOut || items.length === 0}
            >
              {checkingOut ? 'Placing orders…' : `Checkout (${items.length} item${items.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
