import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { fetchBuyerHome } from './api/home'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import { useAuth } from '../context/AuthContext'

const STATUS_CLASS = { CONFIRMED: 'confirmed', PENDING: 'pending', COMPLETED: 'completed', CANCELLED: 'cancelled' }

export default function Home({ setPage }) {
  const { user } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['buyerHome'],
    queryFn: fetchBuyerHome,
    staleTime: 60_000,
  })

  if (isLoading) return <div className="page"><StatTileSkeleton /><TableRowSkeleton /></div>
  if (error)     return <div className="page"><ApiError error={error} onRetry={refetch} /></div>

  const stats  = data?.stats  ?? {}
  const orders = data?.recentOrders ?? []
  const fresh  = data?.freshListings ?? []
  const activity = data?.activity ?? []

  const firstName = user?.fullName?.split(' ')[0] ?? 'there'

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Welcome back</div>
          <h1 className="page__title" style={{marginTop: 4}}>Hello, <em>{firstName}</em></h1>
          <p className="page__sub">{fresh.length} fresh listings available</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => setPage('bcart')}><I.Cart size={12} /> Cart</button>
          <button className="btn btn--primary" onClick={() => setPage('bbrowse')}><I.Store size={12} /> Browse listings</button>
        </div>
      </div>

      <div className="orders-strip orders-strip--4" style={{marginTop: 18}}>
        <div className="stat"><div className="l">Pending orders</div><div className="v">{stats.pending ?? 0}</div><div className="s">awaiting vendor confirm</div></div>
        <div className="stat"><div className="l">Confirmed</div><div className="v">{stats.confirmed ?? 0}</div><div className="s">prep in progress</div></div>
        <div className="stat"><div className="l">Recent orders</div><div className="v">{stats.recent30d ?? 0}</div><div className="s">all time</div></div>
        <div className="stat"><div className="l">Fresh listings</div><div className="v">{fresh.length}</div><div className="s">available now</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Recent orders</div>
            <button className="btn btn--sm" onClick={() => setPage('borders')}>All orders <I.Arrow size={11} /></button>
          </div>
          {orders.length === 0 ? (
            <div className="empty" style={{padding: '24px 0'}}>No orders yet. <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}>Browse listings</button></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Code</th><th>Species</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="kbd">{o.orderCode ?? `ORD-${o.id}`}</span></td>
                    <td>{o.speciesName ?? o.species?.commonName}</td>
                    <td>{o.orderedQtyKg ?? o.qtyKg} kg</td>
                    <td style={{fontFamily: 'var(--font-mono)'}}>₱{((o.orderedQtyKg ?? o.qtyKg ?? 0) * (o.agreedPricePerKg ?? o.pricePerKg ?? 0)).toLocaleString()}</td>
                    <td><span className={`status status--${STATUS_CLASS[o.status] ?? o.status?.toLowerCase()}`}><span className="status__dot" /> {o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Fresh listings</div>
            <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>See all <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {fresh.map(f => {
              const tag = (f.speciesName ?? f.species?.commonName ?? '??').slice(0, 2).toUpperCase()
              return (
                <div key={f.id} className="row" style={{gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, alignItems: 'center'}}>
                  <div style={{width: 36, height: 36, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12}}>{tag}</div>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontWeight: 500, fontSize: 13}}>{f.speciesName ?? f.species?.commonName}</div>
                    <div className="muted-data" style={{fontSize: 11}}>{f.vendorName}</div>
                  </div>
                  <span style={{fontFamily: 'var(--font-mono)', fontSize: 13}}>₱{f.pricePerKg}/kg</span>
                  <button className="btn btn--accent btn--sm" onClick={() => setPage('bbrowse')}>Order now</button>
                </div>
              )
            })}
            {fresh.length === 0 && <div className="muted-data" style={{padding: '12px 0'}}>No listings yet.</div>}
          </div>
        </div>
      </div>

      {activity.length > 0 && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head"><div className="card__title">Recent activity</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {activity.map((a, i) => (
              <div key={a.id ?? i} className="row" style={{gap: 10, padding: '8px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center'}}>
                <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600}}>
                  {a.title?.[0] ?? '?'}
                </div>
                <div style={{flex: 1, fontSize: 13}}><strong>{a.title}</strong> {a.body}</div>
                <span className="muted-data" style={{fontSize: 11}}>{a.occurredAt ? new Date(a.occurredAt).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
