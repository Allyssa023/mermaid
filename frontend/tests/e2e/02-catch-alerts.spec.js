// Catch Alerts page + Vendor Offers modal regression suite.
import { test, expect } from './helpers/fixtures.js'

async function setupTripWithCatch(fisherman) {
  const ctx = fisherman.context
  const trip = await (await ctx.post('/api/trips', { data: {} })).json()
  await ctx.put(`/api/trips/${trip.id}/checklist`, {
    data: {
      fuelChecked: true, engineChecked: true, radioChecked: true,
      lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
    },
  })
  const species = await (await ctx.get('/api/lookups/fish-species')).json()
  const sp = species[0]
  const c = await (await ctx.post(`/api/trips/${trip.id}/catches`, {
    data: { speciesId: sp.id, quantityEstimate: '5 kg', quantityKg: 5 },
  })).json()
  const alert = await (await ctx.post('/api/catch-alerts', {
    data: { speciesId: sp.id, catchLogId: c.id, quantityKg: 5, askingPricePerKg: 100, expiresInHours: 4 },
  })).json()
  return { trip, species: sp, catchLog: c, alert }
}

test.describe('Fisherman · Catch Alerts', () => {

  test('Open offers count is 0 when no vendor has actually offered (auto-offer regression)', async ({
    fishermanPage: page, fisherman,
  }) => {
    await setupTripWithCatch(fisherman)
    await page.goto('/fisherman/catch-alerts')

    // Strip should show "Open offers" = 0 even though a same-species demand
    // listing may exist (the old bug counted those as offers).
    const stat = page.locator('.stat', { hasText: /open offers/i })
    await expect(stat.locator('.v')).toHaveText('0', { timeout: 10_000 })

    // The "N offers" accent button must NOT be visible on the alert card.
    await expect(page.getByRole('button', { name: /\d+ offer/i })).toHaveCount(0)
  })

  test('Vendor offer flows end-to-end and Accept/Decline both work', async ({
    fishermanPage: page, fisherman, vendor,
  }) => {
    const { alert, species } = await setupTripWithCatch(fisherman)

    // Vendor places an offer.
    const order = await (await vendor.context.post('/api/orders', {
      data: {
        speciesId: species.id,
        catchAlertId: alert.id,
        agreedPricePerKg: 110,
        orderedQtyKg: 5,
        dispatchMode: 'PICKUP',
        notes: 'test offer',
      },
    })).json()

    await page.goto('/fisherman/catch-alerts')

    // "1 offer · 1 new" button visible.
    const offersBtn = page.getByRole('button', { name: /1 offer/i })
    await expect(offersBtn).toBeVisible({ timeout: 10_000 })

    // Open the modal.
    await offersBtn.click()
    const modal = page.locator('.modal')
    await expect(modal.getByText(/Vendor Offers \(1\)/i)).toBeVisible()
    await expect(modal.getByText(/E2E Vendor/)).toBeVisible()
    await expect(modal.getByText(/₱110\/kg/)).toBeVisible()

    // Accept the offer.
    await modal.getByRole('button', { name: /accept offer/i }).click()
    await expect(modal.locator('.chip', { hasText: /CONFIRMED/ })).toBeVisible({ timeout: 10_000 })

    // The accept button should disappear (no longer PENDING).
    await expect(modal.getByRole('button', { name: /accept offer/i })).toHaveCount(0)
  })

  test('Decline path moves order to CANCELLED', async ({
    fishermanPage: page, fisherman, vendor,
  }) => {
    const { alert, species } = await setupTripWithCatch(fisherman)
    await vendor.context.post('/api/orders', {
      data: {
        speciesId: species.id, catchAlertId: alert.id,
        agreedPricePerKg: 120, orderedQtyKg: 5,
      },
    })

    await page.goto('/fisherman/catch-alerts')
    await page.getByRole('button', { name: /1 offer/i }).click()
    const modal = page.locator('.modal')
    await modal.getByRole('button', { name: /^decline$/i }).click()
    await expect(modal.locator('.chip', { hasText: /CANCELLED/ })).toBeVisible({ timeout: 10_000 })
  })
})
