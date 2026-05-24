import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/marine', () => ({
  fetchAllConditions: vi.fn(),
  fetchAdvisories: vi.fn(),
}))
vi.mock('../api/catchAlerts', () => ({
  listCatchAlerts: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, fullName: 'Isidro' }, loading: false }),
}))

import { fetchAllConditions, fetchAdvisories } from '../api/marine'
import { listCatchAlerts } from '../api/catchAlerts'

const MOCK_CONDITIONS = {
  zones: [{
    zoneId: 'la_union', zoneName: 'La Union Coast', region: 'Ilocos',
    observedAt: '2026-05-18T06:00:00Z',
    risk: { level: 'SAFE', score: 2, factors: [], advisory: '' },
    marine: { waveHeightM: 0.8 },
    weather: { windSpeedKmh: 15, windGustsKmh: 22 },
    dataSource: 'open-meteo',
  }],
  generatedAt: '2026-05-18T06:00:00Z',
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchAllConditions.mockResolvedValue(MOCK_CONDITIONS)
  fetchAdvisories.mockResolvedValue([])
  listCatchAlerts.mockResolvedValue([])
})

describe('FishermanHomePage', () => {
  it('renders zone name in carousel', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/La Union Coast/i)).toBeInTheDocument()
  })

  it('renders SAFE risk badge', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect((await screen.findAllByText(/SAFE/i)).length).toBeGreaterThan(0)
  })

  it('renders wave height', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect((await screen.findAllByText(/0\.8/)).length).toBeGreaterThan(0)
  })

  it('renders skeleton while loading', () => {
    fetchAllConditions.mockReturnValue(new Promise(() => {}))
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })

  it('renders "No active advisories" when advisories empty', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/No active advisories/i)).toBeInTheDocument()
  })

  it('renders active trip console when activeTrip provided', async () => {
    const trip = { id: 1, departurePoint: 'San Juan Port', startedAt: new Date().toISOString() }
    fetchAllConditions.mockResolvedValue(MOCK_CONDITIONS)
    wrap(<Home setPage={vi.fn()} activeTrip={trip} />)
    expect(await screen.findByText(/San Juan Port/i)).toBeInTheDocument()
  })

  it('renders "Start a Trip" CTA when no active trip', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/Start a Trip/i)).toBeInTheDocument()
  })
})
