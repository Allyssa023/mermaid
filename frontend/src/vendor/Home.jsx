import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { getVendorHome } from './api/home'
import { getSpeciesSeries } from './api/analytics'
import { unpublishListing } from './api/storefront'
import { fetchAllConditions } from '../fisherman/api/marine'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export const freshnessPct = (receivedAtMs) =>
  Math.min(100, ((Date.now() - receivedAtMs) / (6 * 86400 * 1000)) * 100)

export default function Home({ setPage }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const homeQ = useQuery({ queryKey: ['vendor', 'home'], queryFn: getVendorHome, refetchInterval: 60_000 })
  const seriesQ = useQuery({ queryKey: ['vendor', 'species-series'], queryFn: () => getSpeciesSeries(30) })
  const marineQ = useQuery({ queryKey: ['marine', 'all'], queryFn: fetchAllConditions, refetchInterval: 300_000 })

  const unpublishMut = useMutation({
    mutationFn: unpublishListing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'home'] }),
  })

  if (homeQ.isLoading) return <div className="page"><StatTileSkeleton /><TableRowSkeleton rows={3} /></div>
  if (homeQ.error) return <div className="page"><ApiError error={homeQ.error} onRetry={homeQ.refetch} /></div>

  const home = homeQ.data ?? {}
  const firstName = user?.fullName?.split(' ')[0] ?? 'Vendor'
  const displaySub = home?.vendor?.businessName || user?.business || ''

  const series = seriesQ.data ?? []

  // Derive marine data from zones
  const zones = marineQ.data?.zones ?? []
  const RISK_ORDER = { UNSAFE: 2, CAUTION: 1, SAFE: 0 }
  const worstZone = zones.reduce((worst, z) => {
    return (RISK_ORDER[z.risk?.level] ?? 0) > (RISK_ORDER[worst?.risk?.level] ?? 0) ? z : worst
  }, zones[0] ?? null)
  const marine = worstZone
    ? {
        riskLevel: worstZone.risk?.level ?? 'SAFE',
        waveHeight: worstZone.conditions?.waveHeight ?? worstZone.risk?.waveHeight ?? null,
        windSpeed: worstZone.conditions?.windSpeed ?? worstZone.risk?.windSpeed ?? null,
        windGusts: worstZone.conditions?.windGusts ?? worstZone.risk?.windGusts ?? null,
        gusts: worstZone.conditions?.gusts ?? worstZone.risk?.gusts ?? null,
      }
    : null

  // Featured listing: highest-stock PUBLISHED listing
  const featured = (home?.listings ?? [])
    .filter(l => l.status === 'PUBLISHED')
    .sort((a, b) => (b.availableKg ?? 0) - (a.availableKg ?? 0))[0]

  const initialKg = featured?.lots?.[0]?.initialKg ?? featured?.initialKg ?? 0
  const soldKg = initialKg - (featured?.availableKg ?? 0)
  const featuredReceivedAt = featured?.lots?.[0]?.receivedAt
    ? new Date(featured.lots[0].receivedAt).getTime()
    : featured?.receivedAt
      ? new Date(featured.receivedAt).getTime()
      : null
  const fPct = featuredReceivedAt ? freshnessPct(featuredReceivedAt) : 0

  const miniStats = [
    { label: 'Avg agreed/kg', value: home?.avgAgreedPriceKg ? `₱${Number(home.avgAgreedPriceKg).toFixed(0)}` : '—' },
    { label: 'Sell ratio', value: featured && initialKg > 0 ? `${((soldKg / initialKg) * 100).toFixed(0)}%` : '—' },
    { label: 'Margin', value: featured?.costPerKg ? `+${(((featured.pricePerKg - featured.costPerKg) / featured.costPerKg) * 100).toFixed(0)}%` : '—' },
    { label: 'Days in stock', value: featuredReceivedAt ? `${((Date.now() - featuredReceivedAt) / 86400000).toFixed(1)}d` : '—' },
  ]

  // Revenue KPI (keep existing data visible)
  const openOrdersTotal = (home.openOrders?.new ?? 0) + (home.openOrders?.preparing ?? 0) + (home.openOrders?.ready ?? 0)

  return (
    <div className="page">
      {/* Page header */}
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Good morning, <em>{firstName}</em></h1>
          <div className="v-page-header__sub">{displaySub}</div>
        </div>
        <div className="v-page-header__actions">
          <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setPage('vprocurement')}>Browse catch</button>
          <button className="v-btn v-btn--primary v-btn--sm" onClick={() => setPage('vstore')}>New listing</button>
        </div>
      </div>

      {/* KPI strip — revenue + open orders (preserves existing test data) */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Today's revenue</div>
          <div className="v-kpi-cell__value v-mono">₱{(home.todayRevenue ?? 0).toLocaleString()}</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Open orders</div>
          <div className="v-kpi-cell__value v-mono">{openOrdersTotal}</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Unread</div>
          <div className="v-kpi-cell__value v-mono">{home.unreadNotifications ?? 0}</div>
        </div>
      </div>

      {/* Top species row (3 sparkline cards + 1 promo card) */}
      {series.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 200px', gap: 12, marginBottom: 20 }}>
          {series.slice(0, 3).map(s => (
            <div key={s.speciesId} className="v-panel">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{s.localName || s.commonName}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{s.commonName}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{s.revenueShare?.toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: s.revenueDelta >= 0 ? 'var(--kelp)' : 'var(--coral)', marginBottom: 6 }}>
                {s.revenueDelta >= 0 ? '+' : ''}{s.revenueDelta?.toFixed(1)}% vs prior
              </div>
              <div style={{ height: 48 }}>
                <ResponsiveContainer width="100%" height={48}>
                  <LineChart data={s.daily}>
                    <Line type="monotone" dataKey="revenue" stroke="var(--accent-lime)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                {s.lotsCount} lots &middot; ₱{s.pricePerKg?.toFixed(0)}/kg avg
              </div>
            </div>
          ))}
          {/* Advisory promo card */}
          <div className="v-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MERMAID Advisory</div>
            {marine && (
              <span className={`v-chip v-chip--${marine.riskLevel === 'SAFE' ? 'kelp' : marine.riskLevel === 'CAUTION' ? 'caution' : 'coral'}`}>
                {marine.riskLevel}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => marineQ.refetch()}>Refresh</button>
          </div>
        </div>
      )}

      {/* Active listing hero */}
      {featured && (
        <div className="v-panel v-panel--elevated" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span className="v-chip v-chip--kelp">LIVE</span>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                  Updated {new Date(featured.updatedAt).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{featured.speciesName || featured.title}</div>
              <div className="v-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-lime)', margin: '8px 0' }}>
                {soldKg.toFixed(2)} kg sold
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setPage('vstore')}>Edit listing</button>
                <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => unpublishMut.mutate(featured.id)}>Unlist</button>
              </div>
              <div className="v-mono" style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>
                ₱{featured.pricePerKg}/kg &middot; {featured.availableKg}kg remaining
              </div>
            </div>
            {/* Freshness timeline */}
            <div style={{ width: 180, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6 }}>Freshness window</div>
              <div style={{ position: 'relative', height: 8, background: 'var(--hairline)', borderRadius: 4 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${Math.max(4, 100 - fPct)}%`,
                  background: fPct < 50 ? 'var(--kelp)' : fPct < 80 ? 'var(--caution)' : 'var(--coral)',
                  borderRadius: 4, transition: 'width 0.4s'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-5)', marginTop: 2 }}>
                <span>D0</span><span>D3</span><span>D6</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Day {(fPct / 100 * 6).toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 4 mini-KPI cells */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {miniStats.map(({ label, value }) => (
          <div key={label} className="v-kpi-cell">
            <div className="v-kpi-cell__label">{label}</div>
            <div className="v-kpi-cell__value v-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Lower grid: orders + right column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }}>
        {/* Orders panel */}
        <div className="v-panel">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Recent orders</div>
          {(home?.recentOrders || []).slice(0, 5).map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--hairline-2)' }}>
              <span className="v-chip v-chip--muted" style={{ fontSize: 10 }}>{o.status}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{o.buyerName} &middot; {o.speciesName}</span>
              <span className="v-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>₱{o.totalAmount?.toFixed(0)}</span>
            </div>
          ))}
          {(home?.recentOrders || []).length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--ink-4)', padding: '8px 0' }}>No recent orders</div>
          )}
          <button className="v-btn v-btn--ghost v-btn--sm" style={{ marginTop: 10 }} onClick={() => setPage('vorders')}>View all</button>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Advisory */}
          <div className="v-panel">
            <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Marine &middot; La Union</div>
            {marine ? (
              <>
                <span className={`v-chip v-chip--${marine.riskLevel === 'SAFE' ? 'kelp' : marine.riskLevel === 'CAUTION' ? 'caution' : 'coral'}`} style={{ marginBottom: 8 }}>
                  {marine.riskLevel}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                  {[
                    { label: 'Wave', value: `${marine.waveHeight ?? '—'}m` },
                    { label: 'Wind', value: `${marine.windSpeed ?? '—'}kt` },
                    { label: 'Gusts', value: `${marine.gusts ?? marine.windGusts ?? '—'}kt` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 9, color: 'var(--ink-4)' }}>{label}</div>
                      <div className="v-mono" style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Loading…</div>}
          </div>

          {/* Low stock */}
          <div className="v-panel">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Low stock</div>
            {(home?.lowStock || []).map(lot => (
              <div key={lot.id ?? lot.speciesName} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, flex: 1 }}>{lot.speciesName || lot.speciesCommonName}</span>
                <span className="v-chip v-chip--coral v-mono">{lot.remainingKg}kg</span>
              </div>
            ))}
            {(home?.lowStock || []).length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>All stock levels OK</div>
            )}
          </div>
        </div>
      </div>

      {/* Procurement panel */}
      {(home?.recentMatchedCatchAlerts || []).length > 0 && (
        <div className="v-panel">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Source fresh catch</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {(home.recentMatchedCatchAlerts || []).slice(0, 6).map(alert => {
              const inWatchlist = (home.watchlistSpeciesIds || []).includes(alert.speciesId)
              const pct = inWatchlist ? 100 : 60
              return (
                <div key={alert.id} className="v-panel" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="v-chip v-chip--lime">{pct}%</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>#{alert.code || alert.id}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.speciesLocalName || alert.speciesName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{alert.fisherFullName || alert.fisherName || alert.fishermanName}</div>
                  <div className="v-mono" style={{ marginTop: 6, fontSize: 13 }}>{alert.quantityKg}kg &middot; ₱{alert.askingPrice}/kg</div>
                  <button className="v-btn v-btn--ghost v-btn--sm" style={{ marginTop: 8, width: '100%' }} onClick={() => setPage('vprocurement')}>View</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
