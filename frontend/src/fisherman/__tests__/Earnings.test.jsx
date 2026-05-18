import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EarningsPage from '../Earnings'

vi.mock('gsap', () => ({
  default: {
    to: vi.fn().mockImplementation((obj, opts) => { if (opts?.onUpdate) opts.onUpdate(); return {} }),
    from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn(),
  },
}))
vi.mock('../api/earnings', () => ({
  getEarningsSummary: vi.fn(),
  getEarningsLedger: vi.fn(),
}))

import { getEarningsSummary, getEarningsLedger } from '../api/earnings'

const MOCK_SUMMARY = { totalGross: 184320, cashCollected: 142500, creditOutstanding: 41820, orderCount: 28 }
const MOCK_LEDGER = [
  { orderId: 1, date: '2026-04-23', vendorName: 'Test Vendor', speciesName: 'Grouper',
    qtyKg: 4, gross: 2160, paymentMethod: 'UTANG', status: 'SETTLED', settledAt: null },
]

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getEarningsSummary.mockResolvedValue(MOCK_SUMMARY)
  getEarningsLedger.mockResolvedValue(MOCK_LEDGER)
})

describe('EarningsPage', () => {
  it('renders "Total Gross" label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Total Gross/i)).toBeInTheDocument()
  })
  it('renders "Cash Collected" label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Cash Collected/i)).toBeInTheDocument()
  })
  it('renders "Credit Outstanding" label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Credit Outstanding/i)).toBeInTheDocument()
  })
  it('renders "Orders" stat label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/^Orders$/i)).toBeInTheDocument()
  })
  it('renders ledger row species', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Grouper/)).toBeInTheDocument()
  })
  it('renders ledger vendor name', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Test Vendor/)).toBeInTheDocument()
  })
})
