import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CatchAlerts from '../CatchAlerts'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/catchAlerts', () => ({
  listCatchAlerts: vi.fn(),
  createCatchAlert: vi.fn(),
  cancelCatchAlert: vi.fn(),
}))
vi.mock('../../api/lookup', () => ({
  fetchSpecies: vi.fn().mockResolvedValue([{ id: 1, commonName: 'Bangus' }]),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listCatchAlerts } from '../api/catchAlerts'

const MOCK_ALERT = {
  id: 1, speciesName: 'Tuna', quantityKg: 12, askingPricePerKg: 280,
  status: 'ACTIVE', expiresAt: new Date(Date.now() + 3600000).toISOString(),
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listCatchAlerts.mockResolvedValue([MOCK_ALERT])
})

describe('CatchAlertsPage', () => {
  it('renders alert species name', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    expect(await screen.findByText(/Tuna/i)).toBeInTheDocument()
  })

  it('renders quantity kg', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    expect(await screen.findByText(/12 kg/i)).toBeInTheDocument()
  })

  it('shows Create Alert button', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    expect(await screen.findByText(/Create Alert/i)).toBeInTheDocument()
  })

  it('opens drawer on Create Alert click', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    fireEvent.click(await screen.findByText(/Create Alert/i))
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument()
  })
})
