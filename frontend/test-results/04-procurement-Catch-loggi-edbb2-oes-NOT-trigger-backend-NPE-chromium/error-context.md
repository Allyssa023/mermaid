# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-procurement.spec.js >> Catch logging — submitting with blank optional price does NOT trigger backend NPE
- Location: tests\e2e\04-procurement.spec.js:25:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Currently active/i)
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByText(/Currently active/i)

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
          - strong [ref=e68]: Trips
        - button "Notifications" [ref=e70] [cursor=pointer]:
          - img [ref=e71]
        - button "Help" [ref=e74] [cursor=pointer]:
          - img [ref=e75]
      - generic [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: Fisherman · Safety
            - heading "My Trips" [level=1] [ref=e83]:
              - text: My
              - emphasis [ref=e84]: Trips
            - paragraph [ref=e85]: Departure log and safety checklist.
          - button "+ Start Trip" [ref=e87] [cursor=pointer]
        - generic [ref=e88]:
          - button "Active0" [ref=e89] [cursor=pointer]
          - button "Past0" [ref=e90] [cursor=pointer]
        - generic [ref=e91]:
          - generic [ref=e92]: No active trip
          - paragraph [ref=e93]: Start a trip when you're ready to depart.
          - button "+ Start Trip" [ref=e94] [cursor=pointer]
  - button "☀️" [ref=e95] [cursor=pointer]
```

# Test source

```ts
  1  | // Procurement page no-flicker test + NPE regression for catch logging.
  2  | import { test, expect } from './helpers/fixtures.js'
  3  | 
  4  | test('Procurement status pill stays mounted across polling cycles (no flicker)', async ({
  5  |   fishermanPage: page,
  6  | }) => {
  7  |   await page.goto('/fisherman/procurement')
  8  | 
  9  |   // Wait for the bucket to load (empty or with cards — both fine).
  10 |   await expect(page.getByText(/procurement inbox/i)).toBeVisible()
  11 | 
  12 |   // We track the polling stability by listening for re-renders. The simplest
  13 |   // observable proxy: the page heading must remain stable while we observe for
  14 |   // 40 seconds, and no "Stale" chip should flash.
  15 |   const heading = page.getByText(/procurement inbox/i)
  16 |   const start = Date.now()
  17 |   while (Date.now() - start < 40_000) {
  18 |     await expect(heading).toBeVisible()
  19 |     // Stale chip should never appear during a normal poll cycle.
  20 |     await expect(page.locator('.chip', { hasText: /^Stale$/i })).toHaveCount(0)
  21 |     await page.waitForTimeout(2_000)
  22 |   }
  23 | })
  24 | 
  25 | test('Catch logging — submitting with blank optional price does NOT trigger backend NPE', async ({
  26 |   fishermanPage: page, fisherman,
  27 | }) => {
  28 |   // Start a trip (via UI to also exercise that flow).
  29 |   const ctx = fisherman.context
  30 |   const trip = await (await ctx.post('/api/trips', { data: {} })).json()
  31 |   await ctx.put(`/api/trips/${trip.id}/checklist`, {
  32 |     data: {
  33 |       fuelChecked: true, engineChecked: true, radioChecked: true,
  34 |       lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
  35 |     },
  36 |   })
  37 | 
  38 |   await page.goto('/fisherman/trips')
> 39 |   await expect(page.getByText(/Currently active/i)).toBeVisible()
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  40 |   await page.getByRole('button', { name: /\+ add catch/i }).click()
  41 | 
  42 |   // Pick first species, fill ONLY estimate (no kg, no price).
  43 |   await page.getByLabel(/^Species/i).selectOption({ index: 1 })
  44 |   await page.getByLabel(/Quantity estimate/i).fill('regression catch')
  45 | 
  46 |   // Listen for failed responses on the catches endpoint.
  47 |   const responsePromise = page.waitForResponse(r =>
  48 |     r.url().includes(`/api/trips/${trip.id}/catches`) && r.request().method() === 'POST'
  49 |   )
  50 |   await page.getByRole('button', { name: /^add catch$/i }).click()
  51 |   const res = await responsePromise
  52 |   // Must NOT be 500 (the NPE we fixed).
  53 |   expect(res.status()).toBe(201)
  54 |   const body = await res.json()
  55 |   // Backend should accept the request and return a saved log with null price.
  56 |   expect(body.estimatedPricePerKg).toBeNull()
  57 | })
  58 | 
```