import { apiGet, apiPost, apiPatch } from '../../api'
export const listCatchAlerts   = () => apiGet('/catch-alerts/my')
export const createCatchAlert  = (body) => apiPost('/catch-alerts', null, body)
export const cancelCatchAlert  = (id)   => apiPatch(`/catch-alerts/${id}/cancel`, null, {})
