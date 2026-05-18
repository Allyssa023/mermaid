import { apiGet, apiPost } from '../../api'

export const fetchListings = (params = {}) => {
  const qs = new URLSearchParams()
  if (params.q)         qs.set('q', params.q)
  if (params.speciesId) qs.set('speciesId', params.speciesId)
  if (params.vendorId)  qs.set('vendorId', params.vendorId)
  if (params.page != null) qs.set('page', params.page)
  if (params.size != null) qs.set('size', params.size)
  const query = qs.toString()
  return apiGet('/buyer/marketplace/listings' + (query ? `?${query}` : ''))
}

export const fetchListingDetail = (listingId) =>
  apiGet(`/buyer/marketplace/listings/${listingId}`)

export const placeOrder = (body) =>
  apiPost('/buyer/orders', null, body)
