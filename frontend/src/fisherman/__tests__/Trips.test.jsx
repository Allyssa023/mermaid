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
  listCatchLogs: vi.fn().mockResolvedValue([]),
  createCatchLog: vi.fn(),
  deleteCatchLog: vi.fn(),
}))
vi.mock('../api/marine', () => ({
  fetchAllConditions: vi.fn().mockResolvedValue({ zones: [] }),
}))
vi.mock('../api/lookup', () => ({
  fetchSpecies: vi.fn().mockResolvedValue([]),
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
  listTrips.mockResolvedValue([])
})

describe('TripsPage', () => {
  it('renders trip departure point', async () => {
    listTrips.mockResolvedValue([MOCK_TRIP])
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect((await screen.findAllByText(/San Juan Port/i)).length).toBeGreaterThan(0)
  })

  it('shows ACTIVE status chip', async () => {
    listTrips.mockResolvedValue([MOCK_TRIP])
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect((await screen.findAllByText(/ACTIVE/i)).length).toBeGreaterThan(0)
  })

  it('shows Start New Trip button', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect((await screen.findAllByText(/Start New Trip/i)).length).toBeGreaterThan(0)
  })

  it('opens modal on Start New Trip click', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    const buttons = await screen.findAllByText(/Start New Trip/i)
    fireEvent.click(buttons[0])
    expect(screen.getByText(/Departure Point/i)).toBeInTheDocument()
  })
})
