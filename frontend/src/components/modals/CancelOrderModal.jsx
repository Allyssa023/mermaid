// frontend/src/components/modals/CancelOrderModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function CancelOrderModal({ order, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  return (
    <CrudModal
      title={`Cancel Order ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
      confirmLabel="Cancel Order"
      confirmDestructive
      loading={loading}
      disabled={!reason.trim()}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        This cannot be undone. Both parties will be notified.
      </p>
      <label className="field-label" htmlFor="reason">Reason <span style={{color:'var(--danger)'}}>*</span></label>
      <textarea id="reason" aria-label="reason" className="input" rows={3}
        value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Explain why you are cancelling this order…" />
    </CrudModal>
  )
}
