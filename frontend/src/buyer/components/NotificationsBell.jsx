import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPut } from '../../api'
import { I } from '../../icons'
import { timeAgo } from '../utils/format'

export default function NotificationsBell() {
  const navigate = useNavigate()
  const [open, setOpen]         = useState(false)
  const [items, setItems]       = useState([])
  const [unread, setUnread]     = useState(0)
  const [loading, setLoading]   = useState(false)
  const wrapRef = useRef(null)

  async function refreshCount() {
    try {
      const r = await apiGet('/notifications/unread-count')
      setUnread(r?.count || 0)
    } catch { /* ignore */ }
  }

  async function loadList() {
    setLoading(true)
    try {
      const list = await apiGet('/notifications?size=10')
      setItems(Array.isArray(list) ? list : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshCount()
    const t = setInterval(refreshCount, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (open) loadList()
  }, [open])

  // Click-outside to close
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function handleClickItem(n) {
    if (!n.readAt) {
      try {
        await apiPut(`/notifications/${n.id}/read`)
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
        setUnread(c => Math.max(0, c - 1))
      } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link)
    setOpen(false)
  }

  async function handleMarkAll() {
    try {
      await apiPut('/notifications/read-all')
      setItems(prev => prev.map(x => ({ ...x, readAt: x.readAt || new Date().toISOString() })))
      setUnread(0)
    } catch { /* ignore */ }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button className="topbar__icon-btn" title="Notifications" onClick={() => setOpen(o => !o)}>
        <I.Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 14, height: 14, borderRadius: 99,
            background: 'var(--unsafe)', color: '#fff',
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="card" style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 360, maxHeight: 480, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid var(--border, #eee)',
          }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {unread > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
              </div>
            ) : items.length === 0 ? (
              <div className="muted-data" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
                You're all caught up.
              </div>
            ) : (
              items.map(n => {
                const isUnread = !n.readAt
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border, #eee)',
                      cursor: 'pointer',
                      background: isUnread ? 'var(--surface-2, #fafafa)' : 'transparent',
                      display: 'flex', gap: 10,
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isUnread ? 'var(--accent, #f5a524)' : 'transparent',
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isUnread ? 600 : 500, fontSize: 13 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                      <div className="muted-data" style={{ fontSize: 11, marginTop: 4 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
