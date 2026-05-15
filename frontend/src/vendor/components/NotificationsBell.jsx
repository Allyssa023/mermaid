import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../../icons'
import { timeAgo } from '../../buyer/utils/format'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useStomp } from '../../context/StompContext'
import { getNotifications, markRead, markAllRead, getUnreadCount } from '../../api/notifications'

const CURSOR_KEY = 'vendor_notif_cursor'
const DEAL_KINDS = new Set(['DEAL_NEW_PROPOSAL', 'DEAL_AGREED'])

function dealNotifTitle(kind) {
  if (kind === 'DEAL_NEW_PROPOSAL') return 'New deal proposal'
  if (kind === 'DEAL_AGREED') return 'Deal agreed'
  return 'Deal update'
}

export default function VendorNotificationsBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const { permission, request, fire } = usePushNotifications()
  const stomp = useStomp()
  const [dealEvents, setDealEvents] = useState([])

  const countQ = useQuery({
    queryKey: ['notifCount'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
    staleTime: 0,
  })
  const baseUnread = countQ.data?.count ?? 0

  // Always poll in background so push notifications fire even when dropdown is closed
  const notifsQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ size: 20 }),
    refetchInterval: 30000,
    staleTime: 0,
  })
  const restItems = Array.isArray(notifsQ.data) ? notifsQ.data : []
  // Merge in-memory deal events (newest first) with REST list
  const items = [...dealEvents, ...restItems]
  const unread = baseUnread + dealEvents.filter(e => !e.readAt).length

  // Subscribe to STOMP deal notifications and render them in the bell
  useEffect(() => {
    if (!stomp.connected) return
    const sub = stomp.subscribe('/user/queue/notifications', (msg) => {
      if (!msg || !DEAL_KINDS.has(msg.kind)) return
      const id = `deal-${msg.kind}-${msg.dealId}-${Date.now()}`
      const link = msg.kind === 'DEAL_AGREED'
        ? '/vendor/orders'
        : `/vendor/messages?deal=${msg.dealId}`
      const entry = {
        id,
        type: msg.kind,
        title: dealNotifTitle(msg.kind),
        body: msg.text,
        link,
        dealId: msg.dealId,
        readAt: null,
        createdAt: new Date().toISOString(),
        _ephemeral: true,
      }
      setDealEvents(prev => [entry, ...prev].slice(0, 20))
      if (permission !== 'granted') request()
      fire(entry.title, { body: entry.body, icon: '/logo.png', data: { url: entry.link } })
    })
    return () => { try { sub?.unsubscribe() } catch { /* ignore */ } }
  }, [stomp, stomp.connected, permission, request, fire])

  // Handle push notifications for CATCH_ALERT_NEW when list refetches
  useEffect(() => {
    if (!notifsQ.data) return
    const notifs = Array.isArray(notifsQ.data) ? notifsQ.data : []
    const cursor = parseInt(localStorage.getItem(CURSOR_KEY) || '0', 10)
    const fresh = notifs.filter(n => n.id > cursor && n.type === 'CATCH_ALERT_NEW')
    if (fresh.length > 0) {
      if (permission !== 'granted') request()
      fresh.forEach(n => fire(n.title || 'New catch alert', {
        body: n.body,
        icon: '/logo.png',
        data: { url: n.link || '/vendor/procurement' },
      }))
      const maxId = Math.max(...notifs.map(n => n.id))
      localStorage.setItem(CURSOR_KEY, String(maxId))
    } else if (notifs.length > 0 && cursor === 0) {
      const maxId = Math.max(...notifs.map(n => n.id))
      localStorage.setItem(CURSOR_KEY, String(maxId))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifsQ.data])

  const markReadMut = useMutation({
    mutationFn: (id) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifCount'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifCount'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function handleClickItem(n) {
    if (n._ephemeral) {
      // Mark in-memory deal event as read locally
      setDealEvents(prev => prev.map(e => e.id === n.id ? { ...e, readAt: new Date().toISOString() } : e))
    } else if (!n.readAt) {
      markReadMut.mutate(n.id)
    }
    if (n.type === 'DEAL_NEW_PROPOSAL' && n.dealId != null) {
      navigate(`/vendor/messages?deal=${n.dealId}`)
    } else if (n.type === 'DEAL_AGREED') {
      navigate('/vendor/orders')
    } else if (n.link) {
      navigate(n.link)
    }
    setOpen(false)
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
              <button onClick={() => markAllMut.mutate()} style={{
                fontSize: 12, background: 'none', border: 'none',
                color: '#2563eb', cursor: 'pointer', padding: 0,
              }}>Mark all read</button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifsQ.isLoading && items.length === 0 ? (
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
