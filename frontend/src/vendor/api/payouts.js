import { apiGet } from '../../api'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null) p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const getPayoutsSummary = () => apiGet('/vendor/payouts/summary')

export const getPayoutsLedger = (from, to) =>
  apiGet(`/vendor/payouts/ledger${qs({ from, to })}`)
