import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { I } from '../icons'
import { fetchBuyerHome } from './api/home'
import { useAuth } from '../context/AuthContext'
import { PageHead } from './components/PageHead'
import WaveformChart from './components/WaveformChart'
import MiniBars from './components/MiniBars'

const CHIP_STATUS = {
  PENDING:   'status-chip-v2 status-chip-v2--pending',
  CONFIRMED: 'status-chip-v2 status-chip-v2--confirmed',
  COMPLETED: 'status-chip-v2 status-chip-v2--completed',
  CANCELLED: 'status-chip-v2 status-chip-v2--cancelled',
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#5eead4,#38bdf8)',
  'linear-gradient(135deg,#a78bfa,#6a5fc1)',
  'linear-gradient(135deg,#fa7faa,#c4326a)',
  'linear-gradient(135deg,#46d39a,#14b8a6)',
]

function KpiCard({ label, value, sub, color = '#3ee2ff', icon: Icon, rows = [], valueLabel = 'Total Value' }) {
  return (
    <div className="kpi">
      <div className="kpi__head">
        <div className="kpi__badge">
          <div className="kpi__badge-icon" style={{ background: `${color}20`, color }}>
            {Icon && <Icon size={16} />}
          </div>
          <div className="kpi__badge-text">
            <span className="kpi__badge-eyebrow">{sub}</span>
            <span className="kpi__badge-title">{label}</span>
          </div>
        </div>
        <button className="icon-btn"><I.ArrowRight size={14} /></button>
      </div>

      <div className="kpi__label">{valueLabel}</div>
      <div className="kpi__value">{value}</div>

      <div className="kpi__rows">
        {rows.length > 0 ? rows.map((r, i) => (
          <div key={i} className="kpi__row">
            <span className="kpi__row-dot" style={{ background: color }} />
            <span className="kpi__row-label">{r.label}</span>
            <span className="kpi__row-code">{r.code}</span>
            <span className="kpi__row-val">{r.val}</span>
          </div>
        )) : (
          <div style={{ padding: '10px 0', fontSize: 11, color: 'var(--on-dark-muted)', textAlign: 'center' }}>
            No data yet
          </div>
        )}
      </div>
    </div>
  )
}


function FeaturedFreshCard({ listing, setPage, setListingId }) {
  if (!listing) return null

  const name     = listing.speciesName ?? listing.title ?? 'Fresh Catch'
  const vendor   = listing.vendorName ?? 'Vendor'
  const price    = listing.pricePerKg ?? 0
  const availKg  = listing.availableKg ?? 0
  const hasDelivery = (listing.deliveryFee ?? 0) > 0

  // Derive hours since listing was created (proxy for harvest age)
  const createdAt  = listing.createdAt ? new Date(listing.createdAt) : null
  const hoursAgo   = createdAt ? Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 3_600_000)) : 0
  const hoursLabel = hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`

  // Freshness degrades from 96 → ~10 over 48 h
  const freshnessScore  = Math.max(10, Math.min(100, Math.round(96 - hoursAgo * 1.8)))
  const waveformProgress = Math.min(0.95, hoursAgo / 48)
  const primeHoursLeft  = Math.max(0, 18 - hoursAgo)
  const gradeLabel = freshnessScore >= 90 ? 'A-Grade' : freshnessScore >= 75 ? 'B-Grade' : 'C-Grade'
  const gradeTag   = freshnessScore >= 85 ? 'PRIME GRADE' : freshnessScore >= 70 ? 'GOOD GRADE' : 'FAIR GRADE'

  const logisticsLabel = hasDelivery ? `Delivery ₱${listing.deliveryFee}` : 'Pickup only'
  const dispatchLabel  = hasDelivery ? 'Delivery available' : 'Pickup at port'

  return (
    <div className="detail-card-v2 feature-anim">
      <div className="detail-card-v2__left">
        <div className="detail-card-v2__head">
          <span className="detail-card-v2__heading">Featured Fresh</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="icon-btn"><I.Share size={14} /></button>
            <button className="icon-btn"><I.Star size={14} /></button>
          </div>
        </div>
        <div className="detail-card-v2__meta">
          <span className="detail-card-v2__updated">
            Listed {hoursLabel} · {hasDelivery ? `Delivery ₱${listing.deliveryFee}` : 'Pickup only'}
          </span>
          <div className="detail-card-v2__title-row">
            <div className="species-mark-v2"><I.Anchor size={18} /></div>
            <h2 className="detail-card-v2__title"><em>{name}</em></h2>
            <button className="profile-link" onClick={() => setPage('bvendors')}>
              <I.Store size={11} /> {vendor}
            </button>
          </div>
        </div>
        <div>
          <div className="balance-label-v2">Vendor Price</div>
          <div className="balance-value-v2">₱{price} <small>/kg</small></div>
        </div>
        <div className="balance-actions-v2">
          <button className="btn-v2 btn-v2--lime" onClick={() => { setListingId && setListingId(listing.id); setPage('blisting') }}>
            Buy now <I.ArrowRight size={14} />
          </button>
          <button className="btn-v2"><I.Cart size={14} /> Add to cart</button>
        </div>
      </div>

      <div className="detail-card-v2__right">
        <div className="period-head-v2">
          <div>
            <div className="period-title">Freshness Window</div>
            <div className="period-sub">Time remaining in prime state</div>
          </div>
          <span className="period-pill">{primeHoursLeft > 0 ? `T-Minus ${primeHoursLeft}h` : 'Peak passed'}</span>
        </div>
        <div className="period-tag">{gradeTag}</div>
        <WaveformChart progress={waveformProgress} score={freshnessScore} />
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div className="metrics-row-v2 metric-anim">
          <div className="metric-col-v2">
            <div className="metric-col-v2__head">
              <div>
                <div className="metric-col-v2__label">Quality Score</div>
                <div className="metric-col-v2__sub">Based on harvest age</div>
              </div>
              <I.Award size={14} className="muted-v2" />
            </div>
            <div className="metric-card-v2">
              <div className="metric-card-v2__head">
                <span className="metric-card-v2__title">SCORE</span>
                <span className="metric-card-v2__chip">{freshnessScore}/100</span>
              </div>
              <div className="metric-card-v2__value">{gradeLabel}</div>
              <div className="metric-card-v2__bar">
                <div className="metric-card-v2__bar-fill" style={{ width: `${freshnessScore}%` }} />
              </div>
            </div>
          </div>

          <div className="metric-col-v2">
            <div className="metric-col-v2__head">
              <div>
                <div className="metric-col-v2__label">Vendor</div>
                <div className="metric-col-v2__sub">Storefront seller</div>
              </div>
              <I.Store size={14} className="muted-v2" />
            </div>
            <div className="metric-card-v2">
              <div className="metric-card-v2__head">
                <span className="metric-card-v2__title">SELLER</span>
                <span className="metric-card-v2__chip" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {vendor.split(' ')[0]}
                </span>
              </div>
              <div className="metric-card-v2__value" style={{ fontSize: 14 }}>{vendor}</div>
              <div className="metric-card-v2__inline" style={{ marginTop: 6 }}>
                <I.Star size={10} style={{ color: 'var(--warning)' }} /> Verified vendor
              </div>
            </div>
          </div>

          <div className="metric-col-v2">
            <div className="metric-col-v2__head">
              <div>
                <div className="metric-col-v2__label">Logistics</div>
                <div className="metric-col-v2__sub">Delivery info</div>
              </div>
              <I.MapPin size={14} className="muted-v2" />
            </div>
            <div className="metric-card-v2">
              <div className="metric-card-v2__head">
                <span className="metric-card-v2__title">DELIVERY</span>
                <span className="metric-card-v2__chip">{hasDelivery ? `₱${listing.deliveryFee}` : 'Pickup'}</span>
              </div>
              <div className="metric-card-v2__value" style={{ fontSize: 15 }}>{logisticsLabel}</div>
              <div className="metric-card-v2__inline" style={{ marginTop: 6 }}>
                <I.Truck size={12} /> <strong>{dispatchLabel}</strong>
              </div>
            </div>
          </div>

          <div className="metric-col-v2">
            <div className="metric-col-v2__head">
              <div>
                <div className="metric-col-v2__label">Stock</div>
                <div className="metric-col-v2__sub">Current inventory</div>
              </div>
              <I.Activity size={14} className="muted-v2" />
            </div>
            <div className="metric-card-v2">
              <div className="metric-card-v2__head">
                <span className="metric-card-v2__title">AVAILABLE</span>
                <span className="metric-card-v2__chip">{availKg.toFixed(1)}kg</span>
              </div>
              <div className="metric-card-v2__value">
                {availKg.toFixed(1)} <span style={{ fontSize: 13, color: 'var(--on-dark-muted)' }}>kg left</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <MiniBars data={[2,3,5,8,4,9,7,10]} color="var(--warning)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BuyerOrdersCard({ orders, setPage }) {
  const [tab, setTab] = useState('All')
  const tabs = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled']
  
  const filtered = tab === 'All' ? orders : orders.filter(o => o.status.toLowerCase() === tab.toLowerCase())

  return (
    <div className="s-card orders-card-v2 order-anim">
      <div className="orders-card-v2__head">
        <div className="row-v2">
          <div className="s-card__title">Recent Orders</div>
          <div className="orders-card-v2__tabs">
            {tabs.map(t => {
              const count = t === 'All' ? orders.length : orders.filter(o => o.status.toLowerCase() === t.toLowerCase()).length
              return (
                <button 
                  key={t}
                  className={`orders-tab-v2 ${tab === t ? 'orders-tab-v2--on' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t} <span className="orders-tab-v2__count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="row-v2">
          <button className="icon-btn"><I.Filter size={14} /></button>
          <button className="btn-v2 btn-v2--ghost btn-v2--sm" onClick={() => setPage('borders')}>View all <I.ArrowRight size={11} /></button>
        </div>
      </div>
      
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-dark-muted)' }}>
          <I.Clipboard size={32} style={{ opacity: 0.5, marginBottom: 10 }} />
          <div>No orders match this status</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl-v2">
            <thead>
              <tr>
                <th>Order Code</th>
                <th>Species / Vendor</th>
                <th>Quantity</th>
                <th>Total Value</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 5).map(o => {
                const qty   = o.orderedQtyKg ?? o.qtyKg ?? 0
                const price = o.agreedPricePerKg ?? o.pricePerKg ?? 0
                return (
                  <tr key={o.id} onClick={() => setPage('borders')}>
                    <td><span className="kbd-mono">{o.orderCode ?? `ORD-${o.id}`}</span></td>
                    <td>
                      <div className="cell-species-v2">
                        <div className="cell-species-v2__avatar" style={{ background: AVATAR_GRADS[o.id % 5] }}>
                          {(o.speciesName ?? 'F').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="cell-species-v2__main">
                          <span className="cell-species-v2__name">{o.speciesName ?? '—'}</span>
                          <span className="cell-species-v2__buyer">{o.vendorName ?? '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-mono-v2">{qty} kg</td>
                    <td className="cell-money-v2">₱{(qty * price).toLocaleString()}</td>
                    <td><span className={CHIP_STATUS[o.status] ?? 'status-chip-v2'}>{o.status}</span></td>
                    <td><I.ArrowRight size={14} className="muted-v2" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MarineAdvisoryCard() {
  return (
    <div className="s-card advisory-v2 adv-anim">
      <div className="s-card__head">
        <div>
          <div className="s-card__title">Marine Advisory</div>
          <div className="s-card__sub">Live conditions for Manila Bay</div>
        </div>
        <button className="icon-btn"><I.Settings size={14} /></button>
      </div>
      
      <div className="advisory-v2__hero">
        <div className="advisory-v2__hero-head">
          <span className="advisory-v2__live">LIVE</span>
          <span className="advisory-v2__hero-zone">ZONE 4A</span>
        </div>
        <div className="advisory-v2__hero-state">
          <span className="state-dot state-dot--safe" /> ALL CLEAR
        </div>
        
        <div className="advisory-v2__hero-metrics">
          <div>
            <div className="advisory-stat__label">Wind</div>
            <div className="advisory-stat__value">12 <small>knots</small></div>
          </div>
          <div>
            <div className="advisory-stat__label">Swell</div>
            <div className="advisory-stat__value">0.8 <small>m</small></div>
          </div>
          <div>
            <div className="advisory-stat__label">Tide</div>
            <div className="advisory-stat__value">High <small>+1.2</small></div>
          </div>
          <div>
            <div className="advisory-stat__label">Temp</div>
            <div className="advisory-stat__value">28 <small>°C</small></div>
          </div>
          <div>
            <div className="advisory-stat__label">Vis</div>
            <div className="advisory-stat__value">10 <small>km</small></div>
          </div>
          <div>
            <div className="advisory-stat__label">Rain</div>
            <div className="advisory-stat__value">0 <small>mm</small></div>
          </div>
        </div>
      </div>
      
      <div className="advisory-v2__list adv-list-anim">
        <div className="advisory-row-v2">
          <div className="advisory-row-v2__icon advisory-row-v2__icon--info"><I.Wind size={14} /></div>
          <div className="advisory-row-v2__main">
            <div className="advisory-row-v2__title">Optimal conditions</div>
            <div className="advisory-row-v2__sub">Favorable for coastal dispatch</div>
          </div>
          <div className="advisory-row-v2__time">1h ago</div>
        </div>
        <div className="advisory-row-v2">
          <div className="advisory-row-v2__icon advisory-row-v2__icon--warn"><I.Alert size={14} /></div>
          <div className="advisory-row-v2__main">
            <div className="advisory-row-v2__title">Gale warning lifted</div>
            <div className="advisory-row-v2__sub">Northern seaboards clear</div>
          </div>
          <div className="advisory-row-v2__time">3h ago</div>
        </div>
      </div>
    </div>
  )
}

function MarketplaceGrid({ listings, setPage }) {
  return (
    <div className="s-card grid-anim">
      <div className="s-card__head">
        <div>
          <div className="s-card__title">Marketplace Discoveries</div>
          <div className="s-card__sub">Curated catches from your preferred zones</div>
        </div>
        <button className="btn-v2 btn-v2--ghost btn-v2--sm" onClick={() => setPage('bbrowse')}>Browse all <I.ArrowRight size={11} /></button>
      </div>
      
      <div className="catch-grid-v2">
        {listings.map((f, i) => {
          const name = f.speciesName ?? f.species?.commonName ?? 'Fish'
          return (
            <div key={f.id ?? i} className="catch-card-v2" onClick={() => setPage('bbrowse')}>
              <div className="catch-card-v2__head">
                <span className="catch-card-v2__id">ID:{f.id}</span>
                <span className="spacer-v2" />
                <span className="catch-card-v2__match">98% Match</span>
              </div>
              <div className="catch-card-v2__species">{name}</div>
              <div className="catch-card-v2__fisherman"><I.User size={10} /> {f.vendorName ?? 'OceanCatch'}</div>
              <div className="catch-card-v2__zone"><I.MapPin size={10} /> Zone 4A • 12km</div>
              <div className="catch-card-v2__bottom">
                <div className="catch-card-v2__qty">{f.availableKg ?? 50} <small>kg</small></div>
                <div className="catch-card-v2__price">₱{f.pricePerKg}/kg</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActivityCard({ activity }) {
  return (
    <div className="s-card act-anim">
      <div className="s-card__head">
        <div>
          <div className="s-card__title">Activity Feed</div>
          <div className="s-card__sub">Latest updates across your workspace</div>
        </div>
      </div>
      
      {activity.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-dark-muted)' }}>
          <I.Bell size={32} style={{ opacity: 0.5, marginBottom: 10 }} />
          <div>No recent activity</div>
        </div>
      ) : (
        <div className="activity-v2">
          {activity.map((a, i) => (
            <div key={a.id ?? i} className="activity-v2__row">
              <div className="activity-v2__icon activity-v2__icon--system">
                <I.Bell size={14} />
              </div>
              <div className="activity-v2__main">
                <div className="activity-v2__title">{a.title}</div>
                <div className="activity-v2__time">
                  {a.occurredAt ? new Date(a.occurredAt).toLocaleDateString() : 'Just now'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home({ setPage, setListingId }) {
  const { user } = useAuth()
  const comp = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['buyerHome'],
    queryFn: fetchBuyerHome
  })

  // GSAP Animations
  useEffect(() => {
    if (isLoading) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      
      tl.fromTo('.page-head-anim', 
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      )
      .fromTo('.kpi-anim',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.07 },
        "-=0.4"
      )
      .fromTo('.feature-anim',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.3"
      )
      .fromTo('.metric-anim .metric-col-v2',
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06 },
        "-=0.2"
      )
      .fromTo('.order-anim',
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.3"
      )
      .fromTo('.adv-anim',
        { scale: 0.98, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6 },
        "-=0.5"
      )
      .fromTo('.adv-list-anim .advisory-row-v2',
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05 },
        "-=0.3"
      )
      .fromTo('.grid-anim',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        "-=0.2"
      )
      .fromTo('.saved-anim',
        { x: 10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5 },
        "-=0.5"
      )
      .fromTo('.act-anim',
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        "-=0.3"
      )
    }, comp)
    return () => ctx.revert()
  }, [isLoading])

  if (isLoading) return <div style={{ padding: 40, color: 'var(--on-dark-muted)' }}>Loading dashboard...</div>
  if (error) return <div style={{ padding: 40, color: 'var(--danger)' }}>Failed to load dashboard data</div>

  const { stats, recentOrders = [], freshListings = [], activity = [] } = data || {}

  const totalSpend = recentOrders.reduce(
    (sum, o) => sum + (o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0), 0
  )

  const orderRows = recentOrders.slice(0, 3).map(o => ({
    label: o.species?.commonName ?? '—',
    code:  (o.status ?? 'ORD').slice(0, 4),
    val:   o.orderedQtyKg
      ? `₱${Math.round((o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)).toLocaleString()}`
      : '—',
  }))

  const pendingRows = recentOrders
    .filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED')
    .slice(0, 3)
    .map(o => ({
      label: o.species?.commonName ?? '—',
      code:  (o.seller?.fullName ?? 'VNDR').split(' ')[0].slice(0, 4).toUpperCase(),
      val:   o.orderedQtyKg ? `${o.orderedQtyKg}kg` : '—',
    }))

  const spendRows = [...recentOrders]
    .sort((a, b) =>
      ((b.orderedQtyKg ?? 0) * (b.agreedPricePerKg ?? 0)) -
      ((a.orderedQtyKg ?? 0) * (a.agreedPricePerKg ?? 0))
    )
    .slice(0, 3)
    .map(o => ({
      label: o.species?.commonName ?? '—',
      code:  (o.seller?.fullName ?? '?')
        .split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase(),
      val:   o.orderedQtyKg
        ? `₱${Math.round((o.orderedQtyKg ?? 0) * (o.agreedPricePerKg ?? 0)).toLocaleString()}`
        : '—',
    }))

  return (
    <div className="app__content" ref={comp}>
      <div className="page-head-anim">
        <PageHead
          eyebrow={<>Recommended for the next 24h &middot; 3 ports</>}
          title="Freshest"
          lime="catch"
          tools={
            <>
              <button className="filter-pill filter-pill--on"><I.Clock size={12} /> 24H</button>
              <button className="filter-pill"><I.MapPin size={12} /> Within 10km</button>
              <button className="filter-pill"><I.Star size={12} /> Recommended</button>
            </>
          }
        />
      </div>

      <div className="kpi-grid" style={{ marginTop: 24 }}>
        <div className="kpi-anim">
          <KpiCard
            icon={I.Clipboard} color="#5eead4"
            sub="Overview" label="Total Orders"
            value={stats?.recent30d ?? 0}
            valueLabel="Orders (30d)"
            rows={orderRows}
          />
        </div>
        <div className="kpi-anim">
          <KpiCard
            icon={I.Check} color="#3ee2ff"
            sub="Logistics" label="Pending Deliveries"
            value={stats?.pending ?? 0}
            valueLabel="Awaiting dispatch"
            rows={pendingRows}
          />
        </div>
        <div className="kpi-anim">
          <KpiCard
            icon={I.Wallet} color="#a78bfa"
            sub="Financials" label="Total Spend"
            value={`₱${Math.round(totalSpend).toLocaleString()}`}
            valueLabel="Across recent orders"
            rows={spendRows}
          />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <FeaturedFreshCard listing={freshListings[0]} setPage={setPage} setListingId={setListingId} />
      </div>

      <div className="split-3-v2" style={{ marginTop: 24 }}>
        <BuyerOrdersCard orders={recentOrders} setPage={setPage} />
        <MarineAdvisoryCard />
      </div>

      <div className="split-2-v2" style={{ marginTop: 24 }}>
        <MarketplaceGrid listings={freshListings.slice(0, 4)} setPage={setPage} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ActivityCard activity={activity} />
        </div>
      </div>
    </div>
  )
}
