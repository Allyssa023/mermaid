// frontend/src/fisherman/__tests__/AddCatchModal.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddCatchModal } from '../Trips'

vi.mock('../api/trips', () => ({
  listTrips: vi.fn(),
  endTrip: vi.fn(),
  listCatchLogs: vi.fn(),
  createCatchLog: vi.fn(),
  deleteCatchLog: vi.fn(),
}))

vi.mock('../api/catchAlerts', () => ({
  listCatchAlerts: vi.fn(),
  createCatchAlert: vi.fn(),
}))

vi.mock('../../api/lookup', () => ({
  fetchSpecies: vi.fn(),
}))

vi.mock('../../components/BfarBadge', () => ({
  default: () => <span data-testid="bfar-badge" />,
}))

const SPECIES = [
  { id: 1, commonName: 'Tuna' },
  { id: 2, commonName: 'Mackerel' },
]

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function renderModal() {
  return wrap(
    <AddCatchModal
      tripId={1}
      species={SPECIES}
      onSaved={vi.fn()}
      onClose={vi.fn()}
    />
  )
}

function getSubmit() {
  return screen.getByRole('button', { name: /save catch/i })
}

describe('AddCatchModal validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables submit when form is empty', () => {
    renderModal()
    expect(getSubmit()).toBeDisabled()
  })

  it('disables submit when only species is set', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/species/i), { target: { value: '1' } })
    expect(getSubmit()).toBeDisabled()
  })

  it('disables submit when species + quantity are set but price is missing', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/species/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '1' } })
    expect(getSubmit()).toBeDisabled()
  })

  it('enables submit when species + quantity + price are valid (notes empty)', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/species/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '1' } })
    expect(getSubmit()).toBeEnabled()
  })

  it('disables submit when quantity is below the minimum (0)', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/species/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '1' } })
    expect(getSubmit()).toBeDisabled()
  })

  it('disables submit when price is below the minimum (0)', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/species/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '0' } })
    expect(getSubmit()).toBeDisabled()
  })
})
