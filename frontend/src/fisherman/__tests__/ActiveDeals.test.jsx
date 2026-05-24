import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ActiveDeals from '../ActiveDeals'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/deals', () => ({
  listMyDeals: vi.fn(),
  submitProposal: vi.fn(),
  acceptProposal: vi.fn(),
  rejectProposal: vi.fn(),
  cancelDeal: vi.fn(),
  getDeal: vi.fn(),
  listDealMessages: vi.fn(),
}))
vi.mock('../../components/DealChatPane', () => ({ default: () => <div data-testid="deal-chat" /> }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listMyDeals } from '../api/deals'

const MOCK_DEAL = {
  id: 1, status: 'NEGOTIATING',
  vendorName: 'Rosario Vendor',
  speciesName: 'Bangus', qtyKg: 10,
  latestProposalPricePerKg: 200,
  updatedAt: new Date().toISOString(),
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listMyDeals.mockResolvedValue([MOCK_DEAL])
})

describe('ActiveDealsPage', () => {
  it('renders vendor name', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    expect(await screen.findByText(/Rosario Vendor/i)).toBeInTheDocument()
  })

  it('shows NEGOTIATING group header', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    const elements = await screen.findAllByText(/NEGOTIATING/i)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('does not show AGREED group when no agreed deals', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    await screen.findByText(/Rosario Vendor/i)
    const agreedChips = document.querySelectorAll('.deal-row__status .chip')
    const hasAgreed = Array.from(agreedChips).some(chip => chip.textContent.trim().toUpperCase() === 'AGREED')
    expect(hasAgreed).toBe(false)
  })
})
