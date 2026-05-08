import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'
import StatTile from './components/StatTile'

const RISK_CLS = { SAFE: 'chip--safe', CAUTION: 'chip--caution', UNSAFE: 'chip--unsafe' }

export default function Home() {
  const navigate = useNavigate()
  const [conditions, setConditions] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [cond, adv, trips, orders] = await Promise.allSettled([
        apiGet('/marine/conditions'),
        apiGet('/advisories?active=true'),
        apiGet('/trips?status=ACTIVE'),
        apiGet('/fisherman/procurement-orders?bucket=PENDING'),
      ])
      if (cond.status === 'fulfilled') setConditions(cond.value)
      if (adv.status === 'fulfilled')  setAdvisories(Array.isArray(adv.value) ? adv.value : adv.value?.content || [])
      if (trips.status === 'fulfilled') {
        const list = Array.isArray(trips.value) ? trips.value : trips.value?.content || []
        setActiveTrip(list.find(t => t.status === 'ACTIVE') || null)
      }
      if (orders.status === 'fulfilled') {
        const list = Array.isArray(orders.value) ? orders.value : orders.value?.content || []
        setPendingOrders(list.length)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const overall = conditions?.overallRisk || conditions?.riskLevel || 'UNKNOWN'

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Operations</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Today on the <em>water.</em>
          </h1>
          <p className="page__sub">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/fisherman/trips')}>
            Start Trip
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : (
        <>
          {/* Sea Conditions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__head">
              <div className="card__title">Sea Conditions</div>
              <span className={`chip ${RISK_CLS[overall] || 'chip'} chip--dot`}>{overall}</span>
            </div>
            {conditions && (
              <div className="grid grid--kpi" style={{ marginTop: 12 }}>
                <StatTile label="Wave Height" value={conditions.waveHeight} unit="m" />
                <StatTile label="Wind Speed"  value={conditions.windSpeed}  unit="km/h" />
                <StatTile label="Wind Gusts"  value={conditions.windGusts}  unit="km/h" />
                <StatTile label="Precipitation" value={conditions.precipitation} unit="mm" />
              </div>
            )}
          </div>

          {/* Active Trip */}
          {activeTrip && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--safe)' }}>
              <div className="card__head">
                <div>
                  <div className="eyebrow">Active Trip</div>
                  <div className="card__title">{activeTrip.vesselName || 'Current Trip'}</div>
                  <div className="card__sub">Departed {new Date(activeTrip.startedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/trips')}>View</button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__title" style={{ marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/catch-alerts')}>Catch Alerts</button>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/procurement')}>
                Vendor Orders{pendingOrders > 0 ? ` (${pendingOrders})` : ''}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/earnings')}>Earnings</button>
            </div>
          </div>

          {/* Advisories */}
          {advisories.length > 0 && (
            <div className="card">
              <div className="card__title" style={{ marginBottom: 12 }}>Active Advisories</div>
              <div className="adv-list">
                {advisories.map(a => (
                  <div key={a.id} className="adv-item">
                    <span className={`chip chip--dot ${RISK_CLS[a.riskLevel] || ''}`}>{a.riskLevel}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-2)', marginLeft: 8 }}>{a.title || a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
