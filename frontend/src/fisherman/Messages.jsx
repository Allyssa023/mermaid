import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import DealChatPane from '../components/DealChatPane'
import {
  getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal, listMyDeals,
} from './api/deals'
import { readLastViewed, writeLastViewed } from '../utils/dealsLocalStorage'

const fishermanDealsApi = { getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal }

export default function MessagesPage() {
  const { user } = useAuth()
  const myId = user?.id
  const [activeDealId, setActiveDealId] = useState(null)
  const [search, setSearch] = useState('')

  const dealsQ = useQuery({ queryKey: ['deals', 'mine'], queryFn: () => listMyDeals() })
  const deals = dealsQ.data ?? []

  const selectDeal = (id) => {
    setActiveDealId(id)
    writeLastViewed(id)
  }

  const isUnread = (deal) => {
    if (!deal.lastMessageAt) return false
    const last = readLastViewed(deal.id)
    return new Date(deal.lastMessageAt) > (last ?? new Date(0))
  }

  const activeDeal = deals.find(d => d.id === activeDealId)
  const filtered = search
    ? deals.filter(d => (d.vendorName ?? '').toLowerCase().includes(search.toLowerCase()) || (d.speciesName ?? '').toLowerCase().includes(search.toLowerCase()))
    : deals

  const initials = (name) => (name ?? 'V').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const [expandedGroups, setExpandedGroups] = useState(() => new Set())

  const dealGroups = useMemo(() => {
    const map = new Map()
    for (const d of filtered) {
      const pid = d.counterpartyId ?? d.vendorId
      const name = d.counterpartyName || d.vendorName || `User #${pid}`
      if (!map.has(pid)) map.set(pid, { pid, name, deals: [] })
      map.get(pid).deals.push(d)
    }
    return Array.from(map.values())
  }, [filtered])

  useEffect(() => {
    if (dealGroups.length === 0) return
    if (!activeDealId) {
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

  const toggleGroup = (pid) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })

  return (
    <div className="fade-in" style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page__head" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div>
          <div className="eyebrow"><span className="dot" />Vendor coordination</div>
          <h1 className="page__title"><em className="chip-lime">Messages</em></h1>
          <p className="page__sub">Real-time chat with vendors, deal negotiations, and your network.</p>
        </div>
      </div>

      <div className="card card--flush" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Conversation list */}
        <div style={{ borderRight: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
            <div className="f-topbar__search" style={{ width: '100%' }}>
              <I.Search size={13} />
              <input placeholder="Search conversations" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {dealGroups.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                {deals.length === 0 ? 'No deal conversations yet.' : 'No matches.'}
              </div>
            ) : dealGroups.map(({ pid, name, deals: groupDeals }) => {
              const isOpen = expandedGroups.has(pid)
              const groupActive = groupDeals.some(d => d.id === activeDealId)
              const latestAt = groupDeals.reduce((best, d) => {
                const t = d.lastMessageAt || d.updatedAt || d.createdAt
                return !best || (t && t > best) ? t : best
              }, null)

              return (
                <div key={`group-${pid}`}>
                  {/* Vendor group row */}
                  <div
                    className={`message-row${groupActive ? ' message-row--on' : ''}`}
                    onClick={() => toggleGroup(pid)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="message-row__avatar">{initials(name)}</div>
                    <div className="message-row__body">
                      <div className="message-row__head">
                        <div className="message-row__name">{name}</div>
                        <div className="message-row__time">
                          {latestAt ? new Date(latestAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                      <div className="message-row__preview" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{groupDeals.length} deal{groupDeals.length !== 1 ? 's' : ''}</span>
                        {groupDeals.some(d => isUnread(d)) && <div className="message-row__unread" />}
                        <span style={{ marginLeft: 'auto', fontSize: 10, transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </div>
                    </div>
                  </div>

                  {/* Deal sub-rows */}
                  {isOpen && groupDeals.map(deal => (
                    <div key={deal.id}
                      className={`message-row${activeDealId === deal.id ? ' message-row--on' : ''}`}
                      onClick={() => selectDeal(deal.id)}
                      style={{ paddingLeft: 40 }}
                    >
                      <div className="message-row__body">
                        <div className="message-row__head">
                          <div className="message-row__name" style={{ fontSize: 12 }}>{deal.speciesName ?? '—'} · D-{deal.id}</div>
                          <div className="message-row__time">
                            {deal.lastMessageAt ? new Date(deal.lastMessageAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <div className="message-row__preview">{deal.status}</div>
                      </div>
                      {isUnread(deal) && <div className="message-row__unread" />}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat pane */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
          {activeDealId ? (
            <>
              {activeDeal && (
                <div style={{ padding: 18, borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div className="message-row__avatar" style={{ width: 38, height: 38 }}>{initials(activeDeal.vendorName)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{activeDeal.vendorName ?? 'Vendor'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--safe)' }} />
                      Deal D-{activeDeal.id} · {activeDeal.status}
                    </div>
                  </div>
                  <button className="f-topbar__icon-btn"><I.More size={14} /></button>
                </div>
              )}
              <DealChatPane dealId={activeDealId} currentUserId={myId} apiClient={fishermanDealsApi} />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ink-4)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center' }}>
                <I.Message size={20} />
              </div>
              <div style={{ fontSize: 13 }}>Select a conversation to start chatting</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
