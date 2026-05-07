import { apiGet, apiPut } from '../../api'

export const getShopProfile = () => apiGet('/vendor/shop/profile')
export const updateShopProfile = (data) => apiPut('/vendor/shop/profile', null, data)
