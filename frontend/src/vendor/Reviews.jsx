import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listVendorReviews, replyToReview } from './api/reviews'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Reviews() {
  const [replyOpen, setReplyOpen] = useState(null)
  const [replyText, setReplyText] = useState('')

  const qc = useQueryClient()
  const reviewsQ = useQuery({ queryKey: ['vendor', 'reviews'], queryFn: () => listVendorReviews() })
  const replyMut = useMutation({
    mutationFn: ({ id, text }) => replyToReview(id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'reviews'] }),
  })

  if (reviewsQ.isLoading) return <div className="page"><TableRowSkeleton rows={4} /></div>
  if (reviewsQ.error) return <div className="page"><ApiError error={reviewsQ.error} onRetry={reviewsQ.refetch} /></div>
  const reviews = reviewsQ.data ?? []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Reputation</div>
          <h1 className="page__title" style={{marginTop: 4}}>Customer <em>reviews</em></h1>
          <p className="page__sub">Reply to build trust with your buyers.</p>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18}}>
        {reviews.map(r => (
          <div key={r.id} className="card">
            <div className="row" style={{alignItems: 'flex-start', gap: 12}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600}}>{(r.reviewerName ?? '?')[0]}</div>
              <div style={{flex: 1}}>
                <div className="row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <strong>{r.reviewerName ?? 'Buyer'}</strong>
                  </div>
                  <span className="muted-data" style={{fontSize: 12}}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                </div>
                {(r.orderCode || r.speciesName || r.quantityKg) && (
                  <div className="row" style={{gap: 12, marginTop: 4, fontSize: 12, color: 'var(--ink-3)'}}>
                    {r.orderCode && <span className="kbd" style={{fontSize: 11}}>{r.orderCode}</span>}
                    {r.speciesName && <span>{r.speciesName}</span>}
                    {r.quantityKg && <span>{r.quantityKg}<small> kg</small></span>}
                    {r.orderDate && <span>{new Date(r.orderDate).toLocaleDateString()}</span>}
                  </div>
                )}
                <div style={{color: 'oklch(0.65 0.15 80)', fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 2}}>
                  {'★'.repeat(r.rating)}<span style={{opacity: 0.3}}>{'★'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{margin: '8px 0 0', fontSize: 14, lineHeight: 1.55}}>{r.comment}</p>
                {r.vendorReply ? (
                  <div style={{marginTop: 10, padding: '10px 12px', background: 'var(--safe-soft)', borderLeft: '3px solid var(--safe)', borderRadius: 4, fontSize: 13}}>
                    <div className="eyebrow" style={{color: 'var(--safe)', marginBottom: 4}}>Your reply</div>
                    {r.vendorReply}
                    <button className="btn btn--ghost btn--sm" style={{marginTop: 6, padding: '2px 8px', fontSize: 11}} onClick={() => { setReplyOpen(r.id); setReplyText('') }}>Edit</button>
                  </div>
                ) : replyOpen === r.id ? (
                  <div style={{marginTop: 10}}>
                    <textarea className="input" rows="2" placeholder="Thank you for your feedback…" value={replyText} onChange={e => setReplyText(e.target.value)} />
                    <div className="row" style={{gap: 8, marginTop: 6, justifyContent: 'flex-end'}}>
                      <button className="btn btn--ghost btn--sm" onClick={() => setReplyOpen(null)}>Cancel</button>
                      <button className="btn btn--accent btn--sm" onClick={() => { replyMut.mutate({ id: r.id, text: replyText }); setReplyOpen(null) }}>Post reply</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" style={{marginTop: 8}} onClick={() => { setReplyOpen(r.id); setReplyText('') }}>Reply</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
