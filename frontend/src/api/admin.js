import { apiGet, apiPost, apiPut, apiDelete } from '../api.js'

export const fetchAdminUsers    = () => apiGet('/admin/users')
export const updateAdminUser    = (id, body) => apiPut(`/admin/users/${id}`, null, body)
export const createAdminUser    = (body) => apiPost('/admin/users', null, body)

export const fetchAdminAdvisories = () => apiGet('/admin/advisories')
export const createAdvisory       = (body) => apiPost('/admin/advisories', null, body)
export const updateAdvisory       = (id, body) => apiPut(`/admin/advisories/${id}`, null, body)
export const deleteAdvisory       = (id) => apiDelete(`/admin/advisories/${id}`)

export const fetchAdminSpecies  = () => apiGet('/admin/fish-species')
export const createSpecies      = (body) => apiPost('/admin/fish-species', null, body)
export const updateSpecies      = (id, body) => apiPut(`/admin/fish-species/${id}`, null, body)
export const deleteSpecies      = (id) => apiDelete(`/admin/fish-species/${id}`)
export const reactivateSpecies  = (id) => apiPost(`/admin/fish-species/${id}/reactivate`)

export const fetchAdminLocations  = () => apiGet('/admin/market-locations')
export const createLocation       = (body) => apiPost('/admin/market-locations', null, body)
export const updateLocation       = (id, body) => apiPut(`/admin/market-locations/${id}`, null, body)
export const deleteLocation       = (id) => apiDelete(`/admin/market-locations/${id}`)
export const reactivateLocation   = (id) => apiPost(`/admin/market-locations/${id}/reactivate`)

export const fetchAdminMetrics  = () => apiGet('/admin/metrics')
export const fetchAdminDau      = () => apiGet('/admin/dau')
export const fetchAdminHealth   = () => apiGet('/admin/health')
export const fetchAdminAuditLog = (kind) =>
  apiGet(`/admin/audit-log${kind && kind !== 'all' ? `?kind=${kind}` : ''}`)
