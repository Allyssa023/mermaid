// frontend/src/fisherman/__tests__/ActiveDeals.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ActiveDeals from '../ActiveDeals'

vi.mock('../api/deals', () => ({
  listMyDeals: vi.fn(),
  engageDeal:  vi.fn(),
  rejectDeal:  vi.fn(),
}))

import { listMyDeals, engageDeal, rejectDeal } from '../api/deals'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const baseTime = '2026-05-15T10:00:00Z'

const DEALS = [
  {
    id: 1,
    catchAlertId: 100,
    speciesName: 'Yellowfin Tuna',
    counterpartyId: 7,
    counterpartyName: 'Rosario',
    status: 'NEGOTIATING',
    latestProposal: { id: 11, qtyKg: 3, pricePerKg: 320, createdAt: baseTime },
    competitorCount: 2,
    expiresAt: '2026-05-15T12:00:00Z',
    createdAt: baseTime,
  },
  {
    id: 2,
    catchAlertId: 100,
    speciesName: 'Yellowfin Tuna',
    counterpartyId: 8,
    counterpartyName: 'Mila',
    status: 'NEGOTIATING',
    latestProposal: { id: 12, qtyKg: 5, pricePerKg: 310, createdAt: baseTime },
    competitorCount: 2,
    expiresAt: '2026-05-15T12:00:00Z',
    createdAt: baseTime,
  },
  {
    id: 3,
    catchAlertId: 100,
    speciesName: 'Yellowfin Tuna',
    counterpartyId: 9,
    counterpartyName: 'Beni',
    status: 'NEGOTIATING',
    latestProposal: { id: 13, qtyKg: 2, pricePerKg: 330, createdAt: baseTime },
    competitorCount: 2,
    expiresAt: '2026-05-15T12:00:00Z',
    createdAt: baseTime,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  listMyDeals.mockResolvedValue(DEALS)
  engageDeal.mockResolvedValue({ id: 1, status: 'ENGAGED' })
  rejectDeal.mockResolvedValue({ id: 3, status: 'REJECTED' })
})

describe('ActiveDeals', () => {
  it('groups deals under the catch alert header with one header per alert and three rows', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    // species header appears once for the group
    const headers = await screen.findAllByText(/Yellowfin Tuna/i)
    expect(headers.length).toBeGreaterThanOrEqual(1)
    // three vendor names render as rows
    expect(await screen.findByText('Rosario')).toBeInTheDocument()
    expect(screen.getByText('Mila')).toBeInTheDocument()
    expect(screen.getByText('Beni')).toBeInTheDocument()
  })

  it('Accept calls engageDeal and navigates to messages page', async () => {
    const setPage = vi.fn()
    wrap(<ActiveDeals setPage={setPage} />)
    await screen.findByText('Rosario')
    const acceptBtns = screen.getAllByRole('button', { name: /accept/i })
    fireEvent.click(acceptBtns[0])
    await waitFor(() => expect(engageDeal).toHaveBeenCalledWith(1))
    await waitFor(() => expect(setPage).toHaveBeenCalledWith('messages'))
  })

  it('Reject calls rejectDeal and removes the row from the list', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    await screen.findByText('Beni')
    // Simulate reject on the last row (Beni). After reject, refetch returns deals without Beni.
    listMyDeals.mockResolvedValueOnce(DEALS.filter(d => d.id !== 3))
    const rejectBtns = screen.getAllByRole('button', { name: /reject/i })
    fireEvent.click(rejectBtns[2])
    // inline prompt should appear; confirm
    const confirmBtn = await screen.findByRole('button', { name: /confirm reject/i })
    fireEvent.click(confirmBtn)
    await waitFor(() => expect(rejectDeal).toHaveBeenCalledWith(3, expect.any(String)))
    await waitFor(() => expect(screen.queryByText('Beni')).not.toBeInTheDocument())
  })
})
