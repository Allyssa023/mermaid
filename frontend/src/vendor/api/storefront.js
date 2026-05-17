import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../../api'

export const listListings = () => apiGet('/vendor/storefront/listings')

export const getListing = (id) => apiGet(`/vendor/storefront/listings/${id}`)

export const createListing = (body) => apiPost('/vendor/storefront/listings', null, body)

export const updateListing = (id, body) => apiPut(`/vendor/storefront/listings/${id}`, null, body)

export const deleteListing = (id) => apiDelete(`/vendor/storefront/listings/${id}`)

export const publishListing = (id) => apiPost(`/vendor/storefront/listings/${id}/publish`, null, {})

export const unpublishListing = (id) => apiPost(`/vendor/storefront/listings/${id}/unpublish`, null, {})

export const uploadListingPhoto = (file) => apiUpload('/uploads?subDir=listings', file)
