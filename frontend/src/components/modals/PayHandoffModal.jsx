// frontend/src/components/modals/PayHandoffModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

const METHODS = [
  { code: 'GCASH',   label: 'GCash' },
  { code: 'PAYMAYA', label: 'PayMaya / Maya' },
  { code: 'CARD',    label: 'Credit / Debit Card' },
]

export default function PayHandoffModal({ order, handoff, onClose, onSubmit, loading }) {
  const [method, setMethod] = useState('GCASH')
  const total = handoff?.totalAmount

  return (
    <CrudModal
      title={`Pay handoff — ${order.orderCode ?? `Order #${order.id}`}`}
      onClose={onClose}
      onConfirm={() => onSubmit(method)}
      confirmLabel={total != null ? `Pay ₱${Number(total).toLocaleString()}` : 'Pay with Xendit'}
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Both parties have confirmed handoff. The final amount is locked at the
        weight and price agreed at pickup. You will be redirected to Xendit to
        complete payment.
      </p>
      {handoff && (
        <div className="row" style={{ gap: 12, marginTop: 8, fontSize: 12 }}>
          <span>Final qty: <strong>{Number(handoff.actualQtyKg).toLocaleString()} kg</strong></span>
          <span>Price: <strong>₱{Number(handoff.finalPricePerKg).toLocaleString()}/kg</strong></span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {METHODS.map(m => (
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
            <input
              type="radio"
              name="pay-method"
              value={m.code}
              checked={method === m.code}
              onChange={() => setMethod(m.code)}
            />
            <span>{m.label}</span>
          </label>
        ))}
      </div>
    </CrudModal>
  )
}
