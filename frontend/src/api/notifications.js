import { apiGet, apiPut } from '../api'

export const getNotifications = ({ size = 20, unreadOnly = false } = {}) =>
  apiGet(`/notifications?size=${size}&unreadOnly=${unreadOnly}`)

export const markRead = (id) => apiPut(`/notifications/${id}/read`)

export const markAllRead = () => apiPut('/notifications/read-all')

export const getUnreadCount = () => apiGet('/notifications/unread-count')
