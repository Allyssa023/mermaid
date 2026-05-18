import { apiGet, apiPost } from '../../api'

export const placeOrder = (body) => apiPost('/buyer/orders', null, body)

export const listOrders = (status) =>
  apiGet('/buyer/orders' + (status ? `?status=${status}` : ''))

export const getOrder = (orderId) =>
  apiGet(`/buyer/orders/${orderId}`)

export const cancelOrder = (orderId, reason) =>
  apiPost(`/buyer/orders/${orderId}/cancel`, null, { reason })

export const reorder = (orderId) =>
  apiPost(`/buyer/orders/${orderId}/reorder`, null, {})

export const getTimeline = (orderId) =>
  apiGet(`/buyer/orders/${orderId}/timeline`)

export const confirmReceipt      = (orderId)         => apiPost(`/buyer/orders/${orderId}/confirm-receipt`, null, {})
export const disputeOrder        = (orderId, body)   => apiPost(`/buyer/orders/${orderId}/dispute`, null, body)
export const createPaymentIntent = (orderId, method) => apiPost(`/buyer/orders/${orderId}/payment-intent?method=${method}`, null, {})
