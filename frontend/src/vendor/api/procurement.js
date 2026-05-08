import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../../api'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null) p.set(k, v) })
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
export const checkout = () => apiPost('/vendor/procurement/checkout')

// Orders (vendor as buyer)
export const listProcurementOrders = (bucket) =>
  apiGet(`/vendor/procurement/orders${qs({ bucket })}`)
export const cancelProcurementOrder = (orderId, reason) =>
  apiPost(`/vendor/procurement/orders/${orderId}/cancel`, null, reason ? { reason } : undefined)

// Preorders
export const placePreorder = (fishermanId, speciesId, qtyKg, pricePerKg, notes) =>
  apiPost('/vendor/procurement/preorders', null, { fishermanId, speciesId, qtyKg, pricePerKg, notes })
export const listPreviousFishermen = () => apiGet('/vendor/procurement/fishermen')

// Fisherman-side (for the fisherman dashboard tab)
export const listFishermanProcurementOrders = (bucket) =>
  apiGet(`/fisherman/procurement-orders${qs({ bucket })}`)
export const fishermanAccept = (orderId) =>
  apiPost(`/fisherman/procurement-orders/${orderId}/accept`)
export const fishermanMarkReady = (orderId) =>
  apiPost(`/fisherman/procurement-orders/${orderId}/ready`)
export const fishermanComplete = (orderId) =>
  apiPost(`/fisherman/procurement-orders/${orderId}/complete`)
export const fishermanCancel = (orderId, reason) =>
  apiPost(`/fisherman/procurement-orders/${orderId}/cancel`, null, reason ? { reason } : undefined)

export const settleOrder = (id, body) =>
  apiPut(`/vendor/procurement-orders/${id}/settle`, null, body)
