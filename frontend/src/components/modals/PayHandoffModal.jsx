// frontend/src/components/modals/PayHandoffModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

const XENDIT_METHODS = ['GCASH', 'PAYMAYA', 'CARD']

const METHODS = [
  { code: 'GCASH',   label: 'GCash',               group: 'online',  icon: '📱' },
  { code: 'PAYMAYA', label: 'PayMaya / Maya',       group: 'online',  icon: '📱' },
  { code: 'CARD',    label: 'Credit / Debit Card',  group: 'online',  icon: '💳' },
  { code: 'CASH',    label: 'Cash',                 group: 'manual',  icon: '💵' },
  { code: 'CREDIT',  label: 'Credit (pay later)',   group: 'manual',  icon: '📝' },
]

export default function PayHandoffModal({ order, handoff, onClose, onSubmit, loading }) {
  const [method, setMethod] = useState('GCASH')
  const total = handoff?.totalAmount
  const isXendit = XENDIT_METHODS.includes(method)

  const confirmLabel = method === 'CREDIT'
    ? 'Record as Credit'
    : method === 'CASH'
      ? `Record Cash ₱${Number(total ?? 0).toLocaleString()}`
      : total != null
        ? `Pay ₱${Number(total).toLocaleString()}`
        : 'Pay with Xendit'

  return (
    <CrudModal
      title={`Pay handoff — ${order.orderCode ?? `Order #${order.id}`}`}
      onClose={onClose}
      onConfirm={() => onSubmit(method, isXendit)}
      confirmLabel={confirmLabel}
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Both parties have confirmed handoff. The final amount is locked at the
        weight and price agreed at pickup.
        {isXendit
          ? ' You will be redirected to complete payment online.'
          : method === 'CREDIT'
            ? ' This will be recorded as credit (utang). The fisherman can track it in their earnings.'
            : ' Record this cash payment — the fisherman will confirm receipt.'
        }
      </p>
      {handoff && (
        <div className="row" style={{ gap: 12, marginTop: 8, fontSize: 12 }}>
          <span>Final qty: <strong>{Number(handoff.actualQtyKg).toLocaleString()} kg</strong></span>
          <span>Price: <strong>₱{Number(handoff.finalPricePerKg).toLocaleString()}/kg</strong></span>
        </div>
      )}

      {/* Online methods */}
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 14, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
        Online payment
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {METHODS.filter(m => m.group === 'online').map(m => (
          <label
            key={m.code}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${method === m.code ? 'var(--accent)' : 'var(--line)'}`,
              background: method === m.code ? 'var(--accent-soft, transparent)' : 'transparent',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <input type="radio" name="pay-method" value={m.code}
              checked={method === m.code} onChange={() => setMethod(m.code)} />
            <span>{m.icon} {m.label}</span>
          </label>
        ))}
      </div>

      {/* Manual methods */}
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
        Manual / Offline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {METHODS.filter(m => m.group === 'manual').map(m => (
          <label
            key={m.code}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${method === m.code ? 'var(--accent)' : 'var(--line)'}`,
              background: method === m.code ? 'var(--accent-soft, transparent)' : 'transparent',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <input type="radio" name="pay-method" value={m.code}
              checked={method === m.code} onChange={() => setMethod(m.code)} />
            <span>{m.icon} {m.label}</span>
          </label>
        ))}
      </div>
    </CrudModal>
  )
}
