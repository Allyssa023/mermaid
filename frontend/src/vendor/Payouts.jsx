import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { getPayoutsSummary, getPayoutsLedger } from './api/payouts'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Payouts() {
  const today = new Date().toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [applied, setApplied] = useState(null)
  const [dateError, setDateError] = useState('')

  const summaryQ = useQuery({
    queryKey: ['vendor', 'payouts', 'summary', applied?.from, applied?.to],
    queryFn: getPayoutsSummary,
    enabled: !!applied,
  })
  const ledgerQ = useQuery({
    queryKey: ['vendor', 'payouts', 'ledger', applied?.from, applied?.to],
    queryFn: () => getPayoutsLedger(applied.from, applied.to),
    enabled: !!applied,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setDateError('')
    if (fromDate > toDate) { setDateError('Start date must be before end date'); return }
    setApplied({ from: fromDate, to: toDate })
  }

  const summary = summaryQ.data ?? {}
  const ledger  = ledgerQ.data ?? []
  const hasData = !!applied && !summaryQ.isLoading

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Money</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>payouts</em></h1>
          <p className="page__sub">What's owed to you and what's already been settled.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 18, flexWrap: 'wrap'}}>
        <div className="form-row" style={{margin: 0}}>
          <label>From</label>
          <input className="input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="form-row" style={{margin: 0}}>
          <label>To</label>
          <input className="input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <button className="btn btn--primary" type="submit">Apply</button>
      </form>
      {dateError && <div style={{color: 'var(--unsafe)', marginTop: 8, fontSize: 13}}>{dateError}</div>}

      {!applied && (
        <div className="empty" style={{marginTop: 32}}>
          <div className="empty__title">Select a date range and click Apply</div>
        </div>
      )}

      {applied && summaryQ.isLoading && <div className="page"><TableRowSkeleton rows={5} /></div>}
      {applied && summaryQ.error && <ApiError error={summaryQ.error} onRetry={summaryQ.refetch} />}

      {hasData && (
        <>
          <div className="grid grid--kpi" style={{marginTop: 18, gridTemplateColumns: '1fr 1fr'}}>
            <div className="kpi" style={{padding: 22}}>
              <div className="kpi__label">Pending</div>
              <div className="kpi__value" style={{color: 'var(--caution)', fontSize: 38}}>₱{(summary.pendingTotal ?? 0).toLocaleString()}</div>
            </div>
            <div className="kpi" style={{padding: 22}}>
              <div className="kpi__label">Paid Out</div>
              <div className="kpi__value" style={{color: 'var(--safe)', fontSize: 38}}>₱{(summary.paidTotal ?? 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="card" style={{marginTop: 18}}>
            <div className="card__head"><div className="card__title">Ledger</div></div>
            <p className="muted-data" style={{fontSize: 12, marginTop: 0}}>Stub — payouts are not yet processed automatically.</p>
            {ledger.length === 0 ? (
              <div className="empty"><div className="empty__title">No payout entries for this period</div></div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Species</th><th>Qty</th><th>Gross</th><th>Net</th><th>Status</th></tr></thead>
                <tbody>
                  {ledger.map(r => (
                    <tr key={r.orderId}>
                      <td><span className="kbd">#{r.orderId}</span></td>
                      <td className="muted-data">{r.date}</td>
                      <td>{r.buyerName}</td>
                      <td>{r.speciesName}</td>
                      <td>{r.qtyKg} kg</td>
                      <td style={{fontFamily: 'var(--font-mono)'}}>₱{r.gross.toLocaleString()}</td>
                      <td style={{fontFamily: 'var(--font-mono)'}}>₱{r.net.toLocaleString()}</td>
                      <td><span className={`chip ${r.status === 'PAID' ? 'chip--safe' : 'chip--caution'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
