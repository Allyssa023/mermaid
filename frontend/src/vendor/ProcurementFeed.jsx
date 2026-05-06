import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVendorPolling } from './hooks/useVendorPolling'
import { getFeed, getCart, addToCart, listPreviousFishermen, placePreorder } from './api/procurement'
import { apiGet } from '../api'

const FRESHNESS_COLORS = (mins) => {
  if (mins < 60)  return { bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', label: 'Very Fresh' }
  if (mins < 180) return { bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Fresh' }
  return              { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', label: 'Aging' }
}

function OrderModal({ alert, cartSellerIds, onClose, onAdded }) {
  const [qty, setQty]   = useState('')
  const [price, setPrice] = useState(alert.askingPricePerKg ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const available = alert.availableKg ?? alert.quantityKg

  const submit = async () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { setErr('Enter a valid quantity.'); return }
    if (available != null && q > available) { setErr(`Only ${available} kg available.`); return }
    setBusy(true); setErr('')
    try {
      await addToCart(alert.id, q, price ? parseFloat(price) : undefined)
      onAdded()
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to add.')
    } finally {
      setBusy(false)
    }
  }

  const alreadyFromSeller = cartSellerIds.has(alert.fishermanId)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>
          {alreadyFromSeller ? `Order more from ${alert.fishermanName || 'this fisherman'}` : 'Place Order'}
        </h3>
        <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
          {alert.speciesName}
          {available != null && ` · ${available} kg available`}
        </div>
        <label style={{ fontSize: 13, color: '#374151' }}>Quantity (kg)</label>
        <input type="number" min="0.1" step="0.1"
          value={qty} onChange={e => setQty(e.target.value)}
          placeholder={available != null ? `max ${available}` : ''}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4, marginBottom: 12 }}
        />
        <label style={{ fontSize: 13, color: '#374151' }}>Offered price (₱/kg)</label>
        <input type="number" min="0" step="0.5"
          value={price} onChange={e => setPrice(e.target.value)}
          placeholder={alert.askingPricePerKg ? `asking ₱${alert.askingPricePerKg}` : 'optional'}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4, marginBottom: 16 }}
        />
        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={busy} onClick={submit} style={{
            flex: 1, padding: '9px 0', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
          }}>
            {busy ? '…' : 'Add to Order'}
          </button>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'none', border: '1px solid #d1d5db',
            borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function PreorderModal({ onClose, onPlaced }) {
  const [fishermen, setFishermen] = useState([])
  const [species, setSpecies]     = useState([])
  const [form, setForm]           = useState({ fishermanId: '', speciesId: '', qtyKg: '', pricePerKg: '', notes: '' })
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState('')

  useState(() => {
    listPreviousFishermen().then(setFishermen).catch(() => {})
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
  })

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.fishermanId || !form.speciesId || !form.qtyKg || !form.pricePerKg) {
      setErr('All fields except notes are required.'); return
    }
    setBusy(true); setErr('')
    try {
      await placePreorder(+form.fishermanId, +form.speciesId,
        parseFloat(form.qtyKg), parseFloat(form.pricePerKg), form.notes || undefined)
      onPlaced()
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to place preorder.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px' }}>Place Preorder</h3>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
          Reserve fish before the catch alert — fisherman confirms when available.
        </p>
        {[
          ['Fisherman', 'fishermanId', fishermen.map(f => ({ value: f.id, label: f.name }))],
          ['Species',   'speciesId',  species.map(s => ({ value: s.id, label: s.commonName || s.name }))],
        ].map(([label, key, opts]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: '#374151' }}>{label}</label>
            <select value={form[key]} onChange={e => f(key, e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4 }}>
              <option value="">Select {label.toLowerCase()}</option>
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: '#374151' }}>Qty (kg)</label>
            <input type="number" min="0.1" step="0.1" value={form.qtyKg} onChange={e => f('qtyKg', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: '#374151' }}>Price (₱/kg)</label>
            <input type="number" min="0" step="0.5" value={form.pricePerKg} onChange={e => f('pricePerKg', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4 }} />
          </div>
        </div>
        <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: 12, resize: 'vertical' }} />
        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={busy} onClick={submit} style={{
            flex: 1, padding: '9px 0', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
          }}>
            {busy ? '…' : 'Send Preorder'}
          </button>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'none', border: '1px solid #d1d5db',
            borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function ProcurementFeed() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const highlightAlertId = searchParams.get('highlightAlertId')
    ? +searchParams.get('highlightAlertId') : null
  const highlightRef = useRef(null)

  const [speciesFilter, setSpeciesFilter] = useState('')
  const [maxAgeMins, setMaxAgeMins]       = useState('')
  const [species, setSpecies]             = useState([])
  const [orderModal, setOrderModal]       = useState(null)
  const [preorderModal, setPreorderModal] = useState(false)
  const [cartSellerIds, setCartSellerIds] = useState(new Set())
  const [cartCount, setCartCount]         = useState(0)

  useState(() => {
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
    refreshCart()
  })

  const refreshCart = () => {
    getCart().then(items => {
      setCartSellerIds(new Set(items.map(i => i.fishermanId)))
      setCartCount(items.length)
    }).catch(() => {})
  }

  const fetcher = useCallback(
    () => getFeed(speciesFilter || undefined, maxAgeMins || undefined),
    [speciesFilter, maxAgeMins]
  )
  const { data, isStale, loading, error, refetch } = useVendorPolling(fetcher, [speciesFilter, maxAgeMins])
  const alerts = Array.isArray(data) ? data : []

  useEffect(() => {
    if (highlightAlertId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightAlertId, alerts.length])

  return (
    <div style={{ padding: '24px 20px', maxWidth: 780, margin: '0 auto' }}>
      {(orderModal) && (
        <OrderModal
          alert={orderModal}
          cartSellerIds={cartSellerIds}
          onClose={() => setOrderModal(null)}
          onAdded={() => { refreshCart(); refetch() }}
        />
      )}
      {preorderModal && (
        <PreorderModal
          onClose={() => setPreorderModal(false)}
          onPlaced={() => navigate('/vendor/procurement/orders')}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Procurement Feed</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isStale && <span style={{ fontSize: 12, color: '#d97706' }}>● Stale</span>}
          <button onClick={() => setPreorderModal(true)} style={{
            padding: '6px 14px', border: '1px solid #2563eb', background: 'none',
            color: '#2563eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Preorder</button>
          <button onClick={() => navigate('/vendor/procurement/cart')} style={{
            padding: '6px 14px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            Cart {cartCount > 0 ? `(${cartCount})` : ''}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
          <option value="">All species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.commonName || s.name}</option>)}
        </select>
        <select value={maxAgeMins} onChange={e => setMaxAgeMins(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
          <option value="">Any age</option>
          <option value="60">Under 1 hour</option>
          <option value="180">Under 3 hours</option>
          <option value="360">Under 6 hours</option>
        </select>
        <button onClick={refetch} style={{
          padding: '7px 12px', border: '1px solid #d1d5db', background: '#fff',
          borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>Refresh</button>
      </div>

      {loading && alerts.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>Loading…</div>
      )}
      {error && alerts.length === 0 && (
        <div style={{ color: '#dc2626', padding: '20px 0' }}>{error.message || 'Failed to load feed.'}</div>
      )}
      {!loading && alerts.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
          No active catch alerts.
          <br />
          <button onClick={() => setPreorderModal(true)} style={{
            marginTop: 12, padding: '8px 18px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}>Place a Preorder</button>
        </div>
      )}

      {alerts.map(alert => {
        const freshness = FRESHNESS_COLORS(alert.ageMinutes || 0)
        const alreadyFromSeller = cartSellerIds.has(alert.fishermanId)
        const available = alert.availableKg ?? alert.quantityKg
        const isHighlighted = highlightAlertId && alert.id === highlightAlertId

        return (
          <div
            key={alert.id}
            ref={isHighlighted ? highlightRef : null}
            data-highlight={isHighlighted || undefined}
            style={{
              background: isHighlighted ? '#eff6ff' : '#fff',
              border: isHighlighted ? '2px solid #3b82f6'
                : alert.inCart ? '2px solid #2563eb' : '1px solid #e5e7eb',
              borderRadius: 10, padding: '16px 18px', marginBottom: 12,
              transition: 'background 0.3s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {alert.speciesName}
                  <span style={{
                    marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 11,
                    fontWeight: 600, background: freshness.bg, color: freshness.color,
                  }}>
                    {freshness.label}
                  </span>
                  {alert.inCart && (
                    <span style={{ marginLeft: 6, fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>
                      In Cart
                    </span>
                  )}
                  {alert.watchlistMatched && (
                    <span style={{ marginLeft: 6, fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>
                      Watchlist
                    </span>
                  )}
                </div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 3 }}>
                  {alert.fishermanName || `Fisherman #${alert.fishermanId}`}
                  {alert.landingSite && ` · ${alert.landingSite}`}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {available != null && (
                    <span style={{ marginRight: 10 }}>
                      <strong>{available} kg</strong> available
                      {alert.quantityKg && alert.claimedKg > 0 && (
                        <span style={{ color: '#9ca3af' }}> (of {alert.quantityKg} kg)</span>
                      )}
                    </span>
                  )}
                  {alert.askingPricePerKg && (
                    <span>₱{alert.askingPricePerKg}/kg asking</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 8 }}>
                  {alert.ageMinutes < 60
                    ? `${alert.ageMinutes}m ago`
                    : `${Math.round(alert.ageMinutes / 60)}h ago`}
                </div>
                <button
                  onClick={() => setOrderModal(alert)}
                  style={{
                    padding: '7px 14px', background: alreadyFromSeller ? 'none' : '#2563eb',
                    color: alreadyFromSeller ? '#2563eb' : '#fff',
                    border: alreadyFromSeller ? '1px solid #2563eb' : 'none',
                    borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {alreadyFromSeller
                    ? `Order more from ${alert.fishermanName?.split(' ')[0] || 'seller'}`
                    : 'Order'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
