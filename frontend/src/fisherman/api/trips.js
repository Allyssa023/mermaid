import { apiGet, apiPost, apiPut } from '../../api'
export const listTrips     = (status) => apiGet('/trips' + (status ? `?status=${status}` : ''))
export const startTrip     = (body)   => apiPost('/trips', null, body)
export const endTrip       = (id, body) => apiPost(`/trips/${id}/end`, null, body)
export const saveChecklist = (id, body) => apiPut(`/trips/${id}/checklist`, null, body)
