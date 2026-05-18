import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { listCatchAlerts, createCatchAlert, cancelCatchAlert } from './api/catchAlerts'
import { fetchSpecies } from '../api/lookup'

export default function CatchAlerts({ setPage }) {
  const qc = useQueryClient()
  const alertsQ = useQuery({ queryKey: ['fisherman', 'catch-alerts'], queryFn: listCatchAlerts })
  const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })
  const alerts = alertsQ.data ?? []

  const [drawer, setDrawer] = useState(false)
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
    if (els.length) gsap.from(els, { opacity: 0, y: 16, stagger: 0.04, duration: 0.2 })
  }, [alerts.length])

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

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem' }}>Catch Alerts</div>
        <button className="f-btn f-btn--primary" onClick={() => setDrawer(true)}>+ Create Alert</button>
      </div>

      {alertsQ.isError && <div className="f-error">Failed<span className="f-error__retry" onClick={alertsQ.refetch}>Retry</span></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {alerts.map((a, i) => (
          <div key={a.id} className="f-card" style={{ padding: 20 }} ref={el => { cardRefs.current[i] = el }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{a.species?.commonName ?? a.speciesName ?? '—'}</div>
              <span className={`f-chip ${a.status === 'ACTIVE' ? 'f-chip--lime' : 'f-chip--muted'}`}>{a.status}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              {a.quantityKg != null ? `${a.quantityKg} kg` : a.quantityEstimate ?? '—'}
              {a.askingPricePerKg != null && ` · ₱${a.askingPricePerKg}/kg`}
            </div>
            {a.landingSite && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{a.landingSite}</div>}
            {a.status === 'ACTIVE' && (
              <button className="f-btn f-btn--danger f-btn--sm" style={{ marginTop: 12 }}
                onClick={() => cancelMut.mutate(a.id)} disabled={cancelMut.isPending}>
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>

      {drawer && (
        <div className="f-drawer">
          <div className="f-drawer__backdrop" onClick={() => setDrawer(false)} />
          <div className="f-drawer__panel">
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '1.1rem', marginBottom: 20 }}>New Catch Alert</div>
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
                <button type="button" className="f-btn f-btn--secondary" onClick={() => setDrawer(false)}>Cancel</button>
                <button type="submit" className="f-btn f-btn--primary" disabled={createMut.isPending}>
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
