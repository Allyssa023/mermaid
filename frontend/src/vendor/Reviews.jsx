import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

const V_REVIEWS = [
  { id: 1, buyer: 'Sofia Mendez',     rating: 5, comment: 'Sashimi-grade for real. Iced perfectly — delivered exactly on time.', reply: 'Thank you Sofia! Always a pleasure.', date: 'Apr 20' },
  { id: 2, buyer: 'Carlo Aquino',     rating: 4, comment: 'Good fish. Pickup was a bit slow, maybe 20 min wait.', reply: '', date: 'Apr 18' },
  { id: 3, buyer: 'Lisa Tan',         rating: 5, comment: 'Best mahi-mahi in the bay. Will order again.', reply: 'Salamat Lisa!', date: 'Apr 16' },
  { id: 4, buyer: 'Hotel Sorrento',   rating: 3, comment: 'Grouper smaller than expected. Quality still ok.', reply: '', date: 'Apr 14' },
]

export default function Reviews() {
  const [replyOpen, setReplyOpen] = useState(null)
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Reputation</div>
          <h1 className="page__title" style={{marginTop: 4}}>Customer <em>reviews</em></h1>
          <p className="page__sub">4.7 average across 94 reviews. Reply to build trust.</p>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18}}>
        {V_REVIEWS.map(r => (
          <div key={r.id} className="card">
            <div className="row" style={{alignItems: 'flex-start', gap: 12}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600}}>{r.buyer[0]}</div>
              <div style={{flex: 1}}>
                <div className="row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong>{r.buyer}</strong>
                  <span className="muted-data" style={{fontSize: 12}}>{r.date}</span>
                </div>
                <div style={{color: 'oklch(0.65 0.15 80)', fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 2}}>
                  {'★'.repeat(r.rating)}<span style={{opacity: 0.3}}>{'★'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{margin: '8px 0 0', fontSize: 14, lineHeight: 1.55}}>{r.comment}</p>
                {r.reply ? (
                  <div style={{marginTop: 10, padding: '10px 12px', background: 'var(--safe-soft)', borderLeft: '3px solid var(--safe)', borderRadius: 4, fontSize: 13}}>
                    <div className="eyebrow" style={{color: 'var(--safe)', marginBottom: 4}}>Your reply</div>
                    {r.reply}
                    <button className="btn btn--ghost btn--sm" style={{marginTop: 6, padding: '2px 8px', fontSize: 11}} onClick={() => setReplyOpen(r.id)}>Edit</button>
                  </div>
                ) : replyOpen === r.id ? (
                  <div style={{marginTop: 10}}>
                    <textarea className="input" rows="2" placeholder="Thank you for your feedback…" />
                    <div className="row" style={{gap: 8, marginTop: 6, justifyContent: 'flex-end'}}>
                      <button className="btn btn--ghost btn--sm" onClick={() => setReplyOpen(null)}>Cancel</button>
                      <button className="btn btn--accent btn--sm" onClick={() => setReplyOpen(null)}>Post reply</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" style={{marginTop: 8}} onClick={() => setReplyOpen(r.id)}>Reply</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
