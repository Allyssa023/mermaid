import { apiGet, apiPut } from '../../api'
export const getProfile    = () => apiGet('/fisherman/profile')
export const updateProfile = (body) => apiPut('/fisherman/profile', null, body)
