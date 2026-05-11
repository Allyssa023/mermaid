import { useState, useEffect, useRef, useCallback } from 'react'

const BASE_MS = 30_000
const MAX_MS  = 120_000

// Stable shallow-compare for arrays of objects with an id + status — avoids
// replacing the array reference (and remounting child components) when the
// polled result is structurally identical to what's already in state.
function sameOrders(a, b) {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i]
    if (!x || !y) return false
    if (x.id !== y.id) return false
    if (x.status !== y.status) return false
    if (x.updatedAt !== y.updatedAt) return false
  }
  return true
}

export function useFishermanPolling(fetcher) {
  const [data, setData]     = useState(null)
  const [isStale, setStale] = useState(false)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(true)
  const delayRef            = useRef(BASE_MS)
  const timerRef            = useRef(null)
  const mountedRef          = useRef(true)
  const dataRef             = useRef(null)

  const poll = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const result = await fetcher()
      if (!mountedRef.current) return
      // Only update state when the polled data actually differs — prevents
      // unnecessary re-renders that cause UI flicker.
      if (!sameOrders(dataRef.current, result)) {
        dataRef.current = result
        setData(result)
      }
      setStale(false)
      setError(null)
      delayRef.current = BASE_MS
    } catch (err) {
      if (!mountedRef.current) return
      setStale(true)
      setError(err)
      delayRef.current = Math.min(delayRef.current * 2, MAX_MS)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        timerRef.current = setTimeout(poll, delayRef.current)
      }
    }
  }, [fetcher])

  useEffect(() => {
    mountedRef.current = true
    delayRef.current = BASE_MS
    setLoading(true)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timerRef.current)
        poll()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    poll()

    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [poll])

  const refetch = useCallback(() => {
    clearTimeout(timerRef.current)
    delayRef.current = BASE_MS
    poll()
  }, [poll])

  return { data, isStale, error, loading, refetch }
}
