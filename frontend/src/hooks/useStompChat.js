import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'

export function useStompChat({ onMessage, enabled = true }) {
  const clientRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const client = new Client({
      brokerURL: `${proto}//${window.location.host}/api/ws-chat`,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/messages', (frame) => {
          try { onMessageRef.current(JSON.parse(frame.body)) } catch {}
        })
      },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate() }
  }, [enabled])

  const send = useCallback((recipientId, content) => {
    const c = clientRef.current
    if (c?.connected) {
      c.publish({ destination: '/app/chat.send', body: JSON.stringify({ recipientId, content }) })
    }
  }, [])

  return { send }
}
