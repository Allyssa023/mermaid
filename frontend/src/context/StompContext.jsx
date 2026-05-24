import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createStompClient } from '../api/stomp'

const StompContext = createContext(null)

export function StompProvider({ children }) {
  const qc = useQueryClient()
  const clientRef = useRef(null)
  const subsRef = useRef([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const teardownSubs = () => {
      for (const sub of subsRef.current) {
        try { sub.unsubscribe() } catch (e) { console.error('STOMP unsubscribe error', e) }
      }
      subsRef.current = []
    }

    const client = createStompClient({
      onConnect: (c) => {
        // Defensive: clear any stale handles before re-subscribing on reconnect
        teardownSubs()
        setConnected(true)

        // Deal events: invalidate per-deal + the user's deal list
        const dealsSub = c.subscribe('/user/queue/deals', (frame) => {
          try {
            const evt = JSON.parse(frame.body)
            if (evt?.dealId != null) {
              qc.invalidateQueries({ queryKey: ['deal', evt.dealId] })
            }
            // COMPETITOR_COUNT_CHANGED carries only `alertId` (no `dealId`),
            // because it broadcasts to all participants of a single alert.
            // Since competitor-count is cached per-deal, we invalidate ALL
            // ['deal', X, 'competitorCount'] queries via a predicate. This is
            // pragmatic: there are few in-flight deal panes per user, and the
            // refetch is cheap (single integer endpoint).
            if (evt?.kind === 'COMPETITOR_COUNT_CHANGED') {
              qc.invalidateQueries({
                predicate: (q) =>
                  q.queryKey[0] === 'deal' && q.queryKey[2] === 'competitorCount',
              })
            }
            qc.invalidateQueries({ queryKey: ['deals', 'mine'] })
          } catch (e) {
            console.error('STOMP /user/queue/deals parse error', e)
          }
        })

        // Chat messages: invalidate deal thread when message is deal-tagged,
        // otherwise invalidate the plain 1:1 conversation cache.
        const messagesSub = c.subscribe('/user/queue/messages', (frame) => {
          try {
            const msg = JSON.parse(frame.body)
            if (msg?.dealId != null) {
              qc.invalidateQueries({ queryKey: ['deal', msg.dealId, 'messages'] })
              qc.invalidateQueries({ queryKey: ['deals', 'mine'] })
            }
            const otherUserId = msg?.senderId ?? msg?.recipientId
            if (otherUserId != null) {
              qc.invalidateQueries({ queryKey: ['conversation', otherUserId] })
            }
            qc.invalidateQueries({ queryKey: ['chatUsers'] })
          } catch (e) {
            console.error('STOMP /user/queue/messages parse error', e)
          }
        })

        // Notifications: refresh bell + notifications list
        const notificationsSub = c.subscribe('/user/queue/notifications', () => {
          qc.invalidateQueries({ queryKey: ['notifications'] })
          qc.invalidateQueries({ queryKey: ['notifCount'] })
        })

        // Per-user live entity changes (orders, my catch alerts, inventory)
        const liveSub = c.subscribe('/user/queue/live', (frame) => {
          try {
            const evt = JSON.parse(frame.body)
            const kind = evt?.kind
            const payload = evt?.payload ?? {}
            if (kind === 'ORDER_CHANGED') {
              qc.invalidateQueries({ queryKey: ['orders'] })
              qc.invalidateQueries({ queryKey: ['buyerOrders'] })
              qc.invalidateQueries({ queryKey: ['vendor', 'orders'] })
              qc.invalidateQueries({ queryKey: ['vendor', 'supplierOrders'] })
              qc.invalidateQueries({ queryKey: ['fisherman', 'orders'] })
              qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] })
              if (payload.orderId != null) {
                qc.invalidateQueries({ queryKey: ['order', payload.orderId] })
                qc.invalidateQueries({ queryKey: ['orderTimeline', payload.orderId] })
              }
            } else if (kind === 'MY_CATCH_ALERT_CHANGED') {
              qc.invalidateQueries({ queryKey: ['fisherman', 'catch-alerts'] })
              qc.invalidateQueries({ queryKey: ['catchAlerts', 'own'] })
            } else if (kind === 'INVENTORY_CHANGED') {
              qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] })
              qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
              qc.invalidateQueries({ queryKey: ['buyerListings'] })
              qc.invalidateQueries({ queryKey: ['listingDetail'] })
              qc.invalidateQueries({ queryKey: ['vendor', 'home'] })
            } else if (kind === 'CART_CHANGED') {
              // Invalidate any RQ-backed cart consumers
              qc.invalidateQueries({ queryKey: ['cart'] })
              qc.invalidateQueries({ queryKey: ['vendor', 'cart'] })
              // BuyerCartContext sits outside StompProvider — signal via DOM event.
              try {
                window.dispatchEvent(new CustomEvent('mermaid:cart-changed', { detail: payload }))
              } catch (_) { /* SSR / non-browser */ }
            }
          } catch (e) {
            console.error('STOMP /user/queue/live parse error', e)
          }
        })

        // Broadcast topic: catch alerts feed (vendor procurement)
        const alertsTopicSub = c.subscribe('/topic/catch-alerts', (frame) => {
          try {
            const evt = JSON.parse(frame.body)
            if (evt?.kind === 'CATCH_ALERT_CHANGED') {
              qc.invalidateQueries({ queryKey: ['vendor', 'feed'] })
              qc.invalidateQueries({ queryKey: ['catchAlerts'] })
            }
          } catch (e) {
            console.error('STOMP /topic/catch-alerts parse error', e)
          }
        })

        subsRef.current = [dealsSub, messagesSub, notificationsSub, liveSub, alertsTopicSub]
      },
      onDisconnect: () => {
        teardownSubs()
        setConnected(false)
      },
    })
    clientRef.current = client
    client.activate()
    return () => {
      teardownSubs()
      clientRef.current = null
      client.deactivate()
    }
  }, [qc])

  const value = useMemo(() => ({
    get client() { return clientRef.current },
    connected,
    subscribe(destination, callback) {
      const c = clientRef.current
      if (!c?.connected) return null
      return c.subscribe(destination, (frame) => {
        try { callback(JSON.parse(frame.body), frame) } catch (e) { console.error('STOMP subscribe parse error', e) }
      })
    },
    send(destination, body) {
      const c = clientRef.current
      if (!c?.connected) return false
      c.publish({ destination, body: typeof body === 'string' ? body : JSON.stringify(body) })
      return true
    },
    sendChatMessage(recipientId, content, dealId = null) {
      const c = clientRef.current
      if (!c?.connected) return false
      const payload = { recipientId, content }
      if (dealId != null) payload.dealId = dealId
      c.publish({ destination: '/app/chat.send', body: JSON.stringify(payload) })
      return true
    },
  }), [connected])

  return <StompContext.Provider value={value}>{children}</StompContext.Provider>
}

export function useStomp() {
  const ctx = useContext(StompContext)
  if (!ctx) throw new Error('useStomp must be used inside <StompProvider>')
  return ctx
}
