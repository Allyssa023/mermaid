// frontend/src/components/__tests__/DealComposer.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DealComposer from '../DealComposer'

describe('DealComposer', () => {
  it('starts on Message tab and can switch to Propose', () => {
    render(<DealComposer onSendText={vi.fn()} onSendProposal={vi.fn()} />)
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /propose/i }))
    expect(screen.getByLabelText(/quantity in kg/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price per kg/i)).toBeInTheDocument()
  })

  it('blocks Propose submit when qty is empty', () => {
    render(<DealComposer onSendText={vi.fn()} onSendProposal={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: /propose/i }))
    fireEvent.change(screen.getByLabelText(/price per kg/i), { target: { value: '200' } })
    const sendBtn = screen.getByRole('button', { name: /send proposal/i })
    expect(sendBtn).toBeDisabled()
  })

  it('blocks Propose submit when price is empty', () => {
    render(<DealComposer onSendText={vi.fn()} onSendProposal={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: /propose/i }))
    fireEvent.change(screen.getByLabelText(/quantity in kg/i), { target: { value: '30' } })
    expect(screen.getByRole('button', { name: /send proposal/i })).toBeDisabled()
  })

  it('opens in Propose tab with values pre-filled when initial.qtyKg is set', () => {
    render(<DealComposer onSendText={vi.fn()} onSendProposal={vi.fn()} initial={{ qtyKg: 30, pricePerKg: 200 }} />)
    expect(screen.getByLabelText(/quantity in kg/i)).toHaveValue('30')
    expect(screen.getByLabelText(/price per kg/i)).toHaveValue('200')
    expect(screen.getByRole('button', { name: /send proposal/i })).not.toBeDisabled()
  })

  it('Message tab submit calls onSendText(text)', () => {
    const onSendText = vi.fn()
    render(<DealComposer onSendText={onSendText} onSendProposal={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/type a message/i), { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(onSendText).toHaveBeenCalledWith('hello')
  })

  it('Propose tab submit calls onSendProposal with integer qtyKg and pricePerKg', () => {
    const onSendProposal = vi.fn()
    render(<DealComposer onSendText={vi.fn()} onSendProposal={onSendProposal} />)
    fireEvent.click(screen.getByRole('tab', { name: /propose/i }))
    // Try to enter non-numeric junk — should be sanitized away
    fireEvent.change(screen.getByLabelText(/quantity in kg/i), { target: { value: '3a0.5' } })
    fireEvent.change(screen.getByLabelText(/price per kg/i), { target: { value: '200xx' } })
    fireEvent.click(screen.getByRole('button', { name: /send proposal/i }))
    expect(onSendProposal).toHaveBeenCalledWith({ qtyKg: 305, pricePerKg: 200 })
  })

  it('disables inputs and buttons when disabled prop is true', () => {
    render(<DealComposer onSendText={vi.fn()} onSendProposal={vi.fn()} disabled={true} initial={{ qtyKg: 30, pricePerKg: 200 }} />)
    expect(screen.getByLabelText(/quantity in kg/i)).toBeDisabled()
    expect(screen.getByLabelText(/price per kg/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /send proposal/i })).toBeDisabled()
  })
})
