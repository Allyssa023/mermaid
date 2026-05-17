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
import { useAuth } from '../context/AuthContext'

const STATUS_FILTERS = ['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'DISPUTED', 'CANCELLED']

export default function ProcurementFeed({ pageState }) {
  const [tab, setTab] = useState('feed')
  const [statusFilter, setStatusFilter] = useState(null)
  const [settleModal, setSettleModal] = useState(null)
  const [settleLoading, setSettleLoading] = useState(false)
  const watchlistFilter = pageState?.watchlistFilter ?? null

  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()

  const feedQ   = useQuery({
    queryKey: ['vendor', 'feed', watchlistFilter],
    queryFn: () => getFeed(watchlistFilter?.speciesId),
  })
  const cartQ   = useQuery({ queryKey: ['vendor', 'cart'], queryFn: getCart })
  const ordersQ = useQuery({
    queryKey: ['vendor', 'supplierOrders', statusFilter],
    queryFn: () => listMySupplierOrders(statusFilter),
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
  const supplierOrders = allOrders.filter(o => (o.buyer?.id ?? o.buyerId) === user?.id)
  const creditOrders = supplierOrders.filter(o =>
    o.status === 'COMPLETED' && o.payment?.method === 'CREDIT' && o.payment?.status !== 'SETTLED'
  )

  const tabs = [
    { id: 'feed',   label: 'Live feed' },
    { id: 'cart',   label: `Cart (${cartItems.length})` },
    { id: 'orders', label: 'My orders' },
    { id: 'credits', label: ordersQ.data ? `Credits (${creditOrders.length})` : 'Credits' },
  ]

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Procurement</div>
          <h1 className="page__title" style={{marginTop: 4}}>Source <em>fresh catch</em></h1>
          <p className="page__sub">
            {watchlistFilter
              ? <>Filtered by watchlist · {watchlistFilter.label ?? `species #${watchlistFilter.speciesId}`}</>
              : 'Live alerts from fishermen, your watchlist matched first.'}
          </p>
        </div>
      </div>
      <div className="seg" style={{marginTop: 14, alignSelf: 'flex-start'}}>
        {tabs.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === 'feed' && (
        <div style={{marginTop: 18}}>
          {feedQ.isLoading && <TableRowSkeleton rows={4} />}
          {feedQ.error && <ApiError error={feedQ.error} onRetry={feedQ.refetch} />}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12}}>
            {(feedQ.data ?? []).map(a => {
              const inCart = cartItems.some(i => i.catchAlertId === a.id)
              const qty = Number(a.availableKg)
              const canBuy = !!qty && qty >= 0.1
              const price = a.askingPricePerKg ?? a.pricePerKg
              return (
                <div key={a.id} className="alert-card">
                  <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                    <span className="kbd">CA-{a.id}</span>
                    {a.matchScore != null && (
                      <span className="chip chip--accent" style={{fontSize: 10}}>{a.matchScore}% match</span>
                    )}
                    {!canBuy && (
                      <span className="chip" style={{fontSize: 10}}>Sold out</span>
                    )}
                  </div>
                  <div className="alert-card__species" style={{fontSize: 18}}>{a.speciesName}</div>
                  <div className="alert-card__sub">{a.fishermanName}</div>
                  <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8}}>
                    <div className="kpi"><div className="kpi__label">Qty</div><div className="kpi__value">{a.availableKg ?? 0}<small>kg</small></div></div>
                    <div className="kpi"><div className="kpi__label">Price</div><div className="kpi__value">{price != null ? `₱${price}` : '—'}</div></div>
                    <div className="kpi"><div className="kpi__label">Expires</div><div className="kpi__value" style={{fontSize: 13}}>{a.expiresAt ? new Date(a.expiresAt).toLocaleString() : '—'}</div></div>
                  </div>
                  <div className="row" style={{gap: 6, marginTop: 12}}>
                    <button
                      className="btn btn--sm"
                      style={{flex: 1}}
                      onClick={() => addMut.mutate({ catchAlertId: a.id, qtyKg: qty })}
                      disabled={!!inCart || addMut.isPending || !canBuy}
                    >
                      {inCart ? <><I.Check size={11} /> In cart</> : <><I.Plus size={11} /> Add to cart</>}
                    </button>
                    <button
                      className="btn btn--accent btn--sm"
                      style={{flex: 1}}
                      onClick={() => startDealMut.mutate(a)}
                      disabled={startDealMut.isPending || addMut.isPending || !canBuy}
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
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head"><div className="card__title">Your cart</div><div className="card__sub">{cartItems.length} items pending order</div></div>
          {cartQ.isLoading && <TableRowSkeleton rows={3} />}
          {cartQ.error && <ApiError error={cartQ.error} onRetry={cartQ.refetch} />}
          {!cartQ.isLoading && cartItems.length === 0 ? (
            <div className="empty"><div className="empty__title">Cart is empty</div><p>Add alerts from the live feed.</p></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Code</th><th>Species</th><th>Fisher</th><th>Qty (kg)</th><th>Price/kg</th><th>Deal</th><th></th></tr></thead>
              <tbody>
                {cartItems.map(item => {
                  const status = item.dealStatus ?? null
                  const isStale = status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED'
                  return (
                    <tr key={item.id}>
                      <td><span className="kbd">CA-{item.catchAlertId}</span></td>
                      <td>{item.speciesName ?? item.catchAlert?.speciesName ?? '—'}</td>
                      <td className="muted-data">{item.fishermanName ?? '—'}</td>
                      <td>{item.qtyKg} kg</td>
                      <td style={{fontFamily: 'var(--font-mono)'}}>₱{item.pricePerKg}</td>
                      <td>
                        {status == null && <span className="chip">No deal</span>}
                        {status === 'NEGOTIATING' && <span className="chip chip--accent">Negotiating</span>}
                        {isStale && <span className="chip">{status.charAt(0) + status.slice(1).toLowerCase()}</span>}
                        {status === 'AGREED' && <span className="chip chip--accent">Order placed</span>}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <div className="row" style={{gap: 6, justifyContent: 'flex-end'}}>
                          {status == null && (
                            <button
                              className="btn btn--accent btn--sm"
                              onClick={() => startDealFromItemMut.mutate(item.id)}
                              disabled={startDealFromItemMut.isPending}
                            >
                              <I.Arrow size={11} /> Start deal
                            </button>
                          )}
                          {status === 'NEGOTIATING' && (
                            <button
                              className="btn btn--sm"
                              onClick={() => navigate(`/vendor/messages?deal=${item.dealId}`)}
                            >
                              Open chat
                            </button>
                          )}
                          {isStale && (
                            <button
                              className="btn btn--accent btn--sm"
                              onClick={() => startDealFromItemMut.mutate(item.id)}
                              disabled={startDealFromItemMut.isPending}
                            >
                              Restart
                            </button>
                          )}
                          {status !== 'AGREED' && (
                            <button className="btn btn--ghost btn--sm" onClick={() => removeMut.mutate(item.id)} disabled={removeMut.isPending}>
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
        <div style={{marginTop: 18}}>
          <div className="row" style={{gap: 6, marginBottom: 16}}>
            {STATUS_FILTERS.map(s => {
              const active = s === 'all' ? statusFilter === null : statusFilter === s
              const count  = s === 'all' ? supplierOrders.length : supplierOrders.filter(o => o.status === s).length
              return (
                <button
                  key={s}
                  className={`chip ${active ? 'chip--ink' : ''}`}
                  style={{cursor: 'pointer'}}
                  onClick={() => setStatusFilter(s === 'all' ? null : s)}
                >
                  {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  <span style={{marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10}}>{count}</span>
                </button>
              )
            })}
          </div>
          {ordersQ.isLoading && <TableRowSkeleton rows={4} />}
          {ordersQ.error && <ApiError error={ordersQ.error} onRetry={ordersQ.refetch} />}
          {!ordersQ.isLoading && supplierOrders.length === 0 && (
            <div className="empty"><div className="empty__title">No orders yet</div><p>Orders you place from the live feed will appear here.</p></div>
          )}
          {supplierOrders.map(order => (
            <OrderCard key={order.id} order={order} viewerRole="BUYER" mutations={orderMutations} />
          ))}
        </div>
      )}

      {tab === 'credits' && (
        <div style={{marginTop: 18}}>
          {ordersQ.isLoading && <TableRowSkeleton rows={3} />}
          {!ordersQ.isLoading && creditOrders.length === 0 ? (
            <div className="empty">
              <div className="empty__title">No outstanding credits</div>
              <p>All credits have been settled. 🎉</p>
            </div>
          ) : (
            <div className="card">
              <div className="card__head"><div className="card__title">Outstanding credits</div><div className="card__sub">{creditOrders.length} unpaid</div></div>
              <table className="tbl">
                <thead><tr><th>Order</th><th>Fisherman</th><th>Species</th><th>Amount</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {creditOrders.map(o => (
                    <tr key={o.id}>
                      <td className="muted-data">#{o.id}</td>
                      <td>{o.seller?.fullName ?? o.sellerName ?? '—'}</td>
                      <td>{o.speciesName ?? '—'}</td>
                      <td><span className="data" style={{fontFamily: 'var(--font-mono)'}}>₱{(o.payment?.amount ?? 0).toLocaleString()}</span></td>
                      <td className="muted-data">{o.completedAt ? String(o.completedAt).split('T')[0] : '—'}</td>
                      <td style={{textAlign: 'right'}}>
                        <button className="btn btn--accent btn--sm" onClick={() => setSettleModal(o)}>Settle</button>
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
