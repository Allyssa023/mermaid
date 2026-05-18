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
  getSpeciesSeries: vi.fn(),
}))
import { getSalesSummary, getRevenueBySpecies, getProcurementSpend, getRepeatBuyers, getSpeciesSeries } from '../api/analytics'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getSalesSummary.mockResolvedValue({ totalRevenue: 184320, totalOrders: 28, avgOrderValue: 6583, totalQtyKg: 820, uniqueBuyers: 12 })
  getRevenueBySpecies.mockResolvedValue([{ speciesName: 'Yellowfin Tuna', totalRevenue: 84000, totalQtyKg: 220 }])
  getProcurementSpend.mockResolvedValue([{ speciesName: 'Skipjack', totalSpend: 42000, totalQtyKg: 247 }])
  getRepeatBuyers.mockResolvedValue([
    { buyerName: 'Maria Santos', orderCount: 12, totalSpent: 24000, tier: 'VIP' },
    { buyerName: 'Juan Cruz',    orderCount: 4,  totalSpent: 8000,  tier: 'REGULAR' },
    { buyerName: 'Ana Reyes',    orderCount: 1,  totalSpent: 1200,  tier: 'NEW' },
  ])
  getSpeciesSeries.mockResolvedValue([])
})

describe('Analytics', () => {
  it('renders total revenue after load', async () => {
    wrap(<Analytics />)
    expect(await screen.findByText(/184,320/)).toBeInTheDocument()
  })
  it('renders species revenue row', async () => {
    wrap(<Analytics />)
    const matches = await screen.findAllByText(/Yellowfin Tuna/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
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

  describe('tier chips', () => {
    it('renders VIP chip for VIP buyer', async () => {
      wrap(<Analytics />)
      const chip = await screen.findByText('VIP')
      expect(chip).toBeInTheDocument()
      expect(chip.className).toContain('v-chip--lime')
    })
    it('renders REGULAR chip for REGULAR buyer', async () => {
      wrap(<Analytics />)
      const chip = await screen.findByText('REGULAR')
      expect(chip).toBeInTheDocument()
      expect(chip.className).toContain('v-chip--kelp')
    })
    it('renders NEW chip for NEW buyer', async () => {
      wrap(<Analytics />)
      const chip = await screen.findByText('NEW')
      expect(chip).toBeInTheDocument()
      expect(chip.className).toContain('v-chip--tide')
    })
    it('defaults to NEW chip when tier is undefined', async () => {
      getRepeatBuyers.mockResolvedValue([
        { buyerName: 'Unknown Buyer', orderCount: 1, totalSpent: 500 },
      ])
      wrap(<Analytics />)
      const chip = await screen.findByText('NEW')
      expect(chip).toBeInTheDocument()
      expect(chip.className).toContain('v-chip--muted')
    })
  })
})
