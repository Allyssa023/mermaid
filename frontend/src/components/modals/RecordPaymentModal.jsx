// frontend/src/components/modals/RecordPaymentModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

const METHODS = ['GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER']

export default function RecordPaymentModal({ order, handoff, onClose, onSubmit, loading }) {
  const [method, setMethod] = useState('GCASH')
  const [reference, setRef] = useState('')
  const amount = handoff?.totalAmount ?? (order.orderedQtyKg * order.agreedPricePerKg)

  return (
    <CrudModal
      title={`Record Payment — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ method, reference, amount })}
      confirmLabel="Record Payment"
      loading={loading}
    >
      <div className="order-modal-row order-modal-row--total">
        <span>Amount</span><strong>&#8369;{amount?.toLocaleString('en-PH')}</strong>
      </div>
      <label className="field-label">Payment Method</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {METHODS.map(m => (
          <button key={m} className={`btn btn--sm ${method === m ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setMethod(m)}>{m.replace('_', ' ')}</button>
        ))}
      </div>
      {(method === 'GCASH' || method === 'MAYA' || method === 'BANK_TRANSFER') && (
        <>
          <label className="field-label" htmlFor="ref">Reference Number</label>
          <input id="ref" className="input" value={reference} onChange={e => setRef(e.target.value)}
            placeholder="Transaction / reference #" />
        </>
      )}
    </CrudModal>
  )
}
