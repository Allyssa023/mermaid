// frontend/src/vendor/__tests__/Home.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'

vi.mock('../api/home', () => ({ getVendorHome: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Inez Marina' } }) }))
import { getVendorHome } from '../api/home'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
}

const MOCK = {
  todayRevenue: 24800,
  openOrders: { new: 3, preparing: 4, ready: 2 },
  unreadNotifications: 4,
  lowStock: [{ speciesName: 'Yellowfin Tuna', remainingKg: 4.2 }],
  recentMatchedCatchAlerts: [{ id: 1, speciesName: 'Grouper', fishermanName: 'Ramiro', quantityKg: 3.2 }],
}

beforeEach(() => { vi.clearAllMocks(); getVendorHome.mockResolvedValue(MOCK) })

describe('Vendor Home', () => {
  it('renders revenue after load', async () => {
    wrap(<Home setPage={() => {}} />)
    expect(await screen.findByText(/24,800/)).toBeInTheDocument()
  })
  it('renders low stock species', async () => {
    wrap(<Home setPage={() => {}} />)
    expect(await screen.findByText(/Yellowfin Tuna/)).toBeInTheDocument()
  })
  it('renders loading skeleton', () => {
    getVendorHome.mockReturnValue(new Promise(() => {}))
    wrap(<Home setPage={() => {}} />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })
  it('renders error', async () => {
    getVendorHome.mockRejectedValue(new Error('Server down'))
    wrap(<Home setPage={() => {}} />)
    expect(await screen.findByText(/Server down/)).toBeInTheDocument()
  })
})
