import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, updateCartItem, removeCartItem, checkout } from './api/procurement'

export default function ProcurementCart() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editQty, setEditQty] = useState('')

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

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditQty(String(item.qtyKg))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQty('')
  }

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

  const total = items.reduce((sum, i) => {
    const price = i.offeredPricePerKg ?? 0
    return sum + (i.qtyKg * price)
  }, 0)

  if (loading) return <div style={styles.wrap}><p>Loading cart…</p></div>

  return (
    <div style={styles.wrap}>
      <h2 style={styles.heading}>Procurement Cart</h2>

      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} style={styles.dismissBtn}>×</button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={styles.empty}>
          <p>Your cart is empty.</p>
          <button onClick={() => navigate('/procurement')} style={styles.browseBtn}>
            Browse Feed
          </button>
        </div>
      ) : (
        <>
          <div style={styles.itemList}>
            {items.map(item => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <div style={styles.species}>{item.speciesName}</div>
                  <div style={styles.fisherman}>from {item.fishermanName ?? `Fisherman #${item.fishermanId}`}</div>
                  {item.availableKg != null && (
                    <div style={styles.avail}>Available: {item.availableKg.toFixed(1)} kg</div>
                  )}
                </div>

                <div style={styles.cardRight}>
                  {editingId === item.id ? (
                    <div style={styles.editRow}>
                      <input
                        type="number"
                        value={editQty}
                        min="0.1"
                        step="0.1"
                        max={item.availableKg != null ? item.availableKg + item.qtyKg : undefined}
                        onChange={e => setEditQty(e.target.value)}
                        style={styles.qtyInput}
                      />
                      <span style={styles.unit}>kg</span>
                      <button onClick={() => saveEdit(item)} style={styles.saveBtn}>Save</button>
                      <button onClick={cancelEdit} style={styles.cancelBtn}>Cancel</button>
                    </div>
                  ) : (
                    <div style={styles.qtyRow}>
                      <span style={styles.qty}>{item.qtyKg.toFixed(1)} kg</span>
                      {item.offeredPricePerKg != null && (
                        <span style={styles.price}>
                          @ ₱{item.offeredPricePerKg.toFixed(2)}/kg
                        </span>
                      )}
                      <button onClick={() => startEdit(item)} style={styles.editBtn}>Edit</button>
                    </div>
                  )}
                  <button onClick={() => handleRemove(item.id)} style={styles.removeBtn}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.footer}>
            {total > 0 && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Estimated total</span>
                <span style={styles.totalAmt}>₱{total.toFixed(2)}</span>
              </div>
            )}
            <button
              onClick={handleCheckout}
              disabled={checkingOut || items.length === 0}
              style={{ ...styles.checkoutBtn, opacity: checkingOut ? 0.6 : 1 }}
            >
              {checkingOut ? 'Placing orders…' : `Checkout (${items.length} item${items.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  wrap: { padding: 24, maxWidth: 680 },
  heading: { marginTop: 0, marginBottom: 16, fontSize: 20, fontWeight: 600 },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
    padding: '8px 12px', borderRadius: 6, marginBottom: 16,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  dismissBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#b91c1c' },
  empty: { textAlign: 'center', padding: '48px 0', color: '#6b7280' },
  browseBtn: {
    marginTop: 12, padding: '8px 20px', background: '#0284c7', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
  },
  itemList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', background: '#fff',
  },
  cardLeft: { flex: 1, minWidth: 0 },
  species: { fontWeight: 600, fontSize: 15 },
  fisherman: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  avail: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 16 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 8 },
  qty: { fontSize: 15, fontWeight: 600 },
  price: { fontSize: 13, color: '#6b7280' },
  editRow: { display: 'flex', alignItems: 'center', gap: 6 },
  qtyInput: { width: 72, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 },
  unit: { fontSize: 13, color: '#6b7280' },
  editBtn: { padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  saveBtn: { padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  cancelBtn: { padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  removeBtn: { padding: '2px 8px', background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  footer: { borderTop: '1px solid #e5e7eb', paddingTop: 16 },
  totalRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { color: '#6b7280', fontSize: 14 },
  totalAmt: { fontWeight: 700, fontSize: 16 },
  checkoutBtn: {
    width: '100%', padding: '12px', background: '#0284c7', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600,
  },
}
