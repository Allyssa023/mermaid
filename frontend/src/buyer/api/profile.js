import { apiGet, apiPut } from '../../api'

export const getProfile    = ()     => apiGet('/buyer/profile')
export const updateProfile = (body) => apiPut('/buyer/profile', null, body)
