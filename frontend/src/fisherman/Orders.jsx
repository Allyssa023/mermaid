import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import {
  listOrders, confirmOrder, cancelOrder,
  initiateHandoff, confirmPayment, initiateOrderPayout,
} from './api/orders'
import InitiateHandoffModal from '../components/modals/InitiateHandoffModal'
import InitiatePayoutModal  from '../components/modals/InitiatePayoutModal'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED']
const PAGE_SIZE = 10

function Pager({ page, total, onPage }) {
  if (total <= 1) return null
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="pager__info">{page} of {total}</span>
      <button className="pager__btn" disabled={page >= total} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

const statusChip = (status) => {
  if (status === 'COMPLETED') return 'chip--safe'
  if (status === 'DISPUTED')  return 'chip--unsafe'
  if (status === 'PENDING')   return 'chip--caution'
  if (status === 'CONFIRMED') return 'chip--violet'
  return 'chip--muted'
}

const handoffChip = (h) => {
  if (!h) return null
  const s = h.status ?? h
  return s === 'CONFIRMED' ? 'chip--safe' : 'chip--violet'
}

const paymentChip = (p) => {
  if (!p) return null
  return (p.method ?? p) === 'CASH' ? 'chip--safe' : 'chip--caution'
}

function InlineActions({ o, mutations, onOpenModal }) {
  if (o.status === 'PENDING') {
    return (
      <>
        <button className="btn btn--sm btn--ghost" onClick={() => mutations.cancelOrder(o.id, 'Declined by fisherman')}>Decline</button>
        <button className="btn btn--sm btn--primary" onClick={() => mutations.confirmOrder(o.id)}>Accept</button>
      </>
    )
  }
  if (o.status === 'CONFIRMED') {
    if (!o.handoff) {
      return (
        <button className="btn btn--sm btn--primary" onClick={() => onOpenModal(o, 'HANDOFF')}>
          Start Handoff
        </button>
      )
    }
    const hStatus = o.handoff?.status ?? o.handoff
    if (hStatus === 'PENDING') {
      return <span className="chip chip--caution" style={{ fontSize: 11 }}>Awaiting buyer</span>
    }
    if (o.payment && o.payment.status !== 'SETTLED') {
      return (
        <button className="btn btn--sm btn--primary" onClick={() => mutations.confirmPayment(o.id)}>
          Confirm Payment
        </button>
      )
    }
    return null
  }
  if (o.status === 'COMPLETED') {
    return (
      <button className="btn btn--sm btn--ghost" onClick={() => onOpenModal(o, 'PAYOUT')}>
        Get Payout
      </button>
    )
  }
  return null
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage2] = useState(1)
  const [modal, setModal] = useState(null) // { order, type }
  const [submitting, setSubmitting] = useState(false)
  const qc = useQueryClient()

  const ordersQ = useQuery({
    queryKey: ['fisherman', 'orders'],
    queryFn: () => listOrders(null),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fisherman', 'orders'] })

  const mutations = {
    confirmOrder:   (id)       => confirmOrder(id).then(invalidate),
    cancelOrder:    (id, r)    => cancelOrder(id, r).then(invalidate),
    confirmPayment: (id)       => confirmPayment(id).then(invalidate),
  }

  if (ordersQ.isLoading) {
    return (
      <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
        <OrderCardSkeleton /><OrderCardSkeleton />
      </div>
    )
  }
  if (ordersQ.error) {
    return (
      <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
        <ApiError error={ordersQ.error} onRetry={ordersQ.refetch} />
      </div>
    )
  }

  const orders = ordersQ.data ?? []
  const filtered = statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter)

  const stats = {
    pending:   orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    disputed:  orders.filter(o => o.status === 'DISPUTED').length,
    total:     orders.reduce((s, o) => s + (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0), 0),
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagedRows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function runModal(fn) {
    setSubmitting(true)
    try { await fn() }
    finally { setSubmitting(false); setModal(null) }
  }

  return (
    <div className="fade-in" style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Operations</div>
          <h1 className="page__title"><em className="chip-lime">Orders</em></h1>
          <p className="page__sub">Status flow · pickup handoff · payment confirmation · payout</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><I.Note size={12} /> Export</button>
          <button className="btn btn--ghost"><I.Filter size={12} /> Filter</button>
        </div>
      </div>

      <div className="grid--kpi" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 22 }}>
        <div className="kpi"><div className="kpi__label">Pending</div><div className="kpi__value" style={{ color: 'var(--caution)' }}>{stats.pending}</div><div className="kpi__foot">awaiting confirmation</div></div>
        <div className="kpi"><div className="kpi__label">Confirmed</div><div className="kpi__value">{stats.confirmed}</div><div className="kpi__foot">in progress</div></div>
        <div className="kpi"><div className="kpi__label">Completed</div><div className="kpi__value" style={{ color: 'var(--safe)' }}>{stats.completed}</div><div className="kpi__foot">last 30d</div></div>
        <div className="kpi"><div className="kpi__label">Disputed</div><div className="kpi__value" style={{ color: 'var(--unsafe)' }}>{stats.disputed}</div><div className="kpi__foot">needs response</div></div>
        <div className="kpi"><div className="kpi__label">Total value</div><div className="kpi__value">₱{(stats.total / 1000).toFixed(1)}<small>k</small></div><div className="kpi__foot">all orders</div></div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        {STATUS_FILTERS.map(s => {
          const count = s === 'ALL' ? orders.length : orders.filter(o => o.status === s).length
          return (
            <button key={s}
              className={`tabs__item${statusFilter === s ? ' tabs__item--on' : ''}`}
              onClick={() => { setStatusFilter(s); setPage2(1) }}>
              {s} <span className="tabs__item-count">{count}</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink-1)' }}>No orders here</div>
          <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 13 }}>Orders from vendors will appear here.</p>
        </div>
      ) : (
        <>
          <div className="card card--flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th><th>Vendor</th><th>Species</th>
                  <th>Qty</th><th>Price</th><th>Total</th>
                  <th>Payment</th><th>Handoff</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map(o => {
                  const qty    = o.orderedQtyKg ?? 0
                  const price  = o.agreedPricePerKg ?? 0
                  const total  = qty * price
                  const pmChip = paymentChip(o.payment)
                  const hfChip = handoffChip(o.handoff)
                  const hfLabel = o.handoff?.status ?? (typeof o.handoff === 'string' ? o.handoff : null)
                  const pmLabel = o.payment?.method ?? (typeof o.payment === 'string' ? o.payment : null)
                  return (
                    <tr key={o.id}>
                      <td>
                        <kbd>{o.orderCode ?? `O-${o.id}`}</kbd>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
                        </div>
                      </td>
                      <td><strong>{o.buyer?.fullName ?? o.vendorName ?? '—'}</strong></td>
                      <td>{o.species?.commonName ?? o.speciesName ?? '—'}</td>
                      <td className="mono">{qty ? `${qty}kg` : '—'}</td>
                      <td className="mono">{price ? `₱${price}` : '—'}</td>
                      <td className="mono"><strong>{total ? `₱${total.toLocaleString('en-PH')}` : '—'}</strong></td>
                      <td>
                        {pmChip && pmLabel
                          ? <span className={`chip ${pmChip}`}>{pmLabel}</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        {hfChip && hfLabel
                          ? <span className={`chip ${hfChip}`}><span className="chip__dot" />{hfLabel}</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        <span className={`chip ${statusChip(o.status)}`}>
                          <span className="chip__dot" />{o.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <InlineActions
                            o={o}
                            mutations={mutations}
                            onOpenModal={(order, type) => setModal({ order, type })}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={totalPages} onPage={setPage2} />
        </>
      )}

      {modal?.type === 'HANDOFF' && (
        <InitiateHandoffModal
          order={modal.order}
          loading={submitting}
          onClose={() => setModal(null)}
          onSubmit={(body) => runModal(() => initiateHandoff(modal.order.id, body).then(invalidate))}
        />
      )}
      {modal?.type === 'PAYOUT' && (
        <InitiatePayoutModal
          order={modal.order}
          loading={submitting}
          onClose={() => setModal(null)}
          onSubmit={(body) => runModal(() => initiateOrderPayout(modal.order.id, body).then(invalidate))}
        />
      )}
    </div>
  )
}
