import { useState, useEffect, useCallback } from 'react'
import { listVendorReviews, replyToReview } from './api/reviews'

function Stars({ rating }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: 14 }}>
      {'★'.repeat(Math.max(0, Math.min(5, rating || 0)))}{'☆'.repeat(Math.max(0, 5 - Math.min(5, rating || 0)))}
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

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 12, background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#4f46e5',
        }}>
          {(review.reviewerName || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{review.reviewerName || 'Anonymous'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {new Date(review.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Stars rating={review.rating} />
        </div>
      </div>

      {review.comment && (
        <p style={{ margin: '6px 0 10px', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
          {review.comment}
        </p>
      )}

      {review.vendorReply && !editing && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6,
          padding: '8px 12px', fontSize: 13, color: '#166534', marginBottom: 8,
        }}>
          <strong>Your reply:</strong> {review.vendorReply}
          <button
            onClick={() => setEditing(true)}
            style={{ marginLeft: 10, fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Edit
          </button>
        </div>
      )}

      {editing && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply to this review…"
            style={{
              width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
              borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ margin: '4px 0', fontSize: 12, color: '#dc2626' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              onClick={submit}
              disabled={busy}
              style={{
                background: busy ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none',
                borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? 'Posting…' : 'Post Reply'}
            </button>
            {review.vendorReply && (
              <button
                onClick={() => { setEditing(false); setReplyText(review.vendorReply) }}
                style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
              >
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

  if (loading) return <div style={{ padding: 24, color: '#6b7280' }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Customer Reviews</h2>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>
        {reviews.length} review{reviews.length !== 1 ? 's' : ''} received
      </p>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {reviews.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
          <div style={{ fontSize: 15 }}>No reviews yet.</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Reviews from completed orders will appear here.</div>
        </div>
      )}

      {reviews.map(r => (
        <ReviewCard key={r.id} review={r} onReplied={handleReplied} />
      ))}
    </div>
  )
}
