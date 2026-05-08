import { apiGet, apiPost, apiPut } from '../../api'
export const listCatchAlerts   = () => apiGet('/fisherman/catch-alerts')
export const createCatchAlert  = (body) => apiPost('/fisherman/catch-alerts', null, body)
export const cancelCatchAlert  = (id)   => apiPut(`/fisherman/catch-alerts/${id}/cancel`, null, {})
