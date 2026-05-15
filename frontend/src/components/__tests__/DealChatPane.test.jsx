// frontend/src/components/__tests__/DealChatPane.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DealChatPane from '../DealChatPane'

vi.mock('../../context/StompContext', () => ({
  useStomp: () => ({
    connected: true,
    sendChatMessage: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn(),
    client: null,
  }),
}))

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const VENDOR_ID = 7
const FISHERMAN_ID = 4

function makeApi({ deal, messages }) {
  return {
    getDeal: vi.fn().mockResolvedValue(deal),
    listDealMessages: vi.fn().mockResolvedValue(messages),
    submitProposal: vi.fn().mockResolvedValue({}),
    acceptProposal: vi.fn().mockResolvedValue({}),
    rejectProposal: vi.fn().mockResolvedValue({}),
  }
}

const BASE_DEAL = {
  id: 1,
  vendorId: VENDOR_ID,
  fishermanId: FISHERMAN_ID,
  vendorName: 'Rosario',
  fishermanName: 'Isidro',
  species: 'Yellowfin Tuna',
  status: 'NEGOTIATING',
  latestProposal: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DealChatPane', () => {
  it('disables composer when deal.status is AGREED (non-NEGOTIATING)', async () => {
    const api = makeApi({
      deal: { ...BASE_DEAL, status: 'AGREED' },
      messages: [],
    })
    wrap(<DealChatPane dealId={1} currentUserId={VENDOR_ID} apiClient={api} />)
    // Wait for queries to settle and the composer to render
    await screen.findByPlaceholderText(/type a message/i)
    const input = screen.getByPlaceholderText(/type a message/i)
    expect(input).toBeDisabled()
    const sendBtn = screen.getByRole('button', { name: /^send$/i })
    expect(sendBtn).toBeDisabled()
  })

  it('renders TEXT and SYSTEM messages mixed in the thread', async () => {
    const messages = [
      { id: 1, senderId: FISHERMAN_ID, recipientId: VENDOR_ID, content: 'hello',           sentAt: '2026-05-15T10:00:00Z' },
      { id: 2, senderId: VENDOR_ID,   recipientId: FISHERMAN_ID, content: '[SYSTEM] Deal opened', sentAt: '2026-05-15T10:01:00Z' },
      { id: 3, senderId: VENDOR_ID,   recipientId: FISHERMAN_ID, content: 'sure thing',     sentAt: '2026-05-15T10:02:00Z' },
    ]
    const api = makeApi({ deal: BASE_DEAL, messages })
    wrap(<DealChatPane dealId={1} currentUserId={VENDOR_ID} apiClient={api} />)

    await screen.findByText('hello')
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByText('sure thing')).toBeInTheDocument()
    // SYSTEM prefix is stripped
    expect(screen.getByText('Deal opened')).toBeInTheDocument()
    expect(screen.queryByText(/\[SYSTEM\]/)).not.toBeInTheDocument()
  })

  it('Counter on a second proposal updates composer with that proposal\'s values', async () => {
    // Regression guard: DealComposer uses useState(initial) which is only
    // honored on mount. DealChatPane must key the composer so a fresh
    // Counter click against a different proposal remounts it with new values.
    const dealA = {
      ...BASE_DEAL,
      id: 1,
      latestProposal: {
        id: 101,
        qtyKg: 30,
        pricePerKg: 200,
        status: 'PENDING',
        proposedById: FISHERMAN_ID,
        proposedByName: 'Isidro',
        createdAt: '2026-05-15T10:00:00Z',
      },
    }
    const dealB = {
      ...BASE_DEAL,
      id: 2,
      latestProposal: {
        id: 102,
        qtyKg: 50,
        pricePerKg: 300,
        status: 'PENDING',
        proposedById: FISHERMAN_ID,
        proposedByName: 'Isidro',
        createdAt: '2026-05-15T11:00:00Z',
      },
    }
    const apiA = makeApi({ deal: dealA, messages: [] })
    const apiB = makeApi({ deal: dealB, messages: [] })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <DealChatPane dealId={1} currentUserId={VENDOR_ID} apiClient={apiA} />
      </QueryClientProvider>
    )

    // Wait for proposal A to render, then click Counter
    await screen.findByText('30 kg · ₱200/kg')
    fireEvent.click(screen.getByRole('button', { name: /counter/i }))
    expect(screen.getByLabelText(/quantity in kg/i)).toHaveValue('30')
    expect(screen.getByLabelText(/price per kg/i)).toHaveValue('200')

    // Swap to deal B (new dealId triggers a fresh query) and click Counter again
    rerender(
      <QueryClientProvider client={client}>
        <DealChatPane dealId={2} currentUserId={VENDOR_ID} apiClient={apiB} />
      </QueryClientProvider>
    )
    await screen.findByText('50 kg · ₱300/kg')
    fireEvent.click(screen.getByRole('button', { name: /counter/i }))
    expect(screen.getByLabelText(/quantity in kg/i)).toHaveValue('50')
    expect(screen.getByLabelText(/price per kg/i)).toHaveValue('300')
  })

  it('renders PROPOSAL chat messages as a proposal card (not raw text)', async () => {
    const messages = [
      { id: 1, senderId: FISHERMAN_ID, recipientId: VENDOR_ID, content: '[PROPOSAL] qty=30,price=200', sentAt: '2026-05-15T10:00:00Z' },
    ]
    const api = makeApi({ deal: BASE_DEAL, messages })
    wrap(<DealChatPane dealId={1} currentUserId={VENDOR_ID} apiClient={api} />)

    await waitFor(() => {
      expect(screen.getByTestId('thread-proposal')).toBeInTheDocument()
    })
    // Raw encoded form must NOT appear
    expect(screen.queryByText(/\[PROPOSAL\]/)).not.toBeInTheDocument()
    // The parsed values are shown
    expect(screen.getByText(/30 kg/)).toBeInTheDocument()
    expect(screen.getByText(/₱200\/kg/)).toBeInTheDocument()
  })
})
