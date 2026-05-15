// frontend/src/components/__tests__/ProposalCard.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProposalCard from '../ProposalCard'

const BASE = {
  id: 99,
  dealId: 1,
  proposedById: 7,
  proposedByName: 'Rosario',
  qtyKg: 30,
  pricePerKg: 200,
  status: 'PENDING',
  createdAt: '2026-05-15T10:00:00Z',
}

describe('ProposalCard', () => {
  it('shows Accept/Reject/Counter only when isCounterparty=true and status PENDING', () => {
    const onAccept = vi.fn()
    const onReject = vi.fn()
    const onCounter = vi.fn()
    render(<ProposalCard proposal={BASE} isCounterparty={true} onAccept={onAccept} onReject={onReject} onCounter={onCounter} />)

    const acceptBtn = screen.getByRole('button', { name: /accept/i })
    const rejectBtn = screen.getByRole('button', { name: /reject/i })
    const counterBtn = screen.getByRole('button', { name: /counter/i })
    expect(acceptBtn).toBeInTheDocument()
    expect(rejectBtn).toBeInTheDocument()
    expect(counterBtn).toBeInTheDocument()

    fireEvent.click(acceptBtn)
    fireEvent.click(rejectBtn)
    fireEvent.click(counterBtn)
    expect(onAccept).toHaveBeenCalledWith(99)
    expect(onReject).toHaveBeenCalledWith(99)
    expect(onCounter).toHaveBeenCalledWith(BASE)
  })

  it('hides action buttons and shows status text when status is SUPERSEDED', () => {
    render(<ProposalCard proposal={{ ...BASE, status: 'SUPERSEDED' }} isCounterparty={true} />)
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /counter/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/superseded/i).length).toBeGreaterThan(0)
  })

  it('hides action buttons when status is ACCEPTED', () => {
    render(<ProposalCard proposal={{ ...BASE, status: 'ACCEPTED' }} isCounterparty={true} />)
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/accepted/i).length).toBeGreaterThan(0)
  })

  it('hides action buttons when status is REJECTED', () => {
    render(<ProposalCard proposal={{ ...BASE, status: 'REJECTED' }} isCounterparty={true} />)
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/rejected/i).length).toBeGreaterThan(0)
  })

  it('when isCounterparty=false and status PENDING, hides buttons and shows awaiting text', () => {
    render(<ProposalCard proposal={BASE} isCounterparty={false} />)
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    expect(screen.getByText(/awaiting their response/i)).toBeInTheDocument()
  })

  it('renders qty, price, and proposer name', () => {
    render(<ProposalCard proposal={BASE} isCounterparty={false} />)
    expect(screen.getByText(/30 kg/)).toBeInTheDocument()
    expect(screen.getByText(/₱200\/kg/)).toBeInTheDocument()
    expect(screen.getByText(/Rosario/)).toBeInTheDocument()
  })
})
