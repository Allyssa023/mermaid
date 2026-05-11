// frontend/src/fisherman/__tests__/Home.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'

vi.mock('../api/marine', () => ({
  fetchAllConditions: vi.fn(),
  fetchAdvisories: vi.fn(),
}))
vi.mock('../api/procurement', () => ({
  listProcurementOrders: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { fullName: 'Test User', vesselName: 'MV Test' }, loading: false }),
}))

import { fetchAllConditions, fetchAdvisories } from '../api/marine'
import { listProcurementOrders } from '../api/procurement'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK_CONDITIONS = {
  zones: [
    {
      zoneId: 'verde', zoneName: 'Verde Passage', region: 'Batangas',
      observedAt: '2026-05-11T06:32:00Z',
      risk: { level: 'SAFE', score: 2, factors: [], advisory: '' },
      marine: { waveHeightM: 0.9, swellHeightM: 1.2, swellPeriodS: 7, swellDirectionDeg: null },
      weather: { windSpeedKmh: 18, windDirectionDeg: 45, windGustsKmh: 26, precipitationMm: 0, temperatureC: 28, cloudCoverPct: 35 },
      dataSource: 'open-meteo',
    },
  ],
  generatedAt: '2026-05-11T06:32:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchAllConditions.mockResolvedValue(MOCK_CONDITIONS)
  fetchAdvisories.mockResolvedValue([])
  listProcurementOrders.mockResolvedValue([])
})

describe('FishermanHomePage', () => {
  it('renders zone name after data loads', async () => {
    wrap(<Home setPage={vi.fn()} />)
    const matches = await screen.findAllByText(/Verde Passage/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders skeleton while loading', () => {
    fetchAllConditions.mockReturnValue(new Promise(() => {}))
    wrap(<Home setPage={vi.fn()} />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })

  it('renders error when fetch fails', async () => {
    fetchAllConditions.mockRejectedValue(new Error('Network error'))
    wrap(<Home setPage={vi.fn()} />)
    expect(await screen.findByText(/Network error/i)).toBeInTheDocument()
  })
})
