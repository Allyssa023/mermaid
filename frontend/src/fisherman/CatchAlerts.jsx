import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listCatchAlerts, cancelCatchAlert } from './api/catchAlerts'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function AlertsPage() {
  const qc = useQueryClient()

  const alertsQ = useQuery({ queryKey: ['catchAlerts', 'own'], queryFn: listCatchAlerts })

  const cancelMut = useMutation({
    mutationFn: (id) => cancelCatchAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catchAlerts', 'own'] }),
  })

  if (alertsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (alertsQ.error) return <div className="page"><ApiError error={alertsQ.error} onRetry={alertsQ.refetch} /></div>

  const alerts  = alertsQ.data ?? []
  const active  = alerts.filter(a => a.status === 'ACTIVE')
  const matched = alerts.filter(a => a.status === 'MATCHED')
  const sold    = alerts.filter(a => a.status === 'SOLD')
  const expired = alerts.filter(a => a.status === 'EXPIRED' || a.status === 'CANCELLED')

  const totalKg          = active.reduce((s, a) => s + (a.quantityKg ?? 0), 0)
  const potentialRevenue = active.reduce((s, a) => s + (a.quantityKg ?? 0) * (a.askingPricePerKg ?? 0), 0)
  const matchRate        = alerts.length > 0 ? Math.round((matched.length / alerts.length) * 100) : 0

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market-side</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Catch <em>Alerts</em>
          </h1>
          <p className="page__sub">Post catches from My Trips · let vendors come to you.</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => alertsQ.refetch()}>
            <I.Refresh size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Active alerts</div>
          <div className="v">{active.length}</div>
          <div className="s">Across {alerts.length} total</div>
        </div>
        <div className="stat">
          <div className="l">Total offered</div>
          <div className="v">{totalKg.toFixed(0)}<span style={{ fontSize: 16, color: 'var(--ink-4)', marginLeft: 2 }}>kg</span></div>
          <div className="s">Across {active.length} listings</div>
        </div>
        <div className="stat">
          <div className="l">Potential revenue</div>
          <div className="v">₱{(potentialRevenue / 1000).toFixed(1)}k</div>
          <div className="s">At asking price</div>
        </div>
        <div className="stat">
          <div className="l">Open offers</div>
          <div className="v">{active.reduce((s, a) => s + (a.matchedListingIds?.length ?? 0), 0)}</div>
          <div className="s">from vendors</div>
        </div>
        <div className="stat">
          <div className="l">Match rate</div>
          <div className="v">{matchRate}<span style={{ fontSize: 16, color: 'var(--ink-4)', marginLeft: 2 }}>%</span></div>
          <div className="s">All time</div>
        </div>
      </div>

      {/* Active alerts grid */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Active alerts</div>
            <div className="card__sub">{active.length} live · vendors notified in real-time</div>
          </div>
        </div>
        {active.length === 0 ? (
          <div className="muted-data" style={{ padding: '24px 0', textAlign: 'center', fontSize: 13 }}>
            No active alerts. End an active trip to auto-alert vendors about your catches.
          </div>
        ) : (
          <div className="alerts-grid">
            {active.map(a => {
              // eslint-disable-next-line react-hooks/purity
              const urgent = a.expiresAt ? new Date(a.expiresAt).getTime() - Date.now() < 60 * 60 * 1000 : false
              const offerCount = a.matchedListingIds?.length ?? 0
              return (
                <div key={a.id} className={`alert-card${urgent ? ' alert-card--urgent' : ''}`}>
                  <div className="alert-card__head">
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="kbd">{`CA-${a.id}`}</span>
                        {urgent && <span className="chip chip--unsafe chip--dot">Expires soon</span>}
                      </div>
                      <h3 className="alert-card__species">{a.species?.commonName ?? '—'}</h3>
                      <div className="alert-card__sub">
                        Posted {new Date(a.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        {a.landingSite ? ` · ${a.landingSite}` : ''}
                      </div>
                    </div>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => cancelMut.mutate(a.id)}
                      disabled={cancelMut.isPending}
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="alert-card__stats">
                    <div>
                      <div className="l">Qty</div>
                      <div className="v">{a.quantityKg != null ? a.quantityKg : '—'}<small>kg</small></div>
                    </div>
                    <div>
                      <div className="l">Estimate</div>
                      <div className="v" style={{ fontSize: 14 }}>{a.quantityEstimate ?? '—'}</div>
                    </div>
                    <div>
                      <div className="l">Asking</div>
                      <div className="v">{a.askingPricePerKg != null ? `₱${a.askingPricePerKg}` : '—'}<small>/kg</small></div>
                    </div>
                  </div>
                  <div className="alert-card__foot">
                    <div className="row" style={{ gap: 6 }}>
                      <I.Clock size={12} style={{ color: urgent ? 'var(--unsafe)' : 'var(--ink-4)' }} />
                      <span style={{ color: urgent ? 'var(--unsafe)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {a.expiresAt
                          ? new Date(a.expiresAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </span>
                    </div>
                    <span className="btn btn--accent btn--sm">{offerCount} offer{offerCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Matched */}
      {matched.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card__head">
            <div>
              <div className="card__title">Matched · waiting to finalize</div>
              <div className="card__sub">{matched.length} ready to convert to orders</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Species</th><th>Qty</th><th>Price</th><th>Matched</th><th>Site</th></tr>
            </thead>
            <tbody>
              {matched.map(a => (
                <tr key={a.id}>
                  <td><span className="kbd">{`CA-${a.id}`}</span></td>
                  <td style={{ fontWeight: 500 }}>{a.species?.commonName ?? '—'}</td>
                  <td className="data">{a.quantityKg != null ? `${a.quantityKg}kg` : '—'}{a.quantityEstimate ? ` · ${a.quantityEstimate}` : ''}</td>
                  <td className="data">{a.askingPricePerKg != null ? `₱${a.askingPricePerKg}/kg` : '—'}</td>
                  <td>{a.matchedListingIds?.length ?? 0} vendor{(a.matchedListingIds?.length ?? 0) !== 1 ? 's' : ''}</td>
                  <td>{a.landingSite ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sold */}
      {sold.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card__head">
            <div>
              <div className="card__title">Sold</div>
              <div className="card__sub">{sold.length} catches successfully sold</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Species</th><th>Qty</th><th>Ask</th><th>Site</th><th>Status</th><th>Posted</th></tr>
            </thead>
            <tbody>
              {sold.map(a => (
                <tr key={a.id}>
                  <td><span className="kbd">{`CA-${a.id}`}</span></td>
                  <td style={{ fontWeight: 500 }}>{a.species?.commonName ?? '—'}</td>
                  <td className="data">{a.quantityKg != null ? `${a.quantityKg}kg` : '—'}</td>
                  <td className="data">{a.askingPricePerKg != null ? `₱${a.askingPricePerKg}/kg` : '—'}</td>
                  <td>{a.landingSite ?? '—'}</td>
                  <td><span className="chip chip--safe chip--dot">Sold</span></td>
                  <td style={{ color: 'var(--ink-4)' }}>
                    {new Date(a.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expired / Cancelled */}
      {expired.length > 0 && (
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Expired &amp; Cancelled</div>
              <div className="card__sub">{expired.length} past alerts</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Species</th><th>Qty</th><th>Ask</th><th>Site</th><th>Status</th><th>Posted</th></tr>
            </thead>
            <tbody>
              {expired.map(a => (
                <tr key={a.id}>
                  <td><span className="kbd">{`CA-${a.id}`}</span></td>
                  <td style={{ fontWeight: 500 }}>{a.species?.commonName ?? '—'}</td>
                  <td className="data">{a.quantityKg != null ? `${a.quantityKg}kg` : '—'}</td>
                  <td className="data">{a.askingPricePerKg != null ? `₱${a.askingPricePerKg}/kg` : '—'}</td>
                  <td>{a.landingSite ?? '—'}</td>
                  <td>
                    <span className={`chip chip--dot ${a.status === 'CANCELLED' ? 'chip--unsafe' : ''}`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--ink-4)' }}>
                    {new Date(a.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>No catch alerts yet</div>
          <div className="muted-data" style={{ fontSize: 13 }}>
            End an active trip to automatically alert vendors about your catches.
          </div>
        </div>
      )}
    </div>
  )
}
