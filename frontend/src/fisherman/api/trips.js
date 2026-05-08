import { apiGet, apiPost, apiPatch } from '../../api'
export const listTrips     = (status) => apiGet('/trips' + (status ? `?status=${status}` : ''))
export const startTrip     = (body)   => apiPost('/trips', null, body)
export const endTrip       = (id, body) => apiPatch(`/trips/${id}/end`, null, body)
export const saveChecklist = (id, body) => apiPost(`/trips/${id}/checklist`, null, body)
