import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listVendorReviews, replyToReview } from './api/reviews'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

function PageHead({ eyebrow, title, em, sub, actions }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="section-title">{title} {em && <em>{em}</em>}</h1>
        {sub && <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 560 }}>{sub}</p>}
      </div>
      <div className="page__actions">{actions}</div>
    </div>
  )
}

const REVIEWS_PAGE_SIZE = 10

export default function Reviews() {
  const [replyOpen, setReplyOpen] = useState(null)
  const [replyMap, setReplyMap]   = useState({})
  const [page, setPage]           = useState(0)

  const qc = useQueryClient()
  const reviewsQ = useQuery({ queryKey: ['vendor', 'reviews'], queryFn: () => listVendorReviews(0, 200) })
  const replyMut = useMutation({
    mutationFn: ({ id, text }) => replyToReview(id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'reviews'] }),
  })

  if (reviewsQ.isLoading) return <div className="content"><TableRowSkeleton rows={4} /></div>
  if (reviewsQ.error)     return <div className="content"><ApiError error={reviewsQ.error} onRetry={reviewsQ.refetch} /></div>

  const reviews = reviewsQ.data ?? []
  const ratings = reviews.map(r => r.rating).filter(Boolean)
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '—'
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => r === star).length,
  }))
  const maxDist = Math.max(1, ...dist.map(d => d.count))
  const awaitingReply = reviews.filter(r => !r.vendorReply).length

  const getReplyText    = (id)       => replyMap[id] ?? ''
  const setReplyTextFor = (id, text) => setReplyMap(prev => ({ ...prev, [id]: text }))

  return (
    <div className="content view-body">
      <PageHead
        eyebrow="Reputation"
        title="Customer"
        em="reviews"
        sub="Reply to build trust. Buyers reading your shop see your responses prominently."
      />

      <div className="cols-2">
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Rating snapshot</div>
            <div className="panel__sub">Across {reviews.length} reviews · last 30d</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, padding: 18, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 56px var(--font-display)', lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--accent-lime)' }}>
                {avgRating}
              </div>
              <div style={{ font: '600 18px var(--font-mono)', color: 'var(--accent-lime)', marginTop: 4, letterSpacing: 2 }}>★★★★★</div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6 }}>{reviews.length} reviews</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dist.map(d => (
                <div key={d.star} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 30px', gap: 10, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-lime)' }}>{d.star}★</span>
                  <div style={{ height: 8, background: 'var(--panel-3)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(d.count / maxDist) * 100}%`, background: 'linear-gradient(90deg, var(--accent-lime), var(--accent-pink))', borderRadius: 999 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <div className="panel__title" style={{ marginBottom: 14 }}>Quick stats</div>
          <div className="kpi-strip" style={{ borderRadius: 10 }}>
            <div className="cell"><div className="l">Reply rate</div><div className="v">—</div><div className="s">last 30d</div></div>
            <div className="cell"><div className="l">Avg response</div><div className="v">—</div><div className="s">median</div></div>
            <div className="cell"><div className="l">Awaiting reply</div><div className="v">{awaitingReply}</div><div className="s">action needed</div></div>
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(194,239,78,0.08)', border: '1px solid rgba(194,239,78,0.3)', fontSize: 12, color: 'var(--ink-on-dark)' }}>
            <strong style={{ color: 'var(--accent-lime)' }}>↑ Tip</strong>&nbsp; Replying within 2 hours lifts repeat-buyer rate by an average of 18%.
          </div>
        </div>
      </div>

      {reviews.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--muted-2)', padding: 40 }}>
          No reviews yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.slice(page * REVIEWS_PAGE_SIZE, (page + 1) * REVIEWS_PAGE_SIZE).map(r => (
          <div key={r.id} className="review-card">
            <div className="review-card__avatar">
              {(r.reviewerName ?? '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="review-card__body">
              <div className="review-card__head">
                <div className="review-card__name">{r.reviewerName ?? 'Buyer'}</div>
                <div className="review-card__stars">
                  {'★'.repeat(r.rating ?? 0)}
                  <span className="off">{'★'.repeat(5 - (r.rating ?? 0))}</span>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>

              {(r.orderCode || r.speciesName || r.quantityKg) && (
                <div className="review-card__meta">
                  {r.orderCode && (
                    <span className="code" style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--panel-3)', border: '1px solid var(--hairline)' }}>{r.orderCode}</span>
                  )}
                  {r.speciesName && <span style={{ marginLeft: 8 }}>{r.speciesName}</span>}
                  {r.quantityKg  && <span style={{ marginLeft: 8 }}>· {r.quantityKg}kg</span>}
                </div>
              )}

              <p className="review-card__comment">{r.comment}</p>

              {r.vendorReply ? (
                <div className="review-card__reply">
                  <div className="l">Your reply</div>
                  {r.vendorReply}
                  <div style={{ marginTop: 6 }}>
                    <button className="btn btn--sm btn--ghost" onClick={() => setReplyOpen(r.id)}>Edit reply</button>
                  </div>
                  {replyOpen === r.id && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 12px', color: 'var(--ink-on-dark)', font: '500 13px var(--font-ui)', minHeight: 60, resize: 'vertical', width: '100%', boxSizing: 'border-box', outline: 'none' }}
                        rows={2}
                        placeholder="Edit your reply…"
                        value={replyMap[r.id] ?? r.vendorReply}
                        onChange={e => setReplyTextFor(r.id, e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn--sm btn--ghost" onClick={() => setReplyOpen(null)}>Cancel</button>
                        <button
                          className="btn btn--sm btn--primary"
                          disabled={replyMut.isPending}
                          onClick={() => {
                            replyMut.mutate({ id: r.id, text: replyMap[r.id] ?? r.vendorReply })
                            setReplyOpen(null)
                          }}
                        >
                          Save reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : replyOpen === r.id ? (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    style={{ background: 'var(--panel-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 12px', color: 'var(--ink-on-dark)', font: '500 13px var(--font-ui)', minHeight: 60, resize: 'vertical', width: '100%', boxSizing: 'border-box', outline: 'none' }}
                    rows={2}
                    placeholder="Thank the buyer, address concerns, invite them back…"
                    value={getReplyText(r.id)}
                    onChange={e => setReplyTextFor(r.id, e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn--sm btn--ghost" onClick={() => setReplyOpen(null)}>Cancel</button>
                    <button
                      className="btn btn--sm btn--primary"
                      disabled={replyMut.isPending || !getReplyText(r.id).trim()}
                      onClick={() => {
                        replyMut.mutate({ id: r.id, text: getReplyText(r.id) })
                        setReplyOpen(null)
                        setReplyTextFor(r.id, '')
                      }}
                    >
                      Post reply
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn--sm" style={{ marginTop: 10 }} onClick={() => setReplyOpen(r.id)}>
                  Reply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {reviews.length > REVIEWS_PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: '1px solid var(--line)' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {page * REVIEWS_PAGE_SIZE + 1}–{Math.min((page + 1) * REVIEWS_PAGE_SIZE, reviews.length)} of {reviews.length}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * REVIEWS_PAGE_SIZE >= reviews.length}>Next →</button>
        </div>
      )}
    </div>
  )
}
