import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFeed, getCart, addToCart, removeCartItem, startDealFromCartItem,
  listMySupplierOrders,
  initiateHandoff, confirmHandoff,
  recordPayment,
  cancelOrder,
  createOrderPaymentIntent,
  settleCredit,
} from './api/procurement'
import SettleCreditModal from '../components/modals/SettleCreditModal'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import { I } from '../icons'
import OrderCard from '../components/OrderCard'

const STATUS_FILTERS = ['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'DISPUTED', 'CANCELLED']

export const matchPct = (alert, watchlistSpeciesIds = []) =>
  watchlistSpeciesIds.includes(alert.speciesId) ? 100 : 60;

export default function ProcurementFeed({ pageState }) {
  const [tab, setTab] = useState('feed')
  const [statusFilter, setStatusFilter] = useState(null)
  const [settleModal, setSettleModal] = useState(null)
  const [settleLoading, setSettleLoading] = useState(false)
  const watchlistFilter = pageState?.watchlistFilter ?? null

  const qc = useQueryClient()
  const navigate = useNavigate()
  const feedQ   = useQuery({
    queryKey: ['vendor', 'feed', watchlistFilter],
    queryFn: () => getFeed(watchlistFilter?.speciesId),
  })
  const cartQ   = useQuery({ queryKey: ['vendor', 'cart'], queryFn: getCart })
  const ordersQ = useQuery({
    queryKey: ['vendor', 'supplierOrders'],
    queryFn: () => listMySupplierOrders(),
    enabled: tab === 'orders' || tab === 'credits',
    refetchOnWindowFocus: true,
    refetchInterval: tab === 'credits' ? 10000 : false,
  })

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ['vendor', 'supplierOrders'] })

  const addMut      = useMutation({
    mutationFn: ({ catchAlertId, qtyKg }) => addToCart(catchAlertId, qtyKg, undefined),
    onSuccess:   () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }),
    onError:     (e) => alert(e?.message ?? 'Failed to add to cart'),
  })
  const removeMut   = useMutation({ mutationFn: (itemId) => removeCartItem(itemId),  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }) })

  // "Start deal" = add this single item then immediately open a negotiation. Vendor lands in the deal chat.
  const startDealMut = useMutation({
    mutationFn: async (item) => {
      const qty = Number(item.availableKg)
      if (!qty || qty < 0.1) throw new Error('No quantity remaining')
      const cartItem = await addToCart(item.id, qty, undefined)
      const deal = await startDealFromCartItem(cartItem.id)
      return deal
    },
    onSuccess: (deal) => {
      qc.invalidateQueries({ queryKey: ['vendor', 'cart'] })
      navigate(`/vendor/messages?deal=${deal.id}`)
    },
    onError: (e) => window.alert(e?.message ?? 'Failed to start deal'),
  })

  // For an existing cart item with no deal yet (or restarting a stale one).
  const startDealFromItemMut = useMutation({
    mutationFn: (itemId) => startDealFromCartItem(itemId),
    onSuccess: (deal) => {
      qc.invalidateQueries({ queryKey: ['vendor', 'cart'] })
      navigate(`/vendor/messages?deal=${deal.id}`)
    },
    onError: (e) => window.alert(e?.message ?? 'Failed to start deal'),
  })

  // Vendor is BUYER of these procurement orders — handoff confirm + payment confirm are buyer actions.
  const orderMutations = {
    confirmHandoff:  (id)            => confirmHandoff(id).then(invalidateOrders),
    initiateHandoff: (id, body)      => initiateHandoff(id, body).then(invalidateOrders),
    recordPayment:   (id, body)      => recordPayment(id, body).then(invalidateOrders),
    cancelOrder:     (id, r)         => cancelOrder(id, r).then(invalidateOrders),
    createPaymentIntent: async (id, method) => {
      const result = await createOrderPaymentIntent(id, method)
      invalidateOrders()
      return result
    },
  }

  const cartItems = Array.isArray(cartQ.data) ? cartQ.data : (cartQ.data?.items ?? [])

  const allOrders = ordersQ.data ?? []
  const displayOrders = statusFilter
    ? allOrders.filter(o => o.status === statusFilter)
    : allOrders
  const creditOrders = allOrders.filter(o =>
    o.status === 'COMPLETED' && o.payment?.method === 'CREDIT' && o.payment?.status !== 'SETTLED'
  )

  // Derive watchlist species IDs for matchPct
  const watchlistIds = pageState?.watchlistSpeciesIds ?? []

  const feedAlerts = feedQ.data ?? []
  const watchlistMatchCount = feedAlerts.filter(a => matchPct(a, watchlistIds) === 100).length

  const tabs = [
    { id: 'feed',    label: 'Feed' },
    { id: 'cart',    label: `Cart (${cartItems.length})` },
    { id: 'orders',  label: 'Deals' },
    { id: 'credits', label: ordersQ.data ? `Credits (${creditOrders.length})` : 'Credits' },
  ]

  return (
    <div className="v-page">
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Source Catch</h1>
          <p className="v-page-header__sub">Browse catch alerts, manage deals, track credits</p>
        </div>
      </div>

      <div className="v-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`v-tab${tab === t.id ? ' v-tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <div>
          {/* KPI strip */}
          <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <div className="v-kpi-cell">
              <div className="v-kpi-cell__label">Total alerts</div>
              <div className="v-kpi-cell__value">{feedAlerts.length}</div>
            </div>
            <div className="v-kpi-cell">
              <div className="v-kpi-cell__label">Watchlist matches</div>
              <div className="v-kpi-cell__value">{watchlistMatchCount}</div>
            </div>
            <div className="v-kpi-cell">
              <div className="v-kpi-cell__label">In cart</div>
              <div className="v-kpi-cell__value">{cartItems.length}</div>
            </div>
          </div>

          {feedQ.isLoading && <TableRowSkeleton rows={4} />}
          {feedQ.error && <ApiError error={feedQ.error} onRetry={feedQ.refetch} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {feedAlerts.map(a => {
              const inCart = cartItems.some(i => i.catchAlertId === a.id)
              const qty = Number(a.availableKg)
              const canBuy = !!qty && qty >= 0.1
              const price = a.askingPricePerKg ?? a.pricePerKg
              const pct = matchPct(a, watchlistIds)
              return (
                <div key={a.id} className="v-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>CA-{a.id}</span>
                    <span className={`v-chip v-chip--${pct === 100 ? 'lime' : 'tide'}`}>
                      {pct}% match
                    </span>
                    {!canBuy && (
                      <span className="v-chip v-chip--muted">Sold out</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)' }}>
                    {a.speciesName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{a.fishermanName}</div>
                  <div className="v-kpi-strip" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                    <div className="v-kpi-cell" style={{ padding: '10px 12px' }}>
                      <div className="v-kpi-cell__label">Qty</div>
                      <div className="v-kpi-cell__value" style={{ fontSize: 16 }}>{a.availableKg ?? 0}<small style={{ fontSize: 11, opacity: 0.6 }}> kg</small></div>
                    </div>
                    <div className="v-kpi-cell" style={{ padding: '10px 12px' }}>
                      <div className="v-kpi-cell__label">Price</div>
                      <div className="v-kpi-cell__value" style={{ fontSize: 16, fontFamily: 'var(--font-mono)' }}>{price != null ? `₱${price}` : '—'}</div>
                    </div>
                    <div className="v-kpi-cell" style={{ padding: '10px 12px' }}>
                      <div className="v-kpi-cell__label">Expires</div>
                      <div className="v-kpi-cell__value" style={{ fontSize: 11 }}>{a.expiresAt ? new Date(a.expiresAt).toLocaleString() : '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      className="v-btn v-btn--ghost v-btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => addMut.mutate({ catchAlertId: a.id, qtyKg: qty })}
                      disabled={!!inCart || addMut.isPending || !canBuy}
                    >
                      {inCart ? <><I.Check size={11} /> In cart</> : <><I.Plus size={11} /> Add to cart</>}
                    </button>
                    <button
                      className="v-btn v-btn--primary v-btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => startDealMut.mutate(a)}
                      disabled={startDealMut.isPending || addMut.isPending || !canBuy || !!inCart}
                    >
                      <I.Arrow size={11} /> {startDealMut.isPending ? 'Starting…' : 'Start deal'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'cart' && (
        <div className="v-panel" style={{ marginTop: 4 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)' }}>Your cart</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{cartItems.length} items pending order</div>
          </div>
          {cartQ.isLoading && <TableRowSkeleton rows={3} />}
          {cartQ.error && <ApiError error={cartQ.error} onRetry={cartQ.refetch} />}
          {!cartQ.isLoading && cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-4)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Cart is empty</div>
              <p style={{ fontSize: 13 }}>Add alerts from the live feed.</p>
            </div>
          ) : (
            <table className="v-table">
              <thead><tr><th>Code</th><th>Species</th><th>Fisher</th><th>Qty (kg)</th><th>Price/kg</th><th>Deal</th><th></th></tr></thead>
              <tbody>
                {cartItems.map(item => {
                  const status = item.dealStatus ?? null
                  const isStale = status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED'
                  return (
                    <tr key={item.id}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>CA-{item.catchAlertId}</span></td>
                      <td>{item.speciesName ?? item.catchAlert?.speciesName ?? '—'}</td>
                      <td style={{ color: 'var(--ink-3)' }}>{item.fishermanName ?? '—'}</td>
                      <td className="v-mono">{item.qtyKg} kg</td>
                      <td className="v-mono">₱{item.pricePerKg}</td>
                      <td>
                        {status == null && <span className="v-chip v-chip--muted">No deal</span>}
                        {status === 'NEGOTIATING' && <span className="v-chip v-chip--tide">Negotiating</span>}
                        {isStale && <span className="v-chip v-chip--muted">{status.charAt(0) + status.slice(1).toLowerCase()}</span>}
                        {status === 'AGREED' && <span className="v-chip v-chip--kelp">Order placed</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {status == null && (
                            <button
                              className="v-btn v-btn--primary v-btn--sm"
                              onClick={() => startDealFromItemMut.mutate(item.id)}
                              disabled={startDealFromItemMut.isPending}
                            >
                              <I.Arrow size={11} /> Start deal
                            </button>
                          )}
                          {status === 'NEGOTIATING' && (
                            <button
                              className="v-btn v-btn--ghost v-btn--sm"
                              onClick={() => navigate(`/vendor/messages?deal=${item.dealId}`)}
                            >
                              Open chat
                            </button>
                          )}
                          {isStale && (
                            <button
                              className="v-btn v-btn--primary v-btn--sm"
                              onClick={() => startDealFromItemMut.mutate(item.id)}
                              disabled={startDealFromItemMut.isPending}
                            >
                              Restart
                            </button>
                          )}
                          {status !== 'AGREED' && (
                            <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => removeMut.mutate(item.id)} disabled={removeMut.isPending}>
                              <I.Trash size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(s => {
              const active = s === 'all' ? statusFilter === null : statusFilter === s
              const count  = s === 'all' ? allOrders.length : allOrders.filter(o => o.status === s).length
              return (
                <button
                  key={s}
                  className={`v-chip v-chip--${active ? 'lime' : 'muted'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStatusFilter(s === 'all' ? null : s)}
                >
                  {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{count}</span>
                </button>
              )
            })}
          </div>
          {ordersQ.isLoading && <TableRowSkeleton rows={4} />}
          {ordersQ.error && <ApiError error={ordersQ.error} onRetry={ordersQ.refetch} />}
          {!ordersQ.isLoading && displayOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-4)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No orders yet</div>
              <p style={{ fontSize: 13 }}>Orders you place from the live feed will appear here.</p>
            </div>
          )}
          {displayOrders.map(order => (
            <OrderCard key={order.id} order={order} viewerRole="BUYER" mutations={orderMutations} />
          ))}
        </div>
      )}

      {tab === 'credits' && (
        <div>
          {ordersQ.isLoading && <TableRowSkeleton rows={3} />}
          {!ordersQ.isLoading && creditOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-4)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No outstanding credits</div>
              <p style={{ fontSize: 13 }}>All credits have been settled.</p>
            </div>
          ) : (
            <div className="v-panel">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)' }}>Outstanding credits</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{creditOrders.length} unpaid</div>
              </div>
              <table className="v-table">
                <thead><tr><th>Order</th><th>Fisherman</th><th>Species</th><th>Amount</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {creditOrders.map(o => (
                    <tr key={o.id}>
                      <td style={{ color: 'var(--ink-3)' }}>#{o.id}</td>
                      <td>{o.seller?.fullName ?? o.sellerName ?? '—'}</td>
                      <td>{o.speciesName ?? '—'}</td>
                      <td><span className="v-mono">₱{(o.payment?.amount ?? 0).toLocaleString()}</span></td>
                      <td style={{ color: 'var(--ink-3)' }}>{o.completedAt ? String(o.completedAt).split('T')[0] : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="v-btn v-btn--primary v-btn--sm" onClick={() => setSettleModal(o)}>Settle</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {settleModal && (
            <SettleCreditModal
              order={settleModal}
              payment={settleModal.payment}
              loading={settleLoading}
              onClose={() => setSettleModal(null)}
              onSubmit={async (body) => {
                setSettleLoading(true)
                try {
                  if (body.isXendit) {
                    // GCash/Maya — create Xendit payment intent and redirect
                    const result = await createOrderPaymentIntent(settleModal.id, body.method)
                    if (result?.redirectUrl) window.location = result.redirectUrl
                  } else {
                    // Cash — settle directly
                    await settleCredit(settleModal.id, { method: body.method, reference: body.reference })
                    invalidateOrders()
                    setSettleModal(null)
                  }
                } catch (e) {
                  window.alert(e?.message ?? 'Failed to settle credit')
                } finally {
                  setSettleLoading(false)
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
