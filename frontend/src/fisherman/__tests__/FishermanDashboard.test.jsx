import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FishermanDashboard from '../FishermanDashboard'

vi.mock('gsap', () => ({
  default: {
    to: vi.fn().mockImplementation((_el, opts = {}) => { opts.onComplete?.(); return { kill: vi.fn() } }),
    from: vi.fn().mockReturnValue({ kill: vi.fn() }),
    fromTo: vi.fn().mockReturnValue({ kill: vi.fn() }),
    killTweensOf: vi.fn(),
    set: vi.fn(),
  },
}))
vi.mock('../api/trips', () => ({
  listTrips: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, fullName: 'Isidro' }, loading: false }),
}))
vi.mock('../../context/StompContext', () => ({
  StompProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../Home',        () => ({ default: () => <div data-testid="page-home" /> }))
vi.mock('../Trips',       () => ({ default: () => <div data-testid="page-trips" /> }))
vi.mock('../CatchAlerts', () => ({ default: () => <div data-testid="page-alerts" /> }))
vi.mock('../ActiveDeals', () => ({ default: () => <div data-testid="page-deals" /> }))
vi.mock('../Orders',      () => ({ default: () => <div data-testid="page-orders" /> }))
vi.mock('../Earnings',    () => ({ default: () => <div data-testid="page-earnings" /> }))
vi.mock('../Messages',    () => ({ default: () => <div data-testid="page-messages" /> }))
vi.mock('../Profile',     () => ({ default: () => <div data-testid="page-profile" /> }))
vi.mock('../components/NotificationsBell', () => ({ default: () => <div /> }))

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('FishermanDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all 8 nav items', () => {
    wrap(<FishermanDashboard />)
    expect(screen.getAllByRole('button', { hidden: true }).length).toBeGreaterThanOrEqual(8)
  })

  it('starts on dashboard page', () => {
    wrap(<FishermanDashboard />)
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  })

  it('sets data-rail-open false initially', () => {
    const { container } = wrap(<FishermanDashboard />)
    expect(container.querySelector('[data-fisherman-shell]').getAttribute('data-rail-open')).toBe('false')
  })

  it('sets data-rail-open true on rail mouse enter', () => {
    const { container } = wrap(<FishermanDashboard />)
    const rail = container.querySelector('.f-rail')
    fireEvent.mouseEnter(rail)
    expect(container.querySelector('[data-fisherman-shell]').getAttribute('data-rail-open')).toBe('true')
  })

  it('navigates to trips page on nav click', () => {
    wrap(<FishermanDashboard />)
    fireEvent.click(screen.getByTestId('nav-trips'))
    expect(screen.getByTestId('page-trips')).toBeInTheDocument()
  })
})
