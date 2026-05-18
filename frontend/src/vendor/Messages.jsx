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

  const isThreadSelected = (mode === 'deal' && activeDealId != null) || (mode === 'dm' && !!active)

  return (
    <div className="v-page" style={{ paddingBottom: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Page header */}
      <div className="v-page-header" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="v-page-header__title">Messages</h1>
          <p className="v-page-header__sub">Deal negotiations and chat</p>
        </div>
        <div className="v-page-header__actions">
          <button className="v-btn v-btn--ghost v-btn--sm"><I.Filter size={12} /> Filter</button>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, gap: '1px', background: 'var(--hairline)', borderRadius: 'var(--radius-lg, 14px)', overflow: 'hidden', minHeight: 0 }}>

        {/* Conversation list — 350px */}
        <div style={{ width: 350, flexShrink: 0, background: 'var(--bg-card)', overflowY: 'auto', borderRadius: 'var(--radius-lg, 14px) 0 0 var(--radius-lg, 14px)' }}>

          {/* Active deals section */}
          {activeDeals.length > 0 && (
            <>
              <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Deals
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-lime)', background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 999 }}>
                  {activeDeals.length}
                </span>
              </div>
              {activeDeals.map(d => {
                const prop = d.latestProposal
                const on = mode === 'deal' && activeDealId === d.id
                const unread = dealUnread[d.id]
                return (
                  <div
                    key={`deal-${d.id}`}
                    onClick={() => handleSelectDeal(d)}
                    data-testid={`deal-row-${d.id}`}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--hairline-2)',
                      background: on ? 'var(--bg-card-2)' : 'transparent',
                      transition: 'background 0.15s',
                      boxShadow: on ? 'inset 2px 0 0 var(--accent-lime)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-ui, Rubik)', fontWeight: 600, color: 'var(--ink-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {d.speciesName || `Deal #${d.id}`}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {unread && (
                          <span
                            data-testid={`deal-unread-${d.id}`}
                            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-lime)', flexShrink: 0 }}
                          />
                        )}
                        <span className={`v-chip v-chip--${
                          d.status === 'AGREED' ? 'kelp' :
                          d.status === 'EXPIRED' || d.status === 'CANCELLED' ? 'coral' :
                          'tide'
                        }`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', fontSize: 10 }}>{d.counterpartyName || `User #${d.counterpartyId}`}</span>
                      {prop && (
                        <span>{prop.qtyKg}kg @ ₱{prop.pricePerKg}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* All conversations section */}
          <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Conversations
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-elev)', padding: '1px 7px', borderRadius: 999 }}>
              {contacts.length}
            </span>
          </div>

          {/* Search input */}
          <div style={{ padding: '0 12px 8px' }}>
            <input
              placeholder="Search contacts, messages…"
              readOnly
              style={{
                width: '100%',
                background: 'var(--bg-card-2)',
                border: '1px solid var(--hairline)',
                borderRadius: 8,
                padding: '7px 12px',
                color: 'var(--ink-2)',
                fontSize: 12,
                fontFamily: 'var(--font-ui, Rubik)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {contactsQ.isLoading && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-ui, Rubik)' }}>Loading…</div>
          )}

          {contacts.map(c => {
            const on = mode === 'dm' && activeUserId === c.id
            return (
              <div
                key={c.id}
                onClick={() => handleSelectContact(c.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--hairline-2)',
                  background: on ? 'var(--bg-card-2)' : 'transparent',
                  transition: 'background 0.15s',
                  boxShadow: on ? 'inset 2px 0 0 var(--tide)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-ui, Rubik)', fontWeight: 600, color: 'var(--ink-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.fullName}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                    {c.role}
                  </span>
                </div>
              </div>
            )
          })}

          {!contactsQ.isLoading && contacts.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-ui, Rubik)' }}>No conversations yet.</div>
          )}
        </div>

        {/* Thread area — flex */}
        <div style={{ flex: 1, background: 'var(--bg-canvas)', borderRadius: '0 var(--radius-lg, 14px) var(--radius-lg, 14px) 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mode === 'deal' && activeDealId != null ? (
            <DealChatPane dealId={activeDealId} currentUserId={myId} apiClient={vendorDealsApi} />
          ) : active ? (
            <>
              {/* Thread header */}
              <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--hairline)', background: 'var(--bg-card)' }}>
                <div className={`contact__avatar contact__avatar--${colorOf(active.id)}`} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {initials(active.fullName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-ui, Rubik)' }}>{active.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {active.role}
                  </div>
                </div>
                <button className="v-btn v-btn--ghost v-btn--sm" style={{ padding: '4px 8px' }}><I.Dots size={14} /></button>
              </div>

              {/* Message body */}
              <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {convQ.isLoading && (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-4)' }}>Loading…</div>
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
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-ui, Rubik)' }}>
                    No messages yet. Say hi!
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--hairline)', background: 'var(--bg-card)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                  style={{
                    flex: 1,
                    background: 'var(--bg-card-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'var(--ink-1)',
                    fontSize: 13,
                    fontFamily: 'var(--font-ui, Rubik)',
                    resize: 'none',
                    outline: 'none',
                    minHeight: 38,
                    maxHeight: 120,
                  }}
                />
                <button
                  className="v-btn v-btn--primary v-btn--sm"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  style={{ alignSelf: 'flex-end' }}
                >
                  <I.Send size={12} /> Send
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--ink-4)', fontFamily: 'var(--font-ui, Rubik)' }}>
              <span style={{ fontSize: 32, opacity: 0.3 }}>💬</span>
              <span style={{ fontSize: 14 }}>Select a conversation to start chatting</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
