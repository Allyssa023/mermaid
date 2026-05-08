import { useState, useEffect, useRef, useCallback } from 'react'

const BASE_MS = 10_000
const MAX_MS  = 60_000

export function useFishermanPolling(fetcher, deps = []) {
  const [data, setData]     = useState(null)
  const [isStale, setStale] = useState(false)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(true)
  const delayRef            = useRef(BASE_MS)
  const timerRef            = useRef(null)
  const mountedRef          = useRef(true)

  const poll = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const result = await fetcher()
      if (!mountedRef.current) return
      setData(result)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

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
    setLoading(true)
    poll()
  }, [poll])

  return { data, isStale, error, loading, refetch }
}
