# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-trips.spec.js >> Fisherman · Trips >> Start Trip — submit with all fields blank proceeds to checklist
- Location: tests\e2e\01-trips.spec.js:24:3

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: /\+ start trip/i }) resolved to 2 elements:
    1) <button class="btn btn--primary btn--sm">+ Start Trip</button> aka getByRole('button', { name: '+ Start Trip' }).first()
    2) <button class="btn btn--primary btn--sm">+ Start Trip</button> aka getByRole('button', { name: '+ Start Trip' }).nth(1)

Call log:
  - waiting for getByRole('button', { name: /\+ start trip/i })

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
  1   | // Trip + Add Catch + Alert Vendors regression suite.
  2   | // Covers all the fixes from the recent stabilization pass.
  3   | import { test, expect } from './helpers/fixtures.js'
  4   | 
  5   | test.describe('Fisherman · Trips', () => {
  6   | 
  7   |   test('Start Trip — departure & target are optional (no asterisks)', async ({ fishermanPage: page }) => {
  8   |     await page.goto('/')
  9   |     await expect(page).toHaveURL(/\/fisherman/)
  10  |     await page.getByRole('link', { name: /trips/i }).first().click()
  11  | 
  12  |     await page.getByRole('button', { name: /\+ start trip/i }).click()
  13  | 
  14  |     // Labels should say "(optional)" and not have a red asterisk.
  15  |     await expect(page.getByText('Departure point')).toBeVisible()
  16  |     const depRow = page.locator('.form-row', { hasText: 'Departure point' })
  17  |     await expect(depRow.getByText('(optional)')).toBeVisible()
  18  |     await expect(depRow.locator('span', { hasText: '*' })).toHaveCount(0)
  19  | 
  20  |     const tgtRow = page.locator('.form-row', { hasText: 'Target area' })
  21  |     await expect(tgtRow.getByText('(optional)')).toBeVisible()
  22  |   })
  23  | 
  24  |   test('Start Trip — submit with all fields blank proceeds to checklist', async ({ fishermanPage: page }) => {
  25  |     await page.goto('/fisherman/trips')
> 26  |     await page.getByRole('button', { name: /\+ start trip/i }).click()
      |                                                                ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: /\+ start trip/i }) resolved to 2 elements:
  27  | 
  28  |     // Leave all blank.
  29  |     await page.getByRole('button', { name: /^next$/i }).click()
  30  |     // Step 2 visible.
  31  |     await expect(page.getByText('Safety Checklist')).toBeVisible()
  32  |   })
  33  | 
  34  |   test('Safety Checklist — Start Trip blocked + inline error until all 6 checked', async ({ fishermanPage: page }) => {
  35  |     await page.goto('/fisherman/trips')
  36  |     await page.getByRole('button', { name: /\+ start trip/i }).click()
  37  |     await page.getByRole('button', { name: /^next$/i }).click()
  38  | 
  39  |     // Progress label shows 0/6 (red).
  40  |     await expect(page.getByText(/0\/6 complete/)).toBeVisible()
  41  | 
  42  |     const startBtn = page.getByRole('button', { name: /^start trip$/i })
  43  |     await expect(startBtn).toBeDisabled()
  44  | 
  45  |     // Tick 3 → still disabled, label "3/6".
  46  |     const checkboxes = page.locator('input[type="checkbox"]')
  47  |     await checkboxes.nth(0).check()
  48  |     await checkboxes.nth(1).check()
  49  |     await checkboxes.nth(2).check()
  50  |     await expect(page.getByText(/3\/6 complete/)).toBeVisible()
  51  |     await expect(startBtn).toBeDisabled()
  52  | 
  53  |     // Tick remaining → enabled, label "6/6" in green color.
  54  |     await checkboxes.nth(3).check()
  55  |     await checkboxes.nth(4).check()
  56  |     await checkboxes.nth(5).check()
  57  |     await expect(page.getByText(/6\/6 complete/)).toBeVisible()
  58  |     await expect(startBtn).toBeEnabled()
  59  | 
  60  |     await startBtn.click()
  61  | 
  62  |     // Active trip card appears.
  63  |     await expect(page.getByText(/Currently active/i)).toBeVisible({ timeout: 10_000 })
  64  |   })
  65  | 
  66  |   test('Add Catch — species is a strict <select> (no free-text combobox)', async ({ fishermanPage: page, fisherman }) => {
  67  |     // Pre-start a trip via API so we don't repeat the start UI here.
  68  |     const trip = await (async () => {
  69  |       const ctx = fisherman.context
  70  |       const r = await ctx.post('/api/trips', { data: {} })
  71  |       const t = await r.json()
  72  |       await ctx.put(`/api/trips/${t.id}/checklist`, {
  73  |         data: {
  74  |           fuelChecked: true, engineChecked: true, radioChecked: true,
  75  |           lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
  76  |         },
  77  |       })
  78  |       return t
  79  |     })()
  80  | 
  81  |     await page.goto('/fisherman/trips')
  82  |     await expect(page.getByText(/Currently active/i)).toBeVisible()
  83  |     await page.getByRole('button', { name: /\+ add catch/i }).click()
  84  | 
  85  |     const speciesField = page.getByLabel(/^Species/i)
  86  |     // Must be a native <select>.
  87  |     await expect(speciesField).toHaveJSProperty('tagName', 'SELECT')
  88  |     // Has the placeholder option + at least one species.
  89  |     const options = await speciesField.locator('option').count()
  90  |     expect(options).toBeGreaterThan(1)
  91  | 
  92  |     // Submitting without picking shows error.
  93  |     await page.getByRole('button', { name: /^add catch$/i }).click()
  94  |     await expect(page.getByText(/please select a species/i)).toBeVisible()
  95  | 
  96  |     // Pick species, leave estimate + kg blank → error.
  97  |     await speciesField.selectOption({ index: 1 })
  98  |     await page.getByRole('button', { name: /^add catch$/i }).click()
  99  |     await expect(page.getByText(/quantity estimate or exact kg is required/i)).toBeVisible()
  100 | 
  101 |     // Pick species + estimate "test catch" + no other fields → submits (NPE regression).
  102 |     await page.getByLabel(/Quantity estimate/i).fill('test catch')
  103 |     await page.getByRole('button', { name: /^add catch$/i }).click()
  104 | 
  105 |     // New row visible in catches list.
  106 |     await expect(page.getByText(/Catches \(/)).toBeVisible({ timeout: 8_000 })
  107 |   })
  108 | 
  109 |   test('Alert Vendors button — counts unalerted catches and disables after alerting', async ({
  110 |     fishermanPage: page, fisherman,
  111 |   }) => {
  112 |     // Set up: trip + 2 catches via API.
  113 |     const ctx = fisherman.context
  114 |     const trip = await (await ctx.post('/api/trips', { data: {} })).json()
  115 |     await ctx.put(`/api/trips/${trip.id}/checklist`, {
  116 |       data: {
  117 |         fuelChecked: true, engineChecked: true, radioChecked: true,
  118 |         lifeVestChecked: true, weatherReviewed: true, emergencyKitChecked: true,
  119 |       },
  120 |     })
  121 |     const species = await (await ctx.get('/api/lookups/fish-species')).json()
  122 |     const spId = species[0].id
  123 |     await ctx.post(`/api/trips/${trip.id}/catches`, {
  124 |       data: { speciesId: spId, quantityEstimate: '5 kg' },
  125 |     })
  126 |     await ctx.post(`/api/trips/${trip.id}/catches`, {
```