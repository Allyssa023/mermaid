import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Payouts from '../Payouts'

// Mock payouts API
vi.mock('../api/payouts', () => ({
  getPayoutsSummary: vi.fn(),
  getPayoutsLedger: vi.fn(),
}))

import { getPayoutsSummary, getPayoutsLedger } from '../api/payouts'

function renderPayouts() {
  return render(
    <MemoryRouter>
      <Payouts />
    </MemoryRouter>
  )
}

describe('Payouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial prompt before applying date range', () => {
    renderPayouts()
    expect(screen.getByText(/Select a date range and click Apply/)).toBeInTheDocument()
  })

  it('renders ledger table after successful fetch', async () => {
    getPayoutsSummary.mockResolvedValue({
      pendingTotal: 3300,
      paidTotal: 0,
    })
    getPayoutsLedger.mockResolvedValue([
      {
        orderId: 1,
        date: '2026-04-15',
        buyerName: 'Ana Cruz',
        speciesName: 'Tuna',
        qtyKg: 10,
        gross: 1500,
        fees: 0,
        net: 1500,
        status: 'PENDING_PAYOUT',
      },
      {
        orderId: 2,
        date: '2026-04-16',
        buyerName: 'Jose Reyes',
        speciesName: 'Mackerel',
        qtyKg: 5,
        gross: 600,
        fees: 0,
        net: 600,
        status: 'PENDING_PAYOUT',
      },
    ])

    renderPayouts()
    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Ledger')).toBeInTheDocument()
    })

    // Ledger rows present
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('Ana Cruz')).toBeInTheDocument()
    expect(screen.getByText('Tuna')).toBeInTheDocument()
    expect(screen.getByText('Mackerel')).toBeInTheDocument()
  })

  it('renders PENDING_PAYOUT status badges', async () => {
    getPayoutsSummary.mockResolvedValue({ pendingTotal: 1500, paidTotal: 0 })
    getPayoutsLedger.mockResolvedValue([
      {
        orderId: 1, date: '2026-04-15', buyerName: 'Ana', speciesName: 'Tuna',
        qtyKg: 10, gross: 1500, fees: 0, net: 1500, status: 'PENDING_PAYOUT',
      },
    ])

    renderPayouts()
    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('PENDING_PAYOUT')).toBeInTheDocument()
    })
  })

  it('renders disclaimer text in summary', async () => {
    getPayoutsSummary.mockResolvedValue({ pendingTotal: 3300, paidTotal: 0 })
    getPayoutsLedger.mockResolvedValue([])

    renderPayouts()
    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/Stub — payouts are not yet processed automatically/)).toBeInTheDocument()
    })
  })

  it('renders pending and paid totals in summary', async () => {
    getPayoutsSummary.mockResolvedValue({ pendingTotal: 3300, paidTotal: 0 })
    getPayoutsLedger.mockResolvedValue([])

    renderPayouts()
    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Paid Out')).toBeInTheDocument()
    })

    // ₱3,300.00 should be rendered
    expect(screen.getByText(/3,300/)).toBeInTheDocument()
  })

  it('shows empty ledger message when no entries', async () => {
    getPayoutsSummary.mockResolvedValue({ pendingTotal: 0, paidTotal: 0 })
    getPayoutsLedger.mockResolvedValue([])

    renderPayouts()
    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/No payout entries for this period/)).toBeInTheDocument()
    })
  })

  it('shows date validation error for invalid range', async () => {
    renderPayouts()

    const fromInput = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[0]
    const toInput = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[1]

    fireEvent.change(fromInput, { target: { value: '2026-05-01' } })
    fireEvent.change(toInput, { target: { value: '2026-04-01' } })

    fireEvent.submit(screen.getByText('From').closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/Start date must be before end date/)).toBeInTheDocument()
    })

    expect(getPayoutsSummary).not.toHaveBeenCalled()
  })
})
