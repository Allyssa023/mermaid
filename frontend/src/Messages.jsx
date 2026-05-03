import { useState, useEffect, useRef, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import './messages.css'
import { Client } from '@stomp/stompjs'
import { apiGet } from './api'

// ── Icons ──────────────────────────────────────────────────────────────────────

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const PaperclipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
)
const SendIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const ReceiptIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
  </svg>
)
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
)

// ── Helpers ─────────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function avatarColor(id) {
  const colors = ['accent', 'warm', 'sage']
  return colors[(id || 0) % colors.length]
}

function parseInterestMessage(content) {
  if (!content) return null
  const match = content.match(/^Interested in (.+?) at (.+?)\.\nNote: (.+)$/s)
  if (!match) return null
  return { species: match[1], location: match[2], note: match[3] }
}

function groupByDate(messages) {
  const groups = []
  let currentDate = null
  messages.forEach(m => {
    const d = new Date(m.sentAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
    if (d !== currentDate) {
      currentDate = d
      groups.push({ type: 'date', label: d })
    }
    groups.push({ type: 'msg', data: m })
  })
  return groups
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Messages({ token, userProfile, initialContact }) {
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const stompClientRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGet('/messages/users', token)
      setContacts(data)
      return data
    } catch (e) {
      console.error(e)
      return []
    }
  }, [token])

  // On mount: load contacts, then select initialContact if provided
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await loadContacts()
      if (cancelled) return
      if (initialContact) {
        const existing = data.find(c => Number(c.id) === Number(initialContact.id))
        if (existing) {
          setActiveContact(existing)
        } else {
          setContacts(prev => {
            if (prev.some(c => Number(c.id) === Number(initialContact.id))) return prev
            return [initialContact, ...prev]
          })
          setActiveContact(initialContact)
        }
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const client = new Client({
      brokerURL: `ws://localhost:8080/api/ws-chat`,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/user/queue/messages', (msg) => {
          const body = JSON.parse(msg.body)
          setMessages(prev => {
            if (prev.some(m => m.id === body.id)) return prev
            return [...prev, body]
          })
          loadContacts()
        })
      },
      onDisconnect: () => {
        setConnected(false)
      }
    })

    client.activate()
    stompClientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [loadContacts])

  const loadConversation = useCallback(async (userId) => {
    try {
      const data = await apiGet(`/messages/${userId}`, token)
      setMessages(data)
    } catch(e) {
      console.error(e)
    }
  }, [token])

  useEffect(() => {
    if (activeContact) {
      loadConversation(activeContact.id)
    }
  }, [activeContact, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeContact || !stompClientRef.current) return

    stompClientRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        recipientId: activeContact.id,
        content: draft.trim()
      })
    })

    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleTextareaInput = (e) => {
    setDraft(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(e)
    }
  }

  // Filter contacts by search
  const filteredContacts = contacts.filter(c =>
    !searchQuery || c.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group messages by date
  const grouped = groupByDate(messages)

  const totalUnread = contacts.reduce((a, c) => a + (c.unreadCount || 0), 0)

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      <div className="page__head" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{ marginTop: 4 }}><em>Messages</em></h1>
          <p className="page__sub">{contacts.length} conversations · {totalUnread} unread</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--sm"><FilterIcon /> Filter</button>
          <button className="btn btn--primary btn--sm"><PlusIcon /> New message</button>
        </div>
      </div>

      <div className="msgs">
        {/* ── Left: Contact List ── */}
        <div className="msgs__list">
          <div className="msgs__head">
            <strong style={{ fontSize: 13 }}>All conversations</strong>
            <span className="kbd">{contacts.length}</span>
          </div>
          <div className="msgs__search">
            <input
              placeholder="Search contacts, messages…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--ink-4)', fontSize: 13 }}>No conversations yet.</div>
          ) : (
            filteredContacts.map(c => {
              const isActive = activeContact?.id === c.id
              const color = avatarColor(c.id)
              const unread = c.unreadCount || 0
              return (
                <div
                  key={c.id}
                  className={`contact${isActive ? ' contact--on' : ''}`}
                  onClick={() => setActiveContact(c)}
                >
                  <div className={`contact__avatar contact__avatar--${color}${connected ? ' contact__avatar--online' : ''}`}>
                    {initials(c.fullName)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="contact__name">{c.fullName}</div>
                    <div className="contact__preview">
                      <span style={{
                        fontSize: 10,
                        color: 'var(--ink-4)',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginRight: 6,
                      }}>{c.role}</span>
                    </div>
                    {c.lastMessage && (
                      <div className="contact__preview" style={{ marginTop: 1 }}>
                        {c.lastMessage?.length > 40 ? c.lastMessage.substring(0, 40) + '…' : c.lastMessage}
                      </div>
                    )}
                  </div>
                  <div className="contact__meta">
                    {c.lastMessageAt && (
                      <div>{new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    )}
                    {unread > 0 && <span className="contact__unread">{unread}</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Center: Thread ── */}
        {activeContact ? (
          <div className="thread">
            <div className="thread__head">
              <div className={`contact__avatar contact__avatar--${avatarColor(activeContact.id)}${connected ? ' contact__avatar--online' : ''}`}>
                {initials(activeContact.fullName)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{activeContact.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                  {activeContact.role} · {connected ? 'Online now' : 'Offline'}
                </div>
              </div>
              <div className="spacer" />
              <button className="topbar__icon-btn"><ReceiptIcon /></button>
              <button className="topbar__icon-btn"><DotsIcon /></button>
            </div>

            <div className="thread__body">
              {grouped.map((item, i) => {
                if (item.type === 'date') {
                  return <div key={`d-${i}`} className="thread__date-sep">— {item.label} —</div>
                }
                const m = item.data
                const isMine = m.senderId === userProfile?.id
                const interest = parseInterestMessage(m.content)

                if (interest) {
                  return (
                    <div key={m.id} className={`bubble bubble--${isMine ? 'mine' : 'theirs'}`}>
                      <div className="bubble--quote">
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, fontFamily: 'var(--font-mono)', marginBottom: 2 }}>Re: listing</div>
                        {interest.species} · {interest.location}
                      </div>
                      {interest.note}
                      <div className="bubble__time">
                        {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={m.id} className={`bubble bubble--${isMine ? 'mine' : 'theirs'}`}>
                    {m.content}
                    <div className="bubble__time">
                      {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {messages.length > 0 && (
                <div className="bubble bubble--theirs" style={{ padding: '8px 14px', opacity: 0 }}>
                  <span style={{ display: 'inline-flex', gap: 3 }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form className="thread__input" onSubmit={send}>
              <button type="button" className="topbar__icon-btn"><PaperclipIcon /></button>
              <textarea
                ref={textareaRef}
                placeholder="Type a message…"
                value={draft}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                disabled={!connected}
                rows={1}
              />
              <button type="submit" className="btn btn--accent" disabled={!draft.trim() || !connected}>
                <SendIcon /> Send
              </button>
            </form>
          </div>
        ) : (
          <div className="msgs-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>Select a conversation</div>
            <div style={{ fontSize: 13 }}>Choose a contact to start messaging</div>
          </div>
        )}

        {/* ── Right: Info Panel ── */}
        {activeContact ? (
          <div className="thread__info">
            <div>
              <h4>Contact</h4>
              <div className="info-item"><span className="l">Name</span><span className="v">{activeContact.fullName}</span></div>
              <div className="info-item"><span className="l">Type</span><span className="v">{activeContact.role}</span></div>
              <div className="info-item"><span className="l">Status</span><span className="v">{connected ? 'Online' : 'Offline'}</span></div>
            </div>

            <div>
              <h4>Active deal</h4>
              <div style={{ padding: 12, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line-soft, var(--line))' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>No active deals</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  Deals appear when orders are matched
                </div>
              </div>
            </div>

            <div>
              <h4>Recent orders together</h4>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No shared orders yet</div>
            </div>

            <div>
              <h4>Shared files</h4>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No files yet</div>
            </div>
          </div>
        ) : (
          <div className="thread__info" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Select a conversation to view details</div>
          </div>
        )}
      </div>
    </div>
  )
}
