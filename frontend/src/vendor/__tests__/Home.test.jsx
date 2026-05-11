import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'

// Mock the API and hook
vi.mock('../api/home', () => ({
  getVendorHome: vi.fn(),
}))

vi.mock('../hooks/useVendorPolling', () => ({
  useVendorPolling: vi.fn(),
}))

import { getVendorHome } from '../api/home'
import { useVendorPolling } from '../hooks/useVendorPolling'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Home', () => {
  const mockPayload = {
    todayRevenue: 1250.50,
    openOrders: { new: 2, preparing: 1, ready: 0 },
    lowStock: [{ speciesId: 1, speciesName: 'Tuna', remainingKg: 3.5 }],
    recentMatchedCatchAlerts: [
      { id: 12, speciesName: 'Mackerel', createdAt: '2026-05-06T10:00:00Z', fishermanName: 'Juan Dela Cruz' },
    ],
    unreadNotifications: 4,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useVendorPolling.mockReturnValue({
      data: mockPayload,
      isStale: false,
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renders today\'s revenue tile', () => {
    renderHome()
    expect(screen.getByText("Today's Revenue")).toBeInTheDocument()
    // Revenue formatted as PHP
    expect(screen.getByText(/1,250/)).toBeInTheDocument()
  })

  it('renders open orders tile with correct count', () => {
    renderHome()
    expect(screen.getByText('Open Orders')).toBeInTheDocument()
    // total = 2+1+0 = 3
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders unread notifications tile', () => {
    renderHome()
    expect(screen.getByText('Unread Notifications')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders low-stock chips', () => {
    renderHome()
    expect(screen.getByText(/Tuna/)).toBeInTheDocument()
    expect(screen.getByText(/3.5 kg/)).toBeInTheDocument()
  })

  it('renders recent matched catch alerts', () => {
    renderHome()
    expect(screen.getByText(/Mackerel/)).toBeInTheDocument()
    expect(screen.getByText(/Juan Dela Cruz/)).toBeInTheDocument()
  })

  it('renders order breakdown badges', () => {
    renderHome()
    expect(screen.getByText(/New: 2/)).toBeInTheDocument()
    expect(screen.getByText(/Preparing: 1/)).toBeInTheDocument()
    expect(screen.getByText(/Ready: 0/)).toBeInTheDocument()
  })

  it('shows loading state when data is null', () => {
    useVendorPolling.mockReturnValue({
      data: null,
      isStale: false,
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
  })

  it('shows error state when error and no data', () => {
    useVendorPolling.mockReturnValue({
      data: null,
      isStale: false,
      loading: false,
      error: { message: 'Network error' },
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText(/Network error/)).toBeInTheDocument()
  })

  it('shows empty state when all counts zero', () => {
    useVendorPolling.mockReturnValue({
      data: {
        todayRevenue: 0,
        openOrders: { new: 0, preparing: 0, ready: 0 },
        lowStock: [],
        recentMatchedCatchAlerts: [],
        unreadNotifications: 0,
      },
      isStale: false,
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText(/All caught up/)).toBeInTheDocument()
  })
})
