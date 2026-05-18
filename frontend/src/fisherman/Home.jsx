import { useRef, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { fetchAllConditions, fetchAdvisories } from './api/marine'
import { listCatchAlerts } from './api/catchAlerts'

const RISK_CLASS = { SAFE: 'f-chip--safe', CAUTION: 'f-chip--caution', UNSAFE: 'f-chip--unsafe' }

export default function FishermanHomePage({ setPage, activeTrip }) {
  const condQ = useQuery({ queryKey: ['marine', 'all'], queryFn: fetchAllConditions })
  const advQ  = useQuery({ queryKey: ['advisories'], queryFn: () => fetchAdvisories(true) })
  const alertQ = useQuery({ queryKey: ['fisherman', 'catch-alerts'], queryFn: listCatchAlerts })

  const zones    = condQ.data?.zones ?? []
  const advisories = advQ.data ?? []
  const alerts   = alertQ.data ?? []

  const RISK_ORDER = { UNSAFE: 2, CAUTION: 1, SAFE: 0 }
  const overallRisk = zones.reduce((worst, z) => {
    return (RISK_ORDER[z.risk?.level] ?? 0) > (RISK_ORDER[worst] ?? 0) ? z.risk.level : worst
  }, 'SAFE')

  const heroZone = zones[0]

  const [zoneIdx, setZoneIdx] = useState(0)
  const carouselRef = useRef(null)
  const carouselTimer = useRef(null)
  const advanceZone = (next) => {
    if (!carouselRef.current || zones.length < 2) return
    gsap.to(carouselRef.current, {
      opacity: 0, duration: 0.3,
      onComplete: () => {
        setZoneIdx(next)
        gsap.fromTo(carouselRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      },
    })
  }
  useEffect(() => {
    if (zones.length < 2) return
    carouselTimer.current = setInterval(() => {
      setZoneIdx(i => { const next = (i + 1) % zones.length; advanceZone(next); return i })
    }, 4000)
    return () => clearInterval(carouselTimer.current)
  }, [zones.length])

  const waveRef = useRef(null)
  const windRef = useRef(null)
  const gustRef = useRef(null)
  useEffect(() => {
    if (!heroZone) return
    const animate = (ref, target) => {
      if (!ref.current) return
      const obj = { val: 0 }
      gsap.to(obj, { val: target, duration: 0.8, ease: 'power2.out',
        onUpdate: () => { if (ref.current) ref.current.textContent = obj.val.toFixed(1) } })
    }
    animate(waveRef, heroZone.marine?.waveHeightM ?? 0)
    animate(windRef, heroZone.weather?.windSpeedKmh ?? 0)
    animate(gustRef, heroZone.weather?.windGustsKmh ?? 0)
  }, [heroZone?.zoneId])

  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!activeTrip?.startedAt) { setElapsed(''); return }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTrip.startedAt)) / 1000)
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [activeTrip])

  if (condQ.isLoading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton-bar" style={{ height: 80 }}>
          <div className="skeleton-shimmer" />
        </div>
      ))}
    </div>
  )

  const currentZone = zones[zoneIdx]

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: '40% 60%', gap: 16, padding: 16, overflow: 'hidden' }}>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Conditions hero */}
        <div className="f-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`f-chip ${RISK_CLASS[overallRisk] ?? 'f-chip--muted'}`} style={{ fontSize: '0.85rem', padding: '4px 14px' }}>
              {overallRisk}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Overall</span>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 'auto' }}>
            {[
              { label: 'Wave (m)',   ref: waveRef },
              { label: 'Wind km/h', ref: windRef },
              { label: 'Gusts km/h',ref: gustRef },
            ].map(({ label, ref }) => (
              <div key={label}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', fontWeight: 700 }}>
                  <span ref={ref}>0.0</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {condQ.isError && <div className="f-error">Failed to load conditions<span className="f-error__retry" onClick={condQ.refetch}>Retry</span></div>}
        </div>

        {/* Advisories */}
        <div className="f-card" style={{ padding: 20, overflowY: 'auto' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Advisories</div>
          {advisories.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No active advisories</div>
            : advisories.map(a => (
                <div key={a.id} className={`f-chip ${a.severity === 'HIGH' ? 'f-chip--unsafe' : a.severity === 'MEDIUM' ? 'f-chip--caution' : 'f-chip--safe'}`}
                  style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderRadius: 8, padding: '6px 12px', maxWidth: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                </div>
              ))}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Zone carousel */}
        <div className="f-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Zones</div>
          <div ref={carouselRef} style={{ flex: 1 }}>
            {currentZone ? (
              <>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{currentZone.zoneName}</div>
                <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  Wave {currentZone.marine?.waveHeightM ?? '—'} m · Wind {currentZone.weather?.windSpeedKmh ?? '—'} km/h
                </div>
              </>
            ) : <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No zone data</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {zones.map((_, i) => (
              <button key={i} onClick={() => { clearInterval(carouselTimer.current); advanceZone(i) }}
                style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: i === zoneIdx ? 'var(--accent-lime)' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
        </div>

        {/* Catch alerts strip */}
        <div className="f-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>My Alerts</div>
          {alertQ.isError && <div className="f-error">Failed<span className="f-error__retry" onClick={alertQ.refetch}>Retry</span></div>}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                borderBottom: '1px solid var(--hairline)', fontSize: '0.8rem' }}>
                <span>{a.species?.commonName ?? a.speciesName ?? '—'}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {a.quantityKg != null ? `${a.quantityKg} kg` : a.quantityEstimate ?? '—'}
                </span>
              </div>
            ))}
            {alerts.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No active alerts</div>}
          </div>
          <button className="f-btn f-btn--primary f-btn--sm" style={{ marginTop: 12 }} onClick={() => setPage('alerts')}>+ New Alert</button>
        </div>

        {/* Trip console */}
        <div className="f-card f-card--glass" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Trip Console</div>
          {activeTrip ? (
            <>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Departure</div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>{activeTrip.departurePoint ?? 'En route'}</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-lime)', marginBottom: 'auto' }}>
                {elapsed}
              </div>
              <button className="f-btn f-btn--danger f-btn--sm" style={{ marginTop: 16 }}>End Trip</button>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No active trip</div>
              <button className="f-btn f-btn--primary f-btn--sm" onClick={() => setPage('trips')}>Start a Trip</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
