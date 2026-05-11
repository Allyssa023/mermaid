# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-catch-alerts.spec.js >> Fisherman · Catch Alerts >> Vendor offer flows end-to-end and Accept/Decline both work
- Location: tests\e2e\02-catch-alerts.spec.js:41:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /1 offer/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: /1 offer/i })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e6]: M
      - generic [ref=e7]:
        - generic [ref=e8]: Workspace
        - link "Home" [ref=e9] [cursor=pointer]:
          - /url: /fisherman/home
          - img [ref=e11]
          - generic: Home
        - link "Trips" [ref=e16] [cursor=pointer]:
          - /url: /fisherman/trips
          - img [ref=e18]
          - generic: Trips
        - link "Catch Alerts" [ref=e21] [cursor=pointer]:
          - /url: /fisherman/catch-alerts
          - img [ref=e23]
          - generic: Catch Alerts
        - link "Orders" [ref=e26] [cursor=pointer]:
          - /url: /fisherman/orders
          - img [ref=e28]
          - generic: Orders
        - link "Procurement" [ref=e31] [cursor=pointer]:
          - /url: /fisherman/procurement
          - img [ref=e33]
          - generic: Procurement
        - link "Marketplace" [ref=e36] [cursor=pointer]:
          - /url: /fisherman/marketplace
          - img [ref=e38]
          - generic: Marketplace
        - link "Earnings" [ref=e41] [cursor=pointer]:
          - /url: /fisherman/earnings
          - img [ref=e43]
          - generic: Earnings
        - link "Messages" [ref=e45] [cursor=pointer]:
          - /url: /fisherman/messages
          - img [ref=e47]
          - generic: Messages
        - link "Profile" [ref=e49] [cursor=pointer]:
          - /url: /fisherman/profile
          - img [ref=e51]
          - generic: Profile
        - generic [ref=e54]: Account
        - button "Sign Out" [ref=e55] [cursor=pointer]:
          - img [ref=e57]
          - generic: Sign Out
      - generic [ref=e61] [cursor=pointer]:
        - generic [ref=e62]: EF
        - generic:
          - generic: E2E
          - generic: FISHERMAN
    - main [ref=e63]:
      - generic [ref=e64]:
        - generic [ref=e65]:
          - generic [ref=e66]: Mermaid
          - generic [ref=e67]: /
          - strong [ref=e68]: Catch Alerts
        - button "Notifications" [ref=e70] [cursor=pointer]:
          - img [ref=e71]
        - button "Help" [ref=e74] [cursor=pointer]:
          - img [ref=e75]
      - generic [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: Fisherman · Supply
            - heading "Catch Alerts." [level=1] [ref=e83]:
              - text: Catch
              - emphasis [ref=e84]: Alerts.
            - paragraph [ref=e85]: Notify vendors about your fresh catch · alerts expire in 4h
          - button "Refresh" [ref=e87] [cursor=pointer]:
            - img [ref=e88]
            - text: Refresh
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]: Active alerts
            - generic [ref=e96]: "0"
            - generic [ref=e97]: Visible to vendors
          - generic [ref=e98]:
            - generic [ref=e99]: Total offered
            - generic [ref=e100]: —
            - generic [ref=e101]: Across all alerts
          - generic [ref=e102]:
            - generic [ref=e103]: Potential revenue
            - generic [ref=e104]: —
            - generic [ref=e105]: At asking price
          - generic [ref=e106]:
            - generic [ref=e107]: Open offers
            - generic [ref=e108]: "0"
            - generic [ref=e109]: Awaiting response
          - generic [ref=e110]:
            - generic [ref=e111]: Match rate
            - generic [ref=e112]: —
            - generic [ref=e113]: 0 matched / 0 total
        - generic [ref=e114]:
          - img [ref=e115]
          - generic [ref=e118]: No alerts sent yet
          - paragraph [ref=e119]: Use the banner above to alert vendors from your active trip.
  - button "☀️" [ref=e120] [cursor=pointer]
```

# Test source

```ts
  1  | // Catch Alerts page + Vendor Offers modal regression suite.
  2  | import { test, expect } from './helpers/fixtures.js'
  3  | 
  4  | async function setupTripWithCatch(fisherman) {
  5  |   const ctx = fisherman.context
  6  |   const trip = await (await ctx.post('/api/trips', { data: {} })).json()
  7  |   await ctx.put(`/api/trips/${trip.id}/checklist`, {
  8  |     data: {
  9  |       fuelChecked: true, engineChecked: true, radioChecked: true,
  10 |       lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
  11 |     },
  12 |   })
  13 |   const species = await (await ctx.get('/api/lookups/fish-species')).json()
  14 |   const sp = species[0]
  15 |   const c = await (await ctx.post(`/api/trips/${trip.id}/catches`, {
  16 |     data: { speciesId: sp.id, quantityEstimate: '5 kg', quantityKg: 5 },
  17 |   })).json()
  18 |   const alert = await (await ctx.post('/api/catch-alerts', {
  19 |     data: { speciesId: sp.id, catchLogId: c.id, quantityKg: 5, askingPricePerKg: 100, expiresInHours: 4 },
  20 |   })).json()
  21 |   return { trip, species: sp, catchLog: c, alert }
  22 | }
  23 | 
  24 | test.describe('Fisherman · Catch Alerts', () => {
  25 | 
  26 |   test('Open offers count is 0 when no vendor has actually offered (auto-offer regression)', async ({
  27 |     fishermanPage: page, fisherman,
  28 |   }) => {
  29 |     await setupTripWithCatch(fisherman)
  30 |     await page.goto('/fisherman/catch-alerts')
  31 | 
  32 |     // Strip should show "Open offers" = 0 even though a same-species demand
  33 |     // listing may exist (the old bug counted those as offers).
  34 |     const stat = page.locator('.stat', { hasText: /open offers/i })
  35 |     await expect(stat.locator('.v')).toHaveText('0', { timeout: 10_000 })
  36 | 
  37 |     // The "N offers" accent button must NOT be visible on the alert card.
  38 |     await expect(page.getByRole('button', { name: /\d+ offer/i })).toHaveCount(0)
  39 |   })
  40 | 
  41 |   test('Vendor offer flows end-to-end and Accept/Decline both work', async ({
  42 |     fishermanPage: page, fisherman, vendor,
  43 |   }) => {
  44 |     const { alert, species } = await setupTripWithCatch(fisherman)
  45 | 
  46 |     // Vendor places an offer.
  47 |     const order = await (await vendor.context.post('/api/orders', {
  48 |       data: {
  49 |         speciesId: species.id,
  50 |         catchAlertId: alert.id,
  51 |         agreedPricePerKg: 110,
  52 |         orderedQtyKg: 5,
  53 |         dispatchMode: 'PICKUP',
  54 |         notes: 'test offer',
  55 |       },
  56 |     })).json()
  57 | 
  58 |     await page.goto('/fisherman/catch-alerts')
  59 | 
  60 |     // "1 offer · 1 new" button visible.
  61 |     const offersBtn = page.getByRole('button', { name: /1 offer/i })
> 62 |     await expect(offersBtn).toBeVisible({ timeout: 10_000 })
     |                             ^ Error: expect(locator).toBeVisible() failed
  63 | 
  64 |     // Open the modal.
  65 |     await offersBtn.click()
  66 |     const modal = page.locator('.modal')
  67 |     await expect(modal.getByText(/Vendor Offers \(1\)/i)).toBeVisible()
  68 |     await expect(modal.getByText(/E2E Vendor/)).toBeVisible()
  69 |     await expect(modal.getByText(/₱110\/kg/)).toBeVisible()
  70 | 
  71 |     // Accept the offer.
  72 |     await modal.getByRole('button', { name: /accept offer/i }).click()
  73 |     await expect(modal.locator('.chip', { hasText: /CONFIRMED/ })).toBeVisible({ timeout: 10_000 })
  74 | 
  75 |     // The accept button should disappear (no longer PENDING).
  76 |     await expect(modal.getByRole('button', { name: /accept offer/i })).toHaveCount(0)
  77 |   })
  78 | 
  79 |   test('Decline path moves order to CANCELLED', async ({
  80 |     fishermanPage: page, fisherman, vendor,
  81 |   }) => {
  82 |     const { alert, species } = await setupTripWithCatch(fisherman)
  83 |     await vendor.context.post('/api/orders', {
  84 |       data: {
  85 |         speciesId: species.id, catchAlertId: alert.id,
  86 |         agreedPricePerKg: 120, orderedQtyKg: 5,
  87 |       },
  88 |     })
  89 | 
  90 |     await page.goto('/fisherman/catch-alerts')
  91 |     await page.getByRole('button', { name: /1 offer/i }).click()
  92 |     const modal = page.locator('.modal')
  93 |     await modal.getByRole('button', { name: /^decline$/i }).click()
  94 |     await expect(modal.locator('.chip', { hasText: /CANCELLED/ })).toBeVisible({ timeout: 10_000 })
  95 |   })
  96 | })
  97 | 
```