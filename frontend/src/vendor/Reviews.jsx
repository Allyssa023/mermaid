import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listVendorReviews, replyToReview } from './api/reviews'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Reviews() {
  const [replyOpen, setReplyOpen] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyMap, setReplyMap] = useState({})

  const qc = useQueryClient()
  const reviewsQ = useQuery({ queryKey: ['vendor', 'reviews'], queryFn: () => listVendorReviews(0, 200) })
  const replyMut = useMutation({
    mutationFn: ({ id, text }) => replyToReview(id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'reviews'] }),
  })

  if (reviewsQ.isLoading) return <div className="v-page"><TableRowSkeleton rows={4} /></div>
  if (reviewsQ.error) return <div className="v-page"><ApiError error={reviewsQ.error} onRetry={reviewsQ.refetch} /></div>

  const reviews = reviewsQ.data ?? []

  // Rating snapshot calculations
  const ratings = reviews.map(r => r.rating).filter(Boolean)
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '—'
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => r === star).length,
    pct: ratings.length ? Math.round(ratings.filter(r => r === star).length / ratings.length * 100) : 0,
  }))

  function getReplyText(id) {
    return replyMap[id] ?? ''
  }
  function setReplyTextForId(id, text) {
    setReplyMap(prev => ({ ...prev, [id]: text }))
  }

  return (
    <div className="v-page">
      {/* Page header */}
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Reviews</h1>
          <p className="v-page-header__sub">Customer feedback on your shop and listings</p>
        </div>
      </div>

      {/* Rating snapshot panel */}
      <div className="v-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          {/* Left: big avg number */}
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{
              fontSize: 48, fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--accent-lime)',
              lineHeight: 1,
            }}>
              {avgRating}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              {ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}
            </div>
          </div>
          {/* Right: distribution bars */}
          <div style={{ flex: 1 }}>
            {dist.map(d => (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 12, color: 'var(--ink-2)',
                  fontFamily: 'var(--font-mono)', width: 16, textAlign: 'right',
                }}>
                  {d.star}
                </span>
                <span style={{ color: 'var(--accent-lime)', fontSize: 12 }}>★</span>
                <div style={{
                  flex: 1, height: 6, background: 'var(--bg-card-2)',
                  borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${d.pct}%`, height: '100%',
                    background: 'var(--accent-lime)', borderRadius: 3,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{
                  fontSize: 11, color: 'var(--ink-3)',
                  fontFamily: 'var(--font-mono)', width: 28,
                }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review cards */}
      {reviews.length === 0 && (
        <div className="v-panel" style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>
          No reviews yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.map(r => (
          <div key={r.id} className="v-panel">
            {/* Reviewer header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--accent-soft)', color: 'var(--accent-lime)',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontFamily: 'var(--font-display)', flexShrink: 0,
              }}>
                {(r.reviewerName ?? '?')[0].toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name + date row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: 'var(--ink-1)', fontFamily: 'var(--font-display)', fontSize: 14 }}>
                    {r.reviewerName ?? 'Buyer'}
                  </strong>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                {/* Order context tags */}
                {(r.orderCode || r.speciesName || r.quantityKg) && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {r.orderCode && (
                      <span className="v-chip v-chip--muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {r.orderCode}
                      </span>
                    )}
                    {r.speciesName && (
                      <span className="v-chip v-chip--tide">{r.speciesName}</span>
                    )}
                    {r.quantityKg && (
                      <span className="v-chip v-chip--kelp">{r.quantityKg} kg</span>
                    )}
                    {r.orderDate && (
                      <span className="v-chip v-chip--muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {new Date(r.orderDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Star rating */}
                <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: 2 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} style={{ color: i < r.rating ? 'var(--accent-lime)' : 'var(--ink-4)' }}>
                      {i < r.rating ? '★' : '☆'}
                    </span>
                  ))}
                </div>

                {/* Review text */}
                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                  {r.comment}
                </p>

                {/* Reply area */}
                {r.vendorReply ? (
                  <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid var(--hairline)',
                    color: 'var(--ink-2)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>Your reply: </span>
                    {r.vendorReply}
                    <div style={{ marginTop: 6 }}>
                      <button
                        className="v-btn v-btn--ghost v-btn--sm"
                        onClick={() => setReplyOpen(r.id)}
                      >
                        Edit reply
                      </button>
                    </div>
                    {replyOpen === r.id && (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          className="v-input"
                          rows={2}
                          placeholder="Edit your reply…"
                          value={replyMap[r.id] ?? r.vendorReply}
                          onChange={e => setReplyTextForId(r.id, e.target.value)}
                          style={{ resize: 'vertical', fontFamily: 'var(--font-ui)', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setReplyOpen(null)}>
                            Cancel
                          </button>
                          <button
                            className="v-btn v-btn--primary v-btn--sm"
                            disabled={replyMut.isPending}
                            onClick={() => {
                              const text = replyMap[r.id] ?? r.vendorReply
                              replyMut.mutate({ id: r.id, text })
                              setReplyOpen(null)
                            }}
                          >
                            Save reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid var(--hairline)',
                  }}>
                    {replyOpen === r.id ? (
                      <>
                        <textarea
                          placeholder="Write a reply..."
                          rows={2}
                          value={getReplyText(r.id)}
                          onChange={e => setReplyTextForId(r.id, e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg-card-2)',
                            border: '1px solid var(--hairline)',
                            borderRadius: 'var(--radius-md, 10px)',
                            color: 'var(--ink-1)', padding: '8px 12px',
                            fontFamily: 'var(--font-ui)', fontSize: 13,
                            resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                          }}
                          onFocus={e => (e.target.style.borderColor = 'var(--accent-lime)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--hairline)')}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setReplyOpen(null)}>
                            Cancel
                          </button>
                          <button
                            className="v-btn v-btn--primary v-btn--sm"
                            disabled={replyMut.isPending || !getReplyText(r.id).trim()}
                            onClick={() => {
                              replyMut.mutate({ id: r.id, text: getReplyText(r.id) })
                              setReplyOpen(null)
                              setReplyTextForId(r.id, '')
                            }}
                          >
                            Reply
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="v-btn v-btn--ghost v-btn--sm"
                        onClick={() => setReplyOpen(r.id)}
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
