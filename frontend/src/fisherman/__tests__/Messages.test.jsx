import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MessagesPage from '../Messages'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/deals', () => ({
  listMyDeals: vi.fn(),
  getDeal: vi.fn(),
  listDealMessages: vi.fn(),
  submitProposal: vi.fn(),
  acceptProposal: vi.fn(),
  rejectProposal: vi.fn(),
}))
vi.mock('../../components/DealChatPane', () => ({ default: () => <div data-testid="deal-chat-pane" /> }))
vi.mock('../../utils/dealsLocalStorage', () => ({
  readLastViewed: vi.fn().mockReturnValue(new Date(0)),
  writeLastViewed: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))
vi.mock('../../context/StompContext', () => ({
  useStomp: vi.fn().mockReturnValue({ subscribe: vi.fn(), send: vi.fn() }),
}))

import { listMyDeals } from '../api/deals'

const MOCK_DEAL = {
  id: 1, status: 'NEGOTIATING',
  vendorName: 'Rosario',
  speciesName: 'Bangus',
  lastMessageAt: new Date().toISOString(),
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listMyDeals.mockResolvedValue([MOCK_DEAL])
})

describe('MessagesPage', () => {
  it('renders vendor name in deal list', async () => {
    wrap(<MessagesPage />)
    expect(await screen.findByText(/Rosario/i)).toBeInTheDocument()
  })

  it('does NOT render a DM tab or contact list', async () => {
    wrap(<MessagesPage />)
    await screen.findByText(/Rosario/i)
    expect(screen.queryByText(/Direct Message/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Conversations/i)).not.toBeInTheDocument()
  })
})
