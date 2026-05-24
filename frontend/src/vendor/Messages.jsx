import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
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
  competitorCount,
} from './api/deals'
import { readLastViewed, writeLastViewed } from '../utils/dealsLocalStorage'

// ── helpers ──────────────────────────────────────────────────────────────────

const initials = (name) =>
  (name ?? '?')
    .split(' ')
    .filter((x) => x.length > 0)
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

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
  competitorCount,
}

// ── PageHead ─────────────────────────────────────────────────────────────────

function PageHead({ eyebrow, title, em, sub, actions }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="section-title">
          {title} {em && <em>{em}</em>}
        </h1>
        {sub && (
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 560 }}>
            {sub}
          </p>
        )}
      </div>
      <div className="page__actions">{actions}</div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function VendorMessagesPage() {
  const { user } = useAuth()
  const myId = user?.id
  const [searchParams, setSearchParams] = useSearchParams()

  // 'deal' | 'dm'
  const [mode, setMode] = useState('deal')
  const [activeUserId, setActiveUserId] = useState(null)
  const [activeDealId, setActiveDealId] = useState(null)

  // deal-list filter: 'all' | 'unread' | 'negotiating' | 'agreed'
  const [filter, setFilter] = useState('all')

  const [draft, setDraft] = useState('')
  const [localMsgs, setLocalMsgs] = useState([])
  const bodyRef = useRef(null)

  // ── data fetching ─────────────────────────────────────────────────────────

  const contactsQ = useQuery({ queryKey: ['chatUsers'], queryFn: getChatUsers })
  const contacts = contactsQ.data || []

  const dealsQ = useQuery({
    queryKey: ['deals', 'mine'],
    queryFn: () => listMyDeals(),
  })
  const allDeals = dealsQ.data || []

  // ── URL param: ?deal=... ──────────────────────────────────────────────────

  const dealParam = searchParams.get('deal')
  useEffect(() => {
    if (!dealParam) return
    const id = Number(dealParam)
    if (Number.isNaN(id)) return
    setMode('deal')
    setActiveDealId(id)
    writeLastViewed(id)
  }, [dealParam])

  // ── auto-select first deal on load ────────────────────────────────────────

  useEffect(() => {
    if (mode === 'deal' && activeDealId == null && allDeals.length > 0) {
      setActiveDealId(allDeals[0].id)
    }
  }, [allDeals, activeDealId, mode])

  // ── auto-select first contact when in dm mode ─────────────────────────────

  useEffect(() => {
    if (mode === 'dm' && !activeUserId && contacts.length > 0) {
      setActiveUserId(contacts[0].id)
    }
  }, [contacts, activeUserId, mode])

  // ── DM conversation ───────────────────────────────────────────────────────

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

  const onMessage = useCallback(
    (msg) => {
      if (mode !== 'dm') return
      if (msg.senderId === activeUserId || msg.recipientId === activeUserId) {
        setLocalMsgs((prev) => [...prev, msg])
      }
    },
    [activeUserId, mode],
  )

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

  // ── selection handlers ────────────────────────────────────────────────────

  const handleSelectDeal = (deal) => {
    setMode('deal')
    setActiveDealId(deal.id)
    writeLastViewed(deal.id)
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

  // ── unread computation ────────────────────────────────────────────────────

  const dealUnread = useMemo(() => {
    const map = {}
    for (const d of allDeals) {
      const stamp = d.latestProposal?.createdAt || d.updatedAt || d.createdAt
      const last = readLastViewed(d.id)
      const lastMs = last ? last.getTime() : 0
      map[d.id] = stamp ? new Date(stamp).getTime() > lastMs : false
    }
    return map
  }, [allDeals])

  // ── filter deals ──────────────────────────────────────────────────────────

  const filteredDeals = useMemo(() => {
    return allDeals.filter((d) => {
      if (filter === 'unread') return dealUnread[d.id]
      if (filter === 'negotiating') return d.status === 'NEGOTIATING'
      if (filter === 'agreed') return d.status === 'AGREED'
      return true
    })
  }, [allDeals, filter, dealUnread])

  const activeDeal = allDeals.find((d) => d.id === activeDealId)
  const activeContact = contacts.find((c) => c.id === activeUserId)

  // ── group deals by counterparty ───────────────────────────────────────────────
  const [expandedGroups, setExpandedGroups] = useState(() => new Set())

  const dealGroups = useMemo(() => {
    const map = new Map()
    for (const d of filteredDeals) {
      const pid = d.counterpartyId ?? d.fishermanId
      const name = d.counterpartyName || d.fishermanName || `User #${pid}`
      if (!map.has(pid)) map.set(pid, { pid, name, deals: [] })
      map.get(pid).deals.push(d)
    }
    return Array.from(map.values())
  }, [filteredDeals])

  useEffect(() => {
    if (dealGroups.length === 0) return
    if (activeDealId == null) {
      setExpandedGroups((prev) => prev.size === 0 ? new Set([dealGroups[0].pid]) : prev)
      return
    }
    for (const g of dealGroups) {
      if (g.deals.some((d) => d.id === activeDealId)) {
        setExpandedGroups((prev) => new Set([...prev, g.pid]))
        break
      }
    }
  }, [activeDealId, dealGroups])

  const toggleGroup = (pid) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="content">
      <PageHead
        eyebrow="Messages · Deals"
        title="Negotiate"
        em="in flight"
        sub="Open conversations with fishermen. Counter-offers, agreements, and handoff scheduling all live here."
        actions={
          <button className="btn" onClick={() => setFilter('all')}>
            + New deal
          </button>
        }
      />

      <div className="msg-shell">
        {/* ── LEFT PANE ─────────────────────────────────────────────────── */}
        <div className="msg-list">
          <div className="msg-list__head">
            <div className="msg-list__title">Conversations</div>
            <div className="msg-tabs">
              <button
                className={`msg-tabs__btn${mode === 'deal' ? ' msg-tabs__btn--on' : ''}`}
                onClick={() => setMode('deal')}
              >
                Deals
              </button>
              <button
                className={`msg-tabs__btn${mode === 'dm' ? ' msg-tabs__btn--on' : ''}`}
                onClick={() => setMode('dm')}
              >
                Buyer Chats
              </button>
            </div>
            {mode === 'deal' && (
              <div className="msg-list__filter">
                <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'unread' ? 'on' : ''} onClick={() => setFilter('unread')}>Unread</button>
                <button className={filter === 'negotiating' ? 'on' : ''} onClick={() => setFilter('negotiating')}>Negotiating</button>
                <button className={filter === 'agreed' ? 'on' : ''} onClick={() => setFilter('agreed')}>Agreed</button>
              </div>
            )}
          </div>

          <div className="msg-list__body">
            {mode === 'deal' && (
              <>
                {dealsQ.isLoading && (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--muted)' }}>
                    Loading deals…
                  </div>
                )}

                {/* Grouped deal rows */}
                {dealGroups.length === 0 && !dealsQ.isLoading && (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--muted)' }}>
                    No active deals yet.
                  </div>
                )}

                {dealGroups.map(({ pid, name, deals }) => {
                  const isOpen = expandedGroups.has(pid)
                  const groupUnread = deals.some((d) => dealUnread[d.id])
                  const latestAt = fmtDate(
                    deals.reduce((best, d) => {
                      const t = d.latestProposal?.createdAt || d.updatedAt || d.createdAt
                      return !best || (t && t > best) ? t : best
                    }, null)
                  )
                  const groupActive = mode === 'deal' && deals.some((d) => d.id === activeDealId)

                  return (
                    <div key={`group-${pid}`}>
                      {/* Person row */}
                      <div
                        className={`msg-item msg-item--group${groupActive ? ' on' : ''}`}
                        onClick={() => toggleGroup(pid)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="msg-item__avatar">{initials(name)}</div>
                        <div className="msg-item__body">
                          <div className="msg-item__row">
                            <span className="msg-item__name">{name}</span>
                            <span className="msg-item__time">{latestAt}</span>
                          </div>
                          <div className="msg-item__last" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                              {deals.length} deal{deals.length !== 1 ? 's' : ''}
                            </span>
                            {groupUnread && (
                              <span className="msg-item__unread">NEW</span>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                          </div>
                        </div>
                      </div>

                      {/* Deal sub-rows */}
                      {isOpen && deals.map((d) => {
                        const on = mode === 'deal' && activeDealId === d.id
                        const unread = dealUnread[d.id]
                        const species = d.speciesName || d.species?.commonName || d.species?.localName || ''
                        const lastMsg = d.latestProposal
                          ? `₱${d.latestProposal.pricePerKg}/kg · ${d.latestProposal.qtyKg}kg`
                          : 'No proposals yet'
                        const dealCode = `#${String(d.id).padStart(4, '0')}`

                        return (
                          <div
                            key={`deal-${d.id}`}
                            className={`msg-item msg-item--sub${on ? ' on' : ''}`}
                            onClick={() => handleSelectDeal(d)}
                            data-testid={`deal-row-${d.id}`}
                            style={{ paddingLeft: 40 }}
                          >
                            <div className="msg-item__body">
                              <div className="msg-item__row">
                                <span className="msg-item__code" style={{ fontSize: 11 }}>
                                  {dealCode}{species ? ` · ${species}` : ''}
                                </span>
                                <span className="msg-item__time">{fmtDate(d.latestProposal?.createdAt || d.updatedAt || d.createdAt)}</span>
                              </div>
                              <div className="msg-item__last">{lastMsg}</div>
                              <div className="msg-item__meta">
                                {d.status === 'NEGOTIATING' && (
                                  <span className="chip chip--neg" style={{ fontSize: 9 }}>NEG</span>
                                )}
                                {d.status === 'AGREED' && (
                                  <span className="chip chip--ready" style={{ fontSize: 9 }}>AGREED</span>
                                )}
                                {(d.status === 'CANCELLED' || d.status === 'EXPIRED') && (
                                  <span className="chip chip--cancel" style={{ fontSize: 9 }}>
                                    {d.status === 'EXPIRED' ? 'EXPIRED' : 'CANCEL'}
                                  </span>
                                )}
                                {unread && (
                                  <span className="msg-item__unread" data-testid={`deal-unread-${d.id}`}>NEW</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {!dealsQ.isLoading && dealGroups.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                    No active deals yet.
                  </div>
                )}
              </>
            )}

            {mode === 'dm' && (
              <>
                {contactsQ.isLoading && (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--muted)' }}>
                    Loading conversations…
                  </div>
                )}

                {contacts.length === 0 && !contactsQ.isLoading && (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--muted)' }}>
                    No conversations yet.
                  </div>
                )}

                {contacts.map((c) => {
                  const on = activeUserId === c.id
                  const lastMsg = c.lastMessage
                  return (
                    <div
                      key={c.id}
                      className={`msg-item${on ? ' on' : ''}`}
                      onClick={() => handleSelectContact(c.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="msg-item__avatar">{initials(c.fullName)}</div>
                      <div className="msg-item__body">
                        <div className="msg-item__row">
                          <span className="msg-item__name">{c.fullName}</span>
                          <span className="msg-item__time">
                            {lastMsg ? fmtDate(lastMsg.sentAt) : ''}
                          </span>
                        </div>
                        <div className="msg-item__last">{lastMsg?.content ?? c.role}</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE ────────────────────────────────────────────────── */}
        <div className="msg-thread">
          {/* Deal thread via DealChatPane */}
          {mode === 'deal' && activeDealId != null ? (
            <>
              {activeDeal && (
                <div className="msg-thread__head">
                  <div className="msg-item__avatar" style={{ width: 40, height: 40 }}>
                    {initials(
                      activeDeal.counterpartyName ||
                        activeDeal.fishermanName ||
                        `U${activeDeal.counterpartyId ?? activeDeal.fishermanId}`,
                    )}
                  </div>
                  <div>
                    <div style={{ font: '600 14px var(--font-display)' }}>
                      {activeDeal.counterpartyName ||
                        activeDeal.fishermanName ||
                        `User #${activeDeal.counterpartyId ?? activeDeal.fishermanId}`}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--muted-2)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      #{String(activeDeal.id).padStart(4, '0')} ·{' '}
                      {activeDeal.speciesName ||
                        activeDeal.species?.commonName ||
                        activeDeal.species?.localName ||
                        ''}
                      {activeDeal.latestProposal?.qtyKg
                        ? ` · ${activeDeal.latestProposal.qtyKg}kg`
                        : ''}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="topbar__icon" title="Pin">
                      📌
                    </button>
                    <button className="topbar__icon" title="Catch alert">
                      🐟
                    </button>
                    <button className="topbar__icon" title="More">
                      •••
                    </button>
                  </div>
                </div>
              )}

              {/* DealChatPane fills the remainder of .msg-thread */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 14px 14px' }}>
                <DealChatPane
                  dealId={activeDealId}
                  currentUserId={myId}
                  apiClient={vendorDealsApi}
                />
              </div>
            </>
          ) : mode === 'dm' && activeContact ? (
            /* DM thread — inline, not using DealChatPane */
            <>
              <div className="msg-thread__head">
                <div className="msg-item__avatar" style={{ width: 40, height: 40 }}>
                  {initials(activeContact.fullName)}
                </div>
                <div>
                  <div style={{ font: '600 14px var(--font-display)' }}>{activeContact.fullName}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted-2)',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {(activeContact.role ?? '').toLowerCase()}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="topbar__icon" title="More">
                    •••
                  </button>
                </div>
              </div>

              <div
                ref={bodyRef}
                className="msg-thread__body"
              >
                {convQ.isLoading && (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                    Loading…
                  </div>
                )}
                {localMsgs.map((m) => {
                  const mine = m.senderId === myId
                  return (
                    <div
                      key={m.id ?? m.sentAt}
                      className={`msg-bubble ${mine ? 'from-me' : 'from-fisher'}`}
                    >
                      {m.content}
                      <span className="msg-bubble__time">{fmtDate(m.sentAt)}</span>
                    </div>
                  )
                })}
                {!convQ.isLoading && localMsgs.length === 0 && (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--muted)',
                    }}
                  >
                    No messages yet. Say hi!
                  </div>
                )}
              </div>

              <div className="msg-composer">
                <button className="btn btn--sm btn--ghost">+</button>
                <input
                  placeholder="Send a message or propose a counter…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                />
                <button
                  className="btn btn--sm btn--primary"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 10,
                color: 'var(--muted)',
              }}
            >
              <div style={{ fontSize: 32, opacity: 0.25 }}>💬</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)' }}>
                Select a conversation to start
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
