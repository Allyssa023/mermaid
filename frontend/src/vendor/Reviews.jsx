import { useState, useEffect, useCallback } from 'react'
import { listVendorReviews, replyToReview } from './api/reviews'

function Stars({ rating }) {
  const filled = Math.max(0, Math.min(5, rating || 0))
  return (
    <span style={{ color: 'var(--caution)', fontSize: 14, letterSpacing: 1 }}>
      {'★'.repeat(filled)}
      <span style={{ color: 'var(--ink-5)' }}>{'★'.repeat(5 - filled)}</span>
    </span>
  )
}

function ReviewCard({ review, onReplied }) {
  const [replyText, setReplyText] = useState(review.vendorReply || '')
  const [editing, setEditing] = useState(!review.vendorReply)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!replyText.trim()) { setErr('Reply cannot be empty'); return }
    setBusy(true); setErr('')
    try {
      const updated = await replyToReview(review.id, replyText.trim())
      onReplied(updated)
      setEditing(false)
    } catch (e) {
      setErr(e.message || 'Failed to post reply')
    } finally {
      setBusy(false)
    }
  }

  const initials = (review.reviewerName || '?')[0].toUpperCase()

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 99, flexShrink: 0,
          background: 'var(--accent-soft)', color: 'var(--accent-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 15,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
              {review.reviewerName || 'Anonymous'}
            </span>
            <Stars rating={review.rating} />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
          {review.comment && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {review.comment}
            </p>
          )}
        </div>
      </div>

      {review.vendorReply && !editing && (
        <div style={{
          background: 'var(--safe-soft)', border: '1px solid',
          borderColor: 'var(--safe)', borderRadius: 8,
          padding: '8px 12px', fontSize: 13, color: 'var(--safe)',
          marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
        }}>
          <span><strong style={{ color: 'var(--ink-2)' }}>Your reply:</strong> <span style={{ color: 'var(--ink-2)' }}>{review.vendorReply}</span></span>
          <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)} style={{ flexShrink: 0 }}>Edit</button>
        </div>
      )}

      {editing && (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="input"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply to this review…"
            style={{ resize: 'vertical' }}
          />
          {err && <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--unsafe)' }}>{err}</p>}
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn btn--accent btn--sm" onClick={submit} disabled={busy}>
              {busy ? 'Posting…' : 'Post Reply'}
            </button>
            {review.vendorReply && (
              <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(false); setReplyText(review.vendorReply) }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listVendorReviews(0, 50)
      setReviews(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleReplied = (updatedReview) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r))
  }

  if (loading) return (
    <div className="page">
      <div className="empty" style={{ padding: '60px 0' }}>
        <div className="empty__title">Loading…</div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Reputation</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Customer <em>Reviews</em>
          </h1>
          <p className="page__sub">{reviews.length} review{reviews.length !== 1 ? 's' : ''} received · reply to build buyer trust.</p>
        </div>
      </div>

      {error && (
        <div style={{
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {reviews.length === 0 && !error && (
        <div className="empty" style={{ padding: '48px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>★</div>
          <div className="empty__title">No reviews yet</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>Reviews from completed orders will appear here.</p>
        </div>
      )}

      {reviews.map(r => (
        <ReviewCard key={r.id} review={r} onReplied={handleReplied} />
      ))}
    </div>
  )
}
