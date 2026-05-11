// Full fisherman → vendor lifecycle, end to end.
// Trip → catch → alert → vendor offer → fisherman accept → handoff (both sides)
// → vendor payment → fisherman confirm receipt.
import { test, expect } from './helpers/fixtures.js'
import {
  startTrip, saveChecklist, addCatch, createCatchAlert,
  listSpecies, createOrder, confirmOrder, createHandoff,
  confirmHandoffSeller, confirmHandoffBuyer, recordPayment, confirmPayment,
} from './helpers/api.js'

test('Full lifecycle: trip → catch → alert → offer → accept → handoff → payment', async ({
  fishermanPage, fisherman, vendor,
}) => {
  // ── Setup via API ──────────────────────────────────────────────
  const trip = await startTrip(fisherman.context, {})
  await saveChecklist(fisherman.context, trip.id, true)
  const species = (await listSpecies(fisherman.context))[0]
  const catchLog = await addCatch(fisherman.context, trip.id, {
    speciesId: species.id, quantityEstimate: '5 kg', quantityKg: 5,
  })
  const alert = await createCatchAlert(fisherman.context, {
    speciesId: species.id, catchLogId: catchLog.id, quantityKg: 5,
    askingPricePerKg: 100, expiresInHours: 4,
  })

  // ── Vendor places an offer ─────────────────────────────────────
  const order = await createOrder(vendor.context, {
    speciesId: species.id,
    catchAlertId: alert.id,
    agreedPricePerKg: 120,
    orderedQtyKg: 5,
    dispatchMode: 'PICKUP',
  })
  expect(order.status).toBe('PENDING')

  // ── Fisherman accepts via UI ───────────────────────────────────
  await fishermanPage.goto('/fisherman/catch-alerts')
  await fishermanPage.getByRole('button', { name: /1 offer/i }).click()
  await fishermanPage.locator('.modal').getByRole('button', { name: /accept offer/i }).click()
  await expect(
    fishermanPage.locator('.modal').locator('.chip', { hasText: /CONFIRMED/ })
  ).toBeVisible({ timeout: 10_000 })

  // ── Handoff: both parties confirm ──────────────────────────────
  await createHandoff(fisherman.context, order.id, 4.8, 120)
  await confirmHandoffSeller(fisherman.context, order.id)
  const h = await confirmHandoffBuyer(vendor.context, order.id)
  expect(h.status).toBe('CONFIRMED')

  // ── Payment ────────────────────────────────────────────────────
  const total = 4.8 * 120
  const pay = await recordPayment(vendor.context, order.id, total)
  expect(pay.amount).toBeCloseTo(total, 2)
  const confirmed = await confirmPayment(fisherman.context, order.id)
  expect(confirmed.status).toBe('CONFIRMED')

  // ── Verify final state in Orders UI ────────────────────────────
  await fishermanPage.goto('/fisherman/orders')
  // Switch to Completed filter chip.
  await fishermanPage.getByRole('button', { name: /^completed/i }).click()
  await expect(fishermanPage.getByText(`#${order.id}`)).toBeVisible({ timeout: 10_000 })
})
