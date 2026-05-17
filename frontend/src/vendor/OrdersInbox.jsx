import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import OrderCard from '../components/OrderCard'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import {
  listInbox, exportOrders,
  confirmOrder, cancelOrder,
  initiateHandoff, confirmHandoff,
  recordPayment,
  raiseDispute,
  markPreparing, markReady, dispatchRider, markDelivered, completePickup,
} from './api/orders'

const STATUS_FILTERS = ['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'DISPUTED', 'CANCELLED']

export default function OrdersInbox({ pageState, setPage }) {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortDesc, setSortDesc] = useState(true)
  const buyerFilter = pageState?.buyerId ?? null

  const ordersQ = useQuery({
    queryKey: ['vendor', 'orders', { buyerId: buyerFilter }],
    queryFn: () => listInbox({ buyerId: buyerFilter ?? undefined }),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'orders'] })

  const mutations = {
    confirmOrder:    (id)       => confirmOrder(id).then(invalidate),
    cancelOrder:     (id, r)    => cancelOrder(id, r).then(invalidate),
    initiateHandoff: (id, body) => initiateHandoff(id, body).then(invalidate),
    confirmHandoff:  (id)       => confirmHandoff(id).then(invalidate),
    recordPayment:   (id, body) => recordPayment(id, body).then(invalidate),
    raiseDispute:    (id, body) => raiseDispute(id, body).then(invalidate),
    markPreparing:   (id)       => markPreparing(id).then(invalidate),
    markReady:       (id)       => markReady(id).then(invalidate),
    dispatchRider:   (id)       => dispatchRider(id).then(invalidate),
    markDelivered:   (id, body) => markDelivered(id, body).then(invalidate),
    completePickup:  (id, body) => completePickup(id, body).then(invalidate),
  }

  const handleExport = async () => {
    try {
      const blob = await exportOrders({ status: statusFilter === 'all' ? undefined : statusFilter })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message ?? err}`)
    }
  }

  if (ordersQ.isLoading) return <div className="page"><OrderCardSkeleton /><OrderCardSkeleton /></div>
  if (ordersQ.error)     return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

  const normalize = (o) => ({
    ...o,
    orderCode:       o.orderCode ?? `ORD-${o.id}`,
    orderedQtyKg:    o.orderedQtyKg ?? o.qtyKg,
    agreedPricePerKg: o.agreedPricePerKg ?? o.pricePerKg,
    species:         o.species ?? (o.speciesName ? { commonName: o.speciesName } : null),
    buyer:           o.buyer   ?? (o.buyerName   ? { fullName:   o.buyerName   } : null),
  })

  const orders = (ordersQ.data ?? []).map(normalize)

  const pending   = orders.filter(o => o.status === 'PENDING').length
  const confirmed = orders.filter(o => o.status === 'CONFIRMED').length
  const inTransit = orders.filter(o => o.status === 'CONFIRMED' && o.handoff?.status === 'CONFIRMED' && !o.payment).length
  const completed = orders.filter(o => o.status === 'COMPLETED').length
  const totalValue = orders
    .filter(o => !['CANCELLED', 'DISPUTED'].includes(o.status))
    .reduce((a, o) => a + (o.totalAmount ?? (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)), 0)

  const base = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)
  const filtered = [...base].sort((a, b) => {
    const ad = new Date(a.createdAt).getTime()
    const bd = new Date(b.createdAt).getTime()
    return sortDesc ? bd - ad : ad - bd
  })

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Operations · Sales</div>
          <h1 className="page__title" style={{marginTop: 4}}><em>Orders</em></h1>
          <p className="page__sub">
            {buyerFilter
              ? <>Filtered to buyer #{buyerFilter} · <a href="#" onClick={(e) => { e.preventDefault(); setPage?.('vorders', null) }}>clear filter</a></>
              : 'Track every retail sale from confirmation to payment.'}
          </p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={handleExport}><I.Receipt size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Pending</div><div className="v">{pending}</div><div className="s">Awaiting your confirm</div></div>
        <div className="stat"><div className="l">Confirmed</div><div className="v">{confirmed}</div><div className="s">In progress</div></div>
        <div className="stat"><div className="l">In transit</div><div className="v">{inTransit}</div><div className="s">Awaiting payment</div></div>
        <div className="stat"><div className="l">Completed</div><div className="v">{completed}</div><div className="s">Last 7 days</div></div>
        <div className="stat"><div className="l">Open value</div><div className="v">₱{(totalValue/1000).toFixed(1)}k</div><div className="s">Across {orders.length} orders</div></div>
      </div>

      <div className="pipeline">
        <div className="card__head" style={{marginBottom: 0}}>
          <div>
            <div className="card__title">Pipeline this week</div>
            <div className="card__sub">Distribution of open orders across stages</div>
          </div>
          <span className="chip chip--ink">₱{(totalValue/1000).toFixed(1)}k open</span>
        </div>
        <div className="pipeline__bars">
          <div className="pipeline__bar" style={{ flex: pending || 1 }} />
          <div className="pipeline__bar" style={{ flex: confirmed || 1 }} />
          <div className="pipeline__bar" style={{ flex: inTransit || 1 }} />
          <div className="pipeline__bar" style={{ flex: completed || 1 }} />
        </div>
        <div className="pipeline__labels">
          <span><strong>{pending}</strong> Pending</span>
          <span><strong>{confirmed}</strong> Confirmed</span>
          <span><strong>{inTransit}</strong> In transit</span>
          <span><strong>{completed}</strong> Completed</span>
        </div>
      </div>

      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        {STATUS_FILTERS.map(s => {
          const active = statusFilter === s
          const count  = s === 'all' ? orders.length : orders.filter(o => o.status === s).length
          return (
            <button
              key={s}
              className={`chip ${active ? 'chip--ink' : ''}`}
              style={{ cursor: 'pointer', textTransform: s === 'all' ? 'capitalize' : 'none' }}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All orders' : s.charAt(0) + s.slice(1).toLowerCase()}
              <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {count}
              </span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button className="btn btn--sm btn--ghost" onClick={() => setSortDesc(v => !v)}>
          Sort: Date {sortDesc ? '↓' : '↑'}
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="empty" style={{ marginTop: 32 }}>
          <div className="empty__title">No orders yet</div>
          <p>Orders from buyers will appear here.</p>
        </div>
      )}
      {filtered.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          viewerRole="SELLER"
          mutations={mutations}
        />
      ))}
    </div>
  )
}

