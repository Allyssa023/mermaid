import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FishermanProfilePage from '../Profile'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/profile', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}))
vi.mock('../../components/Skeleton', () => ({ CardSkeleton: () => <div data-testid="skeleton" /> }))
vi.mock('../../components/ApiError', () => ({ default: () => <div data-testid="api-error" /> }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, fullName: 'Isidro Cruz', email: 'isidro@test.com' }, loading: false }),
}))

import { getProfile } from '../api/profile'

const MOCK_PROFILE = {
  fullName: 'Isidro Cruz', email: 'isidro@test.com',
  vesselName: 'MV Dagat', landingSite: 'San Juan Port',
  emergencyContactName: null, emergencyContactPhone: null,
  gcashNumber: null, mayaNumber: null,
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getProfile.mockResolvedValue(MOCK_PROFILE)
})

describe('FishermanProfilePage', () => {
  it('displays fullName as read-only text', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    expect((await screen.findAllByText(/Isidro Cruz/i)).length).toBeGreaterThan(0)
  })

  it('email is NOT in an editable input', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    await screen.findAllByText(/Isidro Cruz/i)
    const emailInput = screen.queryByDisplayValue(/isidro@test\.com/i)
    expect(emailInput?.tagName?.toLowerCase()).not.toBe('input')
  })

  it('renders vesselName in an input', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    expect(await screen.findByDisplayValue(/MV Dagat/i)).toBeInTheDocument()
  })

  it('Save Profile button exists', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    expect(await screen.findByText(/Save Profile/i)).toBeInTheDocument()
  })
})
