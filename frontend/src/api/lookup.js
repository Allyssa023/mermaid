import { apiGet, apiPost, apiPut } from '../api.js'

export const fetchSpecies = () => apiGet('/lookups/fish-species')
export const fetchMarketLocations = () => apiGet('/market-locations')

export const fetchBfarPrices = (speciesId) =>
  apiGet('/bfar-prices' + (speciesId ? `?speciesId=${speciesId}` : ''))

export const fetchAllBfarPrices = () => apiGet('/bfar-prices/all')

export const adminCreateBfarPrice = (body) => apiPost('/admin/bfar-prices', null, body)
export const adminUpdateBfarPrice = (id, body) => apiPut(`/admin/bfar-prices/${id}`, null, body)
