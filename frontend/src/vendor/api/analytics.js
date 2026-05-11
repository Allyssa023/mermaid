import { apiGet } from '../../api'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null) p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const getSalesSummary = (from, to) =>
  apiGet(`/vendor/analytics/sales-summary${qs({ from, to })}`)

export const getRevenueBySpecies = (from, to) =>
  apiGet(`/vendor/analytics/revenue-by-species${qs({ from, to })}`)

export const getProcurementSpend = (from, to) =>
  apiGet(`/vendor/analytics/procurement-spend${qs({ from, to })}`)

export const getRepeatBuyers = (from, to, minOrders) =>
  apiGet(`/vendor/analytics/repeat-buyers${qs({ from, to, minOrders })}`)
