import { useState, useEffect, useRef, useCallback } from 'react'
import { apiGet, apiPost } from '../../api'

export default function FishermanNotificationsBell() {
  const [count, setCount]   = useState(0)
  const [open, setOpen]     = useState(false)
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const fetchCount = useCallback(() => {
    apiGet('/notifications/unread-count').then(d => setCount(d?.count ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 30_000)
    return () => clearInterval(id)
  }, [fetchCount])

  const open_ = () => {
    setOpen(o => !o)
    if (!open) {
      setLoading(true)
      apiGet('/notifications?limit=10')
        .then(d => setItems(Array.isArray(d) ? d : d?.content || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }

  const markAll = async () => {
    await apiPost('/notifications/mark-all-read', null, {}).catch(() => {})
    setCount(0)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar__icon-btn"
        onClick={open_}
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--unsafe)', color: 'var(--paper)',
            borderRadius: '50%', fontSize: 9, fontWeight: 700,
            width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100,
          width: 320, background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, boxShadow: 'var(--shadow-2)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Notifications</span>
            {count > 0 && (
              <button onClick={markAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No notifications</div>
            ) : items.map(n => (
              <div key={n.id} style={{
                padding: '10px 16px', borderBottom: '1px solid var(--line)',
                background: n.read ? undefined : 'var(--accent-soft)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: n.read ? 400 : 600 }}>{n.title || n.message}</div>
                {n.body && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{n.body}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
