import { apiGet } from '../../api'
export const getEarningsSummary = (from, to) =>
  apiGet('/fisherman/earnings/summary' + (from ? `?from=${from}&to=${to}` : ''))
export const getEarningsLedger  = (from, to) =>
  apiGet('/fisherman/earnings/ledger' + (from ? `?from=${from}&to=${to}` : ''))
