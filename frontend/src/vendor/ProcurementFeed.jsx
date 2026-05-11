import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeed, getCart, addToCart, removeCartItem, checkout, listProcurementOrders } from './api/procurement'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import { I } from '../icons'

export default function ProcurementFeed() {
  const [tab, setTab] = useState('feed')
  const [bucket, setBucket] = useState('PENDING')

  const qc = useQueryClient()
  const feedQ   = useQuery({ queryKey: ['vendor', 'feed'],            queryFn: () => getFeed() })
  const cartQ   = useQuery({ queryKey: ['vendor', 'cart'],            queryFn: getCart })
  const ordersQ = useQuery({
    queryKey: ['vendor', 'procOrders', bucket],
    queryFn: () => listProcurementOrders(tab === 'orders' ? bucket : undefined),
    enabled: tab === 'orders',
  })

  const addMut      = useMutation({ mutationFn: ({ catchAlertId, qtyKg }) => addToCart(catchAlertId, qtyKg, undefined), onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }) })
  const removeMut   = useMutation({ mutationFn: (itemId) => removeCartItem(itemId),  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }) })
  const checkoutMut = useMutation({ mutationFn: checkout, onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }); qc.invalidateQueries({ queryKey: ['vendor', 'procOrders'] }) } })

  const cartItems = cartQ.data?.items ?? []

  const tabs = [
    { id: 'feed',   label: 'Live feed' },
    { id: 'cart',   label: `Cart (${cartItems.length})` },
    { id: 'orders', label: 'My procurement orders' },
  ]

  const ORDER_BUCKETS = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED', 'DISPUTED']
  const statusMap = { CONFIRMED: 'confirmed', AT_SEA: 'active', COMPLETED: 'completed', PENDING: 'pending', ACCEPTED: 'active', READY: 'active', CANCELLED: 'cancelled', DISPUTED: 'disputed' }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Procurement</div>
          <h1 className="page__title" style={{marginTop: 4}}>Source <em>fresh catch</em></h1>
          <p className="page__sub">Live alerts from fishermen, your watchlist matched first.</p>
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
              const inCart = cartQ.data?.items?.some(i => i.catchAlertId === a.id)
              return (
                <div key={a.id} className="alert-card">
                  <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                    <span className="kbd">CA-{a.id}</span>
                    {a.matchScore != null && (
                      <span className="chip chip--accent" style={{fontSize: 10}}>{a.matchScore}% match</span>
                    )}
                  </div>
                  <div className="alert-card__species" style={{fontSize: 18}}>{a.speciesName}</div>
                  <div className="alert-card__sub">{a.fishermanName}</div>
                  <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8}}>
                    <div className="kpi"><div className="kpi__label">Qty</div><div className="kpi__value">{a.availableKg}<small>kg</small></div></div>
                    <div className="kpi"><div className="kpi__label">Price</div><div className="kpi__value">₱{a.pricePerKg}</div></div>
                    <div className="kpi"><div className="kpi__label">Expires</div><div className="kpi__value" style={{fontSize: 13}}>{a.expiresAt ? new Date(a.expiresAt).toLocaleString() : '—'}</div></div>
                  </div>
                  <div className="row" style={{gap: 6, marginTop: 12}}>
                    <button className="btn btn--ghost btn--sm" style={{flex: 1}}>View detail</button>
                    <button
                      className={`btn btn--sm ${inCart ? '' : 'btn--accent'}`}
                      style={{flex: 1}}
                      onClick={() => addMut.mutate({ catchAlertId: a.id, qtyKg: a.availableKg })}
                      disabled={!!inCart || addMut.isPending || a.availableKg == null}
                    >
                      {inCart ? <><I.Check size={11} /> In cart</> : <><I.Plus size={11} /> Add to cart</>}
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
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head">
            <div className="card__title">Procurement orders</div>
            <div className="seg">
              {ORDER_BUCKETS.map(b => (
                <button key={b} className={bucket === b ? 'on' : ''} onClick={() => setBucket(b)}>
                  {b.charAt(0) + b.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {ordersQ.isLoading && <TableRowSkeleton rows={4} />}
          {ordersQ.error && <ApiError error={ordersQ.error} onRetry={ordersQ.refetch} />}
          {!ordersQ.isLoading && (ordersQ.data ?? []).length === 0 && (
            <div className="empty"><div className="empty__title">No {bucket.toLowerCase()} orders</div></div>
          )}
          {(ordersQ.data ?? []).length > 0 && (
            <table className="tbl">
              <thead><tr><th>ID</th><th>Date</th><th>Species</th><th>Fisher</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {(ordersQ.data ?? []).map(o => (
                  <tr key={o.id}>
                    <td><span className="kbd">#{o.id}</span></td>
                    <td className="muted-data">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td>{o.speciesName ?? '—'}</td>
                    <td>{o.fishermanName ?? '—'}</td>
                    <td>{o.qtyKg} kg</td>
                    <td style={{fontFamily: 'var(--font-mono)'}}>₱{((o.qtyKg ?? 0) * (o.pricePerKg ?? 0)).toLocaleString()}</td>
                    <td><span className={`status status--${statusMap[o.status] ?? ''}`}><span className="status__dot" /> {o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
