// frontend/src/vendor/__tests__/ProcurementFeed.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ProcurementFeed from '../ProcurementFeed'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../api/procurement', () => ({
  getFeed: vi.fn(),
  getCart: vi.fn(),
  addToCart: vi.fn(),
  removeCartItem: vi.fn(),
  startDealFromCartItem: vi.fn(),
  listMySupplierOrders: vi.fn(),
  initiateHandoff: vi.fn(),
  confirmHandoff: vi.fn(),
  recordPayment: vi.fn(),
  confirmPayment: vi.fn(),
  cancelOrder: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, fullName: 'Inez' } }) }))

import {
  getFeed, getCart, addToCart, removeCartItem, startDealFromCartItem, listMySupplierOrders,
} from '../api/procurement'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const FEED_ITEM = {
  id: 11,
  speciesName: 'Yellowfin Tuna',
  fishermanName: 'Ramiro',
  availableKg: 5,
  askingPricePerKg: 320,
  expiresAt: '2026-05-16T08:00:00Z',
  matchScore: 88,
}

beforeEach(() => {
  vi.clearAllMocks()
  navigateMock.mockReset()
  getFeed.mockResolvedValue([FEED_ITEM])
  getCart.mockResolvedValue([])
  listMySupplierOrders.mockResolvedValue([])
  addToCart.mockResolvedValue({ id: 99 })
  startDealFromCartItem.mockResolvedValue({ id: 42, status: 'NEGOTIATING' })
})

describe('ProcurementFeed', () => {
  it('renders a Start deal button on feed cards and triggers the deal flow on click', async () => {
    wrap(<ProcurementFeed />)
    const startBtn = await screen.findByRole('button', { name: /Start deal/i })
    expect(startBtn).toBeInTheDocument()

    fireEvent.click(startBtn)

    await waitFor(() => expect(addToCart).toHaveBeenCalledWith(11, 5, undefined))
    await waitFor(() => expect(startDealFromCartItem).toHaveBeenCalledWith(99))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/vendor/messages?deal=42'))
  })
})
