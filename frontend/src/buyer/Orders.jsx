import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPut } from '../api'
import { I } from '../icons'
import { fmt, fmtPrice } from './utils/format'
import { useCart } from '../context/CartContext'
import ReviewModal from './components/ReviewModal'
import OrderTimelineModal from './components/OrderTimelineModal'

export default function Orders() {
  const navigate = useNavigate()
  const onNavigate = (id) => navigate(`/buyer/${id}`)
  const { orderId: orderIdParam } = useParams()
  const { addItem } = useCart()
  const [tab, setTab]         = useState('active')
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(false)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())
  const [reviewOrder, setReviewOrder] = useState(null)
  const [reviewExisting, setReviewExisting] = useState(null)
  const [timelineOrder, setTimelineOrder] = useState(null)
  const [reorderingId, setReorderingId] = useState(null)
  const [reorderError, setReorderError] = useState('')
  const [reorderWarnings, setReorderWarnings] = useState([])

  async function handleReorder(o) {
    setReorderingId(o.id)
    setReorderError('')
    setReorderWarnings([])
    try {
      const res = await apiPost(`/buyer/orders/${o.id}/reorder`, null, {})
      const warnings = Array.isArray(res?.warnings) ? res.warnings : []
      const cart = res?.cart
      const hasItems = cart && Array.isArray(cart.itemsByVendor)
        ? cart.itemsByVendor.some(g => g?.items?.length > 0)
        : true
      if (!hasItems && warnings.length > 0) {
        // Nothing was added — surface as error so buyer can browse alternatives.
        setReorderError(warnings.join(' '))
      } else {
        if (warnings.length > 0) setReorderWarnings(warnings)
        onNavigate?.('cart')
      }
    } catch (e) {
      setReorderError(e?.message || 'Could not re-add this order to your cart.')
    } finally {
      setReorderingId(null)
    }
  }

  function loadOrders() {
    setLoading(true)
    apiGet('/buyer/orders')
      .then(d => {
        const arr = d?.content || d || []
        setOrders(arr)
        // Probe each completed order for an existing review (best-effort).
        const completed = arr.filter(o => o.status === 'COMPLETED')
        Promise.all(completed.map(o =>
          apiGet(`/buyer/orders/${o.id}/review`).then(r => r ? o.id : null).catch(() => null)
        )).then(ids => setReviewedOrderIds(new Set(ids.filter(Boolean))))
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  // Deep-link: /buyer/orders/:orderId opens the timeline modal for that order
  useEffect(() => {
    if (!orderIdParam) return
    const id = Number(orderIdParam)
    if (Number.isNaN(id)) return
    const found = orders.find(o => o.id === id)
    if (found) {
      setTimelineOrder(found)
    } else {
      // Order not in current list — fetch directly so modal still opens
      apiGet(`/buyer/orders/${id}`)
        .then(o => o && setTimelineOrder(o))
        .catch(() => {})
    }
  }, [orderIdParam, orders])

  const filtered = orders.filter(o => {
    if (tab === 'active') return ['PENDING', 'CONFIRMED'].includes(o.status)
    if (tab === 'completed') return o.status === 'COMPLETED'
    if (tab === 'cancelled') return o.status === 'CANCELLED'
    return true
  })

  // Group orders sharing a cartCheckoutId + sellerId so a single multi-vendor
  // checkout shows up as one card per vendor instead of N rows.
  const grouped = (() => {
    const map = new Map()
    for (const o of filtered) {
      const key = o.cartCheckoutId
        ? `${o.cartCheckoutId}::${o.seller?.id || o.sellerId || 'x'}`
        : `single::${o.id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(o)
    }
    return Array.from(map.values())
  })()

  const totals = {
    active: orders.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  }
  const totalSpent = orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + (o.agreedPricePerKg || 0) * (o.orderedQtyKg || 0), 0)
  const totalKg = orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + (o.orderedQtyKg || 0), 0)

  const [cancellingId, setCancellingId] = useState(null)
  async function handleCancel(o) {
    if (!o?.id) return
    if (!window.confirm(`Cancel order ${o.orderCode || `#${o.id}`}? This cannot be undone.`)) return
    setCancellingId(o.id)
    try {
      await apiPut(`/orders/${o.id}/cancel`)
      loadOrders()
    } catch (e) {
      alert(e?.message || 'Could not cancel this order.')
    } finally {
      setCancellingId(null)
    }
  }

  function handleMessageVendor(o) {
    const vendor = {
      id: o.seller?.id || o.sellerId,
      fullName: o.seller?.fullName || o.vendorName || 'Vendor',
      role: 'VENDOR',
    }
    if (!vendor.id) return
    navigate('/buyer/messages', { state: { initialContact: vendor } })
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchases</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Orders</em></h1>
          <p className="page__sub">
            {orders.length} total orders · {fmtPrice(totalSpent)} spent on {totalKg}kg of fish.
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="orders-strip orders-strip--4">
        <div className="stat">
          <div className="l">Active orders</div>
          <div className="v">{loading ? '—' : totals.active}</div>
          <div className="s">{orders.filter(o => o.status === 'PENDING').length} awaiting confirmation</div>
        </div>
        <div className="stat">
          <div className="l">Completed</div>
          <div className="v">{loading ? '—' : totals.completed}</div>
          <div className="s">All time</div>
        </div>
        <div className="stat">
          <div className="l">Total spent</div>
          <div className="v">{loading ? '—' : totalSpent > 1000 ? `₱${(totalSpent / 1000).toFixed(1)}` : fmtPrice(totalSpent)}{totalSpent > 1000 && <small>k</small>}</div>
          <div className="s">Lifetime value</div>
        </div>
        <div className="stat">
          <div className="l">Total received</div>
          <div className="v">{loading ? '—' : totalKg}<small>kg</small></div>
          <div className="s">Across {totals.completed} orders</div>
        </div>
      </div>

      {reorderError && (
        <div role="alert" className="card" style={{ marginTop: 12, padding: 12, color: 'var(--unsafe)', fontSize: 13 }}>
          {reorderError}
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 12 }}
            onClick={() => { setReorderError(''); onNavigate?.('browse') }}
          >Browse similar</button>
        </div>
      )}

      {reorderWarnings.length > 0 && (
        <div role="status" className="card" style={{ marginTop: 12, padding: 12, color: 'var(--ink-2)', fontSize: 13, borderLeft: '3px solid var(--accent, #f5a524)' }}>
          <strong>Heads up:</strong>
          <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
            {reorderWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginTop: 8 }}
            onClick={() => setReorderWarnings([])}
          >Dismiss</button>
        </div>
      )}

      {/* Orders table with tabs */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active ({totals.active})</button>
            <button className={tab === 'completed' ? 'on' : ''} onClick={() => setTab('completed')}>Completed ({totals.completed})</button>
            <button className={tab === 'cancelled' ? 'on' : ''} onClick={() => setTab('cancelled')}>Cancelled ({totals.cancelled})</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="buyer-empty" style={{ padding: '40px 20px' }}>
            <I.Clipboard size={28} />
            <span>No orders in this category yet.</span>
            <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('browse')}>
              Browse listings
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {grouped.map(group => {
              const head = group[0]
              const vendor = head.seller?.fullName || head.vendorName || '—'
              const groupTotal = group.reduce(
                (a, o) => a + (o.agreedPricePerKg || 0) * (o.orderedQtyKg || 0), 0)
              const groupKg = group.reduce((a, o) => a + (o.orderedQtyKg || 0), 0)
              const status = head.status
              const checkoutLabel = head.cartCheckoutId
                ? `Checkout · ${group.length} item${group.length === 1 ? '' : 's'}`
                : (head.orderCode || `ORD-${head.id}`)

              return (
                <div key={(head.cartCheckoutId || head.id) + '-' + (head.seller?.id || '')} className="order-row">
                  <div className="order-row__head">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
                        <span className="kbd">{checkoutLabel}</span>
                        <span className={`status status--${status?.toLowerCase()}`}>
                          <span className="status__dot" /> {status}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.1 }}>
                        {group.length === 1
                          ? (head.species?.commonName || head.fishSpecies?.commonName || '—')
                          : `${group.length} items from ${vendor}`}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>from <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{vendor}</strong></span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                          {fmt(head.createdAt || head.placedAt)}
                        </span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                          {head.dispatchMode || 'PICKUP'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {group.length > 1 ? (
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
                      {group.map(o => (
                        <div key={o.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          fontSize: 13, padding: '6px 10px', borderBottom: '1px solid var(--line-soft)',
                        }}>
                          <span style={{ flex: 1 }}>
                            {o.species?.commonName || o.fishSpecies?.commonName || '—'}
                            <span className="muted-data" style={{ marginLeft: 6, fontSize: 11 }}>
                              · {o.orderCode || `ORD-${o.id}`}
                            </span>
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                            {(o.orderedQtyKg || 0)}kg × {fmtPrice(o.agreedPricePerKg || 0)}
                          </span>
                          <span style={{ minWidth: 90, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {fmtPrice((o.agreedPricePerKg || 0) * (o.orderedQtyKg || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="order-row__stats">
                    <div>
                      <div className="l">Quantity</div>
                      <div className="v">{groupKg}<small>kg</small></div>
                    </div>
                    <div>
                      <div className="l">Items</div>
                      <div className="v">{group.length}</div>
                    </div>
                    <div>
                      <div className="l">Total</div>
                      <div className="v">{fmtPrice(groupTotal)}</div>
                    </div>
                    <div>
                      <div className="l">Vendor</div>
                      <div className="v" style={{ fontSize: 14 }}>{vendor}</div>
                    </div>
                  </div>

                  <div className="order-row__foot">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                      <span className="muted-data">
                        {head.payment?.method ? `Paid via ${head.payment.method.replace('_', ' ')}` :
                         head.cancelReason ? head.cancelReason : 'Awaiting next step'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => setTimelineOrder(head)}>Timeline</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => handleMessageVendor(head)}>Message vendor</button>
                        {status === 'PENDING' && (
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={cancellingId === head.id}
                            onClick={() => handleCancel(head)}
                          >{cancellingId === head.id ? 'Cancelling…' : 'Cancel'}</button>
                        )}
                        {status === 'CONFIRMED' && <button className="btn btn--accent btn--sm">Confirm receipt</button>}
                        {status === 'COMPLETED' && (
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={reorderingId === head.id}
                            aria-label={`Buy from ${vendor} again`}
                            onClick={() => handleReorder(head)}
                          >{reorderingId === head.id ? 'Adding…' : 'Buy Again'}</button>
                        )}
                        {status === 'COMPLETED' && (
                          reviewedOrderIds.has(head.id) ? (
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={async () => {
                                try {
                                  const r = await apiGet(`/buyer/orders/${head.id}/review`)
                                  setReviewExisting(r)
                                  setReviewOrder(head)
                                } catch { /* fall through */ }
                              }}
                            >Edit review</button>
                          ) : (
                            <button
                              className="btn btn--accent btn--sm"
                              onClick={() => { setReviewExisting(null); setReviewOrder(head) }}
                            >Leave review</button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          existing={reviewExisting}
          onClose={() => { setReviewOrder(null); setReviewExisting(null) }}
          onSubmitted={() => {
            setReviewedOrderIds(prev => new Set([...prev, reviewOrder.id]))
            loadOrders()
          }}
        />
      )}

      {timelineOrder && (
        <OrderTimelineModal
          order={timelineOrder}
          onClose={() => {
            setTimelineOrder(null)
            if (orderIdParam) navigate('/buyer/orders', { replace: true })
          }}
        />
      )}
    </div>
  )
}
