// frontend/src/fisherman/api/marine.js
import { apiGet } from '../../api'

export const fetchAllConditions  = ()                  => apiGet('/marine/conditions')
export const fetchZoneConditions = (zoneId)            => apiGet(`/marine/conditions/${zoneId}`)
export const fetchAdvisories     = (activeOnly = true) => apiGet(`/advisories?activeOnly=${activeOnly}`)
