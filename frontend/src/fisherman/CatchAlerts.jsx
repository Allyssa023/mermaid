import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { listCatchAlerts } from './api/catchAlerts'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function AlertsPage() {
  const alertsQ  = useQuery({ queryKey: ['catchAlerts', 'own'], queryFn: listCatchAlerts })

  if (alertsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (alertsQ.error) return <div className="page"><ApiError error={alertsQ.error} onRetry={alertsQ.refetch} /></div>

  const alerts  = alertsQ.data ?? []

  const active  = alerts.filter(a => a.status === 'ACTIVE')
  const matched = alerts.filter(a => a.status === 'MATCHED')
  const expired = alerts.filter(a => a.status === 'EXPIRED' || a.status === 'CANCELLED')

  const totalKg          = active.reduce((s, a) => s + (a.quantityKg ?? 0), 0)
  const potentialRevenue = active.reduce((s, a) => s + (a.quantityKg ?? 0) * (a.askingPricePerKg ?? 0), 0)

  const matchRate = alerts.length > 0 ? Math.round((matched.length / alerts.length) * 100) : 0

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market-side</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Catch <em>Alerts</em>
          </h1>
          <p className="page__sub">Post what you've caught · let vendors come to you.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Filter</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Post alert</button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Active alerts</div>
          <div className="v">{active.length}</div>
          <div className="s">Across {alerts.length} total alerts</div>
        </div>
        <div className="stat">
          <div className="l">Total offered</div>
          <div className="v">{totalKg.toFixed(0)}<span style={{fontSize:16, color:'var(--ink-4)', marginLeft:2}}>kg</span></div>
          <div className="s">Across {active.length} listings</div>
        </div>
        <div className="stat">
          <div className="l">Potential revenue</div>
          <div className="v">₱{(potentialRevenue/1000).toFixed(1)}k</div>
          <div className="s">At asking price</div>
        </div>
        <div className="stat">
          <div className="l">Open offers</div>
          <div className="v">{active.reduce((s,a)=>s+(a.matchedListingIds?.length??0), 0)}</div>
          <div className="s">{active.reduce((s,a) => s + (a.matchedListingIds?.length ?? 0), 0)} total offers</div>
        </div>
        <div className="stat">
          <div className="l">Match rate</div>
          <div className="v">{matchRate}<span style={{fontSize:16, color:'var(--ink-4)', marginLeft:2}}>%</span></div>
          <div className="s">All time</div>
        </div>
      </div>

      {/* Active alerts grid */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Active alerts</div>
            <div className="card__sub">{active.length} live · buyers notified in real-time</div>
          </div>
          <div className="row" style={{gap: 4}}>
            <button className="btn btn--sm">Sort: Newest</button>
          </div>
        </div>
        <div className="alerts-grid">
          {active.map(a => {
            const urgent = a.expiresAt ? new Date(a.expiresAt).getTime() - Date.now() < 60 * 60 * 1000 : false
            const offerCount = a.matchedListingIds?.length ?? 0
            return (
              <div key={a.id} className={`alert-card${urgent ? ' alert-card--urgent' : ''}`}>
                <div className="alert-card__head">
                  <div>
                    <div className="row" style={{gap: 6}}>
                      <span className="kbd">{`CA-${a.id}`}</span>
                      {urgent && <span className="chip chip--unsafe chip--dot">Expires soon</span>}
                    </div>
                    <h3 className="alert-card__species">{a.species?.commonName}</h3>
                    <div className="alert-card__sub">
                      Posted {new Date(a.createdAt).toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'})} · {a.landingSite ?? '—'}
                    </div>
                  </div>
                  <button className="btn btn--sm btn--ghost"><I.Dots size={14} /></button>
                </div>
                <div className="alert-card__stats">
                  <div>
                    <div className="l">Qty</div>
                    <div className="v">{a.quantityKg ?? 0}<small>kg</small></div>
                  </div>
                  <div>
                    <div className="l">Pieces</div>
                    <div className="v">{a.quantityEstimate ?? '—'}</div>
                  </div>
                  <div>
                    <div className="l">Asking</div>
                    <div className="v">₱{a.askingPricePerKg ?? 0}<small>/kg</small></div>
                  </div>
                </div>
                <div className="alert-card__foot">
                  <div className="row" style={{gap: 6}}>
                    <I.Clock size={12} style={{color: urgent ? 'var(--unsafe)' : 'var(--ink-4)'}} />
                    <span style={{color: urgent ? 'var(--unsafe)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12}}>
                      {a.expiresAt ? new Date(a.expiresAt).toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'}) : '—'}
                    </span>
                  </div>
                  <div className="row" style={{gap: 8}}>
                    <button className="btn btn--accent btn--sm">{offerCount} offer{offerCount !== 1 ? 's' : ''}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Matched alerts */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Matched · waiting to finalize</div>
            <div className="card__sub">{matched.length} ready to convert to orders</div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Species</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Matched</th>
              <th>Site</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matched.map(a => (
              <tr key={a.id} className="row--link">
                <td><span className="kbd">{`CA-${a.id}`}</span></td>
                <td style={{fontWeight: 500, color: 'var(--ink)'}}>{a.species?.commonName}</td>
                <td className="data">{a.quantityKg ?? 0}kg · {a.quantityEstimate ?? '—'} pcs</td>
                <td className="data">₱{a.askingPricePerKg ?? 0}/kg</td>
                <td>{(a.matchedListingIds?.length ?? 0)} vendor{(a.matchedListingIds?.length ?? 0) !== 1 ? 's' : ''}</td>
                <td>{a.landingSite ?? '—'}</td>
                <td><button className="btn btn--sm btn--accent">Create order</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expired */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Expired</div>
            <div className="card__sub">Past alerts · relist with one click</div>
          </div>
        </div>
        {expired.length === 0 ? (
          <div className="empty">No expired alerts yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Species</th><th>Qty</th><th>Ask</th><th>Site</th><th>Posted</th><th></th></tr>
            </thead>
            <tbody>
              {expired.map(a => (
                <tr key={a.id}>
                  <td><span className="kbd">{`CA-${a.id}`}</span></td>
                  <td style={{fontWeight: 500}}>{a.species?.commonName}</td>
                  <td className="data">{a.quantityKg ?? 0}kg</td>
                  <td className="data">₱{a.askingPricePerKg ?? 0}/kg</td>
                  <td>{a.landingSite ?? '—'}</td>
                  <td style={{color: 'var(--ink-4)'}}>{new Date(a.createdAt).toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'})}</td>
                  <td><button className="btn btn--sm">Relist</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
