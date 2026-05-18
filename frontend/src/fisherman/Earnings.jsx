import { useRef, useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { I } from '../icons'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'

const PAGE_SIZE = 10

const STATS = [
  { key: 'totalGross',        label: 'Total gross',    color: null,               foot: 'Last 30 days' },
  { key: 'cashCollected',     label: 'Cash collected', color: 'var(--safe)',       foot: null },
  { key: 'creditOutstanding', label: 'Outstanding',    color: 'var(--caution)',   foot: 'unpaid credit' },
  { key: 'avgPerOrder',       label: 'Avg / order',    color: null,               foot: null },
]

function Pager({ page, total, onPage }) {
  if (total <= 1) return null
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="pager__info">{page} of {total}</span>
      <button className="pager__btn" disabled={page >= total} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

function buildDailyChart(ledger) {
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return { date: d.toISOString().slice(0, 10), value: 0, label: '' }
  })
  days[0].label = days[0].date.slice(5)
  days[4].label = days[4].date.slice(5)
  days[9].label = days[9].date.slice(5)
  days[14].label = days[14].date.slice(5)
  days[19].label = days[19].date.slice(5)
  days[24].label = days[24].date.slice(5)
  days[29].label = days[29].date.slice(5)

  for (const row of ledger) {
    if (!row.date) continue
    const d = String(row.date).slice(0, 10)
    const entry = days.find(x => x.date === d)
    if (entry) entry.value += row.gross ?? 0
  }
  return days
}

export default function EarningsPage() {
  const [ledgerPage, setLedgerPage] = useState(1)
  const summaryQ = useQuery({ queryKey: ['fisherman', 'earnings', 'summary'], queryFn: () => getEarningsSummary() })
  const ledgerQ  = useQuery({ queryKey: ['fisherman', 'earnings', 'ledger'],  queryFn: () => getEarningsLedger() })
  const statRefs = useRef([])

  const summary = summaryQ.data
  const ledger  = ledgerQ.data ?? []

  const chartData = useMemo(() => buildDailyChart(ledger), [ledger])
  const chartMax  = Math.max(...chartData.map(d => d.value), 1)

  useEffect(() => {
    if (!summary) return
    STATS.forEach(({ key }, i) => {
      const el = statRefs.current[i]
      if (!el) return
      const raw = key === 'avgPerOrder'
        ? (summary.totalGross ?? 0) / Math.max(summary.orderCount ?? 1, 1)
        : summary[key] ?? 0
      const obj = { val: 0 }
      gsap.to(obj, {
        val: raw, duration: 0.8, ease: 'power2.out',
        onUpdate: () => {
          if (!el) return
          el.textContent = `₱${obj.val.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        },
      })
    })
  }, [summary])

  const totalLedgerPages = Math.max(1, Math.ceil(ledger.length / PAGE_SIZE))
  const pagedLedger = ledger.slice((ledgerPage - 1) * PAGE_SIZE, ledgerPage * PAGE_SIZE)

  return (
    <div className="fade-in" style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Money</div>
          <h1 className="page__title">Your <em className="chip-lime">Earnings</em></h1>
          <p className="page__sub">Track every kilo sold and what you've collected.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><I.Note size={12} /> Export</button>
        </div>
      </div>

      {summaryQ.isError && (
        <div className="f-error" style={{ marginBottom: 16 }}>
          Failed to load summary<span className="f-error__retry" onClick={summaryQ.refetch}>Retry</span>
        </div>
      )}

      <div className="grid--kpi" style={{ marginBottom: 22 }}>
        {STATS.map(({ key, label, color, foot }, i) => {
          const raw = key === 'avgPerOrder'
            ? (summary?.totalGross ?? 0) / Math.max(summary?.orderCount ?? 1, 1)
            : summary?.[key] ?? 0
          const display = `₱${raw.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
          const footText = foot ?? (key === 'cashCollected' && summary
            ? `${Math.round((summary.cashCollected / (summary.totalGross || 1)) * 100)}% of gross`
            : key === 'avgPerOrder' && summary
              ? `${summary.orderCount ?? 0} orders`
              : '')
          return (
            <div key={key} className="kpi">
              <div className="kpi__label">{label}</div>
              <div className="kpi__value" style={color ? { color } : {}}>
                <span ref={el => { statRefs.current[i] = el }}>{summary ? display : '—'}</span>
              </div>
              <div className="kpi__foot">{footText}</div>
            </div>
          )
        })}
      </div>

      {/* Daily earnings chart */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Daily earnings</div>
            <div className="card__sub">Last 30 days · cash + credit combined</div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: 'rgba(106,95,193,0.6)' }} />Earlier
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--accent-lime)' }} />Last 5 days
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, marginBottom: 8 }}>
          {chartData.map((d, i) => {
            const h = (d.value / chartMax) * 100
            const isRecent = i >= 25
            const bg = d.value === 0
              ? 'rgba(255,255,255,0.05)'
              : isRecent ? 'var(--accent-lime)' : 'rgba(106,95,193,0.55)'
            return (
              <div
                key={i}
                style={{ flex: 1, height: `${Math.max(h, 2)}%`, background: bg, borderRadius: '3px 3px 0 0', transition: 'all 200ms' }}
                title={`${d.date}: ₱${d.value.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-code)' }}>
          {chartData.filter(d => d.label).map(d => (
            <span key={d.date}>{d.label.replace('-', '/')}</span>
          ))}
        </div>
      </div>

      {ledgerQ.isError && (
        <div className="f-error" style={{ marginBottom: 16 }}>
          Failed to load ledger<span className="f-error__retry" onClick={ledgerQ.refetch}>Retry</span>
        </div>
      )}

      <div className="card card--flush">
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card__title">Order ledger</div>
            <div className="card__sub">Recent completed transactions</div>
          </div>
        </div>
        {ledger.length === 0 ? (
          <div className="empty">No transactions yet.</div>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Order</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Gross</th><th>Payment</th></tr>
              </thead>
              <tbody>
                {pagedLedger.map(row => (
                  <tr key={row.orderId}>
                    <td className="mono" style={{ color: 'var(--ink-3)' }}>
                      {row.date ? new Date(row.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td><kbd>O-{row.orderId}</kbd></td>
                    <td><strong>{row.vendorName ?? '—'}</strong></td>
                    <td>{row.speciesName ?? '—'}</td>
                    <td className="mono">{row.qtyKg != null ? `${row.qtyKg}kg` : '—'}</td>
                    <td className="mono"><strong>₱{(row.gross ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}</strong></td>
                    <td>
                      <span className={`chip ${row.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>
                        {row.paymentMethod ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '0 0 4px' }}>
              <Pager page={ledgerPage} total={totalLedgerPages} onPage={setLedgerPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
