import { useNavigate } from 'react-router-dom'
import { useVendorPolling } from './hooks/useVendorPolling'
import { getVendorHome } from './api/home'
import StatTile from './components/StatTile'

const php = (amount) =>
  Number(amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

export default function Home() {
  const navigate = useNavigate()
  const { data, isStale, loading, error, refetch } = useVendorPolling(getVendorHome, [])

  const todayRevenue   = data?.todayRevenue ?? null
  const openOrders     = data?.openOrders ?? {}
  const lowStock       = Array.isArray(data?.lowStock) ? data.lowStock : []
  const recentAlerts   = Array.isArray(data?.recentMatchedCatchAlerts) ? data.recentMatchedCatchAlerts : []
  const unreadCount    = data?.unreadNotifications ?? null

  const newCount       = openOrders.new ?? openOrders.NEW ?? 0
  const preparingCount = openOrders.preparing ?? openOrders.PREPARING ?? 0
  const readyCount     = openOrders.ready ?? openOrders.READY ?? 0
  const totalOpen      = newCount + preparingCount + readyCount

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Operations</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Daily <em>Overview</em>
          </h1>
        </div>
        <div className="page__actions">
          {isStale && <span className="chip chip--caution chip--dot">Stale data</span>}
          <button className="btn btn--ghost btn--sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      {error && !data && (
        <div style={{
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 20, fontSize: 13,
        }}>
          {error.message || 'Failed to load dashboard data.'}
        </div>
      )}

      {loading && !data && (
        <div className="empty" style={{ padding: '60px 0' }}>
          <div className="empty__title">Loading…</div>
        </div>
      )}

      {(!loading || data) && (
        <>
          <div className="grid grid--kpi" style={{ marginBottom: 20 }}>
            <StatTile
              label="Today's Revenue"
              value={todayRevenue != null ? php(todayRevenue) : null}
              sub="Tap to view analytics"
              to="/vendor/analytics"
              dim={todayRevenue == null}
            />
            <StatTile
              label="Open Orders"
              value={totalOpen}
              sub={`${newCount} new · ${preparingCount} preparing · ${readyCount} ready`}
              to="/vendor/orders"
            />
            {unreadCount != null && (
              <StatTile
                label="Unread Notifications"
                value={unreadCount}
                dim={unreadCount === 0}
              />
            )}
          </div>

          {totalOpen > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card__head">
                <div>
                  <div className="card__title">Open Orders Breakdown</div>
                </div>
                <button className="btn btn--sm" onClick={() => navigate('/vendor/orders')}>View all</button>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {newCount > 0 && <span className="chip chip--unsafe chip--dot">{newCount} New</span>}
                {preparingCount > 0 && <span className="chip chip--caution chip--dot">{preparingCount} Preparing</span>}
                {readyCount > 0 && <span className="chip chip--safe chip--dot">{readyCount} Ready</span>}
              </div>
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card__head">
                <div>
                  <div className="card__title">Low Stock Alert</div>
                  <div className="card__sub">{lowStock.length} lot{lowStock.length !== 1 ? 's' : ''} below threshold</div>
                </div>
                <button className="btn btn--sm" onClick={() => navigate('/vendor/inventory')}>View inventory</button>
              </div>
              <div className="row row--wrap" style={{ gap: 8 }}>
                {lowStock.map((item, i) => {
                  const name = item.speciesName || item.species || `Lot #${item.id || i}`
                  const kg   = item.remainingKg ?? item.kg ?? null
                  return (
                    <button
                      key={item.id ?? i}
                      className="chip chip--caution chip--dot"
                      onClick={() => navigate('/vendor/inventory')}
                    >
                      {name}{kg != null ? ` — ${kg} kg` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {recentAlerts.length > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card__head">
                <div>
                  <div className="card__title">Recent Matched Catch Alerts</div>
                  <div className="card__sub">{recentAlerts.length} fresh catches matched to your demand</div>
                </div>
                <button className="btn btn--sm btn--accent" onClick={() => navigate('/vendor/procurement')}>
                  Browse all
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {recentAlerts.map((alert, i) => {
                  const species = alert.speciesName || alert.species || 'Unknown species'
                  const qty     = alert.qtyKg ?? alert.qty ?? null
                  const fisher  = alert.fishermanName || alert.fisherman || null
                  const when    = alert.createdAt || alert.date || null
                  return (
                    <div
                      key={alert.id ?? i}
                      className="alert-card"
                      onClick={() => navigate('/vendor/procurement')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="alert-card__head">
                        <div>
                          <h3 className="alert-card__species" style={{ fontSize: 20 }}>{species}</h3>
                          {fisher && <div className="alert-card__sub">{fisher}</div>}
                        </div>
                        {when && <span className="muted-data">{new Date(when).toLocaleDateString()}</span>}
                      </div>
                      {qty != null && (
                        <div className="alert-card__stats" style={{ gridTemplateColumns: '1fr', marginTop: 10, paddingTop: 10 }}>
                          <div>
                            <div className="l">Available</div>
                            <div className="v" style={{ fontSize: 20 }}>{qty}<small style={{ fontFamily: 'var(--font-ui)', fontSize: 11, marginLeft: 2 }}>kg</small></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!error && lowStock.length === 0 && recentAlerts.length === 0 && totalOpen === 0 && data && (
            <div className="empty" style={{ padding: '48px 0' }}>
              <div className="empty__title">All clear</div>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>No alerts, low stock, or pending orders.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
