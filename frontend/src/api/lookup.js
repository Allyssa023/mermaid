import { apiGet } from '../api.js'

export const fetchSpecies = () => apiGet('/species')
export const fetchMarketLocations = () => apiGet('/market-locations')
