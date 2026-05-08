import { useState, useCallback } from 'react'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'
import { useFishermanPolling } from './hooks/useFishermanPolling'

const php = (v) => Number(v ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

export default function Earnings() {
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const [applied, setApplied] = useState({ from: '', to: '' })

  const summaryFetcher = useCallback(
    () => getEarningsSummary(applied.from || undefined, applied.to || undefined),
    [applied]
  )
  const ledgerFetcher = useCallback(
    () => getEarningsLedger(applied.from || undefined, applied.to || undefined),
    [applied]
  )

  const { data: summary, loading: sl } = useFishermanPolling(summaryFetcher, [applied])
  const { data: rows,    loading: ll } = useFishermanPolling(ledgerFetcher,  [applied])

  const apply = () => setApplied({ from, to })
  const ledger = Array.isArray(rows) ? rows : []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Finance</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Earnings.</em></h1>
          <p className="page__sub">Cash collected vs credit outstanding (utang).</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-row" style={{ flex: 1, minWidth: 140 }}>
            <label>From</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-row" style={{ flex: 1, minWidth: 140 }}>
            <label>To</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn--primary btn--sm" onClick={apply}>Apply</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi__label">Total Gross</div>
          <div className="kpi__value">{sl ? '…' : php(summary?.totalGross)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Cash Collected</div>
          <div className="kpi__value" style={{ color: 'var(--safe)' }}>{sl ? '…' : php(summary?.cashCollected)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Outstanding (Utang)</div>
          <div className="kpi__value" style={{ color: 'var(--caution)' }}>{sl ? '…' : php(summary?.creditOutstanding)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Orders</div>
          <div className="kpi__value">{sl ? '…' : (summary?.orderCount ?? 0)}</div>
        </div>
      </div>

      {ll ? (
        <div className="empty" style={{ padding: '40px 0' }}><div className="empty__title">Loading…</div></div>
      ) : ledger.length === 0 ? (
        <div className="empty" style={{ padding: '48px 0' }}>
          <div className="empty__title">No earnings in this period</div>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Species</th>
                <th style={{ textAlign: 'right' }}>Qty (kg)</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(r => (
                <tr key={r.orderId}>
                  <td><span className="kbd">#{r.orderId}</span></td>
                  <td className="data">{r.date ? new Date(r.date).toLocaleDateString('en-PH') : '—'}</td>
                  <td>{r.speciesName || '—'}</td>
                  <td className="data" style={{ textAlign: 'right' }}>{r.qtyKg ?? '—'}</td>
                  <td className="data" style={{ textAlign: 'right' }}>{php(r.gross)}</td>
                  <td>
                    <span className={`chip ${r.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>
                      {r.paymentMethod === 'CASH' ? 'Cash' : 'Utang'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
