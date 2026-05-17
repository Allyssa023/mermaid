import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../../api'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Feed
export const getFeed = (speciesId, maxAgeMins) =>
  apiGet(`/vendor/procurement/feed${qs({ speciesId, maxAgeMins })}`)

// Cart
export const getCart = () => apiGet('/vendor/procurement/cart')
export const addToCart = (catchAlertId, qtyKg, offeredPricePerKg) =>
  apiPost('/vendor/procurement/cart/items', null, { catchAlertId, qtyKg, offeredPricePerKg })
export const updateCartItem = (itemId, qtyKg, offeredPricePerKg) =>
  apiPatch(`/vendor/procurement/cart/items/${itemId}`, null, { qtyKg, offeredPricePerKg })
export const removeCartItem = (itemId) =>
  apiDelete(`/vendor/procurement/cart/items/${itemId}`)
export const startDealFromCartItem = (itemId) => apiPost(`/vendor/procurement/cart/items/${itemId}/deal`, null, {})

// Orders (vendor as buyer) — unified retail flow via /orders endpoints
export const listMySupplierOrders = (status) =>
  apiGet(`/orders/mine${status ? `?status=${status}` : ''}`)

export const initiateHandoff = (id, body) => apiPost(`/orders/${id}/handoff`, null, body)
export const confirmHandoff  = (id)       => apiPut(`/orders/${id}/handoff/confirm-buyer`, null, {})
export const recordPayment   = (id, body) => apiPost(`/orders/${id}/payment`, null, body)
export const confirmPayment  = (id)       => apiPut(`/orders/${id}/payment/confirm`, null, {})
export const cancelOrder     = (id, reason) => apiPut(`/orders/${id}/cancel`, null, { reason })

// Preorders
export const placePreorder = (fishermanId, speciesId, qtyKg, pricePerKg, notes) =>
  apiPost('/vendor/procurement/preorders', null, { fishermanId, speciesId, qtyKg, pricePerKg, notes })
export const listPreviousFishermen = () => apiGet('/vendor/procurement/fishermen')

// Settlement + disputes + payout (vendor-side)
export const settleOrder = (id, body) =>
  apiPut(`/vendor/procurement-orders/${id}/settle`, null, body)

export const raiseDisputeVendor   = (id, body) => apiPost(`/vendor/procurement-orders/${id}/dispute`, null, body)
export const getDisputeVendor     = (id)       => apiGet(`/vendor/procurement-orders/${id}/dispute`)
export const resolveDisputeVendor = (id, body) => apiPut(`/vendor/procurement-orders/${id}/dispute/resolve`, null, body)

export const initiateOrderPayout = (orderId, channel) =>
  apiPost(`/orders/${orderId}/payout`, null, { channel })

// Xendit payment-intent — buyer/vendor side. After handoff is confirmed, the
// vendor (acting as buyer of the deal) requests a payment intent and follows
// the redirectUrl to complete payment.
export const createOrderPaymentIntent = (orderId, method) =>
  apiPost(`/buyer/orders/${orderId}/payment-intent?method=${encodeURIComponent(method)}`, null, {})

// Credit settlement — vendor pays off an outstanding credit (utang)
export const settleCredit = (orderId, body) =>
  apiPut(`/orders/${orderId}/credit/settle`, null, body)
