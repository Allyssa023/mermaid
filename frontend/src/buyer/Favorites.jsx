import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { I } from '../icons'
import { fmt, fmtPrice } from './utils/format'
import { useFavorites } from '../context/FavoritesContext'
import FavoriteHeart from './components/FavoriteHeart'

export default function Favorites() {
  const navigate = useNavigate()
  const onNavigate = (id) => navigate(`/buyer/${id}`)
  const { vendorFavorites, listingFavorites, loading } = useFavorites()
  const [tab, setTab] = useState('vendors')

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Network</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Your <em>saved</em> items</h1>
          <p className="page__sub">
            {vendorFavorites.length} vendor{vendorFavorites.length === 1 ? '' : 's'} ·{' '}
            {listingFavorites.length} listing{listingFavorites.length === 1 ? '' : 's'} saved.
          </p>
        </div>
      </div>

      <div className="seg" style={{ marginTop: 14, alignSelf: 'flex-start' }}>
        <button className={tab === 'vendors' ? 'on' : ''} onClick={() => setTab('vendors')}>
          Vendors ({vendorFavorites.length})
        </button>
        <button className={tab === 'listings' ? 'on' : ''} onClick={() => setTab('listings')}>
          Listings ({listingFavorites.length})
        </button>
      </div>

      {loading && (
        <div className="muted-data" style={{ marginTop: 18 }}>Loading…</div>
      )}

      {tab === 'vendors' && !loading && (
        vendorFavorites.length === 0 ? (
          <div className="buyer-empty" style={{ marginTop: 40 }}>
            <I.Star size={36} />
            <span>No saved vendors yet. Tap the star icon on any vendor to save them.</span>
            <button className="btn btn--accent" style={{ marginTop: 18 }} onClick={() => onNavigate('browse')}>
              Browse marketplace
            </button>
          </div>
        ) : (
          <div className="vendor-grid" style={{ marginTop: 18 }}>
            {vendorFavorites.map(f => {
              const v = f.vendor
              if (!v) return null
              return (
                <div key={f.id} className="vendor-card">
                  <div className="vendor-card__head">
                    <div className="vendor-card__avatar">
                      {(v.fullName || '?').split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </div>
                    <FavoriteHeart targetType="VENDOR" targetId={v.id} label="vendor" stopPropagation={false} />
                  </div>
                  <h3 className="vendor-card__name">{v.fullName}</h3>
                  <div className="muted-data" style={{ marginBottom: 12 }}>
                    {v.joinedDate ? `Joined ${fmt(v.joinedDate)}` : 'Vendor'}
                  </div>
                  <div className="vendor-card__stats">
                    <div><div className="l">Rating</div><div className="v">★ {v.avgRating ?? '—'}</div></div>
                    <div><div className="l">Reviews</div><div className="v">{v.reviewCount ?? 0}</div></div>
                    <div><div className="l">Trades</div><div className="v" style={{ fontSize: 13 }}>{v.totalCompletedTrades ?? '—'}</div></div>
                  </div>
                  <div className="vendor-card__foot">
                    <button className="btn btn--ghost btn--sm" style={{ flex: 1 }}>Message</button>
                    <button className="btn btn--accent btn--sm" style={{ flex: 1 }} onClick={() => navigate(`/buyer/vendor/${v.id}`)}>View storefront</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'listings' && !loading && (
        listingFavorites.length === 0 ? (
          <div className="buyer-empty" style={{ marginTop: 40 }}>
            <I.Star size={36} />
            <span>No saved listings yet. Tap the star icon on any listing card.</span>
            <button className="btn btn--accent" style={{ marginTop: 18 }} onClick={() => onNavigate('browse')}>
              Browse marketplace
            </button>
          </div>
        ) : (
          <div className="buyer-grid" style={{ marginTop: 18 }}>
            {listingFavorites.map(f => {
              const l = f.listing
              if (!l) {
                return (
                  <div key={f.id} className="buyer-card" style={{ opacity: 0.5 }}>
                    <div className="buyer-card__body">
                      <div className="muted-data">Listing no longer available</div>
                      <FavoriteHeart targetType="LISTING" targetId={f.targetId} stopPropagation={false} />
                    </div>
                  </div>
                )
              }
              const tag = l.fishSpecies?.tag || (l.fishSpecies?.commonName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={f.id} className="buyer-card" onClick={() => navigate(`/buyer/listing/${l.id}`)}>
                  <div className="buyer-card__hero" data-tag={tag} style={{ position: 'relative' }}>
                    <div className="buyer-card__species-tag">{tag}</div>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <FavoriteHeart targetType="LISTING" targetId={l.id} />
                    </div>
                  </div>
                  <div className="buyer-card__body">
                    <h3 className="buyer-card__species">{l.fishSpecies?.commonName || '—'}</h3>
                    <div className="buyer-card__vendor"><span>{l.vendorName || '—'}</span></div>
                    <div className="buyer-card__price">
                      <span className="big">{fmtPrice(l.offerPricePerKg)}</span>
                      <span>/kg</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
