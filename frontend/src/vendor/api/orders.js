import { apiGet, apiPost } from '../../api'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null) p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const listInbox = (bucket, kind) =>
  apiGet(`/vendor/orders${qs({ bucket, kind })}`)

export const acceptOrder = (orderId) =>
  apiPost(`/vendor/orders/${orderId}/accept`)

export const markOrderReady = (orderId) =>
  apiPost(`/vendor/orders/${orderId}/ready`)

export const completeOrder = (orderId) =>
  apiPost(`/vendor/orders/${orderId}/complete`)

export const cancelOrder = (orderId, reason) =>
  apiPost(`/vendor/orders/${orderId}/cancel`, null, reason ? { reason } : undefined)
