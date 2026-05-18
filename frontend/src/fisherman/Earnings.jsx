import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'

const STATS = [
  { key: 'totalGross',        label: 'Total Gross',        prefix: '₱' },
  { key: 'cashCollected',     label: 'Cash Collected',     prefix: '₱' },
  { key: 'creditOutstanding', label: 'Credit Outstanding', prefix: '₱' },
  { key: 'orderCount',        label: 'Orders',             prefix: ''  },
]

export default function EarningsPage() {
  const summaryQ = useQuery({ queryKey: ['fisherman', 'earnings', 'summary'], queryFn: getEarningsSummary })
  const ledgerQ  = useQuery({ queryKey: ['fisherman', 'earnings', 'ledger'],  queryFn: getEarningsLedger })

  const statRefs = useRef([])

  useEffect(() => {
    if (!summaryQ.data) return
    STATS.forEach(({ key, prefix }, i) => {
      const el = statRefs.current[i]
      if (!el) return
      const target = summaryQ.data[key] ?? 0
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target, duration: 0.8, ease: 'power2.out',
        onUpdate: () => {
          if (!el) return
          el.textContent = key === 'orderCount'
            ? String(Math.round(obj.val))
            : `${prefix}${obj.val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
      })
    })
  }, [summaryQ.data])

  const summary = summaryQ.data
  const ledger  = ledgerQ.data ?? []

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', marginBottom: 20 }}>Earnings</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {STATS.map(({ key, label, prefix }, i) => (
          <div key={key} className="f-card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
            <div
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-lime)' }}
              ref={el => { statRefs.current[i] = el }}
            >
              {summary ? (key === 'orderCount' ? String(summary[key] ?? 0) : `${prefix}${(summary[key] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`) : '—'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Transactions</div>
      {ledgerQ.isError && <div className="f-error">Failed to load ledger<span className="f-error__retry" onClick={ledgerQ.refetch}>Retry</span></div>}
      <div className="f-card">
        {ledger.length === 0
          ? <div style={{ padding: 20, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>No transactions yet</div>
          : ledger.map(row => (
              <div key={row.orderId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid var(--hairline)', fontSize: '0.875rem' }}>
                <div>
                  <div>{row.speciesName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{row.vendorName} · {row.qtyKg} kg</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>
                    ₱{(row.gross ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{row.paymentMethod}</div>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
