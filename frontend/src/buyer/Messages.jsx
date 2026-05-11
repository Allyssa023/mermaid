import { useState } from 'react'
import { I } from '../icons'

// ─── Mock data ────────────────────────────────────────────────────────────────
const BUYER_CONVERSATIONS = [
  { id: 'b1', userId: 210, name: 'Marina Seafoods', tag: 'Vendor', initial: 'M', color: 'accent',
    online: true, unread: 1, last: 'Your Mahi order is ready for pickup tomorrow 10am.', lastTime: '11:14' },
  { id: 'b2', userId: 211, name: 'Bay City Market', tag: 'Vendor', initial: 'B', color: 'warm',
    online: false, unread: 0, last: 'We have Lapu-lapu landing Thursday. Reserve some?', lastTime: '09:42' },
  { id: 'b3', userId: 213, name: 'Puerto Azul Resto', tag: 'Vendor', initial: 'P', color: 'sage',
    online: false, unread: 0, last: 'Thanks! Order completed.', lastTime: 'Apr 20' },
  { id: 'b4', userId: 214, name: 'Del Mar Cold Chain', tag: 'Vendor', initial: 'D', color: 'plum',
    online: true, unread: 0, last: 'Frozen squid contract for Q2 ready to review.', lastTime: 'Apr 18' },
]

export default function Messages({ setPage }) {
  const [activeId, setActiveId] = useState(BUYER_CONVERSATIONS[0].id)
  const active = BUYER_CONVERSATIONS.find(c => c.id === activeId)

  return (
    <div className="page page--messages">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{marginTop: 4}}>Messages</h1>
          <p className="page__sub">Direct conversations with the vendors you buy from.</p>
        </div>
      </div>

      <div className="msg-layout" style={{marginTop: 18}}>
        <div className="msg-list">
          <div className="msg-list__search">
            <I.Search size={13} />
            <input placeholder="Search conversations…" />
          </div>
          {BUYER_CONVERSATIONS.map(c => (
            <div key={c.id} className={`msg-list__item${activeId===c.id?' msg-list__item--on':''}`} onClick={() => setActiveId(c.id)}>
              <div className={`msg-avatar msg-avatar--${c.color}`}>{c.initial}</div>
              <div className="msg-list__body">
                <div className="msg-list__head">
                  <strong>{c.name}</strong>
                  <span className="muted-data" style={{fontSize: 11}}>{c.lastTime}</span>
                </div>
                <div className="msg-list__tag">
                  <span className="chip">{c.tag}</span>
                  {c.online ? <span style={{fontSize:10, color:'var(--safe)'}}>● online</span> : null}
                </div>
                <div className="msg-list__last">{c.last}</div>
              </div>
              {c.unread ? <span className="msg-list__unread">{c.unread}</span> : null}
            </div>
          ))}
        </div>

        <div className="msg-thread">
          <div className="msg-thread__head">
            <div className={`msg-avatar msg-avatar--${active.color}`}>{active.initial}</div>
            <div>
              <strong>{active.name}</strong>
              <div className="muted-data">{active.tag} · {active.online ? 'Online now' : 'Offline'}</div>
            </div>
          </div>
          <div className="msg-thread__body">
            <div className="msg-empty">
              <I.Message size={32} />
              <p>This is the start of your conversation with {active.name}.</p>
              <p className="muted-data">Last message: "{active.last}"</p>
            </div>
          </div>
          <div className="msg-thread__compose">
            <button className="btn btn--ghost btn--sm"><I.Paperclip size={14} /></button>
            <input placeholder="Reply to vendor…" />
            <button className="btn btn--primary btn--sm"><I.Send size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
