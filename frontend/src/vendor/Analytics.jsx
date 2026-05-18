import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getSalesSummary, getRevenueBySpecies, getProcurementSpend, getRepeatBuyers, getSpeciesSeries } from './api/analytics'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

function BarRow({ label, value, max, color = 'var(--accent-lime)' }) {
  const pct = Math.round(value / max * 100)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: 12, alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ height: 22, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>
        ₱{value.toLocaleString()}
      </span>
    </div>
  )
}

export default function Analytics({ setPage }) {
  const [range, setRange] = useState('30')
  const [days, setDays] = useState(30)

  const now  = new Date()
  const to   = now.toISOString().split('T')[0]
  const from = new Date(now - Number(range) * 86_400_000).toISOString().split('T')[0]

  const summaryQ = useQuery({ queryKey: ['vendor', 'analytics', 'summary', range], queryFn: () => getSalesSummary(from, to) })
  const speciesQ = useQuery({ queryKey: ['vendor', 'analytics', 'species', range], queryFn: () => getRevenueBySpecies(from, to) })
  const spendQ   = useQuery({ queryKey: ['vendor', 'analytics', 'spend', range],   queryFn: () => getProcurementSpend(from, to) })
  const buyersQ  = useQuery({ queryKey: ['vendor', 'analytics', 'buyers', range],  queryFn: () => getRepeatBuyers(from, to) })
  const seriesQ  = useQuery({ queryKey: ['vendor', 'speciesSeries', days], queryFn: () => getSpeciesSeries(days) })

  if (summaryQ.isLoading) return <div className="v-page"><StatTileSkeleton /><StatTileSkeleton /></div>
  if (summaryQ.error) return <div className="v-page"><ApiError error={summaryQ.error} onRetry={summaryQ.refetch} /></div>

  const a        = summaryQ.data ?? {}
  const bySpecies = speciesQ.data ?? []
  const bySpend   = spendQ.data ?? []
  const buyers    = buyersQ.data ?? []

  const revMax  = bySpecies.length ? Math.max(...bySpecies.map(s => s.totalRevenue)) : 1
  const procMax = bySpend.length   ? Math.max(...bySpend.map(s => s.totalSpend))     : 1

  const topSpecies = bySpecies.length
    ? bySpecies.reduce((best, s) => s.totalRevenue > (best?.totalRevenue ?? 0) ? s : best, null)?.speciesName ?? '—'
    : '—'

  // Flatten species series into date-keyed chart data
  const chartData = useMemo(() => {
    if (!seriesQ.data?.length) return []
    const map = {}
    seriesQ.data.forEach(sp => {
      sp.daily?.forEach(d => {
        if (!map[d.date]) map[d.date] = { date: d.date, revenue: 0, spend: 0 }
        map[d.date].revenue += d.revenue ?? 0
        map[d.date].spend   += d.spend   ?? 0
      })
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [seriesQ.data])

  return (
    <div className="v-page">
      {/* Page header */}
      <div className="v-page-head" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Analytics</div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            How your shop is <em style={{ color: 'var(--accent-lime)', fontStyle: 'normal' }}>performing</em>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Revenue, volume, and repeat-buyer signal.</p>
        </div>
        {/* Range selector */}
        <div className="v-tabs" style={{ alignSelf: 'flex-end' }}>
          {[['7', '7d'], ['30', '30d'], ['90', '90d'], ['365', '1y']].map(([val, label]) => (
            <button
              key={val}
              className={`v-tab${range === val ? ' v-tab--on' : ''}`}
              onClick={() => setRange(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="v-kpi-strip" style={{ marginBottom: 24 }}>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Revenue</div>
          <div className="v-kpi-cell__value">₱{(a.totalRevenue / 1000).toFixed(0)}k</div>
          <div className="v-kpi-cell__sub">₱{a.totalRevenue?.toLocaleString()} total</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Avg order value</div>
          <div className="v-kpi-cell__value">₱{a.avgOrderValue?.toLocaleString()}</div>
          <div className="v-kpi-cell__sub">per order</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Orders</div>
          <div className="v-kpi-cell__value">{a.totalOrders}</div>
          <div className="v-kpi-cell__sub">completed</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Unique buyers</div>
          <div className="v-kpi-cell__value">{a.uniqueBuyers}</div>
          <div className="v-kpi-cell__sub">distinct customers</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Top species</div>
          <div className="v-kpi-cell__value" style={{ fontSize: 16 }}>{topSpecies}</div>
          <div className="v-kpi-cell__sub">by revenue</div>
        </div>
      </div>

      {/* Revenue vs Spend chart */}
      <div className="v-panel" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          Revenue vs. Spend
        </div>
        {/* Chart range tabs */}
        <div className="v-tabs" style={{ marginBottom: 16 }}>
          {[{ label: '7d', val: 7 }, { label: '30d', val: 30 }, { label: '90d', val: 90 }, { label: '1y', val: 365 }].map(r => (
            <button
              key={r.val}
              className={`v-tab${days === r.val ? ' v-tab--on' : ''}`}
              onClick={() => setDays(r.val)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={2}>
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
              }}
              formatter={v => [`₱${v.toLocaleString()}`, '']}
            />
            <Bar dataKey="revenue" fill="var(--accent-lime)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spend"   fill="var(--tide)"        radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by species + Procurement spend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="v-panel">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            Revenue by species
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bySpecies.map(s => (
              <BarRow key={s.speciesName} label={s.speciesName} value={s.totalRevenue} max={revMax} />
            ))}
          </div>
        </div>
        <div className="v-panel">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            Procurement spend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bySpend.map(s => (
              <BarRow key={s.speciesName} label={s.speciesName} value={s.totalSpend} max={procMax} color="var(--tide)" />
            ))}
          </div>
        </div>
      </div>

      {/* Repeat buyers table */}
      <div className="v-panel">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Repeat buyers</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Top customers by order count</div>
        </div>
        <table className="v-table">
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Tier</th>
              <th>Orders</th>
              <th>Total spent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {buyers.map(b => {
              const tierClass = { VIP: 'lime', REGULAR: 'kelp', NEW: 'tide' }[b.tier] ?? 'muted'
              return (
                <tr key={b.buyerId ?? b.buyerName}>
                  <td><strong style={{ color: 'var(--text-primary)' }}>{b.buyerName}</strong></td>
                  <td>
                    <span className={`v-chip v-chip--${tierClass}`}>{b.tier ?? 'NEW'}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{b.orderCount}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₱{b.totalSpent.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => b.buyerId && setPage?.('vorders', { buyerId: b.buyerId })}
                      disabled={!b.buyerId}
                    >
                      View orders
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
