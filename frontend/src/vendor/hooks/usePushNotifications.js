import { useState, useCallback } from 'react'

export function usePushNotifications({ onNotification } = {}) {
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'unsupported'
  )

  const request = useCallback(async () => {
    if (!supported) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      try { await navigator.serviceWorker.register('/sw.js') } catch (_) {}
    }
    return result
  }, [supported])

  const fire = useCallback((title, options = {}) => {
    if (!supported || permission !== 'granted') return
    try {
      new Notification(title, options)
    } catch (_) {}
  }, [supported, permission])

  return { permission, supported, request, fire }
}
