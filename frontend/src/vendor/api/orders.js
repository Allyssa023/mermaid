import { apiGet, apiPost, apiPut } from '../../api'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Seller-side (buyer→vendor) list. Server filters by sellerId from JWT.
export const listInbox = ({ status, buyerId, from, to } = {}) =>
  apiGet(`/vendor/orders${qs({ status, buyerId, from, to })}`)

// CSV export — server returns text/csv. Uses fetch directly to get a Blob.
export const exportOrders = async ({ status, from, to } = {}) => {
  const res = await fetch(`/api/vendor/orders/export${qs({ status, from, to })}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `Export failed (${res.status})`)
  }
  return res.blob()
}

// Retail-flow mutations — vendor-specific confirm uses the vendor endpoint (FISHERMAN role gates /orders/{id}/confirm).
export const confirmOrder    = (id)         => apiPost(`/vendor/orders/${id}/accept`, null, {})
export const markPreparing   = (id)         => apiPost(`/vendor/orders/${id}/preparing`, null, {})
export const markReady       = (id)         => apiPost(`/vendor/orders/${id}/ready`, null, {})
export const dispatchRider   = (id)         => apiPost(`/vendor/orders/${id}/dispatch`, null, {})
export const markDelivered   = (id, body)   => apiPost(`/vendor/orders/${id}/delivered`, null, body)
export const completePickup  = (id, body)   => apiPost(`/vendor/orders/${id}/complete`, null, body)
export const cancelOrder     = (id, reason) => apiPut(`/orders/${id}/cancel`, null, { reason })
export const initiateHandoff = (id, body)   => apiPost(`/orders/${id}/handoff`, null, body)
export const confirmHandoff  = (id)         => apiPut(`/orders/${id}/handoff/confirm-seller`, null, {})
export const recordPayment   = (id, body)   => apiPost(`/orders/${id}/payment`, null, body)
export const confirmPayment  = (id)         => apiPut(`/orders/${id}/payment/confirm`, null, {})
export const raiseDispute    = (id, body)   => apiPost(`/vendor/procurement-orders/${id}/dispute`, null, body)
