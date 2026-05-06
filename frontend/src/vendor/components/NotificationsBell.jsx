import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPut } from '../../api'
import { I } from '../../icons'
import { timeAgo } from '../../buyer/utils/format'
import { usePushNotifications } from '../hooks/usePushNotifications'

const CURSOR_KEY = 'vendor_notif_cursor'

export default function VendorNotificationsBell() {
  const navigate = useNavigate()
  const [open, setOpen]       = useState(false)
  const [items, setItems]     = useState([])
  const [unread, setUnread]   = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const { permission, request, fire } = usePushNotifications()

  async function refreshCount() {
    try {
      const r = await apiGet('/notifications/unread-count')
      setUnread(r?.count || 0)
    } catch { /* ignore */ }
  }

  async function pollForPush() {
    try {
      const list = await apiGet('/notifications?size=20')
      const notifs = Array.isArray(list) ? list : []
      const cursor = parseInt(localStorage.getItem(CURSOR_KEY) || '0', 10)
      const fresh = notifs.filter(n => n.id > cursor && n.type === 'CATCH_ALERT_NEW')
      if (fresh.length > 0) {
        if (permission !== 'granted') {
          // Prompt once when first CATCH_ALERT_NEW arrives
          await request()
        }
        fresh.forEach(n => {
          fire(n.title || 'New catch alert', {
            body: n.body,
            icon: '/logo.png',
            data: { url: n.link || '/vendor/procurement' },
          })
        })
        const maxId = Math.max(...notifs.map(n => n.id))
        localStorage.setItem(CURSOR_KEY, String(maxId))
      } else if (notifs.length > 0 && cursor === 0) {
        const maxId = Math.max(...notifs.map(n => n.id))
        localStorage.setItem(CURSOR_KEY, String(maxId))
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refreshCount()
    pollForPush()
    const t = setInterval(() => { refreshCount(); pollForPush() }, 15_000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission])

  async function loadList() {
    setLoading(true)
    try {
      const list = await apiGet('/notifications?size=15')
      setItems(Array.isArray(list) ? list : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (open) loadList() }, [open])

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
      <button
        title="Notifications"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
          color: '#374151',
        }}
      >
        <I.Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 14, height: 14, borderRadius: 99,
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 340, maxHeight: 420, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid #f3f4f6',
          }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{
                fontSize: 12, background: 'none', border: 'none',
                color: '#2563eb', cursor: 'pointer', padding: 0,
              }}>Mark all read</button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: 14, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 24, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                You're all caught up.
              </div>
            ) : items.map(n => {
              const isUnread = !n.readAt
              const isCatchAlert = n.type === 'CATCH_ALERT_NEW'
              return (
                <div key={n.id} onClick={() => handleClickItem(n)} style={{
                  padding: '12px 14px', borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  background: isUnread ? '#fafafa' : 'transparent',
                  display: 'flex', gap: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                    background: isUnread ? (isCatchAlert ? '#2563eb' : '#f59e0b') : 'transparent',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isUnread ? 600 : 500, fontSize: 13 }}>
                      {isCatchAlert ? 'Catch Alert' : n.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
