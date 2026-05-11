import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmOrderModal from '../modals/ConfirmOrderModal'
import InitiateHandoffModal from '../modals/InitiateHandoffModal'
import CancelOrderModal from '../modals/CancelOrderModal'

const MOCK_ORDER = {
  id: 1, orderCode: 'ORD-001',
  buyer: { fullName: 'Marina Seafoods' },
  species: { commonName: 'Yellowfin Tuna' },
  orderedQtyKg: 42, agreedPricePerKg: 380, dispatchMode: 'DELIVERY',
}

describe('ConfirmOrderModal', () => {
  it('renders order details', () => {
    render(<ConfirmOrderModal order={MOCK_ORDER} onClose={vi.fn()} onConfirm={vi.fn()} onDecline={vi.fn()} />)
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
    expect(screen.getByText(/Yellowfin Tuna/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument()
  })
})

describe('InitiateHandoffModal', () => {
  it('confirm is disabled until actualKg is filled', () => {
    render(<InitiateHandoffModal order={MOCK_ORDER} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /confirm handoff/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/actual weight/i), { target: { value: '41' } })
    expect(screen.getByRole('button', { name: /confirm handoff/i })).not.toBeDisabled()
  })
})

describe('CancelOrderModal', () => {
  it('confirm is disabled until reason is provided', () => {
    render(<CancelOrderModal order={MOCK_ORDER} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'Changed my mind' } })
    expect(screen.getByRole('button', { name: /cancel order/i })).not.toBeDisabled()
  })
})
