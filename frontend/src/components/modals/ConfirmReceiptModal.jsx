import { useState } from 'react'
import CrudModal from './CrudModal'

export default function ConfirmReceiptModal({ onClose, onConfirm, onDispute, loading }) {
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')

  const handleDispute = () => {
    if (reason.trim().length < 10) { setReasonErr('Please describe the issue (min 10 characters)'); return }
    onDispute({ reason: reason.trim() })
  }

  if (disputing) {
    return (
      <CrudModal
        title="Raise a Dispute"
        onClose={onClose}
        onConfirm={handleDispute}
        confirmLabel="Submit Dispute"
        confirmDestructive
        loading={loading}
      >
        <p style={{ marginBottom: 8 }}>Describe what went wrong with your order:</p>
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={e => { setReason(e.target.value); setReasonErr('') }}
          placeholder="e.g. Wrong item delivered, damaged fish..."
        />
        {reasonErr && <p style={{ color: 'var(--unsafe)', fontSize: 12, marginTop: 4 }}>{reasonErr}</p>}
      </CrudModal>
    )
  }

  return (
    <CrudModal
      title="Confirm Receipt"
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="I Received My Order"
      loading={loading}
    >
      <p>Confirm you have received your order in good condition.</p>
      <button
        className="btn btn--ghost btn--sm"
        style={{ marginTop: 12, color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
        onClick={() => setDisputing(true)}
        disabled={loading}
      >
        Something went wrong — raise a dispute
      </button>
    </CrudModal>
  )
}
