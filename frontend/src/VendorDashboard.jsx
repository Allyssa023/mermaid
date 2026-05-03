import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import './handoff.css'
import { apiGet, apiPost, apiPut, apiDelete } from './api'
import { I } from './icons'
import Messages from './Messages'

// ─── Static demo data ─────────────────────────────────────────────────────────

const PRICE_INDEX = [
  { species: 'Yellowfin Tuna', tag: 'YT', current: 420, change: 2.3, series: [395,400,405,408,412,418,420] },
  { species: 'Skipjack',       tag: 'SK', current: 280, change: -1.5, series: [295,292,288,284,280,281,280] },
  { species: 'Mahi-mahi',      tag: 'MM', current: 350, change: 0.8,  series: [342,344,346,348,350,349,350] },
  { species: 'Spanish Mackerel', tag: 'SM', current: 310, change: 1.2, series: [300,302,304,306,308,309,310] },
]

const PROCUREMENT_14D = [20,35,55,45,70,30,80,50,65,40,90,75,60,95].map((kg, i) => ({
  day: i < 13 ? `${13-i}d` : 'T', kg
}))

// ─── Inline SVGs not in I ─────────────────────────────────────────────────────

const EditSvg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashSvg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)
const CloseSvg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/>
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDeadline(iso) {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso) - new Date()) / 86400000)
  if (diff < 0)   return { label: 'Overdue',      urgent: true }
  if (diff === 0) return { label: 'Due today',    urgent: true }
  if (diff === 1) return { label: 'Due tomorrow', urgent: true }
  return { label: fmtDate(iso), urgent: false }
}

function fmtKg(v) {
  if (v == null) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v} kg`
}

function fmtRelative(iso) {
  if (!iso) return ''
  const diff = Math.floor((new Date() - new Date(iso)) / 60000)
  if (diff < 1)    return 'just now'
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function toLocalDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ h = 16, style }) {
  return <div className="skeleton" style={{ height: h, borderRadius: 6, ...style }} />
}

// ─── VendorRail ───────────────────────────────────────────────────────────────

function VendorRail({ user, activeNav, onNav, onLogout }) {
  const NAV = [
    { id: 'dashboard', icon: 'Dashboard', label: 'Dashboard'   },
    { id: 'listings',  icon: 'Store',     label: 'Listings'    },
    { id: 'interests', icon: 'Users',     label: 'Interests'   },
    { id: 'browse',    icon: 'Fish',      label: 'Browse'      },
    { id: 'orders',    icon: 'Clipboard', label: 'Orders'      },
    { id: 'messages',  icon: 'Message',   label: 'Messages'    },
  ]
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'VE'
  const firstName = user?.fullName?.split(' ')[0] || 'Vendor'

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {NAV.map(it => {
          const Icon = I[it.icon]
          return (
            <div
              key={it.id}
              className={`rail-item${activeNav === it.id ? ' rail-item--on' : ''}`}
              onClick={() => onNav(it.id)}
              data-tip={it.label}
            >
              <div className="rail-item__icon"><Icon size={18} /></div>
              <div className="rail-item__text">{it.label}</div>
            </div>
          )
        })}
        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onLogout} data-tip="Sign out">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Sign Out</div>
        </div>
        <div className="rail-item" data-tip="Help">
          <div className="rail-item__icon"><I.Help size={18} /></div>
          <div className="rail-item__text">Help</div>
        </div>
      </div>
      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{firstName}</span>
            <span className="rail__user-role">VENDOR</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── VendorTopbar ─────────────────────────────────────────────────────────────

function VendorTopbar({ page }) {
  const labels = {
    dashboard: 'Dashboard',
    listings:  'My Listings',
    interests: 'Interests',
    browse:    'Browse Catch Alerts',
    orders:    'Orders',
    messages:  'Messages',
  }
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <strong>{labels[page] || page}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search listings, advisories…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} />
      </button>
      <button className="topbar__icon-btn" title="Help">
        <I.Help size={16} />
      </button>
    </div>
  )
}

// ─── DashboardView ────────────────────────────────────────────────────────────

function DashboardView({ user, listings, advisories, interests, loading, onNewListing, onNavigate }) {
  const openListings   = listings.filter(l => l.status === 'OPEN')
  const totalDemandKg  = openListings.reduce((s, l) => s + (l.quantityKg || 0), 0)
  const firstName      = user?.fullName?.split(' ')[0] || 'Vendor'
  const newInterests   = interests.length
  const activeAdv      = advisories.length

  // Build activity from interests + advisories
  const activity = [
    ...interests.slice(0, 3).map(i => ({
      type: 'order',
      who: i.fishermanName || 'Fisherman',
      what: `expressed interest in your ${i.speciesName || 'listing'}`,
      ts: fmtRelative(i.createdAt),
    })),
    ...advisories.slice(0, 2).map(a => ({
      type: 'advisory',
      who: 'MERMAID System',
      what: a.title,
      ts: fmtRelative(a.createdAt || a.activeFrom),
    })),
  ].slice(0, 5)

  // Top suppliers from interests
  const supplierMap = {}
  interests.forEach(i => {
    const key = String(i.fishermanId || i.fishermanName)
    if (!supplierMap[key]) {
      supplierMap[key] = {
        id: key, name: i.fishermanName || '—',
        vessel: '—', port: '—',
        trades: 0, kg: 0, onTimePct: 93, rating: 4.7,
        last: fmtRelative(i.createdAt),
      }
    }
    supplierMap[key].trades++
    supplierMap[key].kg += 50
  })
  const suppliers = Object.values(supplierMap).slice(0, 5)

  const procMax = Math.max(...PROCUREMENT_14D.map(d => d.kg), 1)
  const alertItems = interests.slice(0, 4)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Procurement</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            {greeting()}, <em>{firstName}</em>
          </h1>
          <p className="page__sub">
            {openListings.length} open listings · {newInterests} new offers from fishermen.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => onNavigate('interests')}><I.Filter size={14} /> View interests</button>
          <button className="btn btn--primary" onClick={onNewListing}><I.Plus size={14} /> New demand listing</button>
        </div>
      </div>

      {/* Hero strip */}
      <div className="orders-strip orders-strip--6">
        <div className="stat"><div className="l">Open demand</div><div className="v">{loading ? '—' : totalDemandKg}<small>kg</small></div><div className="s">Across {openListings.length} listings</div></div>
        <div className="stat"><div className="l">Committed</div><div className="v">0<small>kg</small></div><div className="s">0% fulfilled</div></div>
        <div className="stat"><div className="l">New interests</div><div className="v">{loading ? '—' : newInterests}</div><div className="s">Awaiting your reply</div></div>
        <div className="stat"><div className="l">Pending orders</div><div className="v">0</div><div className="s">Awaiting confirm</div></div>
        <div className="stat"><div className="l">Handoffs</div><div className="v">0</div><div className="s">Need your confirmation</div></div>
        <div className="stat"><div className="l">Advisories</div><div className="v" style={{ color: activeAdv > 0 ? 'var(--unsafe)' : 'var(--ink)' }}>{loading ? '—' : activeAdv}</div><div className="s">Active now</div></div>
      </div>

      <div className="grid grid--2-1" style={{ marginTop: 18 }}>
        {/* Live fisherman interests / alerts */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent fisherman interests</div>
              <div className="card__sub">{newInterests} fishermen offering to fulfill your listings</div>
            </div>
            <button className="btn btn--sm" onClick={() => onNavigate('interests')}>View all <I.Arrow size={11} /></button>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[...Array(4)].map((_, i) => <Sk key={i} h={130} />)}
            </div>
          ) : alertItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)', fontSize: 13 }}>
              <p>No interests yet.</p>
              <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={onNewListing}>
                <I.Plus size={13} /> Post a listing
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {alertItems.map((item, idx) => (
                <div key={item.id || idx} className="alert-card">
                  <div className="alert-card__head">
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="kbd">INT-{String(item.id || idx + 1).padStart(3, '0')}</span>
                      </div>
                      <h3 className="alert-card__species" style={{ fontSize: 18 }}>{item.speciesName || '—'}</h3>
                      <div className="alert-card__sub">{item.fishermanName || '—'}</div>
                    </div>
                  </div>
                  <div className="alert-card__stats">
                    <div><div className="l">Listing</div><div className="v" style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{item.listingId ? `#${item.listingId}` : '—'}</div></div>
                    <div><div className="l">Status</div><div className="v" style={{ fontSize: 13 }}>{item.status || 'New'}</div></div>
                  </div>
                  <div className="alert-card__foot">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{fmtRelative(item.createdAt)}</span>
                    <button className="btn btn--accent btn--sm">Reply</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price index */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Price index · 7-day</div>
              <div className="card__sub">₱/kg · regional average</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRICE_INDEX.map(p => {
              const min = Math.min(...p.series)
              const max = Math.max(...p.series)
              const range = max - min || 1
              return (
                <div key={p.species} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.species}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{p.tag}</div>
                  </div>
                  <svg width="64" height="22" style={{ flexShrink: 0 }}>
                    <polyline
                      fill="none"
                      stroke={p.change > 0 ? 'var(--safe)' : p.change < 0 ? 'var(--unsafe)' : 'var(--ink-4)'}
                      strokeWidth="1.5"
                      points={p.series.map((v, i) => `${i / 6 * 60 + 2},${20 - (v - min) / range * 16}`).join(' ')} />
                  </svg>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>₱{p.current}</div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: p.change > 0 ? 'var(--safe)' : p.change < 0 ? 'var(--unsafe)' : 'var(--ink-4)' }}>
                      {p.change > 0 ? '↑' : p.change < 0 ? '↓' : '·'} {Math.abs(p.change).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid--2-1" style={{ marginTop: 18 }}>
        {/* Procurement chart */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Procurement · 14 days</div>
              <div className="card__sub">kg received per day</div>
            </div>
            <span className="chip chip--ink">{PROCUREMENT_14D.reduce((a, d) => a + d.kg, 0)}kg total</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
            {PROCUREMENT_14D.map((d, i) => {
              const h = (d.kg / procMax) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: i === PROCUREMENT_14D.length - 1 ? 'var(--accent)' : 'var(--ink-soft)',
                    borderRadius: '3px 3px 0 0', minHeight: 4,
                  }} />
                  <div style={{ fontSize: 9, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{d.day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity */}
        <div className="card">
          <div className="card__head">
            <div className="card__title">Activity</div>
          </div>
          {activity.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', padding: '8px 0' }}>No recent activity.</p>
          ) : (
            <ul className="activity">
              {activity.map((a, i) => (
                <li key={i} className="activity__item">
                  <span className={`activity__dot activity__dot--${a.type}`} />
                  <div className="activity__body">
                    <div className="activity__line"><strong>{a.who}</strong> <span>{a.what}</span></div>
                    <div className="activity__time">{a.ts}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Top suppliers */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Top suppliers</div>
            <div className="card__sub">Fishermen who've expressed interest · ranked by volume</div>
          </div>
          <button className="btn btn--sm" onClick={() => onNavigate('interests')}>View all</button>
        </div>
        {suppliers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '16px 0' }}>
            No suppliers yet. Post listings to receive offers from fishermen.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Fisherman</th><th>Vessel · Port</th><th>Interests</th><th>Est. Volume</th><th>On-time</th><th>Rating</th><th>Last contact</th><th></th></tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="row--link">
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{s.name}</td>
                  <td><div style={{ fontSize: 13 }}>{s.vessel}</div><small style={{ color: 'var(--ink-4)' }}>{s.port}</small></td>
                  <td className="data">{s.trades}</td>
                  <td className="data">{s.kg}kg</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="data">{s.onTimePct}%</span>
                      <div style={{ width: 50, height: 4, background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${s.onTimePct}%`, height: '100%', background: s.onTimePct >= 90 ? 'var(--safe)' : 'var(--warn)' }} />
                      </div>
                    </div>
                  </td>
                  <td className="data">★ {s.rating}</td>
                  <td style={{ color: 'var(--ink-4)' }}>{s.last}</td>
                  <td><button className="btn btn--sm">Message</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ListingsView ─────────────────────────────────────────────────────────────

function ListingsView({ listings, loading, error, onReload, onAdd, onEdit, onClose, onDelete }) {
  const [filter, setFilter] = useState('all')
  const open     = listings.filter(l => l.status === 'OPEN')
  const filtered = filter === 'all' ? listings : listings.filter(l => l.status === (filter === 'open' ? 'OPEN' : 'CLOSED'))
  const totalKg    = open.reduce((a, l) => a + (l.quantityKg || 0), 0)
  const fulfilledKg = open.reduce((a, l) => a + (l.fulfilledKg || 0), 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Procurement</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Demand <em>Listings</em></h1>
          <p className="page__sub">Tell fishermen what species you need, the price you'll offer, and your timeline.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={onAdd}><I.Plus size={14} /> New listing</button>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Total listings</div><div className="v">{listings.length}</div><div className="s">{open.length} open · {listings.length - open.length} closed</div></div>
        <div className="stat"><div className="l">Open demand</div><div className="v">{totalKg}<small>kg</small></div><div className="s">Across {open.length} active</div></div>
        <div className="stat"><div className="l">Committed</div><div className="v">{fulfilledKg}<small>kg</small></div><div className="s">{totalKg > 0 ? Math.round(fulfilledKg / totalKg * 100) : 0}% fulfilled</div></div>
        <div className="stat"><div className="l">Total interest</div><div className="v">0</div><div className="s">From fishermen</div></div>
      </div>

      {error && (
        <div className="page-error">
          <I.Alert size={16} /> {error}
          <button className="page-error__retry" onClick={onReload}>Retry</button>
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={filter === 'all'    ? 'on' : ''} onClick={() => setFilter('all')}>All ({listings.length})</button>
            <button className={filter === 'open'   ? 'on' : ''} onClick={() => setFilter('open')}>Open ({open.length})</button>
            <button className={filter === 'closed' ? 'on' : ''} onClick={() => setFilter('closed')}>Closed ({listings.length - open.length})</button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--ghost btn--sm">Sort: Newest</button>
          </div>
        </div>

        {loading ? (
          <div className="listings-grid">
            {[...Array(6)].map((_, i) => <Sk key={i} h={240} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>
            <I.Store size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{filter === 'all' ? 'No listings yet.' : `No ${filter} listings.`}</p>
            {filter === 'all' && <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={onAdd}><I.Plus size={14} /> Post First Listing</button>}
          </div>
        ) : (
          <div className="listings-grid">
            {filtered.map(l => {
              const dl    = fmtDeadline(l.neededBy)
              const isOpen = l.status === 'OPEN'
              return (
                <div key={l.id} className={`listing-card${dl?.urgent && isOpen ? ' listing-card--urgent' : ''}${!isOpen ? ' listing-card--closed' : ''}`}>
                  <div className="listing-card__head">
                    <div>
                      <span className="kbd">#{l.id}</span>
                      {dl?.urgent && isOpen && <span className="chip chip--unsafe" style={{ marginLeft: 6 }}>Urgent</span>}
                      {!isOpen && <span className="chip" style={{ marginLeft: 6 }}>Closed</span>}
                    </div>
                    <div className="tbl-actions">
                      {isOpen && <button className="tbl-btn" title="Edit" onClick={() => onEdit(l)}><EditSvg /></button>}
                      {isOpen && <button className="tbl-btn" title="Close" onClick={() => onClose(l.id)}><CloseSvg /></button>}
                      <button className="tbl-btn tbl-btn--danger" title="Delete" onClick={() => onDelete(l)}><TrashSvg /></button>
                    </div>
                  </div>
                  <h3 className="listing-card__species">{l.fishSpecies?.commonName || '—'}</h3>
                  <div className="listing-card__sci">{l.fishSpecies?.scientificName || ''}</div>
                  <div className="listing-card__price">
                    <span className="big">₱{l.offerPricePerKg}</span><span>/kg</span>
                  </div>
                  <div className="listing-card__meta">
                    <div><div className="l">Quantity</div><div className="v">{l.quantityKg}<small>kg</small></div></div>
                    <div><div className="l">Needed by</div><div className="v" style={{ fontSize: 14, color: dl?.urgent ? 'var(--unsafe)' : 'var(--ink)' }}>{dl?.label || '—'}</div></div>
                    <div><div className="l">Interests</div><div className="v">0</div></div>
                  </div>
                  {isOpen && (l.fulfilledKg || 0) > 0 && (
                    <div className="listing-card__progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(l.fulfilledKg / l.quantityKg) * 100}%` }} />
                      </div>
                      <div className="progress-label">
                        <span>{l.fulfilledKg}/{l.quantityKg}kg committed</span>
                        <span>{Math.round((l.fulfilledKg / l.quantityKg) * 100)}%</span>
                      </div>
                    </div>
                  )}
                  {l.notes && <div className="listing-card__notes">"{l.notes}"</div>}
                  <div className="listing-card__foot">
                    <span className="muted-data"><I.MapPin size={11} /> {l.marketLocation?.municipality || l.marketLocation?.name || '—'}</span>
                    {isOpen ? (
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => onEdit(l)}>Edit</button>
                        <button className="btn btn--sm">View interests</button>
                      </div>
                    ) : (
                      <button className="btn btn--ghost btn--sm">Re-open</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── VendorInterestsView ──────────────────────────────────────────────────────

function VendorInterestsView({ interests, listings, loading, onNavigate }) {
  const grouped = listings
    .filter(l => l.status === 'OPEN')
    .map(l => ({
      listing: l,
      items: interests.filter(i => String(i.listingId) === String(l.id)),
    }))
    .filter(g => g.items.length > 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Listing <em>Interests</em></h1>
          <p className="page__sub">{interests.length} fishermen offering to fulfill your demand listings.</p>
        </div>
        <div className="page__actions">
          <button className="btn">Mark all read</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
          {[...Array(3)].map((_, i) => <Sk key={i} h={80} />)}
        </div>
      ) : interests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
          <I.Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No interests yet. Post open listings to receive offers.</p>
          <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => onNavigate('listings')}>
            <I.Plus size={14} /> Post a listing
          </button>
        </div>
      ) : grouped.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          {grouped.map(g => (
            <div className="card" key={g.listing.id}>
              <div className="card__head">
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="kbd">#{g.listing.id}</span>
                    <span className="card__title">{g.listing.fishSpecies?.commonName || '—'}</span>
                  </div>
                  <div className="card__sub">
                    {g.listing.quantityKg}kg @ ₱{g.listing.offerPricePerKg}/kg · {g.items.length} {g.items.length === 1 ? 'fisherman' : 'fishermen'} interested
                  </div>
                </div>
                <button className="btn btn--ghost btn--sm">View listing</button>
              </div>
              <div className="interests-list">
                {g.items.map((item, idx) => (
                  <div key={item.id || idx} className="interest-item">
                    <div className="interest-item__avatar">
                      {(item.fishermanName || '??').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="interest-item__body">
                      <div className="interest-item__head">
                        <strong>{item.fishermanName || '—'}</strong>
                        <span className="muted-data">{fmtRelative(item.createdAt)}</span>
                      </div>
                      {item.message && <p className="interest-item__msg">"{item.message}"</p>}
                    </div>
                    <div className="interest-item__actions">
                      <button className="btn btn--ghost btn--sm">Message</button>
                      <button className="btn btn--accent btn--sm">Place order</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="interests-list">
            {interests.map((item, idx) => (
              <div key={item.id || idx} className="interest-item">
                <div className="interest-item__avatar">
                  {(item.fishermanName || '??').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="interest-item__body">
                  <div className="interest-item__head">
                    <strong>{item.fishermanName || '—'}</strong>
                    <span className="muted-data">{fmtRelative(item.createdAt)}</span>
                  </div>
                  {item.message && <p className="interest-item__msg">"{item.message}"</p>}
                </div>
                <div className="interest-item__actions">
                  <button className="btn btn--ghost btn--sm">Message</button>
                  <button className="btn btn--accent btn--sm">Place order</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── VendorBrowseView ─────────────────────────────────────────────────────────

function VendorBrowseView({ token }) {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [sortBy, setSortBy]   = useState('match')

  useEffect(() => {
    apiGet('/buyer/marketplace/listings', token)
      .then(d => setAlerts(d?.content || d || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [token])

  const sorted = [...alerts].sort((a, b) => {
    if (sortBy === 'price') return (a.offerPricePerKg || 0) - (b.offerPricePerKg || 0)
    if (sortBy === 'qty')   return (b.quantityKg || 0) - (a.quantityKg || 0)
    return 0
  })

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Live marketplace</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Catch <em>Alerts</em></h1>
          <p className="page__sub">{alerts.length} active listings in your region.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Filter</button>
          <button className="btn btn--primary"><I.MapPin size={14} /> Map view</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={filter === 'all'    ? 'on' : ''} onClick={() => setFilter('all')}>All ({alerts.length})</button>
            <button className={filter === 'urgent' ? 'on' : ''} onClick={() => setFilter('urgent')}>Urgent</button>
          </div>
          <div className="seg">
            <button className={sortBy === 'match' ? 'on' : ''} onClick={() => setSortBy('match')}>Match</button>
            <button className={sortBy === 'price' ? 'on' : ''} onClick={() => setSortBy('price')}>Price</button>
            <button className={sortBy === 'qty'   ? 'on' : ''} onClick={() => setSortBy('qty')}>Quantity</button>
          </div>
        </div>

        {loading ? (
          <div className="alerts-grid">
            {[...Array(4)].map((_, i) => <Sk key={i} h={160} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
            <I.Fish size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No catch alerts available right now.</p>
          </div>
        ) : (
          <div className="alerts-grid">
            {sorted.map(a => (
              <div key={a.id} className="alert-card">
                <div className="alert-card__head">
                  <div>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="kbd">#{a.id}</span>
                    </div>
                    <h3 className="alert-card__species">{a.fishSpecies?.commonName || '—'}</h3>
                    <div className="alert-card__sub">{a.vendorName || '—'}</div>
                  </div>
                </div>
                <div className="alert-card__stats">
                  <div><div className="l">Quantity</div><div className="v">{a.quantityKg || '—'}<small>kg</small></div></div>
                  <div><div className="l">Asking</div><div className="v">₱{a.offerPricePerKg || '—'}<small>/kg</small></div></div>
                  <div><div className="l">Total</div><div className="v" style={{ fontSize: 14 }}>₱{((a.quantityKg || 0) * (a.offerPricePerKg || 0)).toLocaleString()}</div></div>
                </div>
                <div className="alert-card__bar">
                  <span><I.MapPin size={11} /> {a.marketLocation?.name || '—'}</span>
                  {a.neededBy && <span style={{ color: 'var(--ink-3)' }}><I.Clock size={11} /> {fmtDate(a.neededBy)}</span>}
                </div>
                <div className="alert-card__foot">
                  <button className="btn btn--ghost btn--sm">Message</button>
                  <button className="btn btn--accent btn--sm">Make offer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── VendorOrdersView ─────────────────────────────────────────────────────────

function VendorOrdersView({ token }) {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('active')

  useEffect(() => {
    apiGet('/vendor/orders', token)
      .then(d => setOrders(d?.content || d || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [token])

  const active    = orders.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status))
  const completed = orders.filter(o => o.status === 'COMPLETED')
  const issues    = orders.filter(o => ['DISPUTED', 'CANCELLED'].includes(o.status))
  const filtered  = tab === 'active' ? active : tab === 'completed' ? completed : issues

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchase orders</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Orders</em></h1>
          <p className="page__sub">{orders.length} orders · {active.length} active.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={tab === 'active'    ? 'on' : ''} onClick={() => setTab('active')}>Active ({active.length})</button>
            <button className={tab === 'completed' ? 'on' : ''} onClick={() => setTab('completed')}>Completed ({completed.length})</button>
            <button className={tab === 'issues'    ? 'on' : ''} onClick={() => setTab('issues')}>Issues ({issues.length})</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => <Sk key={i} h={44} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
            <I.Clipboard size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p>No {tab} orders.</p>
          </div>
        ) : (
          <table className="tbl tbl--orders">
            <thead>
              <tr><th>Order</th><th>Seller</th><th>Species</th><th>Qty</th><th>Total</th><th>Dispatch</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="row--link">
                  <td>
                    <div style={{ fontWeight: 500 }}>{o.orderCode || `#${o.id}`}</div>
                    <small style={{ color: 'var(--ink-4)' }}>{fmtDate(o.createdAt)}</small>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{o.seller?.fullName || '—'}</div>
                    <small style={{ color: 'var(--ink-4)' }}>{o.seller?.vessel || ''}</small>
                  </td>
                  <td>{o.species?.commonName || o.fishSpecies?.commonName || '—'}</td>
                  <td className="data">{o.orderedQtyKg || '—'}<small>kg</small></td>
                  <td className="data">₱{((o.agreedPricePerKg || 0) * (o.orderedQtyKg || 0)).toLocaleString()}</td>
                  <td><span className="chip">{o.dispatchMode || '—'}</span></td>
                  <td>
                    <span className={`status status--${(o.status || '').toLowerCase()}`}>
                      <span className="status__dot" /> {o.status}
                    </span>
                  </td>
                  <td><button className="btn btn--ghost btn--sm"><I.ChevR size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ListingFormModal ─────────────────────────────────────────────────────────

function ListingFormModal({ listing, species, locations, token, onSuccess, onClose }) {
  const isEdit = !!listing

  const [speciesId,       setSpeciesId]       = useState(listing?.fishSpecies?.id    ?? '')
  const [locationId,      setLocationId]      = useState(listing?.marketLocation?.id  ?? '')
  const [quantityKg,      setQuantityKg]      = useState(listing?.quantityKg          ?? '')
  const [offerPricePerKg, setOfferPricePerKg] = useState(listing?.offerPricePerKg     ?? '')
  const [notes,           setNotes]           = useState(listing?.notes                ?? '')
  const [neededBy,        setNeededBy]        = useState(toLocalDatetimeInput(listing?.neededBy))
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState(null)

  async function submit() {
    setError(null)
    if (!speciesId)  { setError('Please select a fish species'); return }
    if (!locationId) { setError('Please select a market location'); return }
    if (!quantityKg || Number(quantityKg) <= 0) { setError('Quantity must be greater than 0'); return }
    if (!offerPricePerKg || Number(offerPricePerKg) < 0) { setError('Price must be 0 or greater'); return }

    setSubmitting(true)
    const body = {
      speciesId:       Number(speciesId),
      locationId:      Number(locationId),
      quantityKg:      Number(quantityKg),
      offerPricePerKg: Number(offerPricePerKg),
      notes:    notes.trim() || null,
      neededBy: neededBy ? new Date(neededBy).toISOString() : null,
    }
    try {
      const result = isEdit
        ? await apiPut(`/vendor/demand-listings/${listing.id}`, token, body)
        : await apiPost('/vendor/demand-listings', token, body)
      onSuccess(result, isEdit)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">{isEdit ? 'Edit listing' : 'New demand listing'}</div>
            <h2 className="modal__title" style={{ marginTop: 4 }}>{isEdit ? 'Edit listing' : 'What do you need?'}</h2>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose}><I.X size={14} /></button>
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--unsafe)', fontFamily: 'var(--font-mono)', padding: '0 0 12px' }}>{error}</div>}
        <div className="form-grid">
          <div className="form-row form-row--2col">
            <div>
              <label>Species *</label>
              <select className="input" value={speciesId} onChange={e => setSpeciesId(e.target.value)}>
                <option value="">Select species…</option>
                {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
              </select>
            </div>
            <div>
              <label>Drop-off location *</label>
              <select className="input" value={locationId} onChange={e => setLocationId(e.target.value)}>
                <option value="">Select location…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row form-row--2col">
            <div>
              <label>Quantity (kg) *</label>
              <input className="input" type="number" min="0.1" step="0.1" placeholder="e.g. 200"
                value={quantityKg} onChange={e => setQuantityKg(e.target.value)} />
            </div>
            <div>
              <label>Offer price ₱/kg *</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 85"
                value={offerPricePerKg} onChange={e => setOfferPricePerKg(e.target.value)} />
            </div>
          </div>
          <div>
            <label>Needed by (optional)</label>
            <input className="input" type="datetime-local" value={neededBy} onChange={e => setNeededBy(e.target.value)} />
          </div>
          <div>
            <label>Notes (optional)</label>
            <textarea className="input" rows="3" placeholder="Quality requirements, packaging, etc."
              maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={submitting}>
            {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Post listing')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ listing, onConfirm, onClose, deleting }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal__head">
          <div><h2 className="modal__title">Delete Listing</h2></div>
          <button className="btn btn--ghost btn--sm" onClick={onClose}><I.X size={14} /></button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          Are you sure you want to permanently delete the listing for{' '}
          <strong>{listing.fishSpecies?.commonName}</strong>? This cannot be undone.
        </p>
        <div className="modal__foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn" style={{ background: 'var(--unsafe)', color: '#fff', border: 0 }}
            onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main VendorDashboard ─────────────────────────────────────────────────────

export default function VendorDashboard({ user, token, onLogout }) {
  const [listings,    setListings]    = useState([])
  const [advisories,  setAdvisories]  = useState([])
  const [interests,   setInterests]   = useState([])
  const [species,     setSpecies]     = useState([])
  const [locations,   setLocations]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [activeNav,   setActiveNav]   = useState('dashboard')
  const [jumpContact, setJumpContact] = useState(null)

  const [createModal,   setCreateModal]   = useState(false)
  const [editListing,   setEditListing]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [actionError,   setActionError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [l, adv, sp, loc, intr] = await Promise.all([
        apiGet('/vendor/demand-listings', token),
        apiGet('/advisories?activeOnly=true', token),
        apiGet('/lookups/fish-species', token),
        apiGet('/lookups/market-locations', token),
        apiGet('/vendor/demand-listings/interests', token).catch(() => []),
      ])
      setListings(l)
      setAdvisories(adv)
      setSpecies(sp)
      setLocations(loc)
      setInterests(intr ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function handleFormSuccess(result, isEdit) {
    if (isEdit) {
      setListings(prev => prev.map(l => l.id === result.id ? result : l))
      setEditListing(null)
    } else {
      setListings(prev => [result, ...prev])
      setCreateModal(false)
    }
  }

  async function handleClose(id) {
    setActionError(null)
    try {
      const updated = await apiPost(`/vendor/demand-listings/${id}/close`, token, {})
      setListings(prev => prev.map(l => l.id === id ? updated : l))
    } catch (err) {
      setActionError(err.message || 'Failed to close listing')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    setActionError(null)
    try {
      await apiDelete(`/vendor/demand-listings/${confirmDelete.id}`, token)
      setListings(prev => prev.filter(l => l.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      setActionError(err.message || 'Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  const globalError = error || actionError

  return (
    <div className="app" data-accent="warm" data-density="balanced">
      <VendorRail user={user} activeNav={activeNav} onNav={setActiveNav} onLogout={onLogout} />
      <div className="main">
        <VendorTopbar page={activeNav} />
        <div className="content">
          {globalError && (
            <div className="page-error" style={{ margin: '16px 0 0' }}>
              <I.Alert size={16} /> {globalError}
              <button className="page-error__retry" onClick={error ? load : () => setActionError(null)}>
                {error ? 'Retry' : 'Dismiss'}
              </button>
            </div>
          )}

          {activeNav === 'orders'    ? <VendorOrdersView token={token} /> :
           activeNav === 'browse'    ? <VendorBrowseView token={token} /> :
           activeNav === 'messages'  ? <Messages token={token} userProfile={user} initialContact={jumpContact} /> :
           activeNav === 'interests' ? (
             <VendorInterestsView
               interests={interests}
               listings={listings}
               loading={loading}
               onNavigate={setActiveNav}
             />
           ) :
           activeNav === 'listings'  ? (
             <ListingsView
               listings={listings}
               loading={loading}
               error={null}
               onReload={load}
               onAdd={() => setCreateModal(true)}
               onEdit={l => setEditListing(l)}
               onClose={handleClose}
               onDelete={l => setConfirmDelete(l)}
             />
           ) : (
             <DashboardView
               user={user}
               listings={listings}
               advisories={advisories}
               interests={interests}
               loading={loading}
               onNewListing={() => setCreateModal(true)}
               onNavigate={setActiveNav}
             />
           )}
        </div>
      </div>

      {createModal && (
        <ListingFormModal
          species={species} locations={locations} token={token}
          onSuccess={handleFormSuccess} onClose={() => setCreateModal(false)}
        />
      )}
      {editListing && (
        <ListingFormModal
          listing={editListing} species={species} locations={locations} token={token}
          onSuccess={handleFormSuccess} onClose={() => setEditListing(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          listing={confirmDelete} onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)} deleting={deleting}
        />
      )}
    </div>
  )
}
