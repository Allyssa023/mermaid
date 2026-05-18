// frontend/src/components/modals/SettleCreditModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

const XENDIT_METHODS = ['GCASH', 'MAYA']

const METHODS = [
  { code: 'CASH',   label: '💵 Cash',   group: 'manual' },
  { code: 'GCASH',  label: '📱 GCash',  group: 'online' },
  { code: 'MAYA',   label: '📱 Maya',   group: 'online' },
]

export default function SettleCreditModal({ order, payment, onClose, onSubmit, loading }) {
  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')
  const isXendit = XENDIT_METHODS.includes(method)

  const confirmLabel = isXendit
    ? `Pay ₱${Number(payment?.amount ?? 0).toLocaleString()} via ${method}`
    : `Settle ₱${Number(payment?.amount ?? 0).toLocaleString()}`

  return (
    <CrudModal
      title={`Settle Credit — Order #${order.id}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ method, reference: reference || undefined, isXendit })}
      confirmLabel={confirmLabel}
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Pay off the outstanding credit for this order.
        {isXendit
          ? ' You will be redirected to complete the payment online.'
          : ' Record this cash payment — the credit will be marked as settled.'}
      </p>
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
        Payment method
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
            <input type="radio" name="settle-method" value={m.code}
              checked={method === m.code} onChange={() => setMethod(m.code)} />
            <span>{m.label}</span>
          </label>
        ))}
      </div>
      {!isXendit && (
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--muted-2)' }}>Reference # (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. receipt #"
            value={reference}
            onChange={e => setReference(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>
      )}
    </CrudModal>
  )
}
