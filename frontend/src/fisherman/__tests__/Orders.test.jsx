import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrdersPage from '../Orders'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/orders', () => ({
  listOrders: vi.fn(),
  confirmOrder: vi.fn(), cancelOrder: vi.fn(),
  initiateHandoff: vi.fn(), confirmHandoff: vi.fn(),
  recordPayment: vi.fn(), confirmPayment: vi.fn(),
  raiseDispute: vi.fn(), initiateOrderPayout: vi.fn(),
}))
vi.mock('../api/procurement', () => ({
  acceptOrder: vi.fn(), markReady: vi.fn(), completeOrder: vi.fn(),
  cancelOrder: vi.fn(),
}))
vi.mock('../../components/OrderCard', () => ({ default: (props) => <div data-testid="order-card">{props.order?.vendorName}</div> }))
vi.mock('../../components/Skeleton', () => ({ OrderCardSkeleton: () => <div data-testid="order-skeleton" /> }))
vi.mock('../../components/ApiError', () => ({ default: () => <div data-testid="api-error" /> }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listOrders } from '../api/orders'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listOrders.mockResolvedValue([{ id: 1, vendorName: 'Test Vendor', status: 'PENDING' }])
})

describe('OrdersPage', () => {
  it('renders order card after data loads', async () => {
    wrap(<OrdersPage setPage={vi.fn()} />)
    expect(await screen.findByTestId('order-card')).toBeInTheDocument()
  })

  it('renders vendor name in order card', async () => {
    wrap(<OrdersPage setPage={vi.fn()} />)
    expect(await screen.findByText(/Test Vendor/i)).toBeInTheDocument()
  })
})
