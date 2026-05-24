import { useState } from 'react'
import { useFavorites } from '../context/FavoritesContext'
import { useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { addItem } from './api/cart'
import { PageHead } from './components/PageHead'

const AVATAR_GRADS = [
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#5eead4,#38bdf8)',
  'linear-gradient(135deg,#a78bfa,#6a5fc1)',
  'linear-gradient(135deg,#fa7faa,#c4326a)',
  'linear-gradient(135deg,#46d39a,#14b8a6)',
]

const SAVED_SEARCHES = [
  { name: 'Bangus · 50kg+ · Dagupan', count: 6, alert: true },
  { name: 'Yellowfin · today\'s haul', count: 14, alert: true },
  { name: 'Lapu-Lapu · under ₱700/kg', count: 2, alert: false },
]

function VendorCard({ fav, setPage, onUnsave }) {
  const v = fav.target ?? {}
  const name = v.shopName ?? v.name ?? fav.targetName ?? 'Vendor'
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const grad = AVATAR_GRADS[fav.id % 5]

  return (
    <div className="card vendor-card">
      <div className="vendor-card__head">
        <div className="inv-row__avatar" style={{ background: grad, width: 44, height: 44, borderRadius: 10, fontSize: 13, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.1, color: 'var(--on-dark)' }}>{name}</div>
          <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{v.location ?? '—'}</div>
        </div>
        <span className="inv-row__chip inv-row__chip--ok">saved</span>
      </div>

      <div className="vendor-card__stats">
        <div>
          <div className="advisory-stat__label">Rating</div>
          <div className="vendor-card__stat-val">
            <I.Star size={11} style={{ color: 'var(--warning)' }} /> {v.rating ?? '—'}
          </div>
        </div>
        <div>
          <div className="advisory-stat__label">Orders</div>
          <div className="vendor-card__stat-val mono">{v.totalTrades ?? '—'}</div>
        </div>
        <div>
          <div className="advisory-stat__label">Last buy</div>
          <div className="vendor-card__stat-val mono">—</div>
        </div>
        <div>
          <div className="advisory-stat__label">Fresh now</div>
          <div className="vendor-card__stat-val mono" style={{ color: 'var(--accent-lime)' }}>—</div>
        </div>
      </div>

      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn--sm" style={{ flex: 1 }} onClick={() => setPage('bbrowse')}>
          <I.Store size={11} /> View store
        </button>
        <button className="btn btn--sm" onClick={() => {
          const vId = fav.targetId ?? v.id
          if (vId) {
            setPage('bmessages', { id: vId, fullName: name, role: 'VENDOR' })
          } else {
            setPage('bmessages')
          }
        }} title="Message vendor">
          <I.Message size={11} />
        </button>
        <button className="btn btn--lime btn--sm" style={{ flex: 1 }} onClick={() => onUnsave(fav.targetId)}>
          Unsave
        </button>
      </div>
    </div>
  )
}

function ListingCard({ fav, setPage }) {
  const l = fav.target ?? {}
  const name     = l.speciesName ?? 'Listing'
  const vendor   = l.vendorName  ?? '—'
  const price    = l.pricePerKg  ?? 0
  const qty      = l.availableKg ?? 0
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const grad     = AVATAR_GRADS[fav.id % 5]

  const createdAt = l.createdAt ? new Date(l.createdAt) : null
  const hoursAgo  = createdAt ? Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 3_600_000)) : 0
  const freshness = Math.max(10, Math.min(100, Math.round(96 - hoursAgo * 1.8)))

  const qc = useQueryClient()
  const [addWarning, setAddWarning] = useState('')
  const handleAdd = async (e) => {
    e.stopPropagation()
    try {
      const result = await addItem({ listingId: fav.targetId, quantityKg: 1 })
      qc.invalidateQueries({ queryKey: ['cart'] })
      if (result?.warning) setAddWarning(result.warning)
    } catch { /* silent */ }
  }

  return (
    <article className="catch-card catch-card--big" style={{ cursor: 'pointer' }} onClick={() => setPage('bbrowse')}>
      <div className="catch-card__head">
        <div className="cell-species__avatar" style={{ background: grad, width: 34, height: 34, borderRadius: 8, fontSize: 11, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <span className="catch-card__id">LST-{fav.targetId}</span>
        <div className="spacer" />
        <button className="icon-btn icon-btn--saved" title="Remove from saved" onClick={e => { e.stopPropagation() }}>
          <I.Heart size={13} />
        </button>
      </div>
      <div className="catch-card__species">{name}</div>
      <div className="catch-card__fisherman"><I.Store size={11} /> {vendor}</div>

      <div className="catch-card__freshness">
        <div className="catch-card__fresh-label">
          <span>Freshness</span><strong>{freshness}/100</strong>
        </div>
        <div className="catch-card__fresh-bar">
          <div className="catch-card__fresh-fill" style={{ width: `${freshness}%` }} />
        </div>
      </div>

      <div className="catch-card__bottom">
        <span className="catch-card__qty">{qty}<small> kg left</small></span>
        <span className="catch-card__price">₱{price}/kg</span>
      </div>
      <div className="catch-card__cta">
        <button className="btn btn--sm btn--lime" style={{ flex: 1, padding: '7px 10px' }} onClick={handleAdd}>
          <I.Cart size={11} /> Add
        </button>
        <button className="btn btn--sm" style={{ flex: 1, padding: '7px 10px' }} onClick={e => { e.stopPropagation(); setPage('bbrowse') }}>
          Quick view
        </button>
      </div>
      {addWarning && (
        <div style={{ fontSize: 10, color: 'var(--warning)', padding: '4px 0', lineHeight: 1.3 }}>{addWarning}</div>
      )}
    </article>
  )
}

const TABS = ['vendors', 'listings', 'searches']

export default function Favorites({ setPage }) {
  const { vendorFavorites, listingFavorites, loading, error, refresh, toggle } = useFavorites()
  const [tab, setTab] = useState('vendors')

  if (loading) {
    return (
      <div className="page-wrap">
        <PageHead eyebrow="Workspace · saved" title="Your" lime="favorites" />
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted-2)', fontSize: 12 }}>Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrap">
        <PageHead eyebrow="Workspace · saved" title="Your" lime="favorites" />
        <div className="empty-state">
          <I.Heart size={32} />
          <div style={{ color: 'var(--danger)' }}>{error}</div>
          <button className="btn btn--sm" onClick={refresh}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <PageHead
        eyebrow="Workspace · saved"
        title="Your"
        lime="favorites"
        sub={`${vendorFavorites.length} vendors · ${listingFavorites.length} listings`}
        tools={<>
          <button className="filter-pill"><I.Bell size={11} /> <strong>Alerts on</strong></button>
          <button className="filter-pill"><I.Filter size={11} /> <strong>Sort by recent</strong></button>
        </>}
      />

      <div className="orders-card__tabs" style={{ alignSelf: 'flex-start', marginTop: 24 }}>
        {TABS.map(t => (
          <button key={t} className={`orders-tab${tab === t ? ' orders-tab--on' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="orders-tab__count">
              {t === 'vendors' ? vendorFavorites.length : t === 'listings' ? listingFavorites.length : SAVED_SEARCHES.length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'vendors' && (
          vendorFavorites.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 48 }}>
              <I.Heart size={36} />
              <div>No saved vendors yet</div>
              <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>Browse marketplace</button>
            </div>
          ) : (
            <div className="vendor-grid">
              {vendorFavorites.map(f => (
                <VendorCard key={f.id} fav={f} setPage={setPage} onUnsave={id => toggle('VENDOR', id)} />
              ))}
            </div>
          )
        )}

        {tab === 'listings' && (
          listingFavorites.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 48 }}>
              <I.Heart size={36} />
              <div>No saved listings yet</div>
              <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>Browse listings</button>
            </div>
          ) : (
            <div className="catch-grid catch-grid--big">
              {listingFavorites.map(f => (
                <ListingCard key={f.id} fav={f} setPage={setPage} />
              ))}
            </div>
          )
        )}

        {tab === 'searches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SAVED_SEARCHES.map(s => (
              <div key={s.name} className="inv-row" style={{ padding: 14 }}>
                <div className="inv-row__avatar" style={{ background: 'var(--layer-3)', color: 'var(--accent-lime)' }}>
                  <I.Search size={14} />
                </div>
                <div className="inv-row__main">
                  <div className="inv-row__name">{s.name}</div>
                  <div className="inv-row__sub">{s.count} matches today · alert {s.alert ? 'on' : 'off'}</div>
                </div>
                <button className="btn btn--sm"><I.Bell size={11} /> {s.alert ? 'On' : 'Off'}</button>
                <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>Run <I.ArrowRight size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
