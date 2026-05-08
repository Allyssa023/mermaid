import { apiGet, apiPost, apiPatch } from '../../api'
export const listProcurementOrders = (bucket) => apiGet(`/fisherman/procurement-orders${bucket ? `?bucket=${bucket}` : ''}`)
export const acceptOrder    = (id) => apiPatch(`/fisherman/procurement-orders/${id}/accept`, null, {})
export const markReady      = (id) => apiPatch(`/fisherman/procurement-orders/${id}/ready`, null, {})
export const completeOrder  = (id) => apiPatch(`/fisherman/procurement-orders/${id}/complete`, null, {})
export const cancelOrder    = (id, reason) => apiPost(`/fisherman/procurement-orders/${id}/cancel`, null, { reason })
export const raiseDispute   = (id, body) => apiPost(`/fisherman/procurement-orders/${id}/dispute`, null, body)
export const getDispute     = (id) => apiGet(`/fisherman/procurement-orders/${id}/dispute`)
export const resolveDispute = (id, body) => apiPatch(`/fisherman/procurement-orders/${id}/dispute/resolve`, null, body)
