import { useState } from 'react'
import { apiPost } from '../api'

export default function InterestModal({ listing, token, onSuccess, onClose }) {
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!message.trim()) { setError('Please write a message'); return }
    setSubmitting(true)
    setError(null)
    try {
      const result = await apiPost(`/marketplace/listings/${listing.id}/interest`, token, {
        message: message.trim(),
      })
      onSuccess(result)
    } catch (err) {
      if (err.message?.includes('DUPLICATE_INTEREST') || err.message?.includes('400')) {
        setError("You've already expressed interest in this listing")
      } else if (err.message?.includes('LISTING_CLOSED')) {
        setError('This listing is no longer accepting interest')
      } else {
        setError(err.message || 'Something went wrong')
      }
      setSubmitting(false)
    }
  }

  return (
    <div
      className="trip-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="trip-modal">
        <div className="trip-modal__header">
          <h2 className="trip-modal__title">Express Interest</h2>
          <button className="trip-modal__close" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            <strong style={{ color: '#7DD3FC' }}>{listing.fishSpecies?.commonName}</strong>
            {' '}at{' '}
            <strong style={{ color: '#fff' }}>{listing.marketLocation?.name}</strong>
            {' '}— ₱{listing.offerPricePerKg}/kg
          </p>
        </div>
        <form className="trip-form" onSubmit={submit}>
          {error && <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0 }}>{error}</p>}
          <label className="trip-form__label">
            Your message to the vendor *
            <textarea
              className="trip-form__textarea"
              placeholder="e.g. I can bring 40kg of fresh Bangus by tomorrow morning…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </label>
          <div className="trip-form__actions">
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Interest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
