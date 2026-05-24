import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import { I } from '../icons'
import {
  listInbox, exportOrders,
  confirmOrder, cancelOrder,
  recordPayment,
  raiseDispute,
  markPreparing, markReady, dispatchRider, markDelivered, completePickup,
} from './api/orders'

const IN_TRANSIT = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'AWAITING_RECEIPT']

function PageHead({ eyebrow, title, em, sub, actions }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="section-title">{title} {em && <em>{em}</em>}</h1>
        {sub && <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 560 }}>{sub}</p>}
      </div>
      <div className="page__actions">{actions}</div>
    </div>
  )
}

const statusChip = (s) => {
  if (s === 'PENDING')   return <span className="chip chip--prep">Pending</span>
  if (s === 'CONFIRMED') return <span className="chip chip--confirmed-lime">Confirmed</span>
  if (s === 'COMPLETED') return <span className="chip chip--ready">Completed</span>
  if (s === 'CANCELLED') return <span className="chip chip--cancel">Cancelled</span>
  if (IN_TRANSIT.includes(s)) return <span className="chip chip--prep">{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')}</span>
  return <span className="chip chip--done">{s}</span>
}

const pipeClass = (s) => {
  if (s === 'PENDING')   return 'pending'
  if (s === 'CONFIRMED') return 'confirmed'
  if (s === 'COMPLETED') return 'done'
  if (s === 'CANCELLED') return 'cancel'
  if (IN_TRANSIT.includes(s)) return 'confirmed'
  return ''
}

export default function OrdersInbox({ pageState, setPage }) {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortDesc, setSortDesc] = useState(true)
  const [ordersPage, setOrdersPage] = useState(0)
  const ORDERS_PAGE_SIZE = 8
  const buyerFilter = pageState?.buyerId ?? null

  const ordersQ = useQuery({
    queryKey: ['vendor', 'orders', { buyerId: buyerFilter }],
    queryFn: () => listInbox({ buyerId: buyerFilter ?? undefined }),
    refetchInterval: 4000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'orders'] })
  const invalidateAll = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['vendor', 'orders'] }),
    qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] }),
    qc.invalidateQueries({ queryKey: ['vendor', 'listings'] }),
    qc.invalidateQueries({ queryKey: ['vendor', 'home'] }),
    qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] }),
  ])

  const mutations = {
    confirmOrder:  (id)       => confirmOrder(id).then(invalidate),
    cancelOrder:   (id, r)    => cancelOrder(id, r).then(invalidate),
    markPreparing: (id)       => markPreparing(id).then(invalidate),
    markReady:     (id)       => markReady(id).then(invalidate),
    dispatchRider: (id)       => dispatchRider(id).then(invalidate),
    markDelivered: (id)       => markDelivered(id, {}).then(invalidateAll),
    completePickup:(id, codAmount) => completePickup(id, codAmount != null ? { codAmount } : {}).then(invalidateAll),
    recordPayment: (id, body) => recordPayment(id, body).then(invalidate),
    raiseDispute:  (id, body) => raiseDispute(id, body).then(invalidate),
  }

  const handleExport = async () => {
    try {
      const blob = await exportOrders({ status: statusFilter === 'all' ? undefined : statusFilter })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message ?? err}`)
    }
  }

  if (ordersQ.isLoading) return <div className="content"><OrderCardSkeleton /><OrderCardSkeleton /></div>
  if (ordersQ.error)     return <div className="content"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

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

  const counts = orders.reduce((acc, o) => {
    const key = IN_TRANSIT.includes(o.status) ? 'IN_TRANSIT' : o.status
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const pending   = counts.PENDING   || 0
  const confirmed = counts.CONFIRMED || 0
  const inTransit = counts.IN_TRANSIT || 0
  const completed = counts.COMPLETED || 0
  const cancelled = counts.CANCELLED || 0

  const totalOpen = orders
    .filter(o => !['CANCELLED', 'COMPLETED'].includes(o.status))
    .reduce((s, o) => s + (o.totalAmount ?? 0), 0)

  const filteredOrders = orders
    .filter(o => {
      if (statusFilter === 'all')        return true
      if (statusFilter === 'in-transit') return IN_TRANSIT.includes(o.status)
      return o.status === statusFilter
    })
    .sort((a, b) => {
      const ad = new Date(a.createdAt).getTime()
      const bd = new Date(b.createdAt).getTime()
      return sortDesc ? bd - ad : ad - bd
    })

  const isReady = (o) => o.status === 'READY' || o.handoffStatus === 'SELLER_READY' || o.subStatus === 'READY'

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Operations · Sales</>}
        title="Order"
        em="inbox"
        sub="Track every retail sale from confirmation to payment, with handoff and dispute tools."
        actions={<>
          <button className="btn" onClick={handleExport}><I.Arrow size={13} style={{ transform: 'rotate(90deg)' }} /> Export CSV</button>
          <button className="btn" onClick={() => setSortDesc(v => !v)}><I.Filter size={13} /> {sortDesc ? 'Newest' : 'Oldest'}</button>
        </>}
      />

      {buyerFilter && (
        <p style={{ margin: '-8px 0 12px', fontSize: 13, color: 'var(--muted)' }}>
          Filtered to buyer #{buyerFilter} ·{' '}
          <a href="#" style={{ color: 'var(--tide)' }} onClick={(e) => { e.preventDefault(); setPage?.('vorders', null) }}>clear filter</a>
        </p>
      )}

      {/* KPI strip */}
      <div className="kpi-strip">
        <div className="cell">
          <div className="l">Pending</div>
          <div className="v">{pending}</div>
          <div className="s">Awaiting confirm</div>
        </div>
        <div className="cell">
          <div className="l">Confirmed</div>
          <div className="v">{confirmed}</div>
          <div className="s">In progress</div>
        </div>
        <div className="cell">
          <div className="l">Completed · 7d</div>
          <div className="v">{orders.filter(o => o.status === 'COMPLETED' && new Date(o.completedAt || o.updatedAt).getTime() > sevenDaysAgo).length}</div>
          <div className="s">delivered &amp; paid</div>
        </div>
        <div className="cell">
          <div className="l">Cancelled</div>
          <div className="v">{cancelled}</div>
          <div className="s">last 7d</div>
        </div>
        <div className="cell">
          <div className="l">Open value</div>
          <div className="v">₱{(totalOpen / 1000).toFixed(1)}<small>k</small></div>
          <div className="s">across {orders.length} orders</div>
        </div>
      </div>

      {/* Pipeline card */}
      <div className="pipeline-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ font: '600 14px var(--font-display)' }}>Pipeline this week</div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>Distribution of open orders across stages</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span className="chip chip--done" style={{ padding: '4px 10px' }}>₱{(totalOpen / 1000).toFixed(1)}k open</span>
          </div>
        </div>
        <div className="pipeline-bars">
          <div className="pipeline-bar pending"   style={{ flex: pending   || 0.5 }} />
          <div className="pipeline-bar confirmed" style={{ flex: (confirmed + inTransit) || 0.5 }} />
          <div className="pipeline-bar transit"   style={{ flex: inTransit || 0.5 }} />
          <div className="pipeline-bar completed" style={{ flex: completed || 0.5 }} />
        </div>
        <div className="pipeline-labels">
          <span><span className="swatch" style={{ background: 'var(--tide)' }} /><strong>{pending}</strong>Pending</span>
          <span><span className="swatch" style={{ background: '#c2ef4e' }} /><strong>{confirmed}</strong>Confirmed</span>
          <span><span className="swatch" style={{ background: 'var(--accent-pink)' }} /><strong>{inTransit}</strong>In transit</span>
          <span><span className="swatch" style={{ background: 'var(--accent-violet-mid)' }} /><strong>{completed}</strong>Completed</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="filter-pills">
        {[
          { id: 'all',        label: 'All orders',  count: orders.length },
          { id: 'PENDING',    label: 'Pending',      count: pending },
          { id: 'CONFIRMED',  label: 'Confirmed',    count: confirmed },
          { id: 'in-transit', label: 'In transit',   count: inTransit },
          { id: 'COMPLETED',  label: 'Completed',    count: completed },
          { id: 'CANCELLED',  label: 'Cancelled',    count: cancelled },
        ].map(({ id, label, count }) => (
          <span
            key={id}
            className={`pill-btn${statusFilter === id ? ' on' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setStatusFilter(id); setOrdersPage(0) }}
          >
            {label}
            <span style={{ marginLeft: 6, opacity: 0.6, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{count}</span>
          </span>
        ))}
      </div>

      {/* Order cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredOrders.slice(ordersPage * ORDERS_PAGE_SIZE, (ordersPage + 1) * ORDERS_PAGE_SIZE).map(o => {
          const buyerName    = o.buyer?.fullName ?? o.buyerName ?? `Buyer #${o.buyerId ?? o.id}`
          const speciesName  = o.species?.commonName ?? o.speciesName ?? '—'
          const qty          = o.orderedQtyKg ?? o.qtyKg ?? 0
          const pricePerKg   = o.agreedPricePerKg ?? o.pricePerKg ?? 0
          const total        = o.totalAmount ?? (qty * pricePerKg)
          const pickupDate   = o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'
          const ready        = isReady(o)

          return (
            <div key={o.id} className="inbox-row">
              <div className={`inbox-row__pipe inbox-row__pipe--${pipeClass(o.status)}`} />
              {/* col 1 — identity */}
              <div className="inbox-row__identity">
                <div className="inbox-row__buyer">{buyerName} <span className="inbox-row__code">#{o.orderCode ?? o.id}</span></div>
                <div className="inbox-row__species">{speciesName} · pickup {pickupDate}</div>
              </div>
              {/* col 2 — status */}
              <div className="inbox-row__status">{statusChip(o.status)}</div>
              {/* col 3 — quantity */}
              <div className="inbox-row__metric inbox-row__metric--qty">
                <div className="inbox-row__qty">{qty}<small>kg</small></div>
                <div className="inbox-row__sub">{pricePerKg ? `₱${pricePerKg}/kg` : '—'}</div>
              </div>
              {/* col 4 — total */}
              <div className="inbox-row__metric inbox-row__metric--total">
                <div className="inbox-row__total">₱{Number(total).toLocaleString()}</div>
                <div className="inbox-row__sub">
                  {ready ? 'Ready' : o.status === 'CONFIRMED' ? 'Packing' : o.status === 'COMPLETED' ? 'Done' : ' '}
                </div>
              </div>
              {/* col 5 — actions */}
              <div className="inbox-row__actions">
                {o.status === 'PENDING' && (
                  <>
                    <button className="btn btn--sm btn--ghost" onClick={() => mutations.cancelOrder(o.id, 'Declined by vendor')}>Decline</button>
                    <button className="btn btn--sm btn--primary" onClick={() => mutations.confirmOrder(o.id)}>Confirm</button>
                  </>
                )}
                {o.status === 'CONFIRMED' && (
                  <button className="btn btn--sm btn--primary" onClick={() => mutations.markPreparing(o.id)}>Start packing</button>
                )}
                {o.status === 'PREPARING' && (
                  o.dispatchMode === 'DELIVERY'
                    ? <button className="btn btn--sm btn--primary" onClick={() => mutations.dispatchRider(o.id)}>Dispatch rider</button>
                    : <button className="btn btn--sm btn--primary" onClick={() => mutations.markReady(o.id)}>Mark ready</button>
                )}
                {o.status === 'READY' && o.dispatchMode !== 'DELIVERY' && (
                  <button className="btn btn--sm btn--primary" onClick={() => mutations.completePickup(o.id, o.totalAmount ?? (qty * pricePerKg))}>Confirm picked up</button>
                )}
                {o.status === 'READY' && o.dispatchMode === 'DELIVERY' && (
                  <span className="chip chip--prep" style={{ fontSize: 11 }}>Waiting for dispatch</span>
                )}
                {o.status === 'OUT_FOR_DELIVERY' && (
                  <span className="chip chip--prep" style={{ fontSize: 11 }}>Rider dispatched</span>
                )}
                {o.status === 'AWAITING_RECEIPT' && (
                  o.dispatchMode === 'DELIVERY'
                    ? <button className="btn btn--sm btn--primary" onClick={() => mutations.markDelivered(o.id)}>Confirm delivered</button>
                    : <button className="btn btn--sm btn--primary" onClick={() => mutations.completePickup(o.id, o.totalAmount ?? (qty * pricePerKg))}>Confirm picked up</button>
                )}
                {o.status === 'COMPLETED' && (
                  <button className="btn btn--sm"><I.Receipt size={11} /> Receipt</button>
                )}
                {o.status === 'CANCELLED' && (
                  <button className="btn btn--sm btn--ghost" onClick={() => mutations.confirmOrder(o.id)}>Reopen</button>
                )}
              </div>
            </div>
          )
        })}
        {filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 14 }}>
            No orders in this category
          </div>
        )}
      </div>
      {filteredOrders.length > ORDERS_PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: '1px solid var(--line)' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setOrdersPage(p => p - 1)} disabled={ordersPage === 0}>← Prev</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {ordersPage * ORDERS_PAGE_SIZE + 1}–{Math.min((ordersPage + 1) * ORDERS_PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => setOrdersPage(p => p + 1)} disabled={(ordersPage + 1) * ORDERS_PAGE_SIZE >= filteredOrders.length}>Next →</button>
        </div>
      )}

    </div>
  )
}
