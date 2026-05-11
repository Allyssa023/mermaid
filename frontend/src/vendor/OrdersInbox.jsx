import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import CancelOrderModal from '../components/modals/CancelOrderModal'
import { listInbox, acceptOrder, markOrderReady, completeOrder, cancelOrder } from './api/orders'

export default function OrdersInbox() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [cancelTarget, setCancelTarget] = useState(null)

  const ordersQ = useQuery({
    queryKey: ['vendor', 'orders'],
    queryFn: () => listInbox(null, 'RETAIL'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'orders'] })

  const acceptMut   = useMutation({ mutationFn: (id) => acceptOrder(id),   onSuccess: invalidate })
  const readyMut    = useMutation({ mutationFn: (id) => markOrderReady(id), onSuccess: invalidate })
  const completeMut = useMutation({ mutationFn: (id) => completeOrder(id), onSuccess: invalidate })
  const cancelMut   = useMutation({
    mutationFn: ({ id, reason }) => cancelOrder(id, reason),
    onSuccess: () => { invalidate(); setCancelTarget(null) },
  })

  if (ordersQ.isLoading) return <div className="page"><OrderCardSkeleton /><OrderCardSkeleton /></div>
  if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

  const orders = ordersQ.data ?? []

  const statusCounts = (s) => s === 'all' ? orders.length : orders.filter(o => o.status === s).length

  const pending   = orders.filter(o => o.status === 'PENDING').length
  const confirmed = orders.filter(o => o.status === 'ACCEPTED').length
  const ready     = orders.filter(o => o.status === 'READY').length
  const completed = orders.filter(o => o.status === 'COMPLETED').length
  const totalValue = orders
    .filter(o => !['CANCELLED', 'DISPUTED'].includes(o.status))
    .reduce((a, o) => a + (o.pricePerKg ?? 0) * (o.qtyKg ?? 0), 0)

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  const stepIndex = (status) => {
    const map = { PENDING: 0, ACCEPTED: 1, READY: 2, COMPLETED: 3 }
    return map[status] ?? -1
  }

  const stepLabel = (i) => ['Pending', 'Accepted', 'Ready', 'Completed'][i] || 'Issue'

  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            <em>Orders</em>
          </h1>
          <p className="page__sub">Track every confirmed sale from matched alert to delivery.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Receipt size={14} /> Export</button>
          <button className="btn btn--primary"><I.Plus size={14} /> New order</button>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Pending</div><div className="v">{pending}</div><div className="s">Awaiting acceptance</div></div>
        <div className="stat"><div className="l">Accepted</div><div className="v">{confirmed}</div><div className="s">Being prepared</div></div>
        <div className="stat"><div className="l">Ready</div><div className="v">{ready}</div><div className="s">Awaiting pickup</div></div>
        <div className="stat"><div className="l">Completed this week</div><div className="v">{completed}</div><div className="s">Last 7 days</div></div>
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
          <div className="pipeline__bar" style={{ flex: ready || 1 }} />
          <div className="pipeline__bar" style={{ flex: completed || 1 }} />
        </div>
        <div className="pipeline__labels">
          <span><strong>{pending}</strong> Pending</span>
          <span><strong>{confirmed}</strong> Accepted</span>
          <span><strong>{ready}</strong> Ready</span>
          <span><strong>{completed}</strong> Completed</span>
        </div>
      </div>

      <div className="row" style={{gap: 6, marginBottom: 12}}>
        {['all', 'PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED', 'DISPUTED'].map(s => (
          <button key={s}
            className={`chip ${statusFilter === s ? 'chip--ink' : ''}`}
            style={{cursor: 'pointer', textTransform: s === 'all' ? 'capitalize' : 'none'}}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All orders' : s.charAt(0) + s.slice(1).toLowerCase()}
            <span style={{marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10}}>
              {statusCounts(s)}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        <div style={{padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div className="card__title">All orders</div>
            <div className="card__sub">{filtered.length} matching · sorted newest first</div>
          </div>
          <button className="btn btn--sm btn--ghost">Sort: Date <I.ChevD size={12} /></button>
        </div>
        {filtered.map(o => {
          const step = stepIndex(o.status)
          const failed = step === -1
          const canCancel = o.status === 'PENDING' || o.status === 'ACCEPTED'
          return (
            <div key={o.id} className="order-row">
              <div className="order-row__id">#{o.id}</div>
              <div className="order-row__party">
                {o.buyerName ?? '—'}
              </div>
              <div>
                <div style={{fontSize: 13, fontWeight: 500}}>{o.speciesName ?? '—'}</div>
                <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2}}>
                  {o.qtyKg != null ? `${o.qtyKg}kg` : '—'}{o.pricePerKg != null ? ` · ₱${o.pricePerKg}/kg` : ''}
                </div>
              </div>
              <div className="order-row__total">
                {o.qtyKg != null && o.pricePerKg != null
                  ? `₱${(o.qtyKg * o.pricePerKg).toLocaleString()}`
                  : '—'}
              </div>
              <div>
                <div className="order-row__steps">
                  {[0,1,2,3].map(i => (
                    <span key={i} className={`order-row__step ${
                      failed ? 'order-row__step--fail' :
                      i < step ? 'order-row__step--done' :
                      i === step ? 'order-row__step--cur' : ''
                    }`} />
                  ))}
                </div>
                <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                  {failed ? o.status : stepLabel(step)}
                </div>
              </div>
              <div style={{fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)'}}>
                {fmtDate(o.createdAt)}
              </div>
              <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                {o.status === 'PENDING' && (
                  <button
                    className="btn btn--sm btn--primary"
                    disabled={acceptMut.isPending}
                    onClick={() => acceptMut.mutate(o.id)}>
                    Accept
                  </button>
                )}
                {o.status === 'ACCEPTED' && (
                  <button
                    className="btn btn--sm btn--primary"
                    disabled={readyMut.isPending}
                    onClick={() => readyMut.mutate(o.id)}>
                    Mark Ready
                  </button>
                )}
                {o.status === 'READY' && (
                  <button
                    className="btn btn--sm btn--primary"
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate(o.id)}>
                    Complete
                  </button>
                )}
                {o.status === 'COMPLETED' && (
                  <span className="chip chip--green" style={{fontSize: 11}}>Completed</span>
                )}
                {o.status === 'CANCELLED' && (
                  <span className="chip chip--red" style={{fontSize: 11}}>Cancelled</span>
                )}
                {canCancel && (
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => setCancelTarget(o)}>
                    Cancel
                  </button>
                )}
                {!canCancel && o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                  <button className="btn btn--sm">Open <I.Arrow size={11} /></button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {cancelTarget && (
        <CancelOrderModal
          order={{ ...cancelTarget, orderCode: `#${cancelTarget.id}` }}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => cancelMut.mutate({ id: cancelTarget.id, reason })}
          loading={cancelMut.isPending}
        />
      )}
    </div>
  )
}
