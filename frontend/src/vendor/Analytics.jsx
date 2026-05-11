import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { getSalesSummary, getRevenueBySpecies, getProcurementSpend, getRepeatBuyers } from './api/analytics'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

function BarRow({ label, value, max, color = 'var(--accent)' }) {
  const pct = Math.round(value / max * 100)
  return (
    <div style={{display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: 12, alignItems: 'center', fontSize: 13}}>
      <span>{label}</span>
      <div style={{height: 22, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${pct}%`, background: color, borderRadius: 4}} />
      </div>
      <span style={{fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right'}}>₱{value.toLocaleString()}</span>
    </div>
  )
}

export default function Analytics() {
  const [range, setRange] = useState('30')

  const now  = new Date()
  const to   = now.toISOString().split('T')[0]
  const from = new Date(now - Number(range) * 86_400_000).toISOString().split('T')[0]

  const summaryQ = useQuery({ queryKey: ['vendor', 'analytics', 'summary', range], queryFn: () => getSalesSummary(from, to) })
  const speciesQ = useQuery({ queryKey: ['vendor', 'analytics', 'species', range], queryFn: () => getRevenueBySpecies(from, to) })
  const spendQ   = useQuery({ queryKey: ['vendor', 'analytics', 'spend', range],   queryFn: () => getProcurementSpend(from, to) })
  const buyersQ  = useQuery({ queryKey: ['vendor', 'analytics', 'buyers', range],  queryFn: () => getRepeatBuyers(from, to) })

  if (summaryQ.isLoading) return <div className="page"><StatTileSkeleton /><StatTileSkeleton /></div>
  if (summaryQ.error) return <div className="page"><ApiError error={summaryQ.error} onRetry={summaryQ.refetch} /></div>

  const a = summaryQ.data ?? {}
  const bySpecies = speciesQ.data ?? []
  const bySpend   = spendQ.data ?? []
  const buyers    = buyersQ.data ?? []

  const revMax  = bySpecies.length ? Math.max(...bySpecies.map(s => s.totalRevenue)) : 1
  const procMax = bySpend.length   ? Math.max(...bySpend.map(s => s.totalSpend))     : 1

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Analytics</div>
          <h1 className="page__title" style={{marginTop: 4}}>How your shop is <em>performing</em></h1>
          <p className="page__sub">Revenue, volume, and repeat-buyer signal.</p>
        </div>
        <div className="seg" style={{alignSelf: 'flex-end'}}>
          {['7', '30', '90', '365'].map(r => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === '365' ? '1y' : r + 'd'}</button>)}
        </div>
      </div>

      <div className="orders-strip orders-strip--4" style={{marginTop: 18, gridTemplateColumns: 'repeat(5, 1fr)'}}>
        <div className="stat"><div className="l">Total orders</div><div className="v">{a.totalOrders}</div><div className="s">across {a.uniqueBuyers} buyers</div></div>
        <div className="stat"><div className="l">Revenue</div><div className="v">₱{(a.totalRevenue / 1000).toFixed(0)}k</div><div className="s">₱{a.totalRevenue?.toLocaleString()} total</div></div>
        <div className="stat"><div className="l">Volume</div><div className="v">{a.totalQtyKg}<small>kg</small></div><div className="s">sold</div></div>
        <div className="stat"><div className="l">AOV</div><div className="v">₱{a.avgOrderValue?.toLocaleString()}</div><div className="s">avg order value</div></div>
        <div className="stat"><div className="l">Unique buyers</div><div className="v">{a.uniqueBuyers}</div><div className="s">repeat buyers</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Revenue by species</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {bySpecies.map(s => <BarRow key={s.speciesName} label={s.speciesName} value={s.totalRevenue} max={revMax} />)}
          </div>
        </div>
        <div className="card">
          <div className="card__head"><div className="card__title">Procurement spend</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {bySpend.map(s => <BarRow key={s.speciesName} label={s.speciesName} value={s.totalSpend} max={procMax} color="oklch(0.65 0.12 220)" />)}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head"><div className="card__title">Repeat buyers</div><div className="card__sub">Top customers by order count</div></div>
        <table className="tbl">
          <thead><tr><th>Buyer</th><th>Orders</th><th>Total spent</th><th></th></tr></thead>
          <tbody>
            {buyers.map(b => (
              <tr key={b.buyerName}>
                <td><strong>{b.buyerName}</strong></td>
                <td>{b.orderCount}</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{b.totalSpent.toLocaleString()}</td>
                <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">View orders</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
