import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFeed, getCart, addToCart, removeCartItem, checkout,
  listMySupplierOrders,
  initiateHandoff, confirmHandoff,
  recordPayment, confirmPayment,
  cancelOrder,
} from './api/procurement'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import { I } from '../icons'
import OrderCard from '../components/OrderCard'
import { useAuth } from '../context/AuthContext'

const STATUS_FILTERS = ['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'DISPUTED', 'CANCELLED']

export default function ProcurementFeed({ pageState }) {
  const [tab, setTab] = useState('feed')
  const [statusFilter, setStatusFilter] = useState(null)
  const watchlistFilter = pageState?.watchlistFilter ?? null

  const qc = useQueryClient()
  const { user } = useAuth()

  const feedQ   = useQuery({
    queryKey: ['vendor', 'feed', watchlistFilter],
    queryFn: () => getFeed(watchlistFilter?.speciesId),
  })
  const cartQ   = useQuery({ queryKey: ['vendor', 'cart'], queryFn: getCart })
  const ordersQ = useQuery({
    queryKey: ['vendor', 'supplierOrders', statusFilter],
    queryFn: () => listMySupplierOrders(statusFilter),
    enabled: tab === 'orders',
  })

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ['vendor', 'supplierOrders'] })

  const addMut      = useMutation({
    mutationFn: ({ catchAlertId, qtyKg }) => addToCart(catchAlertId, qtyKg, undefined),
    onSuccess:   () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }),
    onError:     (e) => alert(e?.message ?? 'Failed to add to cart'),
  })
  const removeMut   = useMutation({ mutationFn: (itemId) => removeCartItem(itemId),  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }) })
  const checkoutMut = useMutation({ mutationFn: checkout, onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }); invalidateOrders() } })

  // "Order now" = add this single item then immediately checkout, skipping the cart UI (Shopee-style buy now).
  const orderNowMut = useMutation({
    mutationFn: async (item) => {
      const qty = Number(item.availableKg)
      if (!qty || qty < 0.1) throw new Error('This alert has no remaining quantity')
      await addToCart(item.id, qty, undefined)
      return checkout()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'cart'] })
      invalidateOrders()
      setTab('orders')
    },
    onError: (e) => window.alert(e?.message ?? 'Failed to order'),
  })

  // Vendor is BUYER of these procurement orders — handoff confirm + payment confirm are buyer actions.
  const orderMutations = {
    confirmHandoff:  (id)       => confirmHandoff(id).then(invalidateOrders),
    confirmPayment:  (id)       => confirmPayment(id).then(invalidateOrders),
    initiateHandoff: (id, body) => initiateHandoff(id, body).then(invalidateOrders),
    recordPayment:   (id, body) => recordPayment(id, body).then(invalidateOrders),
    cancelOrder:     (id, r)    => cancelOrder(id, r).then(invalidateOrders),
  }

  const cartItems = Array.isArray(cartQ.data) ? cartQ.data : (cartQ.data?.items ?? [])

  const allOrders = ordersQ.data ?? []
  const supplierOrders = allOrders.filter(o => (o.buyer?.id ?? o.buyerId) === user?.id)

  const tabs = [
    { id: 'feed',   label: 'Live feed' },
    { id: 'cart',   label: `Cart (${cartItems.length})` },
    { id: 'orders', label: 'My orders' },
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
                      onClick={() => orderNowMut.mutate(a)}
                      disabled={orderNowMut.isPending || addMut.isPending || !canBuy}
                    >
                      <I.Arrow size={11} /> {orderNowMut.isPending ? 'Ordering…' : 'Order now'}
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
            <>
              <table className="tbl">
                <thead><tr><th>Code</th><th>Species</th><th>Fisher</th><th>Qty (kg)</th><th>Price/kg</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {cartItems.map(item => (
                    <tr key={item.id}>
                      <td><span className="kbd">CA-{item.catchAlertId}</span></td>
                      <td>{item.speciesName ?? item.catchAlert?.speciesName ?? '—'}</td>
                      <td className="muted-data">{item.fishermanName ?? '—'}</td>
                      <td>{item.qtyKg} kg</td>
                      <td style={{fontFamily: 'var(--font-mono)'}}>₱{item.pricePerKg}</td>
                      <td style={{fontFamily: 'var(--font-mono)'}}>₱{((item.qtyKg ?? 0) * (item.pricePerKg ?? 0)).toLocaleString()}</td>
                      <td style={{textAlign: 'right'}}>
                        <button className="btn btn--ghost btn--sm" onClick={() => removeMut.mutate(item.id)} disabled={removeMut.isPending}>
                          <I.Trash size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row" style={{justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 14, padding: '14px 0 0', borderTop: '1px solid var(--line)'}}>
                <div>
                  <div className="eyebrow">Grand total</div>
                  <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>
                    ₱{cartItems.reduce((sum, item) => sum + (item.qtyKg ?? 0) * (item.pricePerKg ?? 0), 0).toLocaleString()}
                  </div>
                </div>
                <button className="btn btn--primary" onClick={() => checkoutMut.mutate()} disabled={checkoutMut.isPending}>
                  {checkoutMut.isPending ? 'Placing…' : <>Place procurement orders <I.Arrow size={12} /></>}
                </button>
              </div>
            </>
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

    </div>
  )
}
