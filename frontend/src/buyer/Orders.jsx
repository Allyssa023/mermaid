import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listOrders, cancelOrder, reorder, confirmReceipt, disputeOrder } from './api/orders'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import ReviewModal from './components/ReviewModal'

export default function Orders() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('active')
  const [reviewOrder, setReviewOrder] = useState(null)
  const [reviewedIds, setReviewedIds] = useState(() => new Set())

  const statusParam =
    tab === 'active'    ? undefined :
    tab === 'completed' ? 'COMPLETED' : 'CANCELLED'

  const ordersQ = useQuery({
    queryKey: ['buyerOrders', tab],
    queryFn: () => listOrders(statusParam),
    staleTime: 30_000,
  })

  const cancelMut = useMutation({
    mutationFn: (id) => cancelOrder(id, 'Buyer cancelled'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyerOrders'] }),
  })
  const reorderMut = useMutation({
    mutationFn: (id) => reorder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyerOrders'] }),
  })

  if (ordersQ.isLoading) return <div className="page"><TableRowSkeleton /></div>
  if (ordersQ.error)     return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

  const all = ordersQ.data ?? []
  const orders = tab === 'active'
    ? all.filter(o => ['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT'].includes(o.status))
    : all

  const totalSpent = all.filter(o => o.status === 'COMPLETED')
    .reduce((s, o) => s + (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0), 0)
  const totalKg = all.filter(o => o.status === 'COMPLETED')
    .reduce((s, o) => s + (o.orderedQtyKg ?? 0), 0)
  const activeCount    = all.filter(o => ['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT'].includes(o.status)).length
  const completedCount = all.filter(o => o.status === 'COMPLETED').length
  const cancelledCount = all.filter(o => o.status === 'CANCELLED').length

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchases</div>
          <h1 className="page__title" style={{marginTop: 4}}>My <em>Orders</em></h1>
          <p className="page__sub">{all.length} total orders · ₱{Math.round(totalSpent).toLocaleString()} spent on {Math.round(totalKg)}kg.</p>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Active orders</div><div className="v">{activeCount}</div><div className="s">{all.filter(o=>o.status==='PENDING').length} awaiting confirm</div></div>
        <div className="stat"><div className="l">Completed</div><div className="v">{completedCount}</div><div className="s">All time</div></div>
        <div className="stat"><div className="l">Total spent</div><div className="v">₱{(totalSpent/1000).toFixed(1)}<small>k</small></div><div className="s">Lifetime value</div></div>
        <div className="stat"><div className="l">Total received</div><div className="v">{Math.round(totalKg)}<small>kg</small></div><div className="s">Across {completedCount} orders</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({activeCount})</button>
            <button className={tab==='completed'?'on':''} onClick={()=>setTab('completed')}>Completed ({completedCount})</button>
            <button className={tab==='cancelled'?'on':''} onClick={()=>setTab('cancelled')}>Cancelled ({cancelledCount})</button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="empty" style={{padding: '32px 0'}}>No {tab} orders.</div>
        ) : (
          <div className="orders-list">
            {orders.map(o => {
              const total = (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)
              const st = o.status?.toLowerCase() ?? 'pending'
              return (
                <div key={o.id} className="order-row">
                  <div className="order-row__head">
                    <div>
                      <div className="row" style={{gap: 8, alignItems: 'baseline'}}>
                        <span className="kbd">{o.orderCode ?? `ORD-${o.id}`}</span>
                        <strong>{o.speciesName ?? o.species?.commonName}</strong>
                        {o.sellerName && <span className="muted-data">· from {o.sellerName}</span>}
                      </div>
                      <div className="muted-data" style={{marginTop: 4}}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'} · {o.dispatchMode ?? 'PICKUP'}
                      </div>
                    </div>
                    <span className={`status status--${st}`}><span className="status__dot" /> {o.status}</span>
                  </div>
                  <div className="order-row__stats">
                    <div><div className="l">Quantity</div><div className="v">{o.orderedQtyKg}<small>kg</small></div></div>
                    <div><div className="l">Price/kg</div><div className="v">₱{o.agreedPricePerKg}</div></div>
                    <div><div className="l">Total</div><div className="v">₱{Math.round(total).toLocaleString()}</div></div>
                  </div>
                  <div className="order-row__foot">
                    <span className="muted-data">
                      {o.status === 'PREPARING'        ? 'Being prepared' :
                       o.status === 'OUT_FOR_DELIVERY' ? (o.dispatchMode === 'DELIVERY' ? 'On the way — confirm when received' : 'On the way') :
                       o.status === 'AWAITING_RECEIPT' ? (o.dispatchMode === 'DELIVERY' ? 'Receipt confirmed — waiting for vendor' : 'Ready for pickup — confirm you received it') :
                       o.notes ?? 'Awaiting next step'}
                    </span>
                    <div className="row" style={{gap: 6}}>
                      {o.status === 'PENDING' && (
                        <button className="btn btn--ghost btn--sm" disabled={cancelMut.isPending}
                          onClick={() => cancelMut.mutate(o.id)}>Cancel</button>
                      )}
                      {o.status === 'COMPLETED' && (
                        <button className="btn btn--ghost btn--sm" disabled={reorderMut.isPending}
                          onClick={() => reorderMut.mutate(o.id)}>Re-order</button>
                      )}
                      {o.status === 'COMPLETED' && !reviewedIds.has(o.id) && (
                        <button className="btn btn--accent btn--sm" onClick={() => setReviewOrder(o)}>
                          Leave a Review
                        </button>
                      )}
                      {o.status === 'COMPLETED' && reviewedIds.has(o.id) && (
                        <span className="chip chip--safe" style={{ fontSize: 12 }}>Nice! You left a review!</span>
                      )}
                      {o.status === 'OUT_FOR_DELIVERY' && o.dispatchMode === 'DELIVERY' && (
                        <button className="btn btn--primary btn--sm"
                          onClick={() => confirmReceipt(o.id).then(() => qc.invalidateQueries({ queryKey: ['buyerOrders'] }))}>
                          Order Received
                        </button>
                      )}
                      {o.status === 'AWAITING_RECEIPT' && o.dispatchMode !== 'DELIVERY' && (
                        <button className="btn btn--primary btn--sm"
                          onClick={() => confirmReceipt(o.id).then(() => qc.invalidateQueries({ queryKey: ['buyerOrders'] }))}>
                          Order Received
                        </button>
                      )}
                      {o.status === 'AWAITING_RECEIPT' && (
                        <button className="btn btn--ghost btn--sm"
                          style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                          onClick={() => {
                            const reason = window.prompt('Describe the issue (min 10 chars):')
                            if (reason && reason.length >= 10) {
                              disputeOrder(o.id, { reason }).then(() => qc.invalidateQueries({ queryKey: ['buyerOrders'] }))
                            }
                          }}>
                          Raise Dispute
                        </button>
                      )}
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
          existing={null}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ['buyerOrders'] })
            setReviewedIds(prev => new Set(prev).add(reviewOrder.id))
          }}
        />
      )}
    </div>
  )
}
