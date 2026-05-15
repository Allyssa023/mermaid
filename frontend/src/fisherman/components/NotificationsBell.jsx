import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markAllRead, getUnreadCount } from '../../api/notifications'
import { useStomp } from '../../context/StompContext'

const DEAL_KINDS = new Set(['DEAL_NEW_PROPOSAL', 'DEAL_AGREED'])

function dealNotifTitle(kind) {
  if (kind === 'DEAL_NEW_PROPOSAL') return 'New deal proposal'
  if (kind === 'DEAL_AGREED') return 'Deal agreed'
  return 'Deal update'
}

export default function FishermanNotificationsBell() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const stomp = useStomp()
  const [dealEvents, setDealEvents] = useState([])

  const countQ = useQuery({
    queryKey: ['notifCount'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
    staleTime: 0,
  })
  const baseCount = countQ.data?.count ?? 0
  const unreadDealEvents = dealEvents.filter(e => !e.readAt).length
  const count = baseCount + unreadDealEvents

  const listQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ size: 10 }),
    enabled: open,
    staleTime: 0,
  })
  const restItems = Array.isArray(listQ.data) ? listQ.data : []
  const items = [...dealEvents, ...restItems]

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifCount'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Subscribe to STOMP deal notifications so they show in the bell
  useEffect(() => {
    if (!stomp.connected) return
    const sub = stomp.subscribe('/user/queue/notifications', (msg) => {
      if (!msg || !DEAL_KINDS.has(msg.kind)) return
      const entry = {
        id: `deal-${msg.kind}-${msg.dealId}-${Date.now()}`,
        type: msg.kind,
        title: dealNotifTitle(msg.kind),
        body: msg.text,
        dealId: msg.dealId,
        readAt: null,
        createdAt: new Date().toISOString(),
        _ephemeral: true,
      }
      setDealEvents(prev => [entry, ...prev].slice(0, 20))
    })
    return () => { try { sub?.unsubscribe() } catch { /* ignore */ } }
  }, [stomp, stomp.connected])

  function handleClickItem(n) {
    if (n._ephemeral) {
      setDealEvents(prev => prev.map(e => e.id === n.id ? { ...e, readAt: new Date().toISOString() } : e))
    }
    if (n.type === 'DEAL_NEW_PROPOSAL' && n.dealId != null) {
      window.dispatchEvent(new CustomEvent('mermaid:navigate', { detail: { page: 'messages', dealId: n.dealId } }))
    } else if (n.type === 'DEAL_AGREED') {
      window.dispatchEvent(new CustomEvent('mermaid:navigate', { detail: { page: 'orders' } }))
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar__icon-btn"
        onClick={() => setOpen(o => !o)}
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
              <button onClick={() => markAllMut.mutate()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {listQ.isLoading && items.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No notifications</div>
            ) : items.map(n => {
              const clickable = n._ephemeral || DEAL_KINDS.has(n.type)
              return (
                <div
                  key={n.id}
                  onClick={clickable ? () => handleClickItem(n) : undefined}
                  style={{
                    padding: '10px 16px', borderBottom: '1px solid var(--line)',
                    background: n.readAt ? undefined : 'var(--accent-soft)',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: n.readAt ? 400 : 600 }}>{n.title || n.message}</div>
                  {n.body && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{n.body}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
