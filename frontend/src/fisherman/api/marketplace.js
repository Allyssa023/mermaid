import { apiGet, apiPost } from '../../api'

export const browseDemandListings = (params = {}) => {
  const qs = new URLSearchParams()
  if (params.speciesId)      qs.set('speciesId', params.speciesId)
  if (params.locationId)     qs.set('locationId', params.locationId)
  if (params.minOfferPrice)  qs.set('minOfferPrice', params.minOfferPrice)
  if (params.maxOfferPrice)  qs.set('maxOfferPrice', params.maxOfferPrice)
  const q = qs.toString()
  return apiGet(`/marketplace/listings${q ? `?${q}` : ''}`)
}

export const expressInterest = (listingId, body) =>
  apiPost(`/marketplace/listings/${listingId}/interest`, null, body)

export const listMyInterests = () => apiGet('/marketplace/my-interests')
