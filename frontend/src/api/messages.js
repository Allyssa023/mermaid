import { apiGet } from '../api'
export const getChatUsers    = ()       => apiGet('/messages/users')
export const getConversation = (userId) => apiGet(`/messages/${userId}`)
