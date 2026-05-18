import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import gsap from 'gsap'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { getVendorHome } from './api/home'
import { getSpeciesSeries } from './api/analytics'
import { listListings, unpublishListing } from './api/storefront'
import { listInbox, confirmOrder as confirmOrderApi } from './api/orders'
import { fetchAdvisories } from '../fisherman/api/marine'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export const freshnessPct = (receivedAtMs) =>
  Math.min(100, ((Date.now() - receivedAtMs) / (6 * 86400 * 1000)) * 100)

// ---------- TopSpeciesCard ----------
function TopSpeciesCard({ s }) {
  const up = (s.revenueDelta ?? 0) >= 0
  const badgeLetter = (s.localName || s.commonName || '?')[0].toUpperCase()
  const chartData = (s.daily ?? []).map((d) => ({
    revenue: d.revenue ?? d.value ?? 0,
  }))

  return (
    <div className="kpi-card">
      <div className="kpi-card__head">
        <div
          className="kpi-card__badge"
          style={{
            background: `linear-gradient(135deg, var(--tide-soft, rgba(94,200,230,0.15)), #221a3d)`,
          }}
        >
          {badgeLetter}
        </div>
        <div className="kpi-card__label">
          <span className="eyebrow">Species</span>
          <strong>{s.commonName || s.localName}</strong>
          <span
            style={{
              color: 'var(--muted-2)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
            }}
          >
            {s.localName} &middot; {s.lotsCount ?? 0} lots
          </span>
        </div>
        <div className="kpi-card__open">
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            style={{ transform: 'rotate(45deg)' }}
          >
            <path d="M3 10L10 3M10 3H5M10 3V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="kpi-card__metric">
        <div className="kpi-card__metric-label">Revenue share</div>
        <div className="kpi-card__metric-value">
          {(s.revenueShare ?? 0).toFixed(1)}
          <small>%</small>
        </div>
        <div className={`kpi-card__delta ${up ? 'kpi-card__delta--up' : 'kpi-card__delta--down'}`}>
          {up ? '+' : ''}
          {(s.revenueDelta ?? 0).toFixed(1)}%
        </div>
      </div>

      <div className="kpi-card__chart">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={76}>
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--accent-lime)"
                strokeWidth={1.8}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 76 }} />
        )}
      </div>
    </div>
  )
}

// ---------- AdvisoryCard ----------
const ADV_TONE = { CRITICAL: 'danger', HIGH: 'danger', MEDIUM: 'warn', LOW: 'ok', INFO: 'info' }
const ADV_ICON = { CRITICAL: 'Alert', HIGH: 'Wave', MEDIUM: 'Wind', LOW: 'Drop', INFO: 'Alert' }

function AdvisoryCard({ advisories }) {
  const [idx, setIdx]   = useState(0)
  const contentRef      = useRef(null)
  const iconRef         = useRef(null)

  useEffect(() => {
    if (advisories.length <= 1) return
    const id = setInterval(() => {
      if (!contentRef.current) return
      gsap.to(contentRef.current, {
        x: -20, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          setIdx(prev => (prev + 1) % advisories.length)
          gsap.fromTo(contentRef.current,
            { x: 20, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 }
          )
        },
      })
    }, 4000)
    return () => clearInterval(id)
  }, [advisories.length])

  useEffect(() => {
    if (!iconRef.current) return
    const ctx = gsap.context(() => {
      gsap.to(iconRef.current, { x: 8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    }, iconRef)
    return () => ctx.revert()
  }, [idx])

  const activeAdv  = advisories[idx]
  const tone       = activeAdv ? (ADV_TONE[activeAdv.severity] ?? 'info') : 'info'
  const iconKey    = activeAdv ? (ADV_ICON[activeAdv.severity]  ?? 'Alert') : 'Alert'
  const Icon       = I[iconKey] ?? I.Alert
  const highCount  = advisories.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length

  return (
    <div className={`adv-card adv-card--${tone}`}>
      <div className="adv-card__head">
        <div>
          <div className="panel__title">Advisories</div>
          <div className="panel__sub">{advisories.length > 0 ? `${advisories.length} active · Region I` : 'No active advisories'}</div>
        </div>
        {highCount > 0 && (
          <span className="chip" style={{ background: 'rgba(251,113,133,0.15)', color: 'var(--coral)', border: '1px solid rgba(251,113,133,0.3)', fontSize: 9.5, flexShrink: 0, padding: '3px 8px' }}>
            {highCount} HIGH
          </span>
        )}
      </div>

      <div className="adv-card__rich" ref={contentRef}>
        {advisories.length === 0 ? (
          <div style={{ color: 'var(--muted-2)', fontSize: 12 }}>No active advisories</div>
        ) : (
          <>
            <div className={`adv-card__icon adv-card__icon--${tone}`} ref={iconRef}>
              <Icon size={56} />
            </div>
            <div>
              <div className="adv-card__title">{activeAdv.title}</div>
              <div className="adv-card__meta">Active in your region</div>
              <span className={`adv-card__sev adv-card__sev--${tone}`}>{activeAdv.severity}</span>
            </div>
          </>
        )}
      </div>

      {advisories.length > 1 && (
        <div className="adv-card__dots">
          {advisories.map((_, i) => (
            <button key={i} className={`adv-card__dot${i === idx ? ' on' : ''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- ListingsCarousel ----------
function ListingsCarousel({ listings, onUnlist, onRestock, onRefresh }) {
  const [idx, setIdx]       = useState(0)
  const [paused, setPaused] = useState(false)
  const slideRef            = useRef(null)

  const published = listings
    .filter(l => l.status === 'PUBLISHED')
    .sort((a, b) => (b.availableKg ?? 0) - (a.availableKg ?? 0))
  const total = published.length

  const change = (newIdx) => {
    if (!slideRef.current || total < 2) { setIdx(newIdx); return }
    gsap.to(slideRef.current, {
      opacity: 0, x: -18, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        setIdx(newIdx)
        gsap.fromTo(slideRef.current,
          { opacity: 0, x: 18 },
          { opacity: 1, x: 0, duration: 0.28, ease: 'power2.out' }
        )
      },
    })
  }

  useEffect(() => {
    if (paused || total < 2) return
    const id = setInterval(() => change((idx + 1) % total), 5000)
    return () => clearInterval(id)
  }, [paused, total, idx])

  useEffect(() => {
    if (idx >= total && total > 0) setIdx(0)
  }, [total])

  if (total === 0) {
    return (
      <section className="active-block">
        <header className="ab-head">
          <span style={{ color: 'var(--muted-2)' }}>Your active listings</span>
        </header>
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 14 }}>
            No active listings yet — publish your first lot to see freshness tracking here.
          </div>
          <button className="btn btn--primary" onClick={onRestock}>
            Go to inventory → list for sale
          </button>
        </div>
      </section>
    )
  }

  const listing = published[idx] ?? published[0]

  const speciesName = listing.speciesName || listing.speciesLocalName || listing.title || 'Unknown'
  const location    = listing.pickupLocation || listing.location || '—'
  const fisher      = listing.fishermanName  || listing.fisherName  || listing.fisherman || '—'
  const pricePerKg  = listing.pricePerKg ?? 0
  const costPerKg   = listing.costPerKg  ?? 0
  const availableKg = listing.availableKg ?? 0
  const margin      = costPerKg > 0 ? (((pricePerKg - costPerKg) / costPerKg) * 100).toFixed(0) : null

  const initialKg          = listing.lots?.[0]?.initialKg ?? listing.initialKg ?? 0
  const soldKg             = Math.max(0, initialKg - availableKg)
  const featuredReceivedAt = listing.lots?.[0]?.receivedAt
    ? new Date(listing.lots[0].receivedAt).getTime()
    : listing.receivedAt ? new Date(listing.receivedAt).getTime() : null
  const fPct          = featuredReceivedAt ? freshnessPct(featuredReceivedAt) : 0
  const displayDay    = ((fPct / 100) * 6).toFixed(1)
  const remainFillPct = Math.max(2, 100 - fPct)

  const miniStatDefs = [
    { name: 'Sell ratio',    sub: 'vs initial stock', tag: 'LOT',
      bar: initialKg > 0 ? Math.round((soldKg / initialKg) * 100) : 0,
      value: initialKg > 0 ? `${((soldKg / initialKg) * 100).toFixed(0)}%` : '—' },
    { name: 'Margin',        sub: 'ask vs cost',      tag: 'EST',
      bar: 65,
      value: costPerKg > 0 ? `+${margin}%` : '—' },
    { name: 'Days in stock', sub: 'since received',   tag: 'AGE',
      bar: Math.min(100, Math.round(fPct)),
      value: featuredReceivedAt ? `${((Date.now() - featuredReceivedAt) / 86400000).toFixed(1)}d` : '—' },
    { name: 'Available',     sub: 'kg remaining',     tag: 'KG',
      bar: initialKg > 0 ? Math.round((availableKg / initialKg) * 100) : 100,
      value: `${availableKg}kg` },
  ]

  return (
    <section
      className="active-block"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header className="ab-head">
        <span style={{ color: 'var(--muted-2)' }}>Your active listings</span>
        <div className="spacer" />

        {total > 1 && (
          <div className="ab-car-nav">
            <button className="icon-btn" title="Prev"
              onClick={() => change((idx - 1 + total) % total)}>
              <I.ChevL size={13} />
            </button>
            <div className="ab-car-dots">
              {published.map((_, i) => (
                <button key={i} className={`ab-car-dot${i === idx ? ' on' : ''}`}
                  onClick={() => change(i)} />
              ))}
            </div>
            <button className="icon-btn" title="Next"
              onClick={() => change((idx + 1) % total)}>
              <I.ChevR size={13} />
            </button>
          </div>
        )}

        <div className="ab-head" style={{ gap: 6, marginLeft: 8 }}>
          <button className="icon-btn" title="Refresh" onClick={onRefresh}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7a6 6 0 1 0 1-3.3M1 2v2.7h2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="icon-btn" title="More">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="3" r="1" fill="currentColor" />
              <circle cx="7" cy="7" r="1" fill="currentColor" />
              <circle cx="7" cy="11" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      <div ref={slideRef}>
        <div className="ab-grid">
          {/* LEFT — listing detail */}
          <div>
            <div className="ab-meta">
              <span className="live">LIVE</span>
              <span>Lot {listing.id}</span>
              {total > 1 && (
                <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                  {idx + 1} / {total}
                </span>
              )}
            </div>
            <h2 className="ab-title">
              Lot <em>{speciesName}</em>
              <span style={{ color: 'var(--muted-2)', fontWeight: 400, fontSize: 18 }}>
                ({listing.speciesCommonName || speciesName})
              </span>
            </h2>
            <div className="ab-subtitle">
              {location} &middot; Fisher{' '}
              <strong style={{ color: 'var(--ink-on-dark)' }}>{fisher}</strong>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="kpi-card__metric-label">Current sold balance &middot; kg</div>
              <div className="ab-figure">
                <div className="ab-figure__value">
                  {soldKg.toFixed(2)}<small>kg</small>
                </div>
                <div className="ab-figure__pills">
                  <button className="ab-figure__pill" onClick={onRestock}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>{' '}
                    Restock
                  </button>
                  <button className="ab-figure__pill ab-figure__pill--ghost"
                    onClick={() => onUnlist(listing.id)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>{' '}
                    Unpublish
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 14, color: 'var(--muted-2)', fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>
                <span>₱{pricePerKg}/kg ask</span>
                {costPerKg > 0 && <span>&middot; ₱{costPerKg}/kg cost</span>}
                <span>&middot; {availableKg}kg remaining</span>
                {margin !== null && <span>&middot; margin <span style={{ color: 'var(--accent-lime)' }}>+{margin}%</span></span>}
              </div>
            </div>
          </div>

          {/* RIGHT — freshness window */}
          <div>
            <div className="window-card">
              <div className="window-card__head">
                <div className="window-card__title">Listing freshness window</div>
                <span className="window-card__chip">6 day shelf</span>
              </div>
              <div>
                <div className="timeline">
                  <div className="timeline__rail">
                    <div className="timeline__fill"     style={{ width: `${remainFillPct}%` }} />
                    <div className="timeline__pin"       style={{ left: `${fPct}%` }} />
                    <div className="timeline__pin-label" style={{ left: `${fPct}%` }}>Day {displayDay}</div>
                  </div>
                  <div className="timeline__ticks">
                    <span>Iced D0</span><span>D1</span><span>D2</span>
                    <span>D3</span><span>D4</span><span>D5</span><span>Spoil</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                <span>Sold-thru target: <strong style={{ color: 'var(--ink-on-dark)' }}>Day 4.0</strong></span>
                <span>BFAR cert: <strong style={{ color: 'var(--accent-lime)' }}>OK</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div className="mini-stats">
          {miniStatDefs.map(m => (
            <div key={m.name} className="mini-stat" style={{ '--w': `${m.bar}%` }}>
              <div className="mini-stat__head">
                <div>
                  <div className="mini-stat__name">{m.name}</div>
                  <div className="mini-stat__sub">{m.sub}</div>
                </div>
                <div className="mini-stat__tag">{m.tag}</div>
              </div>
              <div className="mini-stat__value"><span className="v">{m.value}</span></div>
              <div className="mini-stat__bar" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- OrdersPanel ----------
function OrdersPanel({ home, orders, setPage, onConfirm, confirmPending }) {
  const [filter, setFilter] = useState('ALL')

  const statusChip = (s) => {
    if (s === 'PENDING')   return <span className="chip chip--new">Pending</span>
    if (s === 'CONFIRMED') return <span className="chip chip--prep">Confirmed</span>
    if (s === 'COMPLETED') return <span className="chip chip--ready">Completed</span>
    if (s === 'CANCELLED') return <span className="chip chip--cancel">Cancelled</span>
    return <span className="chip chip--done">{s}</span>
  }

  const openCount =
    (home?.openOrders?.new ?? 0) +
    (home?.openOrders?.preparing ?? 0) +
    (home?.openOrders?.ready ?? 0)

  const filtered = filter === 'ALL'     ? orders
    : filter === 'PENDING'              ? orders.filter(o => o.status === 'PENDING')
    : filter === 'READY'                ? orders.filter(o => ['CONFIRMED', 'READY'].includes(o.status))
    : orders

  return (
    <div className="panel">
      <div className="panel__head">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel__title">Orders inbox</div>
          <div className="panel__sub">{openCount} open today</div>
        </div>
        <div className="filter-pills" style={{ marginLeft: 16 }}>
          {[
            { key: 'ALL', label: 'All' },
            { key: 'PENDING', label: 'Pending', count: home?.openOrders?.new },
            { key: 'READY',   label: 'Ready',   count: home?.openOrders?.ready },
          ].map(f => (
            <span
              key={f.key}
              className={`pill-btn${filter === f.key ? ' on' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.count > 0 && (
                <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 4 }}>
                  {f.count}
                </span>
              )}
            </span>
          ))}
        </div>
        <button className="panel__action" onClick={() => setPage?.('vorders')}>
          View all{' '}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5h8M6 2l3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="panel__body">
        {filtered.length > 0 ? (
          <table className="tbl tbl--fixed">
            <colgroup>
              <col style={{ width: 80 }} />
              <col style={{ width: 120 }} />
              <col />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Order</th>
                <th>Buyer</th>
                <th>Species · qty</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const buyerName = o.buyer?.fullName ?? o.buyerName ?? '—'
                const speciesName = o.species?.commonName ?? o.speciesName ?? '—'
                const qty = o.orderedQtyKg ?? o.quantityKg ?? o.qty ?? 0
                const total = o.totalAmount ?? o.total ?? 0
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setPage?.('vorders')}>
                    <td><span className="code">#{o.orderCode ?? o.id}</span></td>
                    <td className="strong">{buyerName}</td>
                    <td>
                      {speciesName}
                      <span style={{ color: 'var(--muted-2)', marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {qty}kg
                      </span>
                    </td>
                    <td className="amount">₱{Number(total).toLocaleString()}</td>
                    <td>{statusChip(o.status)}</td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <span className="btn-row">
                        {o.status === 'PENDING' && (
                          <button
                            className="row-btn row-btn--primary"
                            disabled={confirmPending}
                            onClick={() => onConfirm?.(o.id)}
                          >
                            Confirm
                          </button>
                        )}
                        {o.status === 'CONFIRMED' && (
                          <button className="row-btn" onClick={() => setPage?.('vorders')}>
                            Manage
                          </button>
                        )}
                        {(o.status === 'COMPLETED' || o.status === 'CANCELLED') && (
                          <button className="row-btn" onClick={() => setPage?.('vorders')}>Details</button>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '20px 18px', color: 'var(--muted-2)', fontSize: 13 }}>
            {orders.length === 0 ? 'No recent orders' : 'No orders match this filter'}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- CatchAlertsPanel ----------
function CatchAlertsPanel({ home, setPage }) {
  const alerts = home?.recentMatchedAlerts ?? []

  return (
    <div className="panel">
      <div className="panel__head">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel__title">Catch alerts</div>
          <div className="panel__sub">{alerts.length} matched to your watchlist</div>
        </div>
        <button className="panel__action" onClick={() => setPage?.('vprocurement')}>
          Feed{' '}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5h8M6 2l3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="panel__body">
        {alerts.length === 0 ? (
          <div style={{ padding: '16px 18px', color: 'var(--muted-2)', fontSize: 13 }}>
            No recent catch alerts — add species to your watchlist to get matches.
          </div>
        ) : (
          alerts.slice(0, 5).map((a, i) => {
            const species  = a.speciesName ?? '—'
            const fisher   = a.fishermanName ?? '—'
            const timeStr  = a.createdAt
              ? new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : '—'
            return (
              <div className="adv-item" key={a.catchAlertId ?? i} style={{ cursor: 'pointer' }} onClick={() => setPage?.('vprocurement')}>
                <div className="adv-item__dot info">
                  <span style={{ fontSize: 14 }}>{species[0].toUpperCase()}</span>
                </div>
                <div className="adv-item__body">
                  <div className="adv-item__title">{species}</div>
                  <div className="adv-item__sub">Fisher: {fisher}</div>
                </div>
                <div className="adv-item__time">{timeStr}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---------- LowStockPanel ----------
function LowStockPanel({ home, setPage }) {
  const lowStock = home?.lowStockSpecies ?? []

  return (
    <div className="panel">
      <div className="panel__head">
        <div className="panel__title">Low stock lots</div>
        <span className="panel__sub">{lowStock.length} below threshold</span>
        <button className="panel__action" onClick={() => setPage?.('vinventory')}>
          Inventory{' '}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5h8M6 2l3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="panel__body">
        {lowStock.length === 0 ? (
          <div style={{ padding: '16px 18px', color: 'var(--muted-2)', fontSize: 13 }}>
            All stock levels OK
          </div>
        ) : (
          lowStock.map((row, i) => {
            const remaining = row.availableKg ?? 0
            const VISUAL_MAX = 30
            const pct = Math.min(100, Math.round((remaining / VISUAL_MAX) * 100))
            const ok = remaining > 5
            const name = row.speciesName ?? '—'

            return (
              <div className="stock-row" key={i} style={{ cursor: 'pointer' }} onClick={() => setPage?.('vinventory')}>
                <div className="stock-row__icon">{name[0].toUpperCase()}</div>
                <div>
                  <div className="stock-row__name">{name}</div>
                </div>
                <div className={`stock-row__bar ${ok ? 'ok' : ''}`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="stock-row__qty">
                  <strong style={{ color: ok ? 'var(--ink-on-dark)' : 'var(--coral)' }}>
                    {remaining.toFixed(1)}
                  </strong>
                  <span style={{ color: 'var(--muted-2)' }}>kg</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---------- ProcurementPanel ----------
function ProcurementPanel({ home, setPage }) {
  const alerts = home?.recentMatchedAlerts ?? []

  if (alerts.length === 0) return null

  return (
    <div className="panel">
      <div className="panel__head">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel__title">Catch alerts matched to your watchlist</div>
          <div className="panel__sub">Live procurement feed &middot; {alerts.length} recent matches</div>
        </div>
        <button className="panel__action" onClick={() => setPage?.('vprocurement')}>
          Full feed{' '}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5h8M6 2l3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="feed-grid">
        {alerts.slice(0, 8).map((a, i) => {
          const species = a.speciesName ?? '—'
          const fisher  = a.fishermanName ?? '—'
          const code    = `CA-${a.catchAlertId}`
          const timeStr = a.createdAt
            ? new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : '—'

          return (
            <div key={a.catchAlertId ?? i} className="feed-card" style={{ cursor: 'pointer' }} onClick={() => setPage?.('vprocurement')}>
              <div className="feed-card__head">
                <span className="code">{code}</span>
                <span style={{ marginLeft: 'auto', fontSize: 18 }}>{species[0].toUpperCase()}</span>
              </div>
              <div>
                <div className="feed-card__species">{species}</div>
                <div className="feed-card__fisher">{fisher}</div>
              </div>
              <div className="feed-card__kpis">
                <div>
                  <span className="l">Matched</span>
                  <span className="v" style={{ fontSize: 11 }}>{timeStr}</span>
                </div>
              </div>
              <div className="feed-card__cta">
                <button className="solid" onClick={(e) => { e.stopPropagation(); setPage?.('vprocurement') }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1.5 5.5h8M6 2l3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>{' '}
                  View in feed
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Main Home component ----------
export default function Home({ setPage }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const homeQ = useQuery({
    queryKey: ['vendor', 'home'],
    queryFn: getVendorHome,
    refetchInterval: 60_000,
  })
  const seriesQ = useQuery({
    queryKey: ['vendor', 'species-series'],
    queryFn: () => getSpeciesSeries(30),
  })
  const listingsQ = useQuery({
    queryKey: ['vendor', 'storefront'],
    queryFn: listListings,
    staleTime: 60_000,
  })
  const ordersQ = useQuery({
    queryKey: ['vendor', 'orders'],
    queryFn: () => listInbox({}),
    staleTime: 30_000,
  })
  const advisoriesQ = useQuery({
    queryKey: ['advisories', 'active'],
    queryFn: () => fetchAdvisories(true),
    staleTime: 300_000,
  })

  const unpublishMut = useMutation({
    mutationFn: unpublishListing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
      qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] })
      qc.invalidateQueries({ queryKey: ['vendor', 'home'] })
    },
  })
  const confirmMut = useMutation({
    mutationFn: confirmOrderApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'orders'] })
      qc.invalidateQueries({ queryKey: ['vendor', 'home'] })
    },
  })

  if (homeQ.isLoading) {
    return (
      <div className="content">
        <StatTileSkeleton />
        <TableRowSkeleton rows={3} />
      </div>
    )
  }
  if (homeQ.error) {
    return (
      <div className="content">
        <ApiError error={homeQ.error} onRetry={homeQ.refetch} />
      </div>
    )
  }

  const home     = homeQ.data ?? {}
  const series   = seriesQ.data ?? []
  const listings = listingsQ.data ?? []
  const recentOrders = (ordersQ.data ?? []).slice(0, 6)

  const activeSpeciesCount = series.length || listings.filter(l => l.status === 'PUBLISHED').length

  return (
    <div className="content">
      {/* Section header */}
      <div className="section-head">
        <div>
          <div className="section-eyebrow">
            Recommended for today{' '}
            <span className="pill">{activeSpeciesCount} active species</span>
          </div>
          <h1 className="section-title">
            Top selling <em>catch</em>
          </h1>
        </div>
        <div className="filter-pills">
          <span className="pill-btn on">24H</span>
          <span className="pill-btn">Whole fresh</span>
          <span className="pill-btn">Desc</span>
        </div>
      </div>

      {/* Top species cards + promo card */}
      <div className="top-row">
        {series.slice(0, 3).map((s) => (
          <TopSpeciesCard key={s.speciesId} s={s} />
        ))}
        <AdvisoryCard advisories={advisoriesQ.data ?? []} />
      </div>

      {/* Active listings carousel */}
      <ListingsCarousel
        listings={listings}
        onUnlist={id => unpublishMut.mutate(id)}
        onRestock={() => setPage?.('vprocurement')}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
          qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] })
          qc.invalidateQueries({ queryKey: ['vendor', 'home'] })
        }}
      />

      {/* Lower grid: orders + right stack */}
      <div className="lower-grid">
        <OrdersPanel
          home={home}
          orders={recentOrders}
          setPage={setPage}
          onConfirm={id => confirmMut.mutate(id)}
          confirmPending={confirmMut.isPending}
        />
        <div className="stack">
          <CatchAlertsPanel home={home} setPage={setPage} />
          <LowStockPanel home={home} setPage={setPage} />
        </div>
      </div>

      {/* Procurement feed */}
      <ProcurementPanel home={home} setPage={setPage} />
    </div>
  )
}
