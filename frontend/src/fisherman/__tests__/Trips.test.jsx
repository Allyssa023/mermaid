// frontend/src/fisherman/__tests__/Trips.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import StartTripModal from '../../components/StartTripModal'

describe('StartTripModal checklist gate', () => {
  it('Start Trip button is disabled until all 6 items are checked', async () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()
    render(<StartTripModal onClose={onClose} onCreated={onCreated} />)

    // Step 1 — select municipality, departure point, target area, then click Next
    fireEvent.change(screen.getByRole('combobox', { name: /municipality/i }), { target: { value: 'Agoo' } })
    fireEvent.change(screen.getByRole('combobox', { name: /departure point/i }), { target: { value: 'Sta. Rita Central' } })
    fireEvent.change(screen.getByRole('combobox', { name: /target area/i }), { target: { value: 'Lingayen Gulf off Agoo' } })
    fireEvent.click(screen.getByText(/next/i))

    // Step 2 — checklist: Start Trip should be disabled initially
    const startBtn = screen.getByRole('button', { name: /start trip/i })
    expect(startBtn).toBeDisabled()

    // Check all 6 checkboxes (they use display:none but are still in the DOM)
    const checkboxes = screen.getAllByRole('checkbox', { hidden: true })
    expect(checkboxes).toHaveLength(6)
    checkboxes.forEach(cb => fireEvent.click(cb))

    // Now Start Trip should be enabled
    expect(startBtn).not.toBeDisabled()
  })
})
