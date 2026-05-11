// Procurement page no-flicker test + NPE regression for catch logging.
import { test, expect } from './helpers/fixtures.js'

test('Procurement status pill stays mounted across polling cycles (no flicker)', async ({
  fishermanPage: page,
}) => {
  await page.goto('/fisherman/procurement')

  // Wait for the bucket to load (empty or with cards — both fine).
  await expect(page.getByText(/procurement inbox/i)).toBeVisible()

  // We track the polling stability by listening for re-renders. The simplest
  // observable proxy: the page heading must remain stable while we observe for
  // 40 seconds, and no "Stale" chip should flash.
  const heading = page.getByText(/procurement inbox/i)
  const start = Date.now()
  while (Date.now() - start < 40_000) {
    await expect(heading).toBeVisible()
    // Stale chip should never appear during a normal poll cycle.
    await expect(page.locator('.chip', { hasText: /^Stale$/i })).toHaveCount(0)
    await page.waitForTimeout(2_000)
  }
})

test('Catch logging — submitting with blank optional price does NOT trigger backend NPE', async ({
  fishermanPage: page, fisherman,
}) => {
  // Start a trip (via UI to also exercise that flow).
  const ctx = fisherman.context
  const trip = await (await ctx.post('/api/trips', { data: {} })).json()
  await ctx.put(`/api/trips/${trip.id}/checklist`, {
    data: {
      fuelChecked: true, engineChecked: true, radioChecked: true,
      lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
    },
  })

  await page.goto('/fisherman/trips')
  await expect(page.getByText(/Currently active/i)).toBeVisible()
  await page.getByRole('button', { name: /\+ add catch/i }).click()

  // Pick first species, fill ONLY estimate (no kg, no price).
  await page.getByLabel(/^Species/i).selectOption({ index: 1 })
  await page.getByLabel(/Quantity estimate/i).fill('regression catch')

  // Listen for failed responses on the catches endpoint.
  const responsePromise = page.waitForResponse(r =>
    r.url().includes(`/api/trips/${trip.id}/catches`) && r.request().method() === 'POST'
  )
  await page.getByRole('button', { name: /^add catch$/i }).click()
  const res = await responsePromise
  // Must NOT be 500 (the NPE we fixed).
  expect(res.status()).toBe(201)
  const body = await res.json()
  // Backend should accept the request and return a saved log with null price.
  expect(body.estimatedPricePerKg).toBeNull()
})
