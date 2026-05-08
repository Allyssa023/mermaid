// frontend/src/fisherman/__tests__/Trips.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Import StartTripModal as named export
import { StartTripModal } from '../Trips'

describe('StartTripModal checklist gate', () => {
  it('Start Trip button is disabled until all 6 items are checked', () => {
    const onClose = vi.fn()
    const onStarted = vi.fn()
    render(<StartTripModal onClose={onClose} onStarted={onStarted} />)

    // Enter vessel name and click Next to reach checklist (step 2)
    const vesselInput = screen.getByPlaceholderText(/vessel name/i)
    fireEvent.change(vesselInput, { target: { value: 'MV Test' } })
    fireEvent.click(screen.getByText('Next'))

    // Now on checklist step — Start Trip should be disabled
    const startBtn = screen.getByRole('button', { name: /start trip/i })
    expect(startBtn).toBeDisabled()

    // Check all 6 boxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(6)
    checkboxes.forEach(cb => fireEvent.click(cb))

    // Now Start Trip should be enabled
    expect(startBtn).not.toBeDisabled()
  })
})
