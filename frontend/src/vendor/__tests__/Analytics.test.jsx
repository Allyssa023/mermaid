import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Analytics from '../Analytics'

// Mock all analytics API calls
vi.mock('../api/analytics', () => ({
  getSalesSummary: vi.fn(),
  getRevenueBySpecies: vi.fn(),
  getProcurementSpend: vi.fn(),
  getRepeatBuyers: vi.fn(),
}))

// Mock recharts to avoid canvas/SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => <div />,
}))

import {
  getSalesSummary,
  getRevenueBySpecies,
  getProcurementSpend,
  getRepeatBuyers,
} from '../api/analytics'

function renderAnalytics() {
  return render(
    <MemoryRouter>
      <Analytics />
    </MemoryRouter>
  )
}

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial state with prompt to select date range', () => {
    renderAnalytics()
    expect(screen.getByText(/Select a date range/)).toBeInTheDocument()
  })

  it('shows date range error when range exceeds 365 days', async () => {
    renderAnalytics()

    const fromInput = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[0]
    const toInput = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[1]

    // Set a range > 365 days
    fireEvent.change(fromInput, { target: { value: '2024-01-01' } })
    fireEvent.change(toInput, { target: { value: '2026-05-01' } })

    // Submit via form submit event (more reliable in jsdom than button click)
    const form = fromInput.closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Date range cannot exceed 365 days/)).toBeInTheDocument()
    })

    // API should NOT have been called
    expect(getSalesSummary).not.toHaveBeenCalled()
  })

  it('shows error when start date is after end date', async () => {
    renderAnalytics()

    const fromInput = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[0]
    const toInput = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[1]

    fireEvent.change(fromInput, { target: { value: '2026-05-01' } })
    fireEvent.change(toInput, { target: { value: '2026-04-01' } })

    const form = fromInput.closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Start date must be before end date/)).toBeInTheDocument()
    })
  })

  it('renders sales summary tiles after successful fetch', async () => {
    getSalesSummary.mockResolvedValue({
      totalOrders: 5,
      totalRevenue: 4530,
      totalQtyKg: 33,
      avgOrderValue: 906,
      uniqueBuyers: 2,
    })
    getRevenueBySpecies.mockResolvedValue([
      { speciesId: 1, speciesName: 'Tuna', totalRevenue: 2850, totalQtyKg: 19 },
    ])
    getProcurementSpend.mockResolvedValue([])
    getRepeatBuyers.mockResolvedValue([
      { buyerId: 20, buyerName: 'Maria Santos', orderCount: 3, totalSpent: 3210, lastOrder: '2026-04-28' },
    ])

    renderAnalytics()

    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Total Orders')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Unique Buyers')).toBeInTheDocument()
  })

  it('renders repeat buyers table after fetch', async () => {
    getSalesSummary.mockResolvedValue({
      totalOrders: 5, totalRevenue: 4530, totalQtyKg: 33, avgOrderValue: 906, uniqueBuyers: 2,
    })
    getRevenueBySpecies.mockResolvedValue([])
    getProcurementSpend.mockResolvedValue([])
    getRepeatBuyers.mockResolvedValue([
      { buyerId: 20, buyerName: 'Maria Santos', orderCount: 3, totalSpent: 3210, lastOrder: '2026-04-28' },
    ])

    renderAnalytics()
    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })
  })
})
