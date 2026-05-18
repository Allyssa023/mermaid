import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TripsPage from '../Trips'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/trips', () => ({
  listTrips: vi.fn(),
  startTrip: vi.fn(),
  endTrip: vi.fn(),
  saveChecklist: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listTrips } from '../api/trips'

const MOCK_TRIP = {
  id: 1, departurePoint: 'San Juan Port', targetArea: 'Manila Bay',
  startedAt: '2026-05-18T02:00:00Z', endedAt: null, status: 'ACTIVE',
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listTrips.mockResolvedValue([MOCK_TRIP])
})

describe('TripsPage', () => {
  it('renders trip departure point', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/San Juan Port/i)).toBeInTheDocument()
  })

  it('shows ACTIVE status chip', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/ACTIVE/i)).toBeInTheDocument()
  })

  it('shows Start New Trip button', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/Start New Trip/i)).toBeInTheDocument()
  })

  it('opens modal on Start New Trip click', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    fireEvent.click(await screen.findByText(/Start New Trip/i))
    expect(screen.getByText(/Departure Point/i)).toBeInTheDocument()
  })
})
