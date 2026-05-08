import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVendorPolling } from './hooks/useVendorPolling'
import { getFeed, getCart, addToCart, listPreviousFishermen, placePreorder } from './api/procurement'
import { apiGet } from '../api'

const FRESHNESS = (mins) => {
  if (mins < 60)  return { cls: 'chip chip--safe chip--dot',    label: 'Very Fresh' }
  if (mins < 180) return { cls: 'chip chip--caution chip--dot', label: 'Fresh' }
  return              { cls: 'chip chip--unsafe chip--dot',   label: 'Aging' }
}

function OrderModal({ alert, cartSellerIds, onClose, onAdded }) {
  const [qty, setQty]     = useState('')
  const [price, setPrice] = useState(alert.askingPricePerKg ?? '')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">Procurement</div>
            <div className="modal__title">
              {alreadyFromSeller ? `Add more from ${alert.fishermanName || 'this fisherman'}` : 'Place Order'}
            </div>
            <div className="modal__sub">
              {alert.speciesName}{available != null ? ` · ${available} kg available` : ''}
            </div>
          </div>
        </div>
        <div className="form-grid" style={{ padding: '16px 0 0' }}>
          <div className="form-row">
            <label>Quantity (kg)</label>
            <input className="input" type="number" min="0.1" step="0.1"
              value={qty} onChange={e => setQty(e.target.value)}
              placeholder={available != null ? `max ${available}` : ''} />
          </div>
          <div className="form-row">
            <label>Offered price (₱/kg)</label>
            <input className="input" type="number" min="0" step="0.5"
              value={price} onChange={e => setPrice(e.target.value)}
              placeholder={alert.askingPricePerKg ? `asking ₱${alert.askingPricePerKg}` : 'optional'} />
          </div>
        </div>
        {err && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 8 }}>{err}</div>}
        <div className="modal__foot">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary btn--sm" disabled={busy} onClick={submit}>
            {busy ? '…' : 'Add to Order'}
          </button>
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

  useEffect(() => {
    listPreviousFishermen().then(setFishermen).catch(() => {})
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
  }, [])

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">Procurement</div>
            <div className="modal__title">Place Preorder</div>
            <div className="modal__sub">Reserve fish before the catch alert — fisherman confirms when available.</div>
          </div>
        </div>
        <div className="form-grid" style={{ padding: '16px 0 0' }}>
          {[
            ['Fisherman', 'fishermanId', fishermen.map(fm => ({ value: fm.id, label: fm.name }))],
            ['Species',   'speciesId',  species.map(s  => ({ value: s.id,  label: s.commonName || s.name }))],
          ].map(([label, key, opts]) => (
            <div key={key} className="form-row">
              <label>{label}</label>
              <select className="input" value={form[key]} onChange={e => f(key, e.target.value)}>
                <option value="">Select {label.toLowerCase()}</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-row" style={{ flex: 1 }}>
              <label>Qty (kg)</label>
              <input className="input" type="number" min="0.1" step="0.1"
                value={form.qtyKg} onChange={e => f('qtyKg', e.target.value)} />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label>Price (₱/kg)</label>
              <input className="input" type="number" min="0" step="0.5"
                value={form.pricePerKg} onChange={e => f('pricePerKg', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <label>Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="Optional notes for the fisherman"
              value={form.notes} onChange={e => f('notes', e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>
        </div>
        {err && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 8 }}>{err}</div>}
        <div className="modal__foot">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary btn--sm" disabled={busy} onClick={submit}>
            {busy ? '…' : 'Send Preorder'}
          </button>
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

  const refreshCart = useCallback(() => {
    getCart().then(items => {
      setCartSellerIds(new Set(items.map(i => i.fishermanId)))
      setCartCount(items.length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
    refreshCart()
  }, [refreshCart])

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
    <div className="page">
      {orderModal && (
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

      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Procurement</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Catch <em>Feed</em>
          </h1>
          <p className="page__sub">Live catch alerts from fishermen — order direct from the shore.</p>
        </div>
        <div className="page__actions">
          {isStale && <span className="chip chip--caution chip--dot">Stale data</span>}
          <button className="btn btn--ghost btn--sm" onClick={() => setPreorderModal(true)}>Preorder</button>
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/vendor/procurement/cart')}>
            Cart{cartCount > 0 ? ` (${cartCount})` : ''}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)} style={{ width: 180 }}>
            <option value="">All species</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.commonName || s.name}</option>)}
          </select>
          <select className="input" value={maxAgeMins} onChange={e => setMaxAgeMins(e.target.value)} style={{ width: 160 }}>
            <option value="">Any age</option>
            <option value="60">Under 1 hour</option>
            <option value="180">Under 3 hours</option>
            <option value="360">Under 6 hours</option>
          </select>
          <button className="btn btn--ghost btn--sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      {loading && alerts.length === 0 && (
        <div className="empty" style={{ padding: '60px 0' }}>
          <div className="empty__title">Loading…</div>
        </div>
      )}
      {error && alerts.length === 0 && (
        <div style={{
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          {error.message || 'Failed to load feed.'}
        </div>
      )}
      {!loading && alerts.length === 0 && !error && (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No active catch alerts</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Nothing in the feed right now.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }}
            onClick={() => setPreorderModal(true)}>
            Place a Preorder
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.map(alert => {
          const freshness        = FRESHNESS(alert.ageMinutes || 0)
          const alreadyFromSeller = cartSellerIds.has(alert.fishermanId)
          const available        = alert.availableKg ?? alert.quantityKg
          const isHighlighted    = highlightAlertId && alert.id === highlightAlertId

          return (
            <div
              key={alert.id}
              ref={isHighlighted ? highlightRef : null}
              className="alert-card"
              style={isHighlighted ? { outline: '2px solid var(--accent)', outlineOffset: 2 } : undefined}
            >
              <div className="alert-card__head">
                <div>
                  <h3 className="alert-card__species" style={{ fontSize: 18 }}>{alert.speciesName}</h3>
                  <div className="alert-card__sub">
                    {alert.fishermanName || `Fisherman #${alert.fishermanId}`}
                    {alert.landingSite && ` · ${alert.landingSite}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                    {alert.ageMinutes < 60
                      ? `${alert.ageMinutes}m ago`
                      : `${Math.round(alert.ageMinutes / 60)}h ago`}
                  </span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span className={freshness.cls}>{freshness.label}</span>
                    {alert.inCart && <span className="chip chip--accent">In Cart</span>}
                    {alert.watchlistMatched && <span className="chip chip--safe">Watchlist</span>}
                  </div>
                </div>
              </div>
              <div className="alert-card__stats" style={{ marginTop: 10, paddingTop: 10 }}>
                {available != null && (
                  <div>
                    <div className="l">Available</div>
                    <div className="v" style={{ fontSize: 18 }}>
                      {available}
                      <small style={{ fontFamily: 'var(--font-ui)', fontSize: 11, marginLeft: 2 }}>kg</small>
                      {alert.quantityKg && alert.claimedKg > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 6 }}>
                          of {alert.quantityKg} kg
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {alert.askingPricePerKg && (
                  <div>
                    <div className="l">Asking</div>
                    <div className="v" style={{ fontSize: 18 }}>
                      ₱{alert.askingPricePerKg}
                      <small style={{ fontFamily: 'var(--font-ui)', fontSize: 11, marginLeft: 2 }}>/kg</small>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className={alreadyFromSeller ? 'btn btn--ghost btn--sm' : 'btn btn--primary btn--sm'}
                  onClick={() => setOrderModal(alert)}
                >
                  {alreadyFromSeller
                    ? `Add more from ${alert.fishermanName?.split(' ')[0] || 'seller'}`
                    : 'Order'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
