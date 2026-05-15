import { apiGet, apiPost } from '../../api'

export const listMyDeals          = (status) => apiGet(`/deals/mine${status ? `?status=${status}` : ''}`)
export const getDeal              = (id)     => apiGet(`/deals/${id}`)
export const listDealMessages     = (id, page = 0, size = 50) =>
  apiGet(`/deals/${id}/messages?page=${page}&size=${size}`)
export const submitProposal       = (id, qtyKg, pricePerKg) =>
  apiPost(`/deals/${id}/proposals`, null, { qtyKg, pricePerKg })
export const acceptProposal       = (dealId, proposalId) =>
  apiPost(`/deals/${dealId}/proposals/${proposalId}/accept`, null, {})
export const rejectProposal       = (dealId, proposalId, reason) =>
  apiPost(`/deals/${dealId}/proposals/${proposalId}/reject`, null, { reason })
export const cancelDeal           = (id, reason) =>
  apiPost(`/deals/${id}/cancel`, null, { reason })
export const engageDeal           = (id)     => apiPost(`/deals/${id}/engage`, null, {})
export const rejectDeal           = (id, reason) =>
  apiPost(`/deals/${id}/reject`, null, { reason })
export const competitorCount      = (id)     => apiGet(`/deals/${id}/competitor-count`)
