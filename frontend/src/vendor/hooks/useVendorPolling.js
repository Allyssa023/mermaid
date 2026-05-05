export function useVendorPolling(_fetcher, _opts) {
  return { data: null, error: null, loading: false, isStale: false, refetch: () => {} }
}
