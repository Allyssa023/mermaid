import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { getVendorHome } from './api/home'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Home({ setPage }) {
  const { user } = useAuth()
  const homeQ = useQuery({ queryKey: ['vendor', 'home'], queryFn: getVendorHome, refetchInterval: 60_000 })

  if (homeQ.isLoading) return <div className="page"><StatTileSkeleton /><TableRowSkeleton rows={3} /></div>
  if (homeQ.error) return <div className="page"><ApiError error={homeQ.error} onRetry={homeQ.refetch} /></div>

  const h = homeQ.data ?? {}
  const firstName = user?.fullName?.split(' ')[0] ?? 'Vendor'
  const openOrdersTotal = (h.openOrders?.new ?? 0) + (h.openOrders?.preparing ?? 0) + (h.openOrders?.ready ?? 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · today</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{firstName}</em></h1>
          <p className="page__sub">{user?.business ?? ''} · Pinagbayanan Depot</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Plus size={12} /> New listing</button>
          <button className="btn btn--primary" onClick={() => setPage('vprocurement')}><I.Fish size={12} /> Browse catch</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{marginTop: 18}}>
        <div className="kpi"><div className="kpi__label">Today's revenue</div><div className="kpi__value">₱{(h.todayRevenue ?? 0).toLocaleString()}</div><div className="kpi__foot">vs ₱18.4k yesterday</div></div>
        <div className="kpi"><div className="kpi__label">Open orders</div><div className="kpi__value">{openOrdersTotal}</div><div className="kpi__foot">{h.openOrders?.new ?? 0} new · {h.openOrders?.preparing ?? 0} prep · {h.openOrders?.ready ?? 0} ready</div></div>
        <div className="kpi"><div className="kpi__label">Unread</div><div className="kpi__value">{h.unreadNotifications ?? 0}</div><div className="kpi__foot">messages + notices</div></div>
        <div className="kpi"><div className="kpi__label">Avg rating</div><div className="kpi__value">4.7<small style={{color: 'oklch(0.65 0.15 80)'}}>★</small></div><div className="kpi__foot">94 reviews</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Open orders</div>
              <div className="card__sub">{openOrdersTotal} need action</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vorders')}>All orders <I.Arrow size={11} /></button>
          </div>
          <div className="row" style={{gap: 8, flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--accent)'}}>New</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.openOrders?.new ?? 0}</div>
              <div className="muted-data" style={{fontSize: 11}}>Awaiting confirm</div>
            </div>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--caution)'}}>Preparing</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.openOrders?.preparing ?? 0}</div>
              <div className="muted-data" style={{fontSize: 11}}>In kitchen / packing</div>
            </div>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--safe-soft)', border: '1px solid var(--safe)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--safe)'}}>Ready</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.openOrders?.ready ?? 0}</div>
              <div className="muted-data" style={{fontSize: 11}}>For pickup/handoff</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Low stock</div>
              <div className="card__sub">{(h.lowStock ?? []).length} lots near threshold</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vinventory')}>Inventory <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {(h.lowStock ?? []).map((l, i) => (
              <div key={l.speciesName ?? i} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--paper-2)', borderRadius: 6}}>
                <span style={{flex: 1, fontSize: 13}}>{l.speciesName}</span>
                <span className="chip chip--caution" style={{fontSize: 10}}>{l.remainingKg} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">Recent matched catch alerts</div>
            <div className="card__sub">Based on your watchlist</div>
          </div>
          <button className="btn btn--sm" onClick={() => setPage('vprocurement')}>Browse all <I.Arrow size={11} /></button>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10}}>
          {(h.recentMatchedCatchAlerts ?? []).map(a => (
            <div key={a.id} className="alert-card" style={{padding: 14}}>
              <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                <span className="kbd">CA-{a.id}</span>
                <span className="chip chip--accent" style={{fontSize: 10}}>match</span>
              </div>
              <div className="alert-card__species" style={{fontSize: 16}}>{a.speciesName}</div>
              <div className="alert-card__sub">{a.fishermanName}</div>
              <div className="row" style={{marginTop: 10, justifyContent: 'space-between', alignItems: 'baseline'}}>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 14}}>{a.quantityKg}<small> kg</small></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
