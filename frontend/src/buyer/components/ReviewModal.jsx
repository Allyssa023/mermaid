import { useState } from 'react'
import { apiPost, apiPatch } from '../../api'
import { I } from '../../icons'
import { useEscapeToClose } from './OrderModal'

export function StarPicker({ value, onChange, size = 28 }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: n <= value ? 'var(--accent, #f5a524)' : 'var(--ink-4, #999)',
          }}
        >
          <I.Star size={size} />
        </button>
      ))}
    </div>
  )
}

export default function ReviewModal({ order, existing, onClose, onSubmitted }) {
  const [rating, setRating]   = useState(existing?.rating || 5)
  const [comment, setComment] = useState(existing?.comment || '')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  useEscapeToClose(onClose)

  const isEdit = Boolean(existing?.id)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const path = `/buyer/orders/${order.id}/review`
      const body = { rating, comment: comment.trim() || undefined }
      if (isEdit) {
        await apiPatch(path, null, body)
      } else {
        await apiPost(path, null, body)
      }
      onSubmitted && onSubmitted()
      onClose()
    } catch (err) {
      setError(err?.message || 'Could not save review.')
    } finally {
      setBusy(false)
    }
  }

  const speciesName = order.species?.commonName || 'this order'
  const sellerName  = order.sellerName || order.seller?.fullName || 'the vendor'

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <h2 id="review-modal-title">{isEdit ? 'Edit review' : 'Rate your order'}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close review modal">×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '0 18px 18px' }}>
          <div className="muted-data" style={{ fontSize: 13, marginBottom: 12 }}>
            How was your <strong>{speciesName}</strong> from <strong>{sellerName}</strong>?
          </div>

          <div className="label" style={{ marginTop: 4 }}>Your rating</div>
          <StarPicker value={rating} onChange={setRating} />

          <div className="label" style={{ marginTop: 18 }}>Comment (optional)</div>
          <textarea
            className="input"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anything other buyers should know about this vendor?"
            rows={4}
            maxLength={2000}
          />

          {error && (
            <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 10 }}>{error}</div>
          )}

          <div className="row" style={{ gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--accent" disabled={busy || rating < 1}>
              {busy ? 'Saving…' : isEdit ? 'Update review' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
