// Trip + Add Catch + Alert Vendors regression suite.
// Covers all the fixes from the recent stabilization pass.
import { test, expect } from './helpers/fixtures.js'

test.describe('Fisherman · Trips', () => {

  test('Start Trip — departure & target are optional (no asterisks)', async ({ fishermanPage: page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/fisherman/)
    await page.getByRole('link', { name: /trips/i }).first().click()

    await page.getByRole('button', { name: /\+ start trip/i }).click()

    // Labels should say "(optional)" and not have a red asterisk.
    await expect(page.getByText('Departure point')).toBeVisible()
    const depRow = page.locator('.form-row', { hasText: 'Departure point' })
    await expect(depRow.getByText('(optional)')).toBeVisible()
    await expect(depRow.locator('span', { hasText: '*' })).toHaveCount(0)

    const tgtRow = page.locator('.form-row', { hasText: 'Target area' })
    await expect(tgtRow.getByText('(optional)')).toBeVisible()
  })

  test('Start Trip — submit with all fields blank proceeds to checklist', async ({ fishermanPage: page }) => {
    await page.goto('/fisherman/trips')
    await page.getByRole('button', { name: /\+ start trip/i }).click()

    // Leave all blank.
    await page.getByRole('button', { name: /^next$/i }).click()
    // Step 2 visible.
    await expect(page.getByText('Safety Checklist')).toBeVisible()
  })

  test('Safety Checklist — Start Trip blocked + inline error until all 6 checked', async ({ fishermanPage: page }) => {
    await page.goto('/fisherman/trips')
    await page.getByRole('button', { name: /\+ start trip/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Progress label shows 0/6 (red).
    await expect(page.getByText(/0\/6 complete/)).toBeVisible()

    const startBtn = page.getByRole('button', { name: /^start trip$/i })
    await expect(startBtn).toBeDisabled()

    // Tick 3 → still disabled, label "3/6".
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()
    await checkboxes.nth(2).check()
    await expect(page.getByText(/3\/6 complete/)).toBeVisible()
    await expect(startBtn).toBeDisabled()

    // Tick remaining → enabled, label "6/6" in green color.
    await checkboxes.nth(3).check()
    await checkboxes.nth(4).check()
    await checkboxes.nth(5).check()
    await expect(page.getByText(/6\/6 complete/)).toBeVisible()
    await expect(startBtn).toBeEnabled()

    await startBtn.click()

    // Active trip card appears.
    await expect(page.getByText(/Currently active/i)).toBeVisible({ timeout: 10_000 })
  })

  test('Add Catch — species is a strict <select> (no free-text combobox)', async ({ fishermanPage: page, fisherman }) => {
    // Pre-start a trip via API so we don't repeat the start UI here.
    const trip = await (async () => {
      const ctx = fisherman.context
      const r = await ctx.post('/api/trips', { data: {} })
      const t = await r.json()
      await ctx.put(`/api/trips/${t.id}/checklist`, {
        data: {
          fuelChecked: true, engineChecked: true, radioChecked: true,
          lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
        },
      })
      return t
    })()

    await page.goto('/fisherman/trips')
    await expect(page.getByText(/Currently active/i)).toBeVisible()
    await page.getByRole('button', { name: /\+ add catch/i }).click()

    const speciesField = page.getByLabel(/^Species/i)
    // Must be a native <select>.
    await expect(speciesField).toHaveJSProperty('tagName', 'SELECT')
    // Has the placeholder option + at least one species.
    const options = await speciesField.locator('option').count()
    expect(options).toBeGreaterThan(1)

    // Submitting without picking shows error.
    await page.getByRole('button', { name: /^add catch$/i }).click()
    await expect(page.getByText(/please select a species/i)).toBeVisible()

    // Pick species, leave estimate + kg blank → error.
    await speciesField.selectOption({ index: 1 })
    await page.getByRole('button', { name: /^add catch$/i }).click()
    await expect(page.getByText(/quantity estimate or exact kg is required/i)).toBeVisible()

    // Pick species + estimate "test catch" + no other fields → submits (NPE regression).
    await page.getByLabel(/Quantity estimate/i).fill('test catch')
    await page.getByRole('button', { name: /^add catch$/i }).click()

    // New row visible in catches list.
    await expect(page.getByText(/Catches \(/)).toBeVisible({ timeout: 8_000 })
  })

  test('Alert Vendors button — counts unalerted catches and disables after alerting', async ({
    fishermanPage: page, fisherman,
  }) => {
    // Set up: trip + 2 catches via API.
    const ctx = fisherman.context
    const trip = await (await ctx.post('/api/trips', { data: {} })).json()
    await ctx.put(`/api/trips/${trip.id}/checklist`, {
      data: {
        fuelChecked: true, engineChecked: true, radioChecked: true,
        lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
      },
    })
    const species = await (await ctx.get('/api/lookups/fish-species')).json()
    const spId = species[0].id
    await ctx.post(`/api/trips/${trip.id}/catches`, {
      data: { speciesId: spId, quantityEstimate: '5 kg' },
    })
    await ctx.post(`/api/trips/${trip.id}/catches`, {
      data: { speciesId: spId, quantityEstimate: '3 kg' },
    })

    await page.goto('/fisherman/trips')

    // Button should now read "Alert Vendors (2)".
    const alertBtn = page.getByRole('button', { name: /alert vendors \(2\)/i })
    await expect(alertBtn).toBeVisible({ timeout: 10_000 })
    await expect(alertBtn).toBeEnabled()

    await alertBtn.click()
    await expect(page.getByText(/Alerted vendors about 2 catch/i)).toBeVisible({ timeout: 10_000 })

    // After alerting, button label switches to "All alerted" and is disabled.
    await expect(page.getByRole('button', { name: /all alerted/i })).toBeDisabled({ timeout: 10_000 })
  })
})
