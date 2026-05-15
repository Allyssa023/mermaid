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
            }
            const otherUserId = msg?.senderId ?? msg?.recipientId
            if (otherUserId != null) {
              qc.invalidateQueries({ queryKey: ['conversation', otherUserId] })
            }
          } catch (e) {
            console.error('STOMP /user/queue/messages parse error', e)
          }
        })

        // Notifications: refresh bell + notifications list
        const notificationsSub = c.subscribe('/user/queue/notifications', () => {
          qc.invalidateQueries({ queryKey: ['notifications'] })
        })

        subsRef.current = [dealsSub, messagesSub, notificationsSub]
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
