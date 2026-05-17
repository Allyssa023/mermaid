import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function EarningsPage() {
  const [range, setRange] = useState('30')
  const ranges = [{ id: '7', label: '7d' }, { id: '30', label: '30d' }, { id: '90', label: '90d' }, { id: '365', label: '1y' }]

  const now  = new Date()
  const to   = now.toISOString().split('T')[0]
  const from = new Date(now - Number(range) * 86_400_000).toISOString().split('T')[0]

  const summaryQ = useQuery({
    queryKey: ['earnings', 'summary', range],
    queryFn: () => getEarningsSummary(from, to),
  })
  const ledgerQ = useQuery({
    queryKey: ['earnings', 'ledger', range],
    queryFn: () => getEarningsLedger(from, to),
  })

  if (summaryQ.isLoading) return <div className="page"><StatTileSkeleton /><TableRowSkeleton /></div>
  if (summaryQ.error) return <div className="page"><ApiError error={summaryQ.error} onRetry={summaryQ.refetch} /></div>
  if (ledgerQ.error) return <div className="page"><ApiError error={ledgerQ.error} onRetry={ledgerQ.refetch} /></div>

  const e        = summaryQ.data ?? {}
  const ledger   = ledgerQ.data ?? []

  const rangeLabel = range === '7' ? 'Last 7 days' : range === '30' ? 'Last 30 days' : range === '90' ? 'Last 90 days' : 'Last year'

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Money</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>earnings</em></h1>
          <p className="page__sub">Track every kilo sold and what you've collected.</p>
        </div>
        <div className="seg" style={{alignSelf: 'flex-end'}}>
          {ranges.map(r => (
            <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid--kpi" style={{marginTop: 18}}>
        <div className="kpi"><div className="kpi__label">Total gross</div><div className="kpi__value">₱{(e.totalGross ?? 0).toLocaleString()}</div><div className="kpi__foot">{rangeLabel}</div></div>
        <div className="kpi"><div className="kpi__label">Cash collected</div><div className="kpi__value" style={{color: 'var(--safe)'}}>₱{(e.cashCollected ?? 0).toLocaleString()}</div><div className="kpi__foot">{e.totalGross ? Math.round(e.cashCollected / e.totalGross * 100) : 0}% of gross</div></div>
        <div className="kpi"><div className="kpi__label">Outstanding</div><div className="kpi__value" style={{color: 'var(--caution)'}}>₱{(e.creditOutstanding ?? 0).toLocaleString()}</div><div className="kpi__foot">unpaid</div></div>
        <div className="kpi"><div className="kpi__label">Orders</div><div className="kpi__value">{e.orderCount ?? 0}</div><div className="kpi__foot">{e.orderCount ? `₱${Math.round(e.totalGross / e.orderCount).toLocaleString()} avg` : '—'}</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="card__title">Order ledger</div>
        </div>
        {ledger.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No completed orders in this period. Complete an order to see your earnings here.
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Date</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Gross</th><th>Payment</th></tr></thead>
            <tbody>
              {ledger.map(r => (
                <tr key={r.orderId}>
                  <td className="muted-data">{r.date ? String(r.date).split('T')[0] : '—'}</td>
                  <td>{r.vendorName ?? '—'}</td>
                  <td>{r.speciesName ?? '—'}</td>
                  <td>{r.qtyKg != null ? `${r.qtyKg} kg` : '—'}</td>
                  <td><span className="data" style={{fontFamily: 'var(--font-mono)'}}>₱{(r.gross ?? 0).toLocaleString()}</span></td>
                  <td><span className={`chip ${r.paymentMethod === 'CREDIT' ? 'chip--caution' : 'chip--safe'}`}>{r.paymentMethod === 'CREDIT' ? 'Credit' : r.paymentMethod ?? '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
