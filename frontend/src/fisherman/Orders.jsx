import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
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

// ── Status filter config ────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: null,        label: 'All' },
  { key: 'PENDING',   label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrdersPage({ setPage }) {
  const [statusFilter, setStatusFilter] = useState(null)
  const cardRefs = useRef([])
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

  // GSAP stagger animation on mount / data change
  useEffect(() => {
    const els = cardRefs.current.filter(Boolean)
    if (els.length === 0) return
    gsap.from(els, {
      opacity: 0,
      y: 16,
      duration: 0.35,
      stagger: 0.07,
      ease: 'power2.out',
      clearProps: 'all',
    })
  }, [ordersQ.data, statusFilter])

  // ── Loading / error states ─────────────────────────────────────────────────

  if (ordersQ.isLoading) {
    return (
      <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--bg-canvas)' }}>
        <div data-testid="order-skeleton"><OrderCardSkeleton /></div>
        <div data-testid="order-skeleton"><OrderCardSkeleton /></div>
      </div>
    )
  }

  if (ordersQ.error) {
    return (
      <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--bg-canvas)' }}>
        <ApiError error={ordersQ.error} onRetry={ordersQ.refetch} />
      </div>
    )
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  const orders = ordersQ.data ?? []

  const filtered = statusFilter === null
    ? orders
    : orders.filter(o => o.status === statusFilter)

  // Reset ref array length to match filtered list
  cardRefs.current = cardRefs.current.slice(0, filtered.length)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--bg-canvas)' }}>

      {/* Page heading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
          Operations
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Orders
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Track every confirmed sale from matched alert to delivery.
        </p>
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = statusFilter === key
          const count = key === null
            ? orders.length
            : orders.filter(o => o.status === key).length
          return (
            <button
              key={String(key)}
              className={`f-chip ${active ? 'f-chip--lime' : 'f-chip--muted'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setStatusFilter(key)}
            >
              {label}
              <span style={{ marginLeft: 5, opacity: 0.65, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="f-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No orders yet</div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Orders from vendors will appear here.
          </p>
        </div>
      )}

      {/* Orders list */}
      {filtered.map((order, i) => (
        <div
          key={order.id}
          className="f-card"
          style={{ marginBottom: 12 }}
          ref={el => { cardRefs.current[i] = el }}
        >
          <OrderCard
            order={order}
            currentRole="FISHERMAN"
            mutations={mutations}
          />
        </div>
      ))}
    </div>
  )
}
