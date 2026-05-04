const API_BASE = '/api'

export async function apiGet(path, _token) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiPost(path, _token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiPut(path, _token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiPatch(path, _token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiDelete(path, _token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiUpload(path, file, extraFields = {}) {
  const form = new FormData()
  form.append('file', file)
  for (const [k, v] of Object.entries(extraFields)) {
    if (v != null) form.append(k, v)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`)
  return data
}

