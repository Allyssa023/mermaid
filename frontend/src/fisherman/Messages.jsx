import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import DealChatPane from '../components/DealChatPane'
import {
  getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal, listMyDeals,
} from './api/deals'
import { readLastViewed, writeLastViewed } from '../utils/dealsLocalStorage'

const fishermanDealsApi = { getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal }

const initials = (name) =>
  (name ?? '?').split(' ').filter(x => x.length > 0).map(x => x[0]).slice(0, 2).join('').toUpperCase() || '?'

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yest.'
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function MessagesPage({ openDealId, clearOpenDealId }) {
  const { user } = useAuth()
  const myId = user?.id
  const [activeDealId, setActiveDealId] = useState(openDealId ?? null)
  const [filter, setFilter] = useState('all')
  const [expandedGroups, setExpandedGroups] = useState(() => new Set())

  const dealsQ = useQuery({ queryKey: ['deals', 'mine'], queryFn: () => listMyDeals() })
  const allDeals = dealsQ.data ?? []

  // When navigated here with a specific deal (e.g. after accepting), auto-select it
  useEffect(() => {
    if (openDealId != null) {
      setActiveDealId(openDealId)
      writeLastViewed(openDealId)
      clearOpenDealId?.()
    }
  }, [openDealId, clearOpenDealId])

  const dealUnread = useMemo(() => {
    const map = {}
    for (const d of allDeals) {
      const stamp = d.lastMessageAt || d.updatedAt || d.createdAt
      const last = readLastViewed(d.id)
      const lastMs = last ? last.getTime() : 0
      map[d.id] = stamp ? new Date(stamp).getTime() > lastMs : false
    }
    return map
  }, [allDeals])

  const filteredDeals = useMemo(() => {
    return allDeals.filter(d => {
      if (filter === 'unread') return dealUnread[d.id]
      if (filter === 'negotiating') return d.status === 'NEGOTIATING'
      if (filter === 'agreed') return d.status === 'AGREED'
      return true
    })
  }, [allDeals, filter, dealUnread])

  const dealGroups = useMemo(() => {
    const map = new Map()
    for (const d of filteredDeals) {
      const pid = d.counterpartyId ?? d.vendorId
      const name = d.counterpartyName || d.vendorName || `User #${pid}`
      if (!map.has(pid)) map.set(pid, { pid, name, deals: [] })
      map.get(pid).deals.push(d)
    }
    const groups = Array.from(map.values())

    // Sort deals inside each group (Negotiating first, then Agreed, then Closed; newest first)
    for (const g of groups) {
      g.deals.sort((a, b) => {
        const getTier = (status) => {
          if (status === 'NEGOTIATING') return 0
          if (status === 'AGREED') return 1
          return 2
        }
        const tierA = getTier(a.status)
        const tierB = getTier(b.status)
        if (tierA !== tierB) return tierA - tierB

        const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
        const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime()
        return timeB - timeA
      })
    }

    // Sort groups by the highest tier deal they have, then by latest activity (newest first)
    groups.sort((a, b) => {
      const getGroupMinTier = (deals) => {
        return Math.min(...deals.map(d => {
          if (d.status === 'NEGOTIATING') return 0
          if (d.status === 'AGREED') return 1
          return 2
        }))
      }
      const tierA = getGroupMinTier(a.deals)
      const tierB = getGroupMinTier(b.deals)
      if (tierA !== tierB) return tierA - tierB

      const aMaxTime = Math.max(...a.deals.map(d => new Date(d.lastMessageAt || d.updatedAt || d.createdAt || 0).getTime()))
      const bMaxTime = Math.max(...b.deals.map(d => new Date(d.lastMessageAt || d.updatedAt || d.createdAt || 0).getTime()))
      return bMaxTime - aMaxTime
    })

    return groups
  }, [filteredDeals, activeDealId])

  useEffect(() => {
    if (dealGroups.length === 0) return
    if (activeDealId == null) {
      setExpandedGroups(prev => prev.size === 0 ? new Set([dealGroups[0].pid]) : prev)
      return
    }
    for (const g of dealGroups) {
      if (g.deals.some(d => d.id === activeDealId)) {
        setExpandedGroups(prev => new Set([...prev, g.pid]))
        break
      }
    }
  }, [activeDealId, dealGroups])

  const toggleGroup = (pid) =>
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })

  const selectDeal = (deal) => {
    setActiveDealId(deal.id)
    writeLastViewed(deal.id)
  }

  const activeDeal = allDeals.find(d => d.id === activeDealId)

  return (
    <div className="fade-in" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page__head" style={{ flexShrink: 0 }}>
        <div>
          <div className="eyebrow"><span className="dot" />Vendor coordination</div>
          <h1 className="page__title"><em className="chip-lime">Messages</em></h1>
          <p className="page__sub">Real-time chat with vendors, deal negotiations, and your network.</p>
        </div>
      </div>

      <div className="f-msg-shell">
        {/* Left pane */}
        <div className="f-msg-list">
          <div className="f-msg-list__head">
            <div className="f-msg-list__title">Chats</div>
            <div className="f-msg-list__filter">
              {['all', 'unread', 'negotiating', 'agreed'].map(f => (
                <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="f-msg-list__body">
            {dealsQ.isLoading && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--muted)' }}>Loading deals…</div>
            )}

            {!dealsQ.isLoading && dealGroups.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                {allDeals.length === 0 ? 'No deal conversations yet.' : 'No matches.'}
              </div>
            )}

            {dealGroups.map(({ pid, name, deals }) => {
              const isOpen = expandedGroups.has(pid)
              const groupActive = deals.some(d => d.id === activeDealId)
              const groupUnread = deals.some(d => dealUnread[d.id])
              const latestAt = fmtDate(deals.reduce((best, d) => {
                const t = d.lastMessageAt || d.updatedAt || d.createdAt
                return !best || (t && t > best) ? t : best
              }, null))

              return (
                <div key={`group-${pid}`}>
                  <div
                    className={`f-msg-item${groupActive ? ' on' : ''}`}
                    onClick={() => toggleGroup(pid)}
                  >
                    <div className="f-msg-item__avatar">{initials(name)}</div>
                    <div className="f-msg-item__body">
                      <div className="f-msg-item__row">
                        <span className="f-msg-item__name">{name}</span>
                        <span className="f-msg-item__time">{latestAt}</span>
                      </div>
                      <div className="f-msg-item__last" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                          {deals.length} deal{deals.length !== 1 ? 's' : ''}
                        </span>
                        {groupUnread && <span className="f-msg-item__unread">NEW</span>}
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </div>
                    </div>
                  </div>

                  {isOpen && deals.map(d => {
                    const on = activeDealId === d.id
                    const unread = dealUnread[d.id]
                    const species = d.speciesName || ''
                    const dealCode = `#${String(d.id).padStart(4, '0')}`

                    return (
                      <div
                        key={`deal-${d.id}`}
                        className={`f-msg-item${on ? ' on' : ''}`}
                        onClick={() => selectDeal(d)}
                        style={{ paddingLeft: 40 }}
                      >
                        <div className="f-msg-item__body">
                          <div className="f-msg-item__row">
                            <span className="f-msg-item__code" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                              {dealCode}{species ? ` · ${species}` : ''}
                            </span>
                            <span className="f-msg-item__time">{fmtDate(d.lastMessageAt || d.updatedAt || d.createdAt)}</span>
                          </div>
                          <div className="f-msg-item__meta">
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
                            {unread && <span className="f-msg-item__unread">NEW</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right pane */}
        <div className="f-msg-thread">
          {activeDealId != null ? (
            <>
              {activeDeal && (
                <div className="f-msg-thread__head">
                  <div className="f-msg-item__avatar" style={{ width: 40, height: 40 }}>
                    {initials(activeDeal.counterpartyName || activeDeal.vendorName || `V${activeDeal.counterpartyId ?? activeDeal.vendorId}`)}
                  </div>
                  <div>
                    <div style={{ font: '600 14px var(--font-display)', color: 'var(--ink-1)' }}>
                      {activeDeal.counterpartyName || activeDeal.vendorName || `Vendor #${activeDeal.counterpartyId ?? activeDeal.vendorId}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                      #{String(activeDeal.id).padStart(4, '0')}
                      {activeDeal.speciesName ? ` · ${activeDeal.speciesName}` : ''}
                      {' · '}{activeDeal.status}
                    </div>
                  </div>
                </div>
              )}
              <div className="f-msg-thread__body">
                <DealChatPane dealId={activeDealId} currentUserId={myId} apiClient={fishermanDealsApi} />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, opacity: 0.25 }}>💬</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)' }}>Select a conversation to start</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
