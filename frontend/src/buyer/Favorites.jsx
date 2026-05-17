import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { useFavorites } from '../context/FavoritesContext'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Favorites({ setPage }) {
  const { vendorFavorites, listingFavorites, loading, error, refresh, toggle } = useFavorites()

  if (loading) return <div className="page"><TableRowSkeleton /></div>
  if (error)   return <div className="page"><ApiError error={{ message: error }} onRetry={refresh} /></div>

  const vendors = vendorFavorites.map(f => f.target ?? { id: f.targetId, name: f.targetName })
  const savedListings = listingFavorites

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Network</div>
          <h1 className="page__title" style={{marginTop: 4}}>Saved <em>Vendors</em></h1>
          <p className="page__sub">{vendors.length} saved vendors · {savedListings.length} saved listings.</p>
        </div>
      </div>

      {vendors.length > 0 ? (
        <div className="vendor-grid" style={{marginTop: 18}}>
          {vendorFavorites.map(f => {
            const v = f.target ?? {}
            const name = v.shopName ?? v.name ?? f.targetName ?? 'Vendor'
            const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={f.id} className="vendor-card">
                <div className="vendor-card__head">
                  <div className="vendor-card__avatar">{initials}</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => toggle('VENDOR', f.targetId)}>
                    <I.Star size={12} />
                  </button>
                </div>
                <h3 className="vendor-card__name">{name}</h3>
                {v.location && <div className="muted-data" style={{marginBottom: 12}}><I.MapPin size={11} /> {v.location}</div>}
                {v.rating != null && (
                  <div className="vendor-card__stats">
                    <div><div className="l">Rating</div><div className="v">★ {v.rating}</div></div>
                    {v.totalTrades != null && <div><div className="l">Trades</div><div className="v">{v.totalTrades}</div></div>}
                  </div>
                )}
                <div className="vendor-card__foot">
                  <button className="btn btn--accent btn--sm" style={{flex: 1}} onClick={() => setPage('bbrowse')}>View listings</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty" style={{marginTop: 32}}>
          <I.Star size={36} />
          <div className="empty__title">No saved vendors yet</div>
          <p>Star vendors from the marketplace to save them here.</p>
          <button className="btn btn--primary" style={{marginTop: 12}} onClick={() => setPage('bbrowse')}>Browse marketplace</button>
        </div>
      )}

      {savedListings.length > 0 && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head">
            <div className="card__title">Saved listings</div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {savedListings.map(f => {
              const l = f.target ?? {}
              const name = l.speciesName ?? l.title ?? 'Listing'
              return (
                <div key={f.id} className="row" style={{gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 500}}>{name}</div>
                    {l.vendorName && <div className="muted-data" style={{fontSize: 12}}>{l.vendorName}</div>}
                  </div>
                  {l.pricePerKg && <span style={{fontFamily: 'var(--font-mono)', fontSize: 13}}>₱{l.pricePerKg}/kg</span>}
                  <button className="btn btn--accent btn--sm" onClick={() => setPage('bbrowse')}>View</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => toggle('LISTING', f.targetId)}><I.Trash size={11} /></button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
