// frontend/src/components/ProposalCard.jsx
//
// Renders a single deal proposal. Shows Accept / Reject / Counter buttons
// only when the viewer is the counterparty AND the proposal is PENDING.
// Otherwise it falls back to a textual status (Accepted / Rejected / Superseded).

function formatTimestamp(ts) {
  if (!ts) return ''
  try { return new Date(ts).toLocaleString() } catch { return String(ts) }
}

function statusLabel(status) {
  switch (status) {
    case 'ACCEPTED':   return 'Accepted'
    case 'REJECTED':   return 'Rejected'
    case 'SUPERSEDED': return 'Superseded'
    case 'PENDING':    return 'Pending'
    default:           return status || ''
  }
}

export default function ProposalCard({
  proposal,
  isCounterparty = false,
  onAccept,
  onReject,
  onCounter,
}) {
  if (!proposal) return null

  const { id, qtyKg, pricePerKg, status, createdAt } = proposal
  const proposerLabel =
    proposal.proposedByName ?? (proposal.proposedById != null ? `User #${proposal.proposedById}` : 'Unknown')

  const showActions = isCounterparty && status === 'PENDING'

  return (
    <div className="card proposal-card" style={{padding: 12, borderRadius: 10}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8}}>
        <div style={{fontWeight: 600}}>
          {qtyKg} kg · ₱{pricePerKg}/kg
        </div>
        <span className={`chip ${status === 'PENDING' ? 'chip--accent' : 'chip--ink'}`}>{statusLabel(status)}</span>
      </div>
      <div className="eyebrow" style={{marginTop: 4}}>
        {proposerLabel} · {formatTimestamp(createdAt)}
      </div>

      {showActions ? (
        <div style={{display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap'}}>
          <button className="btn btn--accent btn--sm" onClick={() => onAccept?.(id)}>Accept</button>
          <button className="btn btn--ghost btn--sm" onClick={() => onReject?.(id)}>Reject</button>
          <button className="btn btn--ghost btn--sm" onClick={() => onCounter?.(proposal)}>Counter</button>
        </div>
      ) : (
        <div className="eyebrow" style={{marginTop: 8}}>
          {status === 'PENDING' ? 'Awaiting their response' : statusLabel(status)}
        </div>
      )}
    </div>
  )
}
