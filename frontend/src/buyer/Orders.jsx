import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listOrders, cancelOrder, reorder, confirmReceipt, disputeOrder, getTimeline } from './api/orders'
import ReviewModal from './components/ReviewModal'
import { PageHead } from './components/PageHead'

const CHIP_CLASS = {
  PENDING:          'status-chip status-chip--new',
  CONFIRMED:        'status-chip status-chip--prep',
  PREPARING:        'status-chip status-chip--prep',
  READY:            'status-chip status-chip--ready',
  OUT_FOR_DELIVERY: 'status-chip status-chip--ready',
  AWAITING_RECEIPT: 'status-chip status-chip--ready',
  DISPUTED:         'status-chip status-chip--cancel',
  COMPLETED:        'status-chip status-chip--done',
  CANCELLED:        'status-chip status-chip--cancel',
}

const ACTIVE_STATUSES = ['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT']

const AVATAR_GRADS = [
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#5eead4,#38bdf8)',
  'linear-gradient(135deg,#a78bfa,#6a5fc1)',
  'linear-gradient(135deg,#fa7faa,#c4326a)',
  'linear-gradient(135deg,#46d39a,#14b8a6)',
]

const fmtTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function KpiBadge({ eyebrow, title, value, delta, color, icon: Icon }) {
  return (
    <div className="kpi" style={{ minHeight: 140 }}>
      <div className="kpi__head">
        <div className="kpi__badge">
          <div className="kpi__badge-icon" style={{ color, background: `${color}18` }}>
            <Icon size={16} />
          </div>
          <div className="kpi__badge-text">
            <span className="kpi__badge-eyebrow">{eyebrow}</span>
            <span className="kpi__badge-title">{title}</span>
          </div>
        </div>
      </div>
      <div className="kpi__value" style={{ fontSize: 32 }}>{value}</div>
      {delta && (
        <div className="kpi__delta kpi__delta--up">
          <span className="kpi__delta-dot" />
          <strong>{delta}</strong>
        </div>
      )}
    </div>
  )
}

function OrderDetailPanel({ order, setPage, onCancel, onReorder, onConfirmReceipt, onDispute, isReviewed, onReview }) {
  const timelineQ = useQuery({
    queryKey: ['orderTimeline', order.id],
    queryFn: () => getTimeline(order.id),
    staleTime: 30_000,
  })

  const timeline = timelineQ.data ?? []
  const subtotal = (order.orderedQtyKg ?? 0) * (order.agreedPricePerKg ?? 0)
  const total    = subtotal + Number(order.deliveryFee ?? 0)

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="card__head" style={{ marginBottom: 0 }}>
        <div>
          <div className="card__sub" style={{ marginTop: 0 }}>Order detail</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="kbd-mono">{order.orderCode ?? `ORD-${order.id}`}</span>
            <span className={CHIP_CLASS[order.status] ?? 'status-chip'}>{order.status}</span>
          </div>
        </div>
        <button className="icon-btn"><I.More size={14} /></button>
      </div>

      {/* Species block */}
      <div className="cell-species" style={{ padding: 12, background: 'var(--layer-1)', border: '1px solid var(--hairline-rgba)', borderRadius: 10 }}>
        <div className="cell-species__avatar" style={{ background: AVATAR_GRADS[order.id % 5], width: 42, height: 42, borderRadius: 10, fontSize: 13, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {(order.speciesName ?? 'F').slice(0, 2).toUpperCase()}
        </div>
        <div className="cell-species__main" style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>{order.speciesName ?? '—'}</span>
          <span className="muted" style={{ fontSize: 12 }}>{order.vendorName ?? order.sellerName ?? '—'}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{order.orderedQtyKg}<small className="muted"> kg</small></div>
          <div className="muted mono" style={{ fontSize: 11 }}>₱{order.agreedPricePerKg}/kg</div>
        </div>
      </div>

      {/* Metric mini-cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="metric-card-v2">
          <div className="metric-card-v2__head">
            <span className="metric-card-v2__title">Total</span>
            <span className="metric-card-v2__chip">{order.status === 'COMPLETED' ? 'paid' : 'due'}</span>
          </div>
          <div className="metric-card-v2__value" style={{ fontSize: 18 }}>₱{Math.round(total).toLocaleString()}</div>
        </div>
        <div className="metric-card-v2">
          <div className="metric-card-v2__head">
            <span className="metric-card-v2__title">Dispatch</span>
            <span className="metric-card-v2__chip">mode</span>
          </div>
          <div className="metric-card-v2__value" style={{ fontSize: 14 }}>{order.dispatchMode ?? 'PICKUP'}</div>
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <div className="card__sub" style={{ marginBottom: 10 }}>Timeline</div>
          <div className="timeline">
            {timeline.map((step, i) => {
              const isLast = i === timeline.length - 1
              return (
                <div key={step.id ?? i} className={`timeline__row${isLast && step.completedAt ? ' timeline__row--active' : ''}`}>
                  <div className="timeline__dot" />
                  <div className="timeline__time">{step.completedAt ? fmtTime(step.completedAt) : '—'}</div>
                  <div className="timeline__label">{step.label ?? step.status}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* Actions */}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn--sm" style={{ flex: 1 }} onClick={() => setPage('bmessages')}>
          <I.Message size={11} /> Message vendor
        </button>
        {order.status === 'COMPLETED' && (
          <button className="btn btn--sm" style={{ flex: 1 }} onClick={() => onReorder(order.id)}>
            <I.Refresh size={11} /> Reorder
          </button>
        )}
        {order.status === 'READY' && order.dispatchMode !== 'DELIVERY' && (
          <div style={{ flex: '1 1 100%', padding: '8px 12px', borderRadius: 8, background: 'var(--layer-1)', border: '1px solid var(--hairline-rgba)', fontSize: 12, color: 'var(--muted-2)', textAlign: 'center' }}>
            Order is ready — vendor will confirm when picked up
          </div>
        )}
        {order.status === 'OUT_FOR_DELIVERY' && (
          <button className="btn btn--lime btn--sm" style={{ flex: '1 1 100%' }} onClick={() => onConfirmReceipt(order.id)}>
            Order received <I.ArrowRight size={11} />
          </button>
        )}
        {order.status === 'AWAITING_RECEIPT' && order.dispatchMode !== 'DELIVERY' && (
          <div style={{ flex: '1 1 100%', padding: '8px 12px', borderRadius: 8, background: 'var(--layer-1)', border: '1px solid var(--hairline-rgba)', fontSize: 12, color: 'var(--muted-2)', textAlign: 'center' }}>
            Waiting for vendor to confirm handoff…
          </div>
        )}
        {order.status === 'AWAITING_RECEIPT' && order.dispatchMode === 'DELIVERY' && (
          <button className="btn btn--lime btn--sm" style={{ flex: '1 1 100%' }} onClick={() => onConfirmReceipt(order.id)}>
            Confirm receipt <I.ArrowRight size={11} />
          </button>
        )}
        {order.status === 'COMPLETED' && !isReviewed && (
          <button className="btn btn--lime btn--sm" style={{ flex: '1 1 100%' }} onClick={() => onReview(order)}>
            Leave review <I.ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

const TABS = ['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export default function Orders({ setPage }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('All')
  const [selected, setSelected]   = useState(null)
  const [reviewOrder, setReviewOrder] = useState(null)
  const [reviewedIds, setReviewedIds] = useState(() => new Set())
  const [ordersPage, setOrdersPage] = useState(0)
  const ORDERS_PAGE_SIZE = 10

  const ordersQ = useQuery({
    queryKey: ['buyerOrders'],
    queryFn: () => listOrders(),
    staleTime: 30_000,
  })

  const cancelMut  = useMutation({ mutationFn: id => cancelOrder(id, 'Buyer cancelled'), onSuccess: () => qc.invalidateQueries({ queryKey: ['buyerOrders'] }) })
  const reorderMut = useMutation({ mutationFn: id => reorder(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['buyerOrders'] }) })

  const all = ordersQ.data ?? []

  useEffect(() => {
    if (all.length > 0 && !selected) setSelected(all[0])
  }, [all, selected])

  const totalSpent    = all.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0), 0)
  const activeCount   = all.filter(o => ACTIVE_STATUSES.includes(o.status)).length
  const uniqueVendors = new Set(all.map(o => o.vendorName ?? o.sellerName).filter(Boolean)).size

  const countByTab = Object.fromEntries(TABS.map(t => [t, t === 'All' ? all.length : all.filter(o => o.status === t).length]))
  const filtered   = activeTab === 'All' ? all : all.filter(o => o.status === activeTab)

  const handleConfirmReceipt = (id) => confirmReceipt(id).then(() => {
    qc.invalidateQueries({ queryKey: ['buyerOrders'] })
    qc.invalidateQueries({ queryKey: ['orderTimeline', id] })
  })
  const handleDispute = (id) => {
    const reason = window.prompt('Describe the issue (min 10 chars):')
    if (reason && reason.length >= 10) {
      disputeOrder(id, { reason }).then(() => qc.invalidateQueries({ queryKey: ['buyerOrders'] }))
    }
  }

  return (
    <div className="page-wrap">
      <PageHead
        eyebrow="Workspace · orders"
        title="My"
        lime="orders"
        sub={`${all.length} total`}
        tools={<>
          <button className="filter-pill"><I.Filter size={11} /> <strong>All vendors</strong></button>
          <button className="filter-pill"><I.Receipt size={11} /> <strong>Export</strong></button>
        </>}
      />

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginTop: 24 }}>
        <KpiBadge
          eyebrow="Spend · lifetime"
          title="Total purchase"
          value={<><small>₱</small>{Math.round(totalSpent / 1000).toLocaleString()}k</>}
          delta={`${all.filter(o => o.status === 'COMPLETED').length} completed`}
          color="#5eead4"
          icon={I.Receipt}
        />
        <KpiBadge
          eyebrow="In flight"
          title="Active orders"
          value={activeCount}
          delta={`${all.length} all time`}
          color="#fbbf24"
          icon={I.Truck}
        />
        <KpiBadge
          eyebrow="Network"
          title="Vendors used"
          value={uniqueVendors}
          delta="you've ordered from"
          color="#a78bfa"
          icon={I.Store}
        />
      </div>

      <div className="orders-shell" style={{ marginTop: 20 }}>
        {/* Main table card */}
        <div className="orders-main">
          <div className="card orders-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="orders-card__head">
              <div>
                <div className="card__title">All orders</div>
                <div className="card__sub">Click a row to inspect timeline + receipts</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn--sm"><I.Filter size={11} /> Status</button>
                <button className="btn btn--sm"><I.Filter size={11} /> Vendor</button>
                <button className="btn btn--lime btn--sm" onClick={() => setPage('bbrowse')}>
                  Browse market <I.ArrowRight size={11} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ padding: '0 20px' }}>
              <div className="orders-card__tabs">
                {TABS.map(t => (
                  <button
                    key={t}
                    className={`orders-tab${activeTab === t ? ' orders-tab--on' : ''}`}
                    onClick={() => { setActiveTab(t); setOrdersPage(0) }}
                  >
                    {t === 'All' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                    <span className="orders-tab__count">{countByTab[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            {ordersQ.isLoading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted-2)', fontSize: 12 }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <I.Clipboard size={32} />
                <div>No {activeTab === 'All' ? '' : activeTab.toLowerCase()} orders</div>
              </div>
            ) : (
              <table className="ref-tbl">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Species · Vendor</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>ETA / handoff</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(ordersPage * ORDERS_PAGE_SIZE, (ordersPage + 1) * ORDERS_PAGE_SIZE).map(o => {
                    const total = (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)
                    const isOn  = selected?.id === o.id
                    return (
                      <tr key={o.id} style={{ background: isOn ? 'var(--layer-2)' : undefined }} onClick={() => setSelected(o)}>
                        <td><span className="kbd-mono">{o.orderCode ?? `ORD-${o.id}`}</span></td>
                        <td>
                          <div className="cell-species">
                            <div className="cell-species__avatar" style={{ background: AVATAR_GRADS[o.id % 5] }}>
                              {(o.speciesName ?? 'F').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="cell-species__name">{o.speciesName ?? '—'}</div>
                              <div className="cell-species__buyer">{o.vendorName ?? o.sellerName ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="cell-mono" style={{ textAlign: 'right' }}>{o.orderedQtyKg} <span className="muted">kg</span></td>
                        <td className="cell-money" style={{ textAlign: 'right' }}>₱{Math.round(total).toLocaleString()}</td>
                        <td className="cell-mono" style={{ fontSize: 12 }}>{o.dispatchMode ?? 'PICKUP'}</td>
                        <td><span className={CHIP_CLASS[o.status] ?? 'status-chip'}>{o.status}</span></td>
                        <td style={{ textAlign: 'right' }}><I.ChevR size={12} style={{ color: 'var(--muted-2)' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {filtered.length > ORDERS_PAGE_SIZE && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--hairline)' }}>
                <button className="btn btn--sm" onClick={() => setOrdersPage(p => p - 1)} disabled={ordersPage === 0}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                  {ordersPage * ORDERS_PAGE_SIZE + 1}–{Math.min((ordersPage + 1) * ORDERS_PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <button className="btn btn--sm" onClick={() => setOrdersPage(p => p + 1)} disabled={(ordersPage + 1) * ORDERS_PAGE_SIZE >= filtered.length}>Next →</button>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <aside className="orders-detail">
          {selected ? (
            <OrderDetailPanel
              order={selected}
              setPage={setPage}
              onCancel={id => cancelMut.mutate(id)}
              onReorder={id => reorderMut.mutate(id)}
              onConfirmReceipt={handleConfirmReceipt}
              onDispute={handleDispute}
              isReviewed={reviewedIds.has(selected.id)}
              onReview={setReviewOrder}
            />
          ) : (
            <div className="card">
              <div className="empty-state" style={{ padding: 32 }}>
                <I.Clipboard size={28} />
                <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Select an order to view details</div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          existing={null}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ['buyerOrders'] })
            setReviewedIds(prev => new Set(prev).add(reviewOrder.id))
            setReviewOrder(null)
          }}
        />
      )}
    </div>
  )
}
