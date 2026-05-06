import { apiGet, apiPost, apiDelete } from '../../api'

export const listWatchlist = () => apiGet('/vendor/watchlist')

export const addWatchlist = (speciesId, marketLocationId, radiusKm) =>
  apiPost('/vendor/watchlist', null, { speciesId, marketLocationId, radiusKm })

export const removeWatchlist = (id) => apiDelete(`/vendor/watchlist/${id}`)
