import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { getChatUsers, getConversation } from '../api/messages'
import { useStompChat } from '../hooks/useStompChat'

const COLORS = ['accent', 'warm', 'sage', 'plum']
const colorOf = (id) => COLORS[Number(id) % COLORS.length]
const initials = (name) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
const fmtTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })
}
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return fmtTime(iso)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yest.'
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function Messages({ userProfile, user: userProp, initialContact }) {
  const { user: authUser } = useAuth()
  const myId = (userProfile ?? userProp ?? authUser)?.id
  const [activeUserId, setActiveUserId] = useState(initialContact?.id ?? null)
  const [draft, setDraft] = useState('')
  const [localMsgs, setLocalMsgs] = useState([])
  const bodyRef = useRef(null)

  const contactsQ = useQuery({ queryKey: ['chatUsers'], queryFn: getChatUsers })
  const contacts = contactsQ.data || []

  useEffect(() => {
    if (!activeUserId && contacts.length > 0) {
      setActiveUserId(contacts[0].id)
    }
  }, [contacts, activeUserId])

  const convQ = useQuery({
    queryKey: ['conversation', activeUserId],
    queryFn: () => getConversation(activeUserId),
    enabled: !!activeUserId,
  })

  useEffect(() => {
    if (convQ.data) setLocalMsgs(convQ.data)
  }, [convQ.data])

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
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [localMsgs])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !activeUserId) return
    send(activeUserId, text)
    setDraft('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const active = contacts.find(c => c.id === activeUserId)

  return (
    <div className="page page--messages">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Messages</h1>
          <p className="page__sub">Direct conversations with vendors and fishermen.</p>
        </div>
      </div>

      <div className="msg-layout" style={{ marginTop: 18 }}>
        <div className="msg-list">
          <div className="msg-list__search">
            <I.Search size={13} />
            <input placeholder="Search conversations…" readOnly />
          </div>
          {contactsQ.isLoading && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>Loading…</div>
          )}
          {contacts.map(c => (
            <div
              key={c.id}
              className={`msg-list__item${activeUserId === c.id ? ' msg-list__item--on' : ''}`}
              onClick={() => setActiveUserId(c.id)}
            >
              <div className={`msg-avatar msg-avatar--${colorOf(c.id)}`}>{initials(c.fullName)}</div>
              <div className="msg-list__body">
                <div className="msg-list__head">
                  <strong>{c.fullName}</strong>
                </div>
                <div className="msg-list__tag">
                  <span className="chip">{c.role}</span>
                </div>
              </div>
            </div>
          ))}
          {!contactsQ.isLoading && contacts.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>No conversations yet.</div>
          )}
        </div>

        <div className="msg-thread">
          {active ? (
            <>
              <div className="msg-thread__head">
                <div className={`msg-avatar msg-avatar--${colorOf(active.id)}`}>{initials(active.fullName)}</div>
                <div>
                  <strong>{active.fullName}</strong>
                  <div className="muted-data">{active.role}</div>
                </div>
              </div>
              <div className="msg-thread__body" ref={bodyRef}>
                {convQ.isLoading && (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>Loading…</div>
                )}
                {localMsgs.map((m) => {
                  const mine = m.senderId === myId
                  return (
                    <div key={m.id ?? m.sentAt} className={`bubble bubble--${mine ? 'mine' : 'theirs'}`}>
                      {m.content}
                      <div className="bubble__time">{fmtDate(m.sentAt)}</div>
                    </div>
                  )
                })}
                {!convQ.isLoading && localMsgs.length === 0 && (
                  <div className="msg-empty">
                    <I.Message size={32} />
                    <p>Start your conversation with {active.fullName}.</p>
                  </div>
                )}
              </div>
              <div className="msg-thread__compose">
                <input
                  placeholder={`Reply to ${active.fullName}…`}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                />
                <button className="btn btn--primary btn--sm" onClick={handleSend} disabled={!draft.trim()}>
                  <I.Send size={14} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
              {contactsQ.isLoading ? 'Loading…' : 'Select a conversation.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
