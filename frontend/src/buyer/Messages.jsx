import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { getChatUsers, getConversation } from '../api/messages'
import { useStompChat } from '../hooks/useStompChat'
import { PageHead } from './components/PageHead'

const AVATAR_GRADS = [
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#5eead4,#38bdf8)',
  'linear-gradient(135deg,#a78bfa,#6a5fc1)',
  'linear-gradient(135deg,#fa7faa,#c4326a)',
  'linear-gradient(135deg,#46d39a,#14b8a6)',
]

const initials = (name) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
const fmtTime  = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })
}
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return fmtTime(iso)
  const yest = new Date(today); yest.setDate(today.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Yest.'
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

const QUICK_REPLIES = ["How fresh?", "Delivery available?", "What's available?"]

export default function Messages({ userProfile, user: userProp, initialContact }) {
  const { user: authUser } = useAuth()
  const myId = (userProfile ?? userProp ?? authUser)?.id
  const [activeUserId, setActiveUserId] = useState(initialContact?.id ?? null)
  const [draft, setDraft] = useState('')
  const [localMsgs, setLocalMsgs] = useState([])
  const [search, setSearch] = useState('')
  const [contactPage, setContactPage] = useState(0)
  const CONTACTS_PAGE = 8
  const bodyRef = useRef(null)

  const contactsQ = useQuery({ queryKey: ['chatUsers'], queryFn: getChatUsers })
  const contacts  = contactsQ.data || []

  const displayContacts = [...contacts]
  if (initialContact && !contacts.some(c => c.id === initialContact.id)) {
    displayContacts.unshift(initialContact)
  }

  useEffect(() => {
    if (!activeUserId && displayContacts.length > 0) setActiveUserId(displayContacts[0].id)
  }, [displayContacts, activeUserId])

  const convQ = useQuery({
    queryKey: ['conversation', activeUserId],
    queryFn: () => getConversation(activeUserId),
    enabled: !!activeUserId,
  })

  useEffect(() => { if (convQ.data) setLocalMsgs(convQ.data) }, [convQ.data])
  useEffect(() => {
    setLocalMsgs([])
    if (activeUserId) convQ.refetch()
  }, [activeUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onMessage = useCallback((msg) => {
    if (msg.senderId === activeUserId || msg.recipientId === activeUserId) {
      setLocalMsgs(prev => [...prev, msg])
    }
  }, [activeUserId])

  const { send } = useStompChat({ onMessage, enabled: true })

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [localMsgs])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !activeUserId) return
    send(activeUserId, text)
    setDraft('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const active = displayContacts.find(c => c.id === activeUserId)
  const filteredContacts = search.trim()
    ? displayContacts.filter(c => c.fullName?.toLowerCase().includes(search.toLowerCase()))
    : displayContacts

  return (
    <div className="page-wrap">
      <PageHead
        eyebrow="Insight · messages"
        sub={`${displayContacts.length} conversations`}
        title="Vendor"
        lime="chats"
      />

      <div className="card ref-msg-shell" style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
        {/* Contact list */}
        <aside className="msg-list-ref">
          <div className="msg-list__search-ref">
            <I.Search size={13} />
            <input
              placeholder="Search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setContactPage(0) }}
            />
          </div>

          {contactsQ.isLoading ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--muted-2)', textAlign: 'center' }}>Loading…</div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: 24, fontSize: 12, color: 'var(--muted-2)', textAlign: 'center' }}>
              {search ? 'No matches' : 'No conversations yet.'}
            </div>
          ) : filteredContacts.slice(contactPage * CONTACTS_PAGE, (contactPage + 1) * CONTACTS_PAGE).map(c => {
            const lastMsg = c.lastMessage
            return (
              <button
                key={c.id}
                className={`msg-thread-ref${activeUserId === c.id ? ' msg-thread-ref--on' : ''}`}
                onClick={() => setActiveUserId(c.id)}
              >
                <div className="msg-thread-ref__avatar" style={{ background: AVATAR_GRADS[c.id % 5] }}>
                  {initials(c.fullName)}
                </div>
                <div className="msg-thread-ref__main">
                  <div className="msg-thread-ref__head">
                    <span className="msg-thread-ref__name">{c.fullName}</span>
                    <span className="msg-thread-ref__time">{lastMsg ? fmtDate(lastMsg.sentAt) : ''}</span>
                  </div>
                  <div className="msg-thread-ref__preview">{lastMsg?.content ?? c.role}</div>
                </div>
              </button>
            )
          })}
          {filteredContacts.length > CONTACTS_PAGE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid var(--hairline)' }}>
              <button className="btn btn--sm" onClick={() => setContactPage(p => p - 1)} disabled={contactPage === 0}>←</button>
              <span style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                {contactPage + 1} / {Math.ceil(filteredContacts.length / CONTACTS_PAGE)}
              </span>
              <button className="btn btn--sm" onClick={() => setContactPage(p => p + 1)} disabled={(contactPage + 1) * CONTACTS_PAGE >= filteredContacts.length}>→</button>
            </div>
          )}
        </aside>

        {/* Message pane */}
        <div className="msg-pane-ref">
          {active ? (
            <>
              <div className="msg-pane-ref__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: AVATAR_GRADS[active.id % 5], display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(active.fullName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-dark)' }}>{active.fullName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{active.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="icon-btn" title="Call"><I.Phone size={14} /></button>
                  <button className="icon-btn" title="Info"><I.More size={14} /></button>
                </div>
              </div>

              <div className="msg-pane-ref__body" ref={bodyRef}>
                {convQ.isLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted-2)' }}>Loading…</div>
                ) : localMsgs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--muted-2)' }}>
                    <I.Message size={32} />
                    <p style={{ fontSize: 13, margin: 0 }}>Start your conversation with {active.fullName}.</p>
                  </div>
                ) : localMsgs.map((m) => {
                  const mine = m.senderId === myId
                  return (
                    <div key={m.id ?? m.sentAt} className={mine ? 'msg-bubble-ref--me' : 'msg-bubble-ref--vendor'}>
                      <div className="msg-bubble-ref__body">{m.content}</div>
                      <div className="msg-bubble-ref__time">{fmtDate(m.sentAt)}</div>
                    </div>
                  )
                })}
              </div>

              <div className="msg-pane-ref__compose">
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {QUICK_REPLIES.map(q => (
                    <button key={q} className="ref-chip" style={{ cursor: 'pointer' }} onClick={() => setDraft(q)}>{q}</button>
                  ))}
                </div>
                <div className="msg-compose-ref">
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message…"
                  />
                  <button className="btn btn--primary btn--sm" onClick={handleSend} disabled={!draft.trim()}>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted-2)', fontSize: 13 }}>
              {contactsQ.isLoading ? 'Loading…' : 'Select a conversation to start messaging.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
