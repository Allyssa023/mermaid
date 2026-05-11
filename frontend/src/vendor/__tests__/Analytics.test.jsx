// frontend/src/vendor/__tests__/Analytics.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Analytics from '../Analytics'

vi.mock('../api/analytics', () => ({
  getSalesSummary: vi.fn(),
  getRevenueBySpecies: vi.fn(),
  getProcurementSpend: vi.fn(),
  getRepeatBuyers: vi.fn(),
}))
import { getSalesSummary, getRevenueBySpecies, getProcurementSpend, getRepeatBuyers } from '../api/analytics'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getSalesSummary.mockResolvedValue({ totalRevenue: 184320, totalOrders: 28, avgOrderValue: 6583, totalQtyKg: 820, uniqueBuyers: 12 })
  getRevenueBySpecies.mockResolvedValue([{ speciesName: 'Yellowfin Tuna', totalRevenue: 84000, totalQtyKg: 220 }])
  getProcurementSpend.mockResolvedValue([{ speciesName: 'Skipjack', totalSpend: 42000, totalQtyKg: 247 }])
  getRepeatBuyers.mockResolvedValue([{ buyerName: 'Maria Santos', orderCount: 3, totalSpent: 3210 }])
})

describe('Analytics', () => {
  it('renders total revenue after load', async () => {
    wrap(<Analytics />)
    expect(await screen.findByText(/184,320/)).toBeInTheDocument()
  })
  it('renders species revenue row', async () => {
    wrap(<Analytics />)
    expect(await screen.findByText(/Yellowfin Tuna/)).toBeInTheDocument()
  })
  it('renders repeat buyer row', async () => {
    wrap(<Analytics />)
    expect(await screen.findByText(/Maria Santos/)).toBeInTheDocument()
  })
  it('renders loading skeleton', () => {
    getSalesSummary.mockReturnValue(new Promise(() => {}))
    wrap(<Analytics />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })
})
