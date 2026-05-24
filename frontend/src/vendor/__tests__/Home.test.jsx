// frontend/src/vendor/__tests__/Home.test.jsx
import { describe, it, expect, vi, beforeEach, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home, { freshnessPct } from '../Home'

vi.mock('../api/home', () => ({ getVendorHome: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Inez Marina' } }) }))
vi.mock('../api/analytics', () => ({ getSpeciesSeries: vi.fn(() => Promise.resolve([])) }))
vi.mock('../api/storefront', () => ({ unpublishListing: vi.fn(), listListings: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../fisherman/api/marine', () => ({ fetchAllConditions: vi.fn(() => Promise.resolve({ zones: [] })) }))
import { getVendorHome } from '../api/home'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK = {
  todayRevenue: 24800,
  openOrders: { new: 3, preparing: 4, ready: 2 },
  unreadNotifications: 4,
  lowStockSpecies: [{ speciesName: 'Yellowfin Tuna', availableKg: 4.2 }],
  recentMatchedAlerts: [{ catchAlertId: 1, speciesName: 'Grouper', fishermanName: 'Ramiro', createdAt: new Date().toISOString() }],
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

test('freshnessPct returns ~0 for brand-new lot', () => {
  expect(freshnessPct(Date.now())).toBeCloseTo(0, 0)
})
test('freshnessPct clamps to 100 for lot older than 6 days', () => {
  expect(freshnessPct(Date.now() - 7 * 86400 * 1000)).toBe(100)
})
