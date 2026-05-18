import { apiGet, apiPost, apiDelete } from '../../api'

export const getFavorites    = ()             => apiGet('/buyer/favorites')
export const addFavorite     = (body)         => apiPost('/buyer/favorites', null, body)
export const removeFavorite  = (favoriteId)   => apiDelete(`/buyer/favorites/${favoriteId}`)
