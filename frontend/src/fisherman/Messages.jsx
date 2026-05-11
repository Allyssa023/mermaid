import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

// ── Inline mock data ─────────────────────────────────────────────────────────

const CONVERSATIONS = [
  {
    id: 'c1', userId: 210, name: 'Marina Seafoods', tag: 'Vendor', avatar: 'MS', initial: 'M', color: 'accent',
    online: true, unread: 2,
    last: 'Great, we can match the price. When can you deliver?',
    lastTime: '09:42',
    messages: [
      { from: 'them', ts: '09:12', content: 'Kumusta, Ramiro! Saw your Mahi listing at ₱260/kg.' },
      { from: 'them', ts: '09:12', content: 'Quote:Mahi-mahi·Brgy. Pinagbayanan::Interested at ₱260. We need it by tomorrow if possible.' },
      { from: 'me',   ts: '09:20', content: 'Available — 9kg total, 2 whole fish. Quality is top-grade, iced at sea.' },
      { from: 'me',   ts: '09:21', content: 'I can deliver to your Pinagbayanan depot.' },
      { from: 'them', ts: '09:36', content: 'Perfect. Can you do ₱255?' },
      { from: 'me',   ts: '09:38', content: '₱258 and I cover the ice. Fair?' },
      { from: 'them', ts: '09:42', content: 'Great, we can match the price. When can you deliver?' },
    ]
  },
  { id: 'c2', userId: 211, name: 'Bay City Market',  tag: 'Vendor',              avatar: 'BC', initial: 'B', color: 'warm',
    online: true,  unread: 0, last: 'Handoff at 15:00 works. Ipapasok ko na sa system.', lastTime: '08:14' },
  { id: 'c3', userId: 301, name: 'Capt. Arturo R.',  tag: 'Fisherman · Sirena I', avatar: 'AR', initial: 'A', color: 'sage',
    online: false, unread: 0, last: 'Tide reading looks good for Thursday. Talk tonight.', lastTime: 'Yest.' },
  { id: 'c4', userId: 213, name: 'Puerto Azul Resto', tag: 'Vendor',             avatar: 'PA', initial: 'P', color: 'accent',
    online: false, unread: 1, last: 'Need 15kg of Lapu-lapu by Saturday, live if possible.', lastTime: 'Yest.' },
  { id: 'c5', userId: 1,   name: 'BFAR Region IV-A', tag: 'Authority',           avatar: 'BF', initial: 'B', color: 'warm',
    online: false, unread: 0, last: 'License renewal reminder: expires June 14.', lastTime: 'Apr 21' },
  { id: 'c6', userId: 214, name: 'Del Mar Cold Chain', tag: 'Vendor',            avatar: 'DM', initial: 'D', color: 'sage',
    online: true,  unread: 0, last: 'Weekly bulk contract ready for review.', lastTime: 'Apr 21' },
  { id: 'c7', userId: 302, name: 'Ka Benjie (Port)',  tag: 'Harbor Master',      avatar: 'BP', initial: 'K', color: 'accent',
    online: false, unread: 0, last: 'Slip 7 is yours for Friday morning.', lastTime: 'Apr 20' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [activeId, setActiveId] = useState('c1')
  const active = CONVERSATIONS.find(c => c.id === activeId)
  const [draft, setDraft] = useState('')

  const msgs = active.messages || [
    { from: 'them', ts: '14:22', content: 'Hi Ramiro, following up on the listing.' },
    { from: 'me',   ts: '14:30', content: 'Hi! I have availability. What volume are you looking for?' },
    { from: 'them', ts: '14:32', content: active.last },
  ]

  return (
    <div className="page" style={{paddingBottom: 24}}>
      <div className="page__head" style={{marginBottom: 14}}>
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{marginTop: 4}}><em>Messages</em></h1>
          <p className="page__sub">{CONVERSATIONS.length} conversations · {CONVERSATIONS.reduce((a,c)=>a+c.unread,0)} unread</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--sm"><I.Filter size={12} /> Filter</button>
          <button className="btn btn--primary btn--sm"><I.Plus size={12} /> New message</button>
        </div>
      </div>

      <div className="msgs">
        {/* List */}
        <div className="msgs__list">
          <div className="msgs__head">
            <strong style={{fontSize: 13}}>All conversations</strong>
            <span className="kbd">{CONVERSATIONS.length}</span>
          </div>
          <div className="msgs__search">
            <input placeholder="Search contacts, messages…" />
          </div>
          {CONVERSATIONS.map(c => (
            <div key={c.id} className={`contact${activeId === c.id ? ' contact--on' : ''}`} onClick={() => setActiveId(c.id)}>
              <div className={`contact__avatar contact__avatar--${c.color}${c.online ? ' contact__avatar--online' : ''}`}>
                {c.avatar}
              </div>
              <div style={{minWidth: 0}}>
                <div className="contact__name">{c.name}</div>
                <div className="contact__preview">
                  <span style={{
                    fontSize: 10,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginRight: 6,
                  }}>{c.tag}</span>
                </div>
                <div className="contact__preview" style={{marginTop: 1}}>{c.last}</div>
              </div>
              <div className="contact__meta">
                <div>{c.lastTime}</div>
                {c.unread > 0 && <span className="contact__unread">{c.unread}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Thread */}
        <div className="thread">
          <div className="thread__head">
            <div className={`contact__avatar contact__avatar--${active.color}${active.online ? ' contact__avatar--online' : ''}`}>
              {active.avatar}
            </div>
            <div>
              <div style={{fontSize: 14, fontWeight: 500}}>{active.name}</div>
              <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>
                {active.tag} · {active.online ? 'Online now' : 'Last seen 2h ago'}
              </div>
            </div>
            <div className="spacer" />
            <button className="topbar__icon-btn"><I.Receipt size={14} /></button>
            <button className="topbar__icon-btn"><I.Dots size={14} /></button>
          </div>
          <div className="thread__body">
            <div className="thread__date-sep">— Today —</div>
            {msgs.map((m, i) => {
              // Handle quote format
              if (m.content.startsWith('Quote:')) {
                const [quote, body] = m.content.slice(6).split('::')
                return (
                  <div key={i} className={`bubble bubble--${m.from === 'me' ? 'mine' : 'theirs'}`}>
                    <div className="bubble--quote">
                      <div style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, fontFamily: 'var(--font-mono)', marginBottom: 2}}>Re: listing</div>
                      {quote}
                    </div>
                    {body}
                    <div className="bubble__time">{m.ts}</div>
                  </div>
                )
              }
              return (
                <div key={i} className={`bubble bubble--${m.from === 'me' ? 'mine' : 'theirs'}`}>
                  {m.content}
                  <div className="bubble__time">{m.ts}</div>
                </div>
              )
            })}
            <div className="bubble bubble--theirs" style={{padding: '8px 14px', opacity: 0.7}}>
              <span style={{display: 'inline-flex', gap: 3}}>
                <span style={{width: 4, height: 4, borderRadius: 99, background: 'var(--ink-4)', animation: 'typing 1.2s infinite'}} />
                <span style={{width: 4, height: 4, borderRadius: 99, background: 'var(--ink-4)', animation: 'typing 1.2s infinite 0.2s'}} />
                <span style={{width: 4, height: 4, borderRadius: 99, background: 'var(--ink-4)', animation: 'typing 1.2s infinite 0.4s'}} />
              </span>
            </div>
          </div>
          <div className="thread__input">
            <button className="topbar__icon-btn"><I.Paperclip size={14} /></button>
            <textarea placeholder="Type a message…" value={draft} onChange={e => setDraft(e.target.value)} />
            <button className="btn btn--accent"><I.Send size={12} /> Send</button>
          </div>
        </div>

        {/* Info */}
        <div className="thread__info">
          <div>
            <h4>Contact</h4>
            <div className="info-item"><span className="l">Organization</span><span className="v">{active.name}</span></div>
            <div className="info-item"><span className="l">Type</span><span className="v">{active.tag}</span></div>
            <div className="info-item"><span className="l">Location</span><span className="v">Pinagbayanan, QZ</span></div>
            <div className="info-item"><span className="l">Rating</span><span className="v">4.8 ★ (42)</span></div>
          </div>
          <div>
            <h4>Active deal</h4>
            <div style={{padding: 12, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line-soft)'}}>
              <div style={{fontSize: 13, fontWeight: 500}}>Mahi-mahi · 9kg</div>
              <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2}}>From alert CA-840</div>
              <div style={{fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 8}}>₱2,322</div>
              <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>₱258/kg agreed</div>
              <button className="btn btn--accent btn--sm" style={{marginTop: 10, width: '100%', justifyContent: 'center'}}>Finalize as order</button>
            </div>
          </div>
          <div>
            <h4>Recent orders together</h4>
            <div style={{fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>ORD-7412</span>
                <span className="data" style={{color: 'var(--ink-2)'}}>₱2,340</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>ORD-7398</span>
                <span className="data" style={{color: 'var(--ink-2)'}}>₱7,350</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>ORD-7376</span>
                <span className="data" style={{color: 'var(--ink-2)'}}>₱4,100</span>
              </div>
            </div>
          </div>
          <div>
            <h4>Shared files</h4>
            <div style={{fontSize: 12, color: 'var(--ink-3)'}}>No files yet</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
