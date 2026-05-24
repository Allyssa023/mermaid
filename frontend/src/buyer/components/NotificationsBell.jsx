import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../../icons'
import { timeAgo } from '../utils/format'
import { getNotifications, markRead, markAllRead, getUnreadCount } from '../../api/notifications'
import { useStomp } from '../../context/StompContext'

export default function NotificationsBell({ onNavigate, btnClassName = "topbar__icon-btn" }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const stomp = useStomp()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const countQ = useQuery({
    queryKey: ['notifCount'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
    staleTime: 0,
  })
  const unread = countQ.data?.count ?? 0

  const listQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ size: 10 }),
    enabled: open,
    staleTime: 0,
  })
  const items = Array.isArray(listQ.data) ? listQ.data : []

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
    if (!stomp || !stomp.connected) return
    const sub = stomp.subscribe('/user/queue/notifications', () => {
      qc.invalidateQueries({ queryKey: ['notifCount'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => {
      if (sub) sub.unsubscribe()
    }
  }, [stomp, stomp?.connected, qc])

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function handleClickItem(n) {
    if (!n.readAt) markReadMut.mutate(n.id)
    if (n.link) {
      if (onNavigate) {
        let dest = n.link
        if (dest.startsWith('/')) {
          dest = dest.substring(1)
        }
        if (dest.includes('order')) {
          onNavigate('borders')
        } else if (dest.includes('message')) {
          onNavigate('bmessages')
        } else if (dest.includes('cart')) {
          onNavigate('bcart')
        } else {
          onNavigate('bhome')
        }
      } else {
        navigate(n.link)
      }
    }
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button className={btnClassName} title="Notifications" onClick={() => setOpen(o => !o)} style={{ position: 'relative' }}>
        <I.Bell size={16} />
        {unread > 0 && (
          <span className="bell-btn__dot" style={{
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
              <button className="btn btn--ghost btn--sm" onClick={() => markAllMut.mutate()}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {listQ.isLoading && items.length === 0 ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
              </div>
            ) : items.length === 0 ? (
              <div className="muted-data" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
                You're all caught up — activity will appear here as orders progress.
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
