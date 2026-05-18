import { apiGet, apiPatch, apiDelete } from '../../api'

export const getCart    = ()                          => apiGet('/buyer/cart')
export const updateItem = (itemId, body)              => apiPatch(`/buyer/cart/items/${itemId}`, null, body)
export const removeItem = (itemId)                    => apiDelete(`/buyer/cart/items/${itemId}`)
export const clearCart  = ()                          => apiDelete('/buyer/cart')

// Returns { cart, warning } — warning is non-null when qty was capped to stock limit
export async function addItem(body) {
  const res = await fetch('/api/buyer/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return { cart: data, warning: res.headers.get('X-Cart-Warning') }
}
