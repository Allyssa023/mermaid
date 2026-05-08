import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/earnings', () => ({
  getEarningsSummary: vi.fn().mockResolvedValue({
    totalGross: 1500, cashCollected: 1000, creditOutstanding: 500, orderCount: 3,
  }),
  getEarningsLedger: vi.fn().mockResolvedValue([]),
}))

import Earnings from '../Earnings'

describe('Earnings page', () => {
  it('renders cash and credit summary tiles', async () => {
    render(<Earnings />)
    expect(await screen.findByText('₱1,000.00')).toBeInTheDocument()
    expect(await screen.findByText('₱500.00')).toBeInTheDocument()
  })
})
