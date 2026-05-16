import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import {
  listOrders, confirmOrder, cancelOrder,
  initiateHandoff, confirmHandoff, recordPayment,
  confirmPayment, raiseDispute, initiateOrderPayout,
} from './api/orders'
import {
  acceptOrder, markReady, completeOrder,
  cancelOrder as procureCancelOrder,
} from './api/procurement'
import OrderCard from '../components/OrderCard'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState(null)

  const qc = useQueryClient()

  const ordersQ = useQuery({
    queryKey: ['fisherman', 'orders', statusFilter],
    queryFn: () => listOrders(statusFilter),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fisherman', 'orders'] })

  const mutations = {
    confirmOrder:    (id)       => confirmOrder(id).then(invalidate),
    cancelOrder:     (id, r)    => cancelOrder(id, r).then(invalidate),
    initiateHandoff: (id, body) => initiateHandoff(id, body).then(invalidate),
    confirmHandoff:  (id)       => confirmHandoff(id).then(invalidate),
    recordPayment:   (id, body) => recordPayment(id, body).then(invalidate),
    confirmPayment:  (id)       => confirmPayment(id).then(invalidate),
    raiseDispute:    (id, body) => raiseDispute(id, body).then(invalidate),
    initiatePayout:  (id, body) => initiateOrderPayout(id, body).then(invalidate),
    procureAccept:   (id)       => acceptOrder(id).then(invalidate),
    procureReady:    (id)       => markReady(id).then(invalidate),
    procureComplete: (id)       => completeOrder(id).then(invalidate),
    procureCancel:   (id, r)    => procureCancelOrder(id, r).then(invalidate),
  }

  if (ordersQ.isLoading) return (
    <div className="page">
      <OrderCardSkeleton />
      <OrderCardSkeleton />
    </div>
  )
  if (ordersQ.error) return (
    <div className="page">
      <ApiError error={ordersQ.error} onRetry={ordersQ.refetch} />
    </div>
  )

  const orders = ordersQ.data ?? []

  const pending   = orders.filter(o => o.status === 'PENDING').length
  const confirmed = orders.filter(o => o.status === 'CONFIRMED').length
  const completed = orders.filter(o => o.status === 'COMPLETED').length
  const inTransit = orders.filter(o => o.handoff?.status === 'CONFIRMED' && o.status === 'CONFIRMED').length
  const totalValue = orders
    .filter(o => !['CANCELLED', 'DISPUTED'].includes(o.status))
    .reduce((a, o) => a + (o.totalAmount ?? (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)), 0)

  const STATUS_FILTERS = ['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'DISPUTED', 'CANCELLED']

  const filtered = statusFilter === null
    ? orders
    : orders.filter(o => o.status === statusFilter)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            <em>Orders</em>
          </h1>
          <p className="page__sub">Track every confirmed sale from matched alert to delivery.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Receipt size={14} /> Export</button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Pending</div>
          <div className="v">{pending}</div>
          <div className="s">Awaiting buyer confirm</div>
        </div>
        <div className="stat">
          <div className="l">Confirmed</div>
          <div className="v">{confirmed}</div>
          <div className="s">Ready for pickup</div>
        </div>
        <div className="stat">
          <div className="l">In transit</div>
          <div className="v">{inTransit}</div>
          <div className="s">En route to buyer</div>
        </div>
        <div className="stat">
          <div className="l">Completed this week</div>
          <div className="v">{completed}</div>
          <div className="s">Last 7 days</div>
        </div>
        <div className="stat">
          <div className="l">Open value</div>
          <div className="v">₱{(totalValue / 1000).toFixed(1)}k</div>
          <div className="s">Across {orders.length} orders</div>
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="pipeline">
        <div className="card__head" style={{ marginBottom: 0 }}>
          <div>
            <div className="card__title">Pipeline this week</div>
            <div className="card__sub">Distribution of open orders across stages</div>
          </div>
          <span className="chip chip--ink">₱{(totalValue / 1000).toFixed(1)}k open</span>
        </div>
        <div className="pipeline__bars">
          <div className="pipeline__bar" style={{ flex: pending || 1 }} />
          <div className="pipeline__bar" style={{ flex: confirmed || 1 }} />
          <div className="pipeline__bar" style={{ flex: inTransit || 1 }} />
          <div className="pipeline__bar" style={{ flex: completed || 1 }} />
        </div>
        <div className="pipeline__labels">
          <span><strong>{pending}</strong> Awaiting</span>
          <span><strong>{confirmed}</strong> Confirmed</span>
          <span><strong>{inTransit}</strong> In transit</span>
          <span><strong>{completed}</strong> Delivered</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        {STATUS_FILTERS.map(s => {
          const active = s === 'all' ? statusFilter === null : statusFilter === s
          const count  = s === 'all' ? orders.length : orders.filter(o => o.status === s).length
          return (
            <button
              key={s}
              className={`chip ${active ? 'chip--ink' : ''}`}
              style={{ cursor: 'pointer', textTransform: s === 'all' ? 'capitalize' : 'none' }}
              onClick={() => setStatusFilter(s === 'all' ? null : s)}
            >
              {s === 'all' ? 'All orders' : s.charAt(0) + s.slice(1).toLowerCase()}
              <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 && (
        <div className="empty" style={{ marginTop: 32 }}>
          <div className="empty__title">No orders yet</div>
          <p>Orders from vendors will appear here.</p>
        </div>
      )}
      {filtered.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          currentRole="FISHERMAN"
          mutations={mutations}
        />
      ))}
    </div>
  )
}
