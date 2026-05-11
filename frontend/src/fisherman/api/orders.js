// frontend/src/fisherman/api/orders.js
import { apiGet, apiPost, apiPut } from '../../api'

// GET /orders/mine?status=... (api.yaml: /orders/mine, not /orders)
export const listOrders      = (status) => apiGet(`/orders/mine${status ? `?status=${status}` : ''}`)

// No GET /orders/{orderId} in api.yaml; use /orders/mine and filter client-side, or keep for future use
export const getOrder        = (id)     => apiGet(`/orders/${id}`)

// PUT /orders/{orderId}/confirm (api.yaml uses PUT, not POST)
export const confirmOrder    = (id)     => apiPut(`/orders/${id}/confirm`, null, {})

// PUT /orders/{orderId}/cancel (api.yaml uses PUT, not POST)
export const cancelOrder     = (id, reason) => apiPut(`/orders/${id}/cancel`, null, { reason })

// POST /orders/{orderId}/handoff (matches spec)
export const initiateHandoff = (id, body)   => apiPost(`/orders/${id}/handoff`, null, body)

// PUT /orders/{orderId}/handoff/confirm-seller (api.yaml: confirm-seller, not /confirm)
export const confirmHandoff  = (id)         => apiPut(`/orders/${id}/handoff/confirm-seller`, null, {})

// POST /orders/{orderId}/payment (matches spec)
export const recordPayment   = (id, body)   => apiPost(`/orders/${id}/payment`, null, body)

// PUT /orders/{orderId}/payment/confirm (api.yaml uses PUT, not POST)
export const confirmPayment  = (id)         => apiPut(`/orders/${id}/payment/confirm`, null, {})

// GET /orders/{orderId}/timeline (matches spec)
export const getTimeline     = (id)         => apiGet(`/orders/${id}/timeline`)

// POST /fisherman/procurement-orders/{id}/dispute (api.yaml: no /orders/{id}/dispute — closest is this)
export const raiseDispute    = (id, body)   => apiPost(`/fisherman/procurement-orders/${id}/dispute`, null, body)
