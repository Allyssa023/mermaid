import { Client } from '@stomp/stompjs'

/**
 * Create a STOMP client configured for the Mermaid /api/ws-chat endpoint.
 * Framework-free: callers wire onConnect/onDisconnect to do subscriptions
 * and React state updates.
 *
 * @param {object} opts
 * @param {(client: Client) => void} [opts.onConnect]
 * @param {(client: Client) => void} [opts.onDisconnect]
 * @returns {Client}
 */
export function createStompClient({ onConnect, onDisconnect } = {}) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const client = new Client({
    brokerURL: `${proto}//${window.location.host}/api/ws-chat`,
    reconnectDelay: 5000,
    onConnect: () => {
      try { onConnect?.(client) } catch (e) { console.error('STOMP onConnect handler error', e) }
    },
    onDisconnect: () => {
      try { onDisconnect?.(client) } catch (e) { console.error('STOMP onDisconnect handler error', e) }
    },
  })
  return client
}
