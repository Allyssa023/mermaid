import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { I } from '../icons'
import { useCart } from '../context/CartContext'
import { PageHead } from './components/PageHead'

const AVATAR_GRADS = [
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#5eead4,#38bdf8)',
  'linear-gradient(135deg,#a78bfa,#6a5fc1)',
  'linear-gradient(135deg,#fa7faa,#c4326a)',
  'linear-gradient(135deg,#46d39a,#14b8a6)',
  'linear-gradient(135deg,#60a5fa,#3b82f6)',
  'linear-gradient(135deg,#c2ef4e,#84cc16)',
]

function speciesInitials(name = '') {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??'
}

function vendorInitials(name = '') {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'V?'
}

function freshnessFromItem(item) {
  if (item.createdAt) {
    const h = Math.max(0, Math.round((Date.now() - new Date(item.createdAt).getTime()) / 3_600_000))
    return Math.max(10, Math.min(100, Math.round(96 - h * 1.8)))
  }
  return 92
}

/* ── Qty stepper matching the reference style ── */
function QtyStepper({ qty, onDecrement, onIncrement, disabled }) {
  return (
    <div className="qty-stepper">
      <button onClick={onDecrement} disabled={disabled || qty <= 0.5}>−</button>
      <span style={{ fontFamily: 'var(--font-code)' }}>
        {qty.toFixed(1)} <small style={{ color: 'var(--on-dark-muted)', fontWeight: 400 }}>kg</small>
      </span>
      <button onClick={onIncrement} disabled={disabled}>+</button>
    </div>
  )
}

export default function Cart({ setPage }) {
  const { cart, loading, error, refresh, updateItem, removeItem, clearCart } = useCart()
  const [rowBusy, setRowBusy]   = useState({})
  const [rowErr, setRowErr]     = useState({})
  const [actionErr, setActionErr] = useState(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (loading || !bodyRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.from(bodyRef.current.children, {
      opacity: 0, y: 12, stagger: 0.06, duration: 0.25, ease: 'power2.out', clearProps: 'all',
    })
  }, [loading])

  async function handleUpdate(itemId, qty) {
    setRowErr(prev => { const n = { ...prev }; delete n[itemId]; return n })
    setRowBusy(prev => ({ ...prev, [itemId]: true }))
    try { await updateItem(itemId, { quantityKg: Math.max(0.5, parseFloat(qty.toFixed(1))) }) }
    catch (e) { setRowErr(prev => ({ ...prev, [itemId]: e.message ?? 'Could not update' })) }
    finally { setRowBusy(prev => { const n = { ...prev }; delete n[itemId]; return n }) }
  }

  async function handleRemove(itemId) {
    setActionErr(null)
    setRowBusy(prev => ({ ...prev, [itemId]: true }))
    try { await removeItem(itemId) }
    catch (e) { setActionErr(e.message ?? 'Could not remove item') }
    finally { setRowBusy(prev => { const n = { ...prev }; delete n[itemId]; return n }) }
  }

  async function handleClear() {
    setActionErr(null)
    try { await clearCart() }
    catch (e) { setActionErr(e.message ?? 'Could not clear cart') }
  }

  const groups    = cart.groups ?? []
  const itemCount = cart.itemCount ?? 0

  // Exclude unavailable (SOLD_OUT / closed) items from totals
  const availableGrand = groups.reduce((sum, g) =>
    sum + (g.items ?? []).reduce((s, it) => it.warning ? s : s + (it.lineTotal ?? 0), 0), 0)
  const handling  = Math.round(availableGrand * 0.02)
  const total     = availableGrand + handling

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="page-wrap">
        <PageHead eyebrow="Cart" title="Ready to check" lime="out" />
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--on-dark-muted)', fontSize: 12 }}>Loading cart…</div>
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="page-wrap">
        <PageHead eyebrow="Cart" title="Ready to check" lime="out" />
        <div className="empty-state">
          <I.Cart size={32} />
          <div style={{ color: 'var(--danger)' }}>{error}</div>
          <button className="btn btn--primary btn--sm" onClick={refresh}>Retry</button>
        </div>
      </div>
    )
  }

  /* ── Empty ── */
  if (groups.length === 0) {
    return (
      <div className="page-wrap">
        <PageHead
          eyebrow="Cart"
          title="Ready to check"
          lime="out"
          sub="0 items"
          tools={
            <button className="filter-pill" onClick={() => setPage('bbrowse')}>
              <I.Fish size={11} /> <strong>Browse market</strong>
            </button>
          }
        />
        <div className="empty-state" style={{ marginTop: 64 }}>
          <I.Cart size={40} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Your cart is empty</div>
          <p style={{ fontSize: 13, color: 'var(--on-dark-muted)', margin: '4px 0 16px' }}>
            Browse the marketplace to add fresh listings.
          </p>
          <button className="btn btn--lime" onClick={() => setPage('bbrowse')}>Browse listings <I.ArrowRight size={12} /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <PageHead
        eyebrow="Cart"
        title="Ready to check"
        lime="out"
        sub={`${itemCount} item${itemCount !== 1 ? 's' : ''} · ${groups.length} vendor${groups.length !== 1 ? 's' : ''}`}
        tools={
          <>
            <button className="filter-pill" onClick={() => setPage('bbrowse')}>
              <I.Refresh size={11} /> <strong>Save for later</strong>
            </button>
            <button className="filter-pill">
              <I.MapPin size={11} /> <strong>Pickup</strong>
            </button>
          </>
        }
      />

      {actionErr && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: 13, margin: '16px 0' }}>
          {actionErr}
        </div>
      )}

      <div className="cart-shell" style={{ marginTop: 24 }}>
        {/* ── Vendor groups ── */}
        <div ref={bodyRef} className="cart-main">
          {groups.map((g, gi) => {
            const vName    = g.vendor?.shopName ?? g.vendor?.fullName ?? 'Vendor'
            const vHandle  = g.vendor?.handle ? `@${g.vendor.handle}` : `@${vName.split(' ')[0].toLowerCase()}`
            const vInitials = vendorInitials(vName)
            const vGrad    = AVATAR_GRADS[gi % AVATAR_GRADS.length]
            const subtotal = g.subtotal ?? 0

            return (
              <div key={g.vendor?.id ?? gi} className="cart-group">
                {/* Group head */}
                <div className="cart-group__head">
                  <div className="cart-group__brand">
                    <div
                      className="cell-species__avatar"
                      style={{ background: vGrad, width: 36, height: 36, borderRadius: 9, fontSize: 11, display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 700, color: '#fff' }}
                    >
                      {vInitials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{vName}</div>
                      <div style={{ fontSize: 11, color: 'var(--on-dark-muted)' }}>
                        <I.Star size={9} style={{ verticalAlign: -1, color: 'var(--warning)' }} /> {vHandle}
                      </div>
                    </div>
                  </div>
                  <div className="cart-group__eta">
                    <I.Truck size={12} /> ETA <strong>Today · on confirm</strong>
                  </div>
                </div>

                {/* Items */}
                {(g.items ?? []).map((it, ii) => {
                  const spName    = it.speciesName ?? it.title ?? 'Fish'
                  const spInit    = speciesInitials(spName)
                  const spGrad    = AVATAR_GRADS[(it.listingId ?? it.id ?? ii) % AVATAR_GRADS.length]
                  const price     = it.unitPriceSnapshot ?? it.currentPricePerKg ?? 0
                  const qty       = it.quantityKg ?? 1
                  const lineTotal = it.lineTotal ?? Math.round(qty * price)
                  const fresh     = freshnessFromItem(it)
                  const busy      = !!rowBusy[it.id]
                  const unavailable = !!it.warning

                  return (
                    <div key={it.id}>
                      <div className="cart-ref-item" style={{ opacity: unavailable ? 0.45 : 1 }}>
                        {/* Species avatar */}
                        <div
                          className="cell-species__avatar"
                          style={{ background: spGrad, width: 48, height: 48, borderRadius: 10, fontSize: 13, display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 700, color: '#fff' }}
                        >
                          {spInit}
                        </div>

                        {/* Main info */}
                        <div className="cart-ref-item__main">
                          <div className="cart-ref-item__title">{spName}</div>
                          <div className="cart-ref-item__meta">
                            <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--on-dark-muted)', background: 'var(--layer-3)', padding: '2px 6px', borderRadius: 4 }}>
                              LST-{it.listingId ?? it.id}
                            </span>
                            <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)' }}>₱{price}/kg</span>
                            <span className="catch-card__match" style={{ background: 'var(--aqua-soft)', color: 'var(--aqua)' }}>
                              Fresh · {fresh}
                            </span>
                          </div>
                        </div>

                        {/* Qty stepper */}
                        <QtyStepper
                          qty={qty}
                          disabled={busy || unavailable}
                          onDecrement={() => handleUpdate(it.id, qty - 0.5)}
                          onIncrement={() => handleUpdate(it.id, qty + 0.5)}
                        />

                        {/* Line total */}
                        <div className="cart-ref-item__total">₱{Math.round(lineTotal).toLocaleString()}</div>

                        {/* Remove */}
                        <button
                          className="icon-btn"
                          title="Remove"
                          disabled={busy}
                          onClick={() => handleRemove(it.id)}
                        >
                          <I.Trash size={14} />
                        </button>
                      </div>
                      {it.warning && (
                        <p style={{ color: 'var(--warning)', fontSize: 11, margin: '2px 0 4px', paddingLeft: 18 }}>{it.warning}</p>
                      )}
                      {rowErr[it.id] && (
                        <p style={{ color: 'var(--danger)', fontSize: 11, margin: '2px 0 4px', paddingLeft: 18 }}>{rowErr[it.id]}</p>
                      )}
                    </div>
                  )
                })}

                {/* Group footer */}
                <div className="cart-group__foot">
                  <span style={{ fontSize: 11, color: 'var(--on-dark-muted)' }}>
                    Subtotal · {vName.split(' ')[0]}
                  </span>
                  <span style={{ fontFamily: 'var(--font-code)', fontWeight: 600 }}>₱{Math.round(subtotal).toLocaleString()}</span>
                </div>
              </div>
            )
          })}

          {/* Suggestions strip */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Discover more from your vendors</div>
                <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', marginTop: 2 }}>Same trip · cold-chain shares apply</div>
              </div>
              <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>
                See all <I.ArrowRight size={11} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <I.Fish size={20} style={{ color: 'var(--on-dark-muted)', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--on-dark-muted)', lineHeight: 1.5 }}>
                Browse today's freshest hauls from your saved vendors and discover deals you might like.
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary sidebar ── */}
        <aside className="cart-summary-ref">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Order summary</div>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--on-dark-muted)', background: 'var(--layer-3)', padding: '3px 8px', borderRadius: 4 }}>
                CART-{cart.id ?? '—'}
              </span>
            </div>

            {/* Per-vendor subtotals */}
            {groups.map((g, gi) => (
              <div key={g.vendor?.id ?? gi} className="sum-row">
                <span>{g.vendor?.shopName ?? g.vendor?.fullName ?? 'Vendor'}</span>
                <span className="mono">₱{Math.round(g.subtotal ?? 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="sum-row">
              <span>Cold-chain handling</span>
              <span className="mono">₱{handling.toLocaleString()}</span>
            </div>

            <div className="sum-divider" />

            <div className="sum-row sum-row--total">
              <span>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>₱{Math.round(total).toLocaleString()}</span>
            </div>

            {/* CTAs */}
            <button
              className="btn btn--lime"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 0', marginTop: 14 }}
              onClick={() => setPage('bcheckout')}
            >
              Checkout · ₱{Math.round(total).toLocaleString()} <I.ArrowRight size={12} />
            </button>
            <button
              className="btn btn--ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
              onClick={handleClear}
            >
              <I.Refresh size={11} /> Save as recurring
            </button>

            {/* Cold-chain status inset */}
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--layer-1)', border: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <I.Bolt size={12} style={{ color: 'var(--accent-lime)' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Cold-chain on track</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--on-dark-muted)' }}>
                {groups.length} vendor{groups.length !== 1 ? 's' : ''} in this cart maintain 0–4°C transit.
              </div>
            </div>

            {/* Clear cart */}
            <button
              className="btn btn--ghost btn--sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10, color: 'var(--danger)', fontSize: 11 }}
              onClick={handleClear}
            >
              Clear cart
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
