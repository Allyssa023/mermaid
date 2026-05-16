// frontend/src/components/modals/InitiatePayoutModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

const CHANNELS = [
  { code: 'PH_GCASH',   label: 'GCash' },
  { code: 'PH_PAYMAYA', label: 'PayMaya / Maya' },
]

export default function InitiatePayoutModal({ order, onClose, onSubmit, loading }) {
  const [channel, setChannel] = useState('PH_GCASH')

  return (
    <CrudModal
      title={`Initiate Payout — ${order.orderCode ?? `Order #${order.id}`}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ channelCode: channel })}
      confirmLabel="Send to my e-wallet"
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Choose where the buyer's payment should land. Make sure your e-wallet
        details are saved in your profile.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {CHANNELS.map(c => (
          <label
            key={c.code}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${channel === c.code ? 'var(--accent)' : 'var(--line)'}`,
              background: channel === c.code ? 'var(--accent-soft, transparent)' : 'transparent',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <input
              type="radio"
              name="payout-channel"
              value={c.code}
              checked={channel === c.code}
              onChange={() => setChannel(c.code)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
    </CrudModal>
  )
}
