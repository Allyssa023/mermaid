// frontend/src/components/modals/DisputeModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function DisputeModal({ order, onClose, onSubmit, loading }) {
  const [reason, setReason] = useState('')
  return (
    <CrudModal
      title={`Raise Dispute — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ reason })}
      confirmLabel="Raise Dispute"
      confirmDestructive
      loading={loading}
      disabled={!reason.trim()}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Describe the discrepancy — weight, quality, or price disagreement. This will be visible to the other party.
      </p>
      <label className="field-label" htmlFor="dispute-reason">Dispute Reason <span style={{color:'var(--danger)'}}>*</span></label>
      <textarea id="dispute-reason" aria-label="reason" className="input" rows={4}
        value={reason} onChange={e => setReason(e.target.value)}
        placeholder="e.g. Received 38kg but invoice says 42kg…" />
    </CrudModal>
  )
}
