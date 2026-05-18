export async function getOrderReview(orderId) {
  const res = await fetch(`/api/buyer/orders/${orderId}/review`, { credentials: 'include' })
  if (res.status === 404) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}
