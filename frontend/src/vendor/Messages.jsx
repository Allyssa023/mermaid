import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { getChatUsers, getConversation } from '../api/messages'
import { useStompChat } from '../hooks/useStompChat'
import DealChatPane from '../components/DealChatPane'
import {
  getDeal,
  listDealMessages,
  submitProposal,
  acceptProposal,
  rejectProposal,
  listMyDeals,
} from './api/deals'
import { readLastViewed, writeLastViewed } from '../utils/dealsLocalStorage'

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

const vendorDealsApi = {
  getDeal,
  listDealMessages,
  submitProposal,
  acceptProposal,
  rejectProposal,
}

export default function VendorMessagesPage() {
  const { user } = useAuth()
  const myId = user?.id
  const [searchParams, setSearchParams] = useSearchParams()

  const [mode, setMode] = useState('dm')
  const [activeUserId, setActiveUserId] = useState(null)
  const [activeDealId, setActiveDealId] = useState(null)
  const [draft, setDraft] = useState('')
  const [localMsgs, setLocalMsgs] = useState([])
  const bodyRef = useRef(null)

  const contactsQ = useQuery({ queryKey: ['chatUsers'], queryFn: getChatUsers })
  const contacts = contactsQ.data || []

  const dealsQ = useQuery({
    queryKey: ['deals', 'mine', 'NEGOTIATING'],
    queryFn: () => listMyDeals('NEGOTIATING'),
  })
  const activeDeals = dealsQ.data || []

  // Auto-select deal from ?deal=... on mount (and on changes).
  const dealParam = searchParams.get('deal')
  useEffect(() => {
    if (!dealParam) return
    const id = Number(dealParam)
    if (Number.isNaN(id)) return
    setMode('deal')
    setActiveDealId(id)
    writeLastViewed(id)
  }, [dealParam])

  useEffect(() => {
    if (mode === 'dm' && !activeUserId && contacts.length > 0) {
      setActiveUserId(contacts[0].id)
    }
  }, [contacts, activeUserId, mode])

  const convQ = useQuery({
    queryKey: ['conversation', activeUserId],
    queryFn: () => getConversation(activeUserId),
    enabled: !!activeUserId && mode === 'dm',
  })

  useEffect(() => {
    if (convQ.data) setLocalMsgs(convQ.data)
  }, [convQ.data])

  useEffect(() => {
    setLocalMsgs([])
    if (activeUserId && mode === 'dm') convQ.refetch()
  }, [activeUserId, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const onMessage = useCallback((msg) => {
    if (mode !== 'dm') return
    if (msg.senderId === activeUserId || msg.recipientId === activeUserId) {
      setLocalMsgs(prev => [...prev, msg])
    }
  }, [activeUserId, mode])

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

  const handleSelectDeal = (deal) => {
    setMode('deal')
    setActiveDealId(deal.id)
    writeLastViewed(deal.id)
    // Reflect selection in URL so refreshes hold.
    const next = new URLSearchParams(searchParams)
    next.set('deal', String(deal.id))
    setSearchParams(next, { replace: true })
  }

  const handleSelectContact = (id) => {
    setMode('dm')
    setActiveUserId(id)
    if (searchParams.has('deal')) {
      const next = new URLSearchParams(searchParams)
      next.delete('deal')
      setSearchParams(next, { replace: true })
    }
  }

  const active = contacts.find(c => c.id === activeUserId)

  const dealUnread = useMemo(() => {
    const map = {}
    for (const d of activeDeals) {
      const stamp = d.latestProposal?.createdAt || d.updatedAt || d.createdAt
      const last = readLastViewed(d.id)
      const lastMs = last ? last.getTime() : 0
      map[d.id] = stamp ? new Date(stamp).getTime() > lastMs : false
    }
    return map
  }, [activeDeals])

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      <div className="page__head" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{ marginTop: 4 }}><em>Messages</em></h1>
          <p className="page__sub">{contacts.length} conversation{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--sm"><I.Filter size={12} /> Filter</button>
        </div>
      </div>

      <div className="msgs">
        <div className="msgs__list">
          {activeDeals.length > 0 && (
            <>
              <div className="msgs__head">
                <strong style={{ fontSize: 13 }}>Active deals</strong>
                <span className="kbd">{activeDeals.length}</span>
              </div>
              {activeDeals.map(d => {
                const prop = d.latestProposal
                const on = mode === 'deal' && activeDealId === d.id
                const unread = dealUnread[d.id]
                return (
                  <div
                    key={`deal-${d.id}`}
                    className={`contact${on ? ' contact--on' : ''}`}
                    onClick={() => handleSelectDeal(d)}
                    data-testid={`deal-row-${d.id}`}
                  >
                    <div className={`contact__avatar contact__avatar--${colorOf(d.id)}`}>
                      {initials(d.counterpartyName)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="contact__name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.counterpartyName || `User #${d.counterpartyId}`}
                        </span>
                        {unread && (
                          <span
                            data-testid={`deal-unread-${d.id}`}
                            style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent, #2a8)' }}
                          />
                        )}
                      </div>
                      <div className="contact__preview">
                        <span style={{
                          fontSize: 10,
                          color: 'var(--ink-4)',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginRight: 6,
                        }}>CA-{d.catchAlertId}</span>
                        {prop && (
                          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                            {prop.qtyKg}kg @ ₱{prop.pricePerKg}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          <div className="msgs__head">
            <strong style={{ fontSize: 13 }}>All conversations</strong>
            <span className="kbd">{contacts.length}</span>
          </div>
          <div className="msgs__search">
            <input placeholder="Search contacts, messages…" readOnly />
          </div>
          {contactsQ.isLoading && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>Loading…</div>
          )}
          {contacts.map(c => (
            <div
              key={c.id}
              className={`contact${mode === 'dm' && activeUserId === c.id ? ' contact--on' : ''}`}
              onClick={() => handleSelectContact(c.id)}
            >
              <div className={`contact__avatar contact__avatar--${colorOf(c.id)}`}>
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
              </div>
            </div>
          ))}
          {!contactsQ.isLoading && contacts.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>No conversations yet.</div>
          )}
        </div>

        <div className="thread">
          {mode === 'deal' && activeDealId != null ? (
            <DealChatPane dealId={activeDealId} currentUserId={myId} apiClient={vendorDealsApi} />
          ) : active ? (
            <>
              <div className="thread__head">
                <div className={`contact__avatar contact__avatar--${colorOf(active.id)}`}>
                  {initials(active.fullName)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{active.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                    {active.role}
                  </div>
                </div>
                <div className="spacer" />
                <button className="topbar__icon-btn"><I.Dots size={14} /></button>
              </div>
              <div className="thread__body" ref={bodyRef}>
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
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                    No messages yet. Say hi!
                  </div>
                )}
              </div>
              <div className="thread__input">
                <textarea
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                />
                <button className="btn btn--accent" onClick={handleSend} disabled={!draft.trim()}>
                  <I.Send size={12} /> Send
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
              Select a conversation to start chatting.
            </div>
          )}
        </div>

        {mode === 'dm' && active && (
          <div className="thread__info">
            <div>
              <h4>Contact</h4>
              <div className="info-item"><span className="l">Name</span><span className="v">{active.fullName}</span></div>
              <div className="info-item"><span className="l">Role</span><span className="v">{active.role}</span></div>
              <div className="info-item"><span className="l">Email</span><span className="v" style={{ fontSize: 11 }}>{active.email}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
