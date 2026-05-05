import { useState, useEffect } from 'react'
import { apiGet } from '../../api'
import { fmtDateTime } from '../utils/format'
import { I } from '../../icons'
import { useEscapeToClose } from './OrderModal'

export const STATUS_META = {
  PENDING:          { label: 'Order placed',       icon: 'Clipboard' },
  CONFIRMED:        { label: 'Vendor confirmed',   icon: 'Check' },
  PROCESSING:       { label: 'Being prepared',     icon: 'Box' },
  READY_FOR_PICKUP: { label: 'Ready for pickup',   icon: 'Store' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery',   icon: 'Truck' },
  COMPLETED:        { label: 'Order completed',    icon: 'CheckCircle' },
  CANCELLED:        { label: 'Order cancelled',    icon: 'Alert' },
  DISPUTED:         { label: 'Order disputed',     icon: 'Alert' },
}

export default function OrderTimelineModal({ order, onClose }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  useEscapeToClose(onClose)

  function load() {
    setLoading(true)
    apiGet(`/buyer/orders/${order.id}/timeline`)
      .then(d => { setEvents(Array.isArray(d) ? d : []); setError('') })
      .catch(e => setError(e?.message || 'Failed to load timeline.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Light polling so buyers see vendor-driven status changes without WebSocket.
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const speciesName = order.species?.commonName || order.fishSpecies?.commonName || `Order #${order.id}`
  const orderCode   = order.orderCode || `ORD-${order.id}`

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="timeline-modal-title">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel" style={{ maxWidth: 560 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">{orderCode}</div>
            <h2 id="timeline-modal-title" style={{ marginTop: 2 }}>Order timeline</h2>
            <div className="muted-data" style={{ fontSize: 12 }}>{speciesName}</div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close timeline modal">×</button>
        </div>

        <div style={{ padding: '0 18px 18px' }}>
          {loading && events.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : error ? (
            <div style={{ color: 'var(--unsafe)', fontSize: 13, padding: '8px 0' }}>{error}</div>
          ) : events.length === 0 ? (
            <div className="muted-data" style={{ fontSize: 13, padding: '8px 0' }}>
              No timeline events recorded yet.
            </div>
          ) : (
            <ol style={{
              listStyle: 'none', padding: 0, margin: '4px 0 0',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}>
              {events.map((ev, idx) => {
                const meta   = STATUS_META[ev.status] || { label: ev.status, icon: 'Clock' }
                const Icon   = I[meta.icon] || I.Clock
                const isLast = idx === events.length - 1
                const isCurrent = isLast
                return (
                  <li key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      alignSelf: 'stretch', minWidth: 28,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isCurrent ? 'var(--accent, #f5a524)' : 'var(--surface-2)',
                        color: isCurrent ? '#fff' : 'var(--ink-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={14} />
                      </div>
                      {!isLast && (
                        <div style={{
                          flex: 1, width: 2, background: 'var(--border, #e5e5e5)',
                          marginTop: 2, marginBottom: 2,
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                      <div className="muted-data" style={{ fontSize: 11, marginTop: 2 }}>
                        {fmtDateTime(ev.createdAt)}
                        {ev.actorName ? ` · ${ev.actorName}` : ''}
                      </div>
                      {ev.note && (
                        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--ink-2)' }}>
                          {ev.note}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
