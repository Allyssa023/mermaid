import { apiGet, apiPost } from '../../api'

export const listVendorReviews = (page = 0, size = 20) =>
  apiGet(`/vendor/reviews?page=${page}&size=${size}`)

export const replyToReview = (id, text) =>
  apiPost(`/vendor/reviews/${id}/reply`, null, { text })
