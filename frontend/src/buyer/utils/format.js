export function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtPrice(p) {
  if (p == null) return '—'
  return `₱${Number(p).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function timeAgo(dt) {
  if (!dt) return ''
  const diff = (Date.now() - new Date(dt).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}
