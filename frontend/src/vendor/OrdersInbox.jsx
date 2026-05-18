import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

const IN_TRANSIT = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'AWAITING_RECEIPT']

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
    orderCode:        o.orderCode ?? `ORD-${o.id}`,
    orderedQtyKg:     o.orderedQtyKg ?? o.qtyKg,
    agreedPricePerKg: o.agreedPricePerKg ?? o.pricePerKg,
    species:          o.species ?? (o.speciesName ? { commonName: o.speciesName } : null),
    buyer:            o.buyer   ?? (o.buyerName   ? { fullName:   o.buyerName   } : null),
  })

  const orders = (ordersQ.data ?? []).map(normalize)
  const sevenDaysAgo = Date.now() - 7 * 86400 * 1000

  const buckets = {
    pending:   orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    inTransit: orders.filter(o => IN_TRANSIT.includes(o.status)).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  }
  const bucketTotal = Math.max(1, buckets.pending + buckets.confirmed + buckets.inTransit + buckets.completed)

  const filteredOrders = orders
    .filter(o => {
      if (statusFilter === 'all')        return true
      if (statusFilter === 'in-transit') return IN_TRANSIT.includes(o.status)
      return o.status === statusFilter.toUpperCase()
    })
    .sort((a, b) => {
      const ad = new Date(a.createdAt).getTime()
      const bd = new Date(b.createdAt).getTime()
      return sortDesc ? bd - ad : ad - bd
    })

  return (
    <div>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Order <em>inbox</em></h1>
          {buyerFilter && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-4)' }}>
              Filtered to buyer #{buyerFilter} ·{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setPage?.('vorders', null) }}>clear filter</a>
            </p>
          )}
        </div>
        <div className="v-page-header__actions">
          <button className="v-btn v-btn--ghost v-btn--sm" onClick={handleExport}>Export CSV</button>
          <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setSortDesc(v => !v)}>
            Date {sortDesc ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Pending',      value: buckets.pending },
          { label: 'Confirmed',    value: buckets.confirmed },
          { label: 'Completed 7d', value: orders.filter(o => o.status === 'COMPLETED' && new Date(o.completedAt || o.updatedAt).getTime() > sevenDaysAgo).length },
          { label: 'Cancelled 7d', value: orders.filter(o => o.status === 'CANCELLED' && new Date(o.updatedAt).getTime() > sevenDaysAgo).length },
          { label: 'Open value',   value: `₱${orders.filter(o => !['COMPLETED','CANCELLED','DISPUTED'].includes(o.status)).reduce((s, o) => s + (o.totalAmount ?? 0), 0).toFixed(0)}` },
        ].map(({ label, value }) => (
          <div key={label} className="v-kpi-cell">
            <div className="v-kpi-cell__label">{label}</div>
            <div className="v-kpi-cell__value v-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline visualizer */}
      <div className="v-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4, height: 36, alignItems: 'stretch', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Pending',    count: buckets.pending,   color: 'var(--accent-lime)' },
            { label: 'Confirmed',  count: buckets.confirmed, color: 'var(--tide, #5ec8e6)' },
            { label: 'In transit', count: buckets.inTransit, color: 'var(--coral, #ff8a6b)' },
            { label: 'Completed',  count: buckets.completed, color: 'var(--accent-violet-mid)' },
          ].map(b => (
            <div key={b.label}
              style={{
                flex: Math.max(0.5, b.count / bucketTotal),
                background: b.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 8px', minWidth: 60, transition: 'flex 0.4s ease',
              }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0e0820', whiteSpace: 'nowrap' }}>
                {b.label} {b.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="v-tabs" style={{ marginBottom: 16 }}>
        {['all', 'pending', 'confirmed', 'in-transit', 'completed', 'cancelled'].map(f => (
          <button key={f}
            className={`v-tab${statusFilter === f ? ' v-tab--on' : ''}`}
            onClick={() => setStatusFilter(f)}>
            {f === 'in-transit' ? 'In transit' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Order cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredOrders.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            viewerRole="SELLER"
            mutations={mutations}
          />
        ))}
        {filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32, fontSize: 14 }}>
            No orders in this category
          </div>
        )}
      </div>
    </div>
  )
}
