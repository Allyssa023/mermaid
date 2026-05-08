import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  getSalesSummary,
  getRevenueBySpecies,
  getProcurementSpend,
  getRepeatBuyers,
} from './api/analytics'

const today = new Date()
const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000)
const fmt = (d) => d.toISOString().slice(0, 10)

const php = (amount) =>
  Number(amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

const DIFF_DAYS = (from, to) => {
  const a = new Date(from)
  const b = new Date(to)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export default function Analytics() {
  const [from, setFrom] = useState(fmt(thirtyDaysAgo))
  const [to,   setTo]   = useState(fmt(today))
  const [rangeError, setRangeError] = useState('')
  const [summary,    setSummary]    = useState(null)
  const [bySpecies,  setBySpecies]  = useState(null)
  const [procSpend,  setProcSpend]  = useState(null)
  const [buyers,     setBuyers]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [submitted,  setSubmitted]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setRangeError('')
    setFetchError('')
    if (!from || !to) { setRangeError('Please select both a start and end date.'); return }
    if (new Date(from) > new Date(to)) { setRangeError('Start date must be before end date.'); return }
    if (DIFF_DAYS(from, to) > 365) { setRangeError('Date range cannot exceed 365 days.'); return }
    setLoading(true)
    setSubmitted(false)
    try {
      const [s, r, p, b] = await Promise.all([
        getSalesSummary(from, to).catch(() => null),
        getRevenueBySpecies(from, to).catch(() => null),
        getProcurementSpend(from, to).catch(() => null),
        getRepeatBuyers(from, to, 2).catch(() => null),
      ])
      setSummary(s)
      setBySpecies(Array.isArray(r) ? r : null)
      setProcSpend(Array.isArray(p) ? p : null)
      setBuyers(Array.isArray(b) ? b : null)
      setSubmitted(true)
    } catch (err) {
      setFetchError(err.message || 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Performance</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Sales <em>Analytics</em>
          </h1>
          <p className="page__sub">Revenue, procurement, and buyer trends over a custom date range.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <div className="card__title">Date Range</div>
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
        <>
          <div className="orders-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
            {[
              { label: 'Total Orders',    value: summary?.totalOrders ?? '—' },
              { label: 'Total Revenue',   value: summary?.totalRevenue != null ? php(summary.totalRevenue) : '—' },
              { label: 'Total Volume',    value: summary?.totalQtyKg ?? '—', unit: 'kg' },
              { label: 'Avg Order Value', value: summary?.avgOrderValue != null ? php(summary.avgOrderValue) : '—' },
              { label: 'Unique Buyers',   value: summary?.uniqueBuyers ?? '—' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="stat">
                <div className="l">{label}</div>
                <div className="v" style={{ fontSize: 24 }}>{value}{unit && <small>{unit}</small>}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card__head">
              <div>
                <div className="card__title">Revenue by Species</div>
                <div className="card__sub">Gross revenue (₱) per species in period</div>
              </div>
            </div>
            {!bySpecies || bySpecies.length === 0 ? (
              <div className="empty"><p>No revenue data for this period.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bySpecies} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="speciesName" tick={{ fontSize: 11, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                  <Tooltip formatter={(v) => php(v)} contentStyle={{ fontFamily: 'Geist, sans-serif', fontSize: 13, borderColor: 'var(--line)', borderRadius: 8 }} />
                  <Bar dataKey="totalRevenue" fill="oklch(0.55 0.09 55)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card__head">
              <div>
                <div className="card__title">Procurement Spend</div>
                <div className="card__sub">Cost (₱) per species purchased in period</div>
              </div>
            </div>
            {!procSpend || procSpend.length === 0 ? (
              <div className="empty"><p>No procurement data for this period.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={procSpend} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="speciesName" tick={{ fontSize: 11, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                  <Tooltip formatter={(v) => php(v)} contentStyle={{ fontFamily: 'Geist, sans-serif', fontSize: 13, borderColor: 'var(--line)', borderRadius: 8 }} />
                  <Bar dataKey="totalSpend" fill="oklch(0.55 0.09 220)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card__head">
              <div>
                <div className="card__title">Repeat Buyers</div>
                <div className="card__sub">Buyers with 2+ orders in the selected period</div>
              </div>
            </div>
            {!buyers || buyers.length === 0 ? (
              <div className="empty"><p>No repeat buyers in this period.</p></div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b, i) => (
                    <tr key={b.buyerId ?? i}>
                      <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{b.buyerName || `Buyer #${b.buyerId}`}</td>
                      <td className="data">{b.orderCount}</td>
                      <td className="data">{php(b.totalSpent)}</td>
                      <td style={{ color: 'var(--ink-4)' }}>
                        {b.lastOrder ? new Date(b.lastOrder).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
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
