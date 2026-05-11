import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderCard from '../OrderCard'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const BASE_ORDER = {
  id: 1, orderCode: 'ORD-001',
  buyer: { fullName: 'Marina Seafoods' },
  seller: { fullName: 'Ramiro Delgado' },
  species: { commonName: 'Yellowfin Tuna' },
  orderedQtyKg: 42, agreedPricePerKg: 380,
  status: 'PENDING', handoff: null, payment: null,
}

describe('OrderCard — fisherman perspective', () => {
  it('shows Confirm Order button when PENDING + role=FISHERMAN', () => {
    wrap(<OrderCard order={BASE_ORDER} currentRole="FISHERMAN" onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument()
  })

  it('shows "Waiting" text when CONFIRMED + role=FISHERMAN', () => {
    wrap(<OrderCard order={{ ...BASE_ORDER, status: 'CONFIRMED' }} currentRole="FISHERMAN" onAction={vi.fn()} />)
    expect(screen.getByText(/waiting/i)).toBeInTheDocument()
  })

  it('shows order code', () => {
    wrap(<OrderCard order={BASE_ORDER} currentRole="FISHERMAN" onAction={vi.fn()} />)
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
  })
})

describe('OrderCard — vendor perspective', () => {
  it('shows Initiate Handoff when CONFIRMED + role=VENDOR', () => {
    wrap(<OrderCard order={{ ...BASE_ORDER, status: 'CONFIRMED' }} currentRole="VENDOR" onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /initiate handoff/i })).toBeInTheDocument()
  })
})
