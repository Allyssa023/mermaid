import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

  const dealsQ = useQuery({
    queryKey: ['deals', 'mine'],
    queryFn: () => listMyDeals(),
  })
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

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Deal sidebar */}
      <div style={{ width: 280, flexShrink: 0, background: 'var(--bg-card)', borderRight: '1px solid var(--hairline)', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, borderBottom: '1px solid var(--hairline)' }}>
          Deal Chats
        </div>
        {deals.map(deal => (
          <button
            key={deal.id}
            onClick={() => selectDeal(deal.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '14px 20px', border: 'none',
              borderBottom: '1px solid var(--hairline)', cursor: 'pointer', textAlign: 'left',
              boxShadow: deal.id === activeDealId ? 'inset 3px 0 0 var(--accent-lime)' : 'none',
              background: deal.id === activeDealId ? 'var(--bg-card-2)' : 'transparent',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: deal.id === activeDealId ? 600 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deal.vendorName ?? 'Vendor'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {deal.speciesName ?? '—'}
              </div>
            </div>
            {isUnread(deal) && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-lime)', flexShrink: 0 }} />
            )}
          </button>
        ))}
        {deals.length === 0 && (
          <div style={{ padding: 20, color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center' }}>
            No deal conversations yet
          </div>
        )}
      </div>

      {/* Chat pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)', overflow: 'hidden' }}>
        {activeDealId
          ? <DealChatPane dealId={activeDealId} currentUserId={myId} apiClient={fishermanDealsApi} />
          : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
              Select a conversation
            </div>
          )
        }
      </div>
    </div>
  )
}
