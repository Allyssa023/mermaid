import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { I } from '../icons'
import { listCatchAlerts, createCatchAlert, cancelCatchAlert } from './api/catchAlerts'
import { fetchSpecies } from '../api/lookup'

const PAGE_SIZE = 10

function Pager({ page, total, onPage }) {
  if (total <= 1) return null
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="pager__info">{page} of {total}</span>
      <button className="pager__btn" disabled={page >= total} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

function isUrgent(alert) {
  if (!alert.expiresAt) return false
  const msLeft = new Date(alert.expiresAt).getTime() - Date.now()
  return msLeft > 0 && msLeft < 2 * 60 * 60 * 1000
}

function expiresIn(alert) {
  if (!alert.expiresAt) return null
  const msLeft = new Date(alert.expiresAt).getTime() - Date.now()
  if (msLeft <= 0) return null
  const h = Math.floor(msLeft / 3600000)
  const m = Math.floor((msLeft % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function CatchAlerts() {
  const qc = useQueryClient()
  const alertsQ = useQuery({ queryKey: ['fisherman', 'catch-alerts'], queryFn: listCatchAlerts })
  const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })
  const alerts = alertsQ.data ?? []

  const [filter, setFilter] = useState('ALL')
  const [drawer, setDrawer] = useState(false)
  const [cardPage, setCardPage] = useState(1)
  const [form, setForm] = useState({ speciesId: '', expiresInHours: 24, quantityKg: '', landingSite: '', askingPricePerKg: '', notes: '' })

  const createMut = useMutation({
    mutationFn: (body) => createCatchAlert(body),
    onSuccess: () => {
      qc.invalidateQueries(['fisherman', 'catch-alerts'])
      setDrawer(false)
      setForm({ speciesId: '', expiresInHours: 24, quantityKg: '', landingSite: '', askingPricePerKg: '', notes: '' })
    },
  })

  const cancelMut = useMutation({
    mutationFn: (id) => cancelCatchAlert(id),
    onSuccess: () => qc.invalidateQueries(['fisherman', 'catch-alerts']),
  })

  const cardRefs = useRef([])
  useEffect(() => {
    const els = cardRefs.current.filter(Boolean)
    if (els.length) {
      gsap.fromTo(els, 
        { opacity: 0, y: 16 }, 
        { opacity: 1, y: 0, stagger: 0.04, duration: 0.2, overwrite: 'auto' }
      )
    }
  }, [alerts.length, filter, cardPage])

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = {
      speciesId: Number(form.speciesId),
      expiresInHours: Number(form.expiresInHours),
      ...(form.quantityKg && { quantityKg: Number(form.quantityKg) }),
      ...(form.landingSite && { landingSite: form.landingSite }),
      ...(form.askingPricePerKg && { askingPricePerKg: Number(form.askingPricePerKg) }),
      ...(form.notes && { notes: form.notes }),
    }
    createMut.mutate(body)
  }

  const active  = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'MATCHED')
  const sold    = alerts.filter(a => a.status === 'SOLD')
  const totalKg = active.reduce((s, a) => s + (a.quantityKg ?? 0), 0)
  const potentialRev = active.reduce((s, a) => s + (a.quantityKg ?? 0) * (a.askingPricePerKg ?? 0), 0)

  const filtered = filter === 'ALL'     ? alerts
    : filter === 'ACTIVE'  ? alerts.filter(a => a.status === 'ACTIVE')
    : filter === 'MATCHED' ? alerts.filter(a => a.status === 'MATCHED')
    : alerts.filter(a => a.status === 'SOLD')

  const totalCardPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagedCards = filtered.slice((cardPage - 1) * PAGE_SIZE, cardPage * PAGE_SIZE)

  const statusChip = (status) => {
    if (status === 'MATCHED') return 'chip--safe'
    if (status === 'ACTIVE')  return 'chip--lime'
    if (status === 'SOLD')    return 'chip--safe'
    return 'chip--muted'
  }

  return (
    <div className="fade-in" style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Market-side · let vendors come to you</div>
          <h1 className="page__title">Catch <em className="chip-lime">Alerts</em></h1>
          <p className="page__sub">Post live catches — vendors get notified in real-time and bid for your haul.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => alertsQ.refetch()}><I.Refresh size={12} /> Refresh</button>
          <button className="btn btn--lime" onClick={() => setDrawer(true)}><I.Plus size={12} /> Create Alert</button>
        </div>
      </div>

      {alertsQ.isError && (
        <div className="f-error" style={{ marginBottom: 16 }}>
          Failed to load alerts<span className="f-error__retry" onClick={alertsQ.refetch}>Retry</span>
        </div>
      )}

      <div className="grid--kpi" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 22 }}>
        <div className="kpi"><div className="kpi__label">Active</div><div className="kpi__value">{active.length}</div><div className="kpi__foot">Of {alerts.length} total</div></div>
        <div className="kpi"><div className="kpi__label">Offered</div><div className="kpi__value">{totalKg.toFixed(0)}<small>kg</small></div><div className="kpi__foot">Across {active.length} listings</div></div>
        <div className="kpi"><div className="kpi__label">Potential rev</div><div className="kpi__value" style={{ color: 'var(--accent-lime)' }}>₱{(potentialRev / 1000).toFixed(1)}<small>k</small></div><div className="kpi__foot">At asking</div></div>
        <div className="kpi"><div className="kpi__label">Open offers</div><div className="kpi__value">{active.reduce((s, a) => s + (a.offerCount ?? 0), 0)}</div><div className="kpi__foot">From vendors</div></div>
        <div className="kpi"><div className="kpi__label">Sold</div><div className="kpi__value" style={{ color: 'var(--safe)' }}>{sold.length}</div><div className="kpi__foot">Last 30d</div></div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0)), var(--bg-card)', borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="card__head">
          <div>
            <div className="card__title">Active alerts</div>
            <div className="card__sub">{active.length} live to vendor network</div>
          </div>
          <div className="seg">
            {['ALL', 'ACTIVE', 'MATCHED', 'SOLD'].map(f => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => { setFilter(f); setCardPage(1) }}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">No alerts in this category.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {pagedCards.map((a, i) => {
                const urgent = isUrgent(a)
                const timeLeft = expiresIn(a)
                return (
                  <div
                    key={a.id}
                    ref={el => { cardRefs.current[i] = el }}
                    className="card"
                    style={{
                      padding: 18,
                      background: urgent
                        ? 'radial-gradient(ellipse 60% 50% at 100% 0%, rgba(251,113,133,0.14), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)), var(--bg-card-2)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)), var(--bg-card-2)',
                      borderColor: urgent ? 'rgba(251,113,133,0.36)' : 'rgba(255,255,255,0.14)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <kbd>CA-{a.id}</kbd>
                          {urgent && <span className="chip chip--unsafe"><span className="chip__dot" />Expires soon</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff' }}>
                          {a.species?.commonName ?? a.speciesName ?? '—'}
                        </div>
                      </div>
                      <span className={`chip ${statusChip(a.status)}`}>
                        <span className="chip__dot" />{a.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--hairline-2)' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Quantity</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff', marginTop: 2 }}>
                          {a.quantityKg != null
                            ? <>{a.quantityKg}<small style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--ink-4)', fontWeight: 500 }}>kg</small></>
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Asking</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff', marginTop: 2 }}>
                          {a.askingPricePerKg != null
                            ? <>₱{a.askingPricePerKg}<small style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--ink-4)', fontWeight: 500 }}>/kg</small></>
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {a.status === 'SOLD' ? 'Sold for' : 'Total'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: a.status === 'SOLD' ? 'var(--accent-lime)' : '#fff', marginTop: 2 }}>
                          {a.quantityKg != null && a.askingPricePerKg != null
                            ? `₱${(a.quantityKg * a.askingPricePerKg).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
                            : '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {a.status === 'SOLD'
                          ? <span><I.Check size={11} style={{ verticalAlign: -1, color: 'var(--safe)', marginRight: 4 }} />Sold</span>
                          : timeLeft
                            ? <span><I.Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Expires in {timeLeft}</span>
                            : a.landingSite
                              ? <span><I.MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{a.landingSite}</span>
                              : '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {(a.offerCount ?? 0) > 0 && a.status !== 'SOLD' && a.status !== 'EXPIRED' && (
                          <span className="chip chip--violet">
                            <span className="chip__dot" />{a.offerCount} {a.offerCount === 1 ? 'offer' : 'offers'}
                          </span>
                        )}
                        {a.status === 'ACTIVE' && (
                          <button className="btn btn--sm"
                            style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', borderColor: 'rgba(251,113,133,0.3)' }}
                            onClick={() => cancelMut.mutate(a.id)} disabled={cancelMut.isPending}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pager page={cardPage} total={totalCardPages} onPage={setCardPage} />
          </>
        )}
      </div>

      {drawer && (
        <div className="f-drawer">
          <div className="f-drawer__backdrop" onClick={() => setDrawer(false)} />
          <div className="f-drawer__panel">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', marginBottom: 20 }}>New Catch Alert</div>
            <form onSubmit={handleSubmit}>
              <div className="f-field">
                <label className="f-label">Species *</label>
                <select className="f-input" value={form.speciesId} onChange={e => setForm(f => ({ ...f, speciesId: e.target.value }))} required>
                  <option value="">Select species…</option>
                  {(speciesQ.data ?? []).map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
                </select>
              </div>
              <div className="f-field">
                <label className="f-label">Expires in (hours) *</label>
                <input className="f-input" type="number" min={1} max={48} value={form.expiresInHours}
                  onChange={e => setForm(f => ({ ...f, expiresInHours: e.target.value }))} required />
              </div>
              <div className="f-field">
                <label className="f-label">Quantity (kg)</label>
                <input className="f-input" type="number" min={0} value={form.quantityKg}
                  onChange={e => setForm(f => ({ ...f, quantityKg: e.target.value }))} />
              </div>
              <div className="f-field">
                <label className="f-label">Landing site</label>
                <input className="f-input" value={form.landingSite}
                  onChange={e => setForm(f => ({ ...f, landingSite: e.target.value }))} />
              </div>
              <div className="f-field">
                <label className="f-label">Asking price per kg (₱)</label>
                <input className="f-input" type="number" min={0} value={form.askingPricePerKg}
                  onChange={e => setForm(f => ({ ...f, askingPricePerKg: e.target.value }))} />
              </div>
              <div className="f-field">
                <label className="f-label">Notes</label>
                <input className="f-input" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn--ghost" onClick={() => setDrawer(false)}>Cancel</button>
                <button type="submit" className="btn btn--lime" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Creating…' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
