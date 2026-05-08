import { useState } from 'react'
import { getPayoutsSummary, getPayoutsLedger } from './api/payouts'

const today = new Date()
const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000)
const fmt = (d) => d.toISOString().slice(0, 10)

const php = (amount) =>
  Number(amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

function PayoutStatus({ status }) {
  const map = {
    PENDING_PAYOUT: 'pending',
    PAID: 'completed',
  }
  const cls = map[status] || ''
  return (
    <span className={`status status--${cls}`}>
      <span className="status__dot" />
      {status === 'PENDING_PAYOUT' ? 'Pending' : status === 'PAID' ? 'Paid' : status}
    </span>
  )
}

export default function Payouts() {
  const [from, setFrom] = useState(fmt(thirtyDaysAgo))
  const [to,   setTo]   = useState(fmt(today))
  const [rangeError, setRangeError] = useState('')
  const [summary,    setSummary]    = useState(null)
  const [ledger,     setLedger]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [submitted,  setSubmitted]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setRangeError('')
    setFetchError('')
    if (!from || !to) { setRangeError('Please select both a start and end date.'); return }
    if (new Date(from) > new Date(to)) { setRangeError('Start date must be before end date.'); return }
    setLoading(true)
    setSubmitted(false)
    try {
      const [s, l] = await Promise.all([
        getPayoutsSummary().catch(() => null),
        getPayoutsLedger(from, to).catch(() => null),
      ])
      setSummary(s)
      setLedger(Array.isArray(l) ? l : null)
      setSubmitted(true)
    } catch (err) {
      setFetchError(err.message || 'Failed to load payouts.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Finance</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Payout <em>Ledger</em>
          </h1>
          <p className="page__sub">Track completed orders pending payout and historical disbursements.</p>
        </div>
      </div>

      {summary && (
        <div className="orders-strip" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
          <div className="stat">
            <div className="l">Pending Payout</div>
            <div className="v" style={{ fontSize: 28, color: 'var(--caution)' }}>{php(summary.pendingTotal)}</div>
            <div className="s">Awaiting disbursement</div>
          </div>
          <div className="stat">
            <div className="l">Total Paid Out</div>
            <div className="v" style={{ fontSize: 28, color: 'var(--safe)' }}>{php(summary.paidTotal ?? 0)}</div>
            <div className="s">Historical disbursements</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div className="card__title">Filter by Date Range</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-row">
            <label>From</label>
            <input
              className="input"
              type="date"
              value={from}
              max={to || fmt(today)}
              onChange={e => setFrom(e.target.value)}
              style={{ width: 170 }}
            />
          </div>
          <div className="form-row">
            <label>To</label>
            <input
              className="input"
              type="date"
              value={to}
              min={from}
              max={fmt(today)}
              onChange={e => setTo(e.target.value)}
              style={{ width: 170 }}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
          {rangeError && (
            <div style={{ width: '100%', color: 'var(--unsafe)', fontSize: 13, marginTop: 4 }}>{rangeError}</div>
          )}
        </form>
      </div>

      {fetchError && (
        <div style={{
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          {fetchError}
        </div>
      )}

      {submitted && !fetchError && (
        <div className="card">
          <div className="card__head">
            <div className="card__title">Ledger</div>
            <span className="chip">{ledger?.length ?? 0} entries</span>
          </div>
          {!ledger || ledger.length === 0 ? (
            <div className="empty"><p>No payout entries for this period.</p></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Buyer</th>
                  <th>Species</th>
                  <th>Qty (kg)</th>
                  <th>Gross</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row, i) => (
                  <tr key={row.orderId ?? i}>
                    <td>
                      <span className="kbd">#{row.orderId}</span>
                    </td>
                    <td style={{ color: 'var(--ink-4)' }}>
                      {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {row.buyer || row.buyerName || '—'}
                    </td>
                    <td style={{ color: 'var(--ink-2)' }}>
                      {row.species || row.speciesName || '—'}
                    </td>
                    <td className="data" style={{ textAlign: 'right' }}>
                      {row.qty ?? row.qtyKg ?? '—'}
                    </td>
                    <td className="data" style={{ textAlign: 'right' }}>
                      {row.gross != null ? php(row.gross) : '—'}
                    </td>
                    <td>
                      <PayoutStatus status={row.status || 'PENDING_PAYOUT'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!submitted && !loading && (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No data yet</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Select a date range above and click Apply.</p>
        </div>
      )}
    </div>
  )
}
