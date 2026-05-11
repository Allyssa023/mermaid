import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EarningsPage from '../Earnings'

vi.mock('../api/earnings', () => ({
  getEarningsSummary: vi.fn(),
  getEarningsLedger: vi.fn(),
}))

import { getEarningsSummary, getEarningsLedger } from '../api/earnings'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK_SUMMARY = { totalGross: 184320, cashCollected: 142500, creditOutstanding: 41820, orderCount: 28 }
const MOCK_LEDGER  = [
  { orderId: 1, date: '2026-04-23', speciesName: 'Grouper', qtyKg: 4, gross: 2160, paymentMethod: 'UTANG' },
]

beforeEach(() => {
  vi.clearAllMocks()
  getEarningsSummary.mockResolvedValue(MOCK_SUMMARY)
  getEarningsLedger.mockResolvedValue(MOCK_LEDGER)
})

describe('EarningsPage', () => {
  it('renders total gross after data loads', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/184,320/)).toBeInTheDocument()
  })

  it('renders ledger row species', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Grouper/)).toBeInTheDocument()
  })
})
