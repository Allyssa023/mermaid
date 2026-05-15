// frontend/src/components/DealComposer.jsx
//
// Two-tab composer for the deal chat pane:
//   - "Message": free-text chat sent via STOMP (sendChatMessage).
//   - "Propose": integer qty + integer price, submitted via submitProposal.
// When `initial.qtyKg` is set (Counter mode), the composer opens in the
// Propose tab with the values pre-filled.

import { useState } from 'react'

function intOnly(v) {
  return String(v ?? '').replace(/[^0-9]/g, '')
}

export default function DealComposer({ onSendText, onSendProposal, initial, disabled = false }) {
  const [tab, setTab] = useState(initial?.qtyKg ? 'propose' : 'chat')
  const [text, setText] = useState('')
  const [qty, setQty] = useState(initial?.qtyKg != null ? String(initial.qtyKg) : '')
  const [price, setPrice] = useState(initial?.pricePerKg != null ? String(initial.pricePerKg) : '')

  const qtyNum = parseInt(qty, 10) || 0
  const priceNum = parseInt(price, 10) || 0
  const proposeBlocked = disabled || qtyNum <= 0 || priceNum <= 0
  const textBlocked = disabled || text.trim().length === 0

  function handleSendText() {
    if (textBlocked) return
    onSendText?.(text.trim())
    setText('')
  }

  function handleSendProposal() {
    if (proposeBlocked) return
    onSendProposal?.({ qtyKg: qtyNum, pricePerKg: priceNum })
    setQty('')
    setPrice('')
  }

  return (
    <div className="deal-composer card" style={{padding: 10, display: 'flex', flexDirection: 'column', gap: 8}}>
      <div className="seg seg--sm" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'chat'}
          className={tab === 'chat' ? 'on' : ''}
          onClick={() => setTab('chat')}
        >Message</button>
        <button
          role="tab"
          aria-selected={tab === 'propose'}
          className={tab === 'propose' ? 'on' : ''}
          onClick={() => setTab('propose')}
        >Propose</button>
      </div>

      {tab === 'chat' ? (
        <div style={{display: 'flex', gap: 6}}>
          <input
            aria-label="Message text"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            style={{flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line, #ddd)'}}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
          />
          <button
            className="btn btn--accent btn--sm"
            disabled={textBlocked}
            onClick={handleSendText}
          >Send</button>
        </div>
      ) : (
        <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center'}}>
          <input
            aria-label="Quantity in kg"
            placeholder="qty (kg)"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(intOnly(e.target.value))}
            disabled={disabled}
            style={{width: 110, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line, #ddd)'}}
          />
          <input
            aria-label="Price per kg"
            placeholder="₱/kg"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(intOnly(e.target.value))}
            disabled={disabled}
            style={{width: 110, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line, #ddd)'}}
          />
          <button
            className="btn btn--accent btn--sm"
            disabled={proposeBlocked}
            onClick={handleSendProposal}
          >Send Proposal</button>
        </div>
      )}
    </div>
  )
}
