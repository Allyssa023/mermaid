// frontend/src/components/modals/InitiateHandoffModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function InitiateHandoffModal({ order, onClose, onSubmit, loading }) {
  const [actualKg, setActualKg] = useState('')
  const [finalPrice, setFinalPrice] = useState(order.agreedPricePerKg ?? '')
  const total = actualKg && finalPrice ? (actualKg * finalPrice).toLocaleString('en-PH') : '—'
  const valid = actualKg > 0 && finalPrice > 0

  return (
    <CrudModal
      title={`Initiate Handoff — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={() => onSubmit({ actualQtyKg: Number(actualKg), finalPricePerKg: Number(finalPrice) })}
      confirmLabel="Confirm Handoff"
      loading={loading}
      disabled={!valid}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Record what was actually handed over at the dock. Both parties will need to confirm.
      </p>
      <label className="field-label" htmlFor="actualKg">Actual Weight (kg)</label>
      <input id="actualKg" aria-label="actual weight" className="input" type="number" min="0" step="0.1"
        value={actualKg} onChange={e => setActualKg(e.target.value)} placeholder={`Agreed: ${order.orderedQtyKg} kg`} />
      <label className="field-label" htmlFor="finalPrice">Final Price / kg (&#8369;)</label>
      <input id="finalPrice" className="input" type="number" min="0" step="0.5"
        value={finalPrice} onChange={e => setFinalPrice(e.target.value)} />
      <div className="order-modal-row order-modal-row--total"><span>Total</span><strong>&#8369;{total}</strong></div>
    </CrudModal>
  )
}
