import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSalesSummary, getRevenueBySpecies, getProcurementSpend, getRepeatBuyers, getSpeciesSeries } from './api/analytics'
import { StatTileSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

function PageHead({ eyebrow, title, em, sub, actions }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="section-title">{title} {em && <em>{em}</em>}</h1>
        {sub && <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 560 }}>{sub}</p>}
      </div>
      <div className="page__actions">{actions}</div>
    </div>
  )
}

export default function Analytics({ setPage }) {
  const [range, setRange] = useState('30')

  const { from, to } = useMemo(() => {
    const now = new Date()
    return {
      to: now.toISOString().split('T')[0],
      from: new Date(now - Number(range) * 86_400_000).toISOString().split('T')[0],
    }
  }, [range])

  const summaryQ = useQuery({ queryKey: ['vendor', 'analytics', 'summary', range], queryFn: () => getSalesSummary(from, to) })
  const speciesQ = useQuery({ queryKey: ['vendor', 'analytics', 'species', range], queryFn: () => getRevenueBySpecies(from, to) })
  const spendQ   = useQuery({ queryKey: ['vendor', 'analytics', 'spend', range],   queryFn: () => getProcurementSpend(from, to) })
  const buyersQ  = useQuery({ queryKey: ['vendor', 'analytics', 'buyers', range],  queryFn: () => getRepeatBuyers(from, to) })

  if (summaryQ.isLoading) return <div className="content"><StatTileSkeleton /><StatTileSkeleton /></div>
  if (summaryQ.error) return <div className="content"><ApiError error={summaryQ.error} onRetry={summaryQ.refetch} /></div>

  const a         = summaryQ.data ?? {}
  const bySpecies = speciesQ.data ?? []
  const bySpend   = spendQ.data ?? []
  const buyers    = buyersQ.data ?? []

  const revMax  = Math.max(1, ...bySpecies.map(s => s.totalRevenue ?? 0))
  const procMax = Math.max(1, ...bySpend.map(s => s.totalSpend ?? 0))

  return (
    <div className="content view-body">
      <PageHead
        eyebrow="Analytics"
        title="How your shop is"
        em="performing"
        sub="Revenue, volume, and repeat-buyer signal — sliced by species, buyer, and time window."
        actions={
          <div className="seg-tabs">
            {[['7', '7d'], ['30', '30d'], ['90', '90d'], ['365', '1y']].map(([val, label]) => (
              <button key={val} className={range === val ? 'on' : ''} onClick={() => setRange(val)}>
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="kpi-strip">
        <div className="cell">
          <div className="l">Orders</div>
          <div className="v">{a.totalOrders ?? 0}</div>
          <div className="s">across {a.uniqueBuyers ?? 0} buyers</div>
        </div>
        <div className="cell">
          <div className="l">Revenue</div>
          <div className="v">₱{((a.totalRevenue ?? 0) / 1000).toFixed(0)}<small>k</small></div>
          <div className="s">in period</div>
        </div>
        <div className="cell">
          <div className="l">Volume</div>
          <div className="v">{a.totalQtyKg ?? 0}<small>kg</small></div>
          <div className="s">sold</div>
        </div>
        <div className="cell">
          <div className="l">AOV</div>
          <div className="v">₱{(a.avgOrderValue ?? 0).toLocaleString()}</div>
          <div className="s">avg order value</div>
        </div>
        <div className="cell">
          <div className="l">Repeat rate</div>
          <div className="v">{((a.repeatRate ?? 0) * 100).toFixed(0)}<small>%</small></div>
          <div className="s">buyer return rate</div>
        </div>
      </div>

      <div className="cols-2--equal cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Revenue by species</div>
            <div className="panel__sub">Top selling SKUs</div>
            <button className="panel__action">All →</button>
          </div>
          <div style={{ padding: '12px 18px 18px' }}>
            {bySpecies.length === 0 && (
              <div style={{ color: 'var(--muted-2)', fontSize: 12, padding: '8px 0' }}>No data for this period.</div>
            )}
            {bySpecies.map(s => (
              <div key={s.speciesName} className="bar-row">
                <div className="bar-row__name">{s.speciesName}</div>
                <div className="bar-row__track">
                  <div className="bar-row__fill" style={{ width: (s.totalRevenue / revMax * 100) + '%' }} />
                </div>
                <div className="bar-row__val">₱{((s.totalRevenue ?? 0) / 1000).toFixed(0)}k</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Procurement spend</div>
            <div className="panel__sub">Cost basis by species</div>
            <button className="panel__action">All →</button>
          </div>
          <div style={{ padding: '12px 18px 18px' }}>
            {bySpend.length === 0 && (
              <div style={{ color: 'var(--muted-2)', fontSize: 12, padding: '8px 0' }}>No data for this period.</div>
            )}
            {bySpend.map(s => (
              <div key={s.speciesName} className="bar-row">
                <div className="bar-row__name">{s.speciesName}</div>
                <div className="bar-row__track alt">
                  <div className="bar-row__fill" style={{ width: (s.totalSpend / procMax * 100) + '%' }} />
                </div>
                <div className="bar-row__val">₱{((s.totalSpend ?? 0) / 1000).toFixed(0)}k</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Repeat buyers</div>
          <div className="panel__sub">Your loyal customer base</div>
          <button className="panel__action">All buyers →</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 18px 18px' }}>
          {buyers.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted-2)', padding: '24px 0', fontSize: 13 }}>No repeat buyers yet.</div>
          )}
          {buyers.map(b => {
            const tier = b.tier ?? 'NEW'
            const chipStyle = tier === 'VIP'
              ? { background: 'rgba(194,239,78,0.14)', color: 'var(--accent-lime)', border: '1px solid rgba(194,239,78,0.3)', fontSize: 9.5 }
              : tier === 'REGULAR' || tier === 'Reg'
                ? { background: 'var(--tide-soft)', color: 'var(--tide)', border: '1px solid var(--hairline)', fontSize: 9.5 }
                : { background: 'var(--panel-3)', color: 'var(--muted)', border: '1px solid var(--hairline)', fontSize: 9.5 }
            return (
              <div key={b.buyerId ?? b.buyerName} className="buyer-row">
                <div className="buyer-row__identity">
                  <div className="buyer-row__name">{b.buyerName}</div>
                  <div className="buyer-row__sub">ID {b.buyerId ?? '—'}</div>
                </div>
                <div className="buyer-row__tier">
                  <span className="chip" style={chipStyle}>{tier}</span>
                </div>
                <div className="buyer-row__metric">
                  <div className="buyer-row__val">{b.orderCount}</div>
                  <div className="buyer-row__label">orders</div>
                </div>
                <div className="buyer-row__metric">
                  <div className="buyer-row__val" style={{ color: 'var(--accent-lime)' }}>₱{(b.totalSpent ?? 0).toLocaleString()}</div>
                  <div className="buyer-row__label">total spent</div>
                </div>
                <div className="buyer-row__actions">
                  <button className="btn btn--sm btn--ghost" onClick={() => b.buyerId && setPage?.('vorders', { buyerId: b.buyerId })}>
                    View orders
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
