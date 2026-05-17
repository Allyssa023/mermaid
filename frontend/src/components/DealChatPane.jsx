// frontend/src/components/DealChatPane.jsx
//
// Role-agnostic deal chat pane. Used by both vendor and fisherman dashboards.
//
// Design choice — apiClient prop-drilling:
//   This component lives in src/components/ (shared), but the per-role API
//   modules in src/vendor/api/deals.js and src/fisherman/api/deals.js have
//   identical signatures. Rather than pulling them into a shared module
//   (and forcing a refactor of every existing caller), the parent passes
//   `apiClient` containing { getDeal, listDealMessages, submitProposal,
//   acceptProposal, rejectProposal }. The chat send goes through
//   useStomp().sendChatMessage which is already role-agnostic.
//
// Design choice — inline PROPOSAL rendering:
//   Backend encodes proposals in the chat thread as
//   `"[PROPOSAL] qty=X,price=Y"` content strings without a proposalId.
//   We therefore render thread proposals as an inline summary card (no
//   Accept/Reject buttons). The live actionable card is the top-pinned
//   `<ProposalCard>` driven by `deal.latestProposal`, which carries the id.

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStomp } from '../context/StompContext'
import ProposalCard from './ProposalCard'
import DealComposer from './DealComposer'
import { isOnboardingDismissed, dismissOnboarding } from '../utils/dealsLocalStorage'

const PROPOSAL_RE = /^\[PROPOSAL\]\s*qty=(\d+(?:\.\d+)?),\s*price=(\d+(?:\.\d+)?)/i

function parseMessageKind(msg) {
  const c = msg?.content ?? ''
  if (PROPOSAL_RE.test(c)) {
    const m = c.match(PROPOSAL_RE)
    return { kind: 'PROPOSAL', qtyKg: parseFloat(m[1]), pricePerKg: parseFloat(m[2]) }
  }
  if (c.startsWith('[SYSTEM]')) {
    return { kind: 'SYSTEM', text: c.replace(/^\[SYSTEM\]\s?/, '') }
  }
  return { kind: 'TEXT', text: c }
}

function formatTs(ts) {
  if (!ts) return ''
  try { return new Date(ts).toLocaleString() } catch { return String(ts) }
}

export default function DealChatPane({ dealId, currentUserId, apiClient }) {
  const qc = useQueryClient()
  const stomp = useStomp()
  const [counterInitial, setCounterInitial] = useState(null)
  // One-time onboarding hint: dismissed flag is persisted in localStorage so
  // it never re-appears after the first dismissal across deals/sessions.
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => isOnboardingDismissed())
  function handleDismissOnboarding() {
    dismissOnboarding()
    setOnboardingDismissed(true)
  }

  const { data: deal } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => apiClient.getDeal(dealId),
    enabled: dealId != null,
    refetchInterval: 5000,
  })

  const { data: messagesPage } = useQuery({
    queryKey: ['deal', dealId, 'messages'],
    queryFn: () => apiClient.listDealMessages(dealId),
    enabled: dealId != null,
  })
  // Backend returns DealMessagesPage = { content, page, size, totalElements, totalPages };
  // older mocks / tests may still return a bare array. Tolerate both.
  const messages = Array.isArray(messagesPage)
    ? messagesPage
    : (messagesPage?.content ?? [])

  // Competitor count: pulled on a 30s interval AND invalidated by the
  // COMPETITOR_COUNT_CHANGED STOMP event (see StompContext.jsx). The helper
  // is optional on apiClient — if a caller doesn't wire it up we skip the query.
  const { data: competitorData } = useQuery({
    queryKey: ['deal', dealId, 'competitorCount'],
    queryFn: () => apiClient.competitorCount(dealId),
    refetchInterval: 30000,
    enabled: !!dealId && typeof apiClient.competitorCount === 'function',
  })
  const competitorCount = competitorData?.count ?? competitorData ?? 0

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['deal', dealId] })
    qc.invalidateQueries({ queryKey: ['deal', dealId, 'messages'] })
  }

  const acceptM = useMutation({
    mutationFn: (proposalId) => apiClient.acceptProposal(dealId, proposalId),
    onSuccess: invalidate,
  })
  const rejectM = useMutation({
    mutationFn: ({ proposalId, reason }) => apiClient.rejectProposal(dealId, proposalId, reason),
    onSuccess: invalidate,
  })
  const proposeM = useMutation({
    mutationFn: ({ qtyKg, pricePerKg }) => apiClient.submitProposal(dealId, qtyKg, pricePerKg),
    onSuccess: () => { setCounterInitial(null); invalidate() },
  })

  const counterpartyName = useMemo(() => {
    if (!deal || currentUserId == null) return ''
    if (deal.vendorId === currentUserId)    return deal.fishermanName ?? `User #${deal.fishermanId}`
    if (deal.fishermanId === currentUserId) return deal.vendorName    ?? `User #${deal.vendorId}`
    return ''
  }, [deal, currentUserId])

  const counterpartyId = deal
    ? (deal.vendorId === currentUserId ? deal.fishermanId : deal.vendorId)
    : null

  const composerDisabled = !deal || deal.status !== 'NEGOTIATING'

  const latestProposal = deal?.latestProposal
  const isLatestProposalCounterparty =
    latestProposal && currentUserId != null && latestProposal.proposedById !== currentUserId

  function handleSendText(text) {
    if (counterpartyId == null) return
    stomp.sendChatMessage(counterpartyId, text, dealId)
  }
  function handleSendProposal({ qtyKg, pricePerKg }) {
    proposeM.mutate({ qtyKg, pricePerKg })
  }
  function handleCounter(proposal) {
    setCounterInitial({ qtyKg: proposal.qtyKg, pricePerKg: proposal.pricePerKg })
  }
  function handleAccept(proposalId) {
    acceptM.mutate(proposalId)
  }
  function handleReject(proposalId) {
    rejectM.mutate({ proposalId, reason: 'Rejected by user' })
  }

  return (
    <div className="deal-chat-pane" style={{display: 'flex', flexDirection: 'column', gap: 10, height: '100%'}}>
      {/* Context bar */}
      <div className="card" style={{padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
        <div>
          <div style={{fontWeight: 600}}>{counterpartyName || 'Deal'}</div>
          <div className="eyebrow">{deal?.species?.commonName ?? deal?.speciesName ?? ''}</div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
          {competitorCount > 0 && (
            <span className="chip" data-testid="competitor-chip">
              {competitorCount} {competitorCount === 1 ? 'other bidding' : 'others bidding'}
            </span>
          )}
          {deal?.status && (
            <span className={`chip ${deal.status === 'NEGOTIATING' ? 'chip--accent' : 'chip--ink'}`}>
              {deal.status}
            </span>
          )}
        </div>
      </div>

      {/* Waiting for fisherman confirmation banner */}
      {deal?.status === 'NEGOTIATING' && !deal.fishermanEngagedAt && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--warn-soft, rgba(255,193,7,0.1))',
          border: '1px solid var(--warn, #ffc107)',
          fontSize: 13, textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ color: 'var(--ink-2)' }}>
            Waiting for fisherman to accept this deal…
          </span>
        </div>
      )}

      {/* Deal rejected/cancelled banner */}
      {deal?.status && deal.status !== 'NEGOTIATING' && deal.status !== 'AGREED' && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--unsafe-soft, rgba(220,53,69,0.08))',
          border: '1px solid var(--unsafe, #dc3545)',
          fontSize: 13, textAlign: 'center',
        }}>
          <strong style={{ color: 'var(--unsafe)' }}>
            {deal.status === 'REJECTED' ? '❌ Deal rejected by fisherman' : `Deal ${deal.status.toLowerCase()}`}
          </strong>
        </div>
      )}

      {/* Pinned latest proposal */}
      {latestProposal && (
        <ProposalCard
          proposal={latestProposal}
          isCounterparty={!!isLatestProposalCounterparty && deal.status === 'NEGOTIATING'}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounter={handleCounter}
        />
      )}

      {/* Message thread */}
      <div className="deal-thread" style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 2px'}}>
        {messages.length === 0 && (
          <div className="empty" style={{padding: 12}}>No messages yet.</div>
        )}
        {messages.map((msg) => {
          const parsed = parseMessageKind(msg)
          const mine = msg.senderId === currentUserId
          const align = mine ? 'flex-end' : 'flex-start'
          if (parsed.kind === 'SYSTEM') {
            return (
              <div
                key={msg.id}
                data-kind="SYSTEM"
                style={{alignSelf: 'center', fontStyle: 'italic', color: 'var(--ink-4, #888)', fontSize: 12}}
              >
                {parsed.text}
              </div>
            )
          }
          if (parsed.kind === 'PROPOSAL') {
            return (
              <div key={msg.id} data-kind="PROPOSAL" style={{alignSelf: align, maxWidth: '85%'}}>
                <div className="card" data-testid="thread-proposal" style={{padding: 8, borderRadius: 8}}>
                  <div className="eyebrow">Proposal</div>
                  <div style={{fontWeight: 600}}>{parsed.qtyKg} kg · ₱{parsed.pricePerKg}/kg</div>
                  <div className="eyebrow" style={{marginTop: 2}}>{formatTs(msg.sentAt)}</div>
                </div>
              </div>
            )
          }
          return (
            <div
              key={msg.id}
              data-kind="TEXT"
              style={{
                alignSelf: align,
                maxWidth: '85%',
                background: mine ? 'var(--accent-soft, #def)' : 'var(--paper-2, #f4f4f4)',
                padding: '6px 10px',
                borderRadius: 10,
              }}
            >
              <div>{parsed.text}</div>
              <div className="eyebrow" style={{marginTop: 2, opacity: 0.7}}>{formatTs(msg.sentAt)}</div>
            </div>
          )
        })}
      </div>

      {/* One-time onboarding hint — only while deal is NEGOTIATING and user
          has never dismissed it. Mirrors the SYSTEM-message bubble styling. */}
      {!onboardingDismissed && deal?.status === 'NEGOTIATING' && (
        <div
          data-testid="deals-onboarding-hint"
          role="status"
          style={{
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontStyle: 'italic',
            color: 'var(--ink-4, #888)',
            fontSize: 12,
          }}
        >
          <span>💡 To make an offer, tap Propose.</span>
          <button
            type="button"
            onClick={handleDismissOnboarding}
            aria-label="Dismiss onboarding hint"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: 14,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Composer */}
      {/*
        key forces a remount whenever the user clicks "Counter" on a different
        proposal, so DealComposer's `useState(initial?...)` re-initializes with
        the new qty/price. Without this, the same composer instance keeps the
        first counter's values when the user counters a second proposal.
      */}
      <DealComposer
        key={`composer-${counterInitial?.qtyKg ?? 'fresh'}-${counterInitial?.pricePerKg ?? 'fresh'}`}
        onSendText={handleSendText}
        onSendProposal={handleSendProposal}
        initial={counterInitial ?? undefined}
        disabled={composerDisabled}
      />
    </div>
  )
}
