import { apiGet, apiPost } from '../../api'

export const listLots = (speciesId, includeEmpty = false) => {
  const params = new URLSearchParams()
  if (speciesId) params.set('speciesId', speciesId)
  if (includeEmpty) params.set('includeEmpty', 'true')
  return apiGet(`/vendor/inventory/lots?${params}`)
}

export const recordAdjustment = (lotId, deltaKg, reason, note) =>
  apiPost('/vendor/inventory/adjustments', null, { lotId, deltaKg, reason, note })

export const availability = (speciesId) =>
  apiGet(`/vendor/inventory/availability?speciesId=${speciesId}`)
