# Fisherman Module — Manual E2E QA Checklist

> Acting as your senior QA. This is the *full* manual pass for the Fisherman
> role. Tick each box, note any defect you find, attach screenshots in the
> "Notes" column. Don't skip — the value is in the explicit "what to look for".

## 0. Pre-flight setup

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Start PostgreSQL on `:5432` (`mermaid_db` exists). | Backend connects with no Flyway errors in console. |
| ☐ | Start marine service: `cd marine-service && uvicorn app.main:app --reload`. | Listens on `:8081`. `/health` returns 200. |
| ☐ | Start backend: `cd backend && ./mvnw spring-boot:run`. | Listens on `:8080`. Logs show `Started AppApplication`. No Flyway / generator errors. |
| ☐ | Start frontend: `cd frontend && npm run dev`. | Vite dev server on `:5173`. No console errors at boot. |
| ☐ | Have **two** test accounts ready: one FISHERMAN, one VENDOR. | If missing, register them — see §1. |
| ☐ | Have at least 3 active **FishSpecies** rows seeded (Tilapia, Bangus, Galunggong). | Verify via `/api/lookups/fish-species` in browser dev tools. |
| ☐ | Open browser DevTools → Console + Network tab. Keep open the whole pass. | Any red error in Console or 4xx/5xx in Network is a defect — log it. |

---

## 1. Authentication & Profile

### 1.1 Login as Fisherman
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Go to `/login`. Enter fisherman email + password. Click Login. | Redirects to fisherman dashboard. JWT stored. No console errors. |
| ☐ | Refresh the page (`F5`). | Stays logged in. No flash of login screen. |
| ☐ | Try wrong password. | Inline error "Invalid credentials" or similar. Field not cleared. No 500 in network tab. |
| ☐ | Logout (top right). | Returns to login. Subsequent direct navigation to `/fisherman/...` redirects to login. |

### 1.2 Profile page (`/fisherman/profile`)
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Navigate to **Profile**. | Loads with current name / phone / vessel / emergency contact / GCash / Maya numbers. No "undefined". |
| ☐ | Edit Full Name → blank → save. | Blocked with validation error. |
| ☐ | Edit Emergency Contact Phone → "abc" → save. | Either format validation or accepted (note which). Real number `+639xx` must save. |
| ☐ | Edit GCash + Maya numbers → save. | Saved. Reload page → values persist. |
| ☐ | Edit Vessel Name → "RV Tester" → save. | Saved. Visible on Trip cards later. |

---

## 2. Dashboard / Home (`/fisherman`)

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Open Home. | Weather/risk widget loads (SAFE/CAUTION/UNSAFE chip). |
| ☐ | Inspect Network tab. | `/api/conditions/...` returns 200 within ~2s. No CORS errors. |
| ☐ | Disconnect Wi-Fi briefly, click refresh. | Graceful fallback (cached data or error banner). No white screen. |
| ☐ | Reconnect, refresh. | Data restored. |
| ☐ | Look at "Active trip" tile. | If no active trip → empty state with CTA. If active → matches the one you started. |
| ☐ | Stat tiles (catches, earnings, etc). | Numbers are not `NaN`, not `undefined`. |
| ☐ | Bell icon top right. | Click → notification panel opens. No errors. |

---

## 3. My Trips (`/fisherman/trips`) — **trip lifecycle**

### 3.1 Start Trip flow — Step 1 (Departure)
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Click **+ Start Trip**. Modal opens. | Title "Start Trip". Three fields: Departure point, Target area, Vessel name. |
| ☐ | **Departure point** and **Target area** labels show **"(optional)"** in grey, **not** a red `*`. | This is the recent fix — confirm it's visible. |
| ☐ | Leave **all three fields blank** → click **Next**. | Proceeds to step 2 (Safety Checklist). No "required" error. |
| ☐ | Press Back / cancel → re-open. Fill in all three. Click Next. | Proceeds. |
| ☐ | Open dev tools → Network → POST `/api/trips` payload preview. | Confirms `departurePoint`/`targetArea` accept null. |

### 3.2 Start Trip — Step 2 (Safety checklist)
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Modal shows 6 checklist items + a **"N/6 complete"** progress label in red/orange when incomplete. | Label turns green when all 6 ticked. |
| ☐ | Without checking any item, click **Start Trip**. | Button is disabled (greyed). Clicking does nothing AND an inline red error reads "Please complete every safety checklist item before starting the trip." |
| ☐ | Check 3 items → Start Trip. | Still disabled. Counter shows "3/6". |
| ☐ | Check all 6 → Start Trip. | Button enables, click → trip created, modal closes, active trip card appears. |
| ☐ | Check Network: `POST /api/trips` then `PUT /api/trips/{id}/checklist`. | Both 200/201. |

### 3.3 Active Trip card
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Card visible at top with green left border. | Shows "Currently active · HH:MM:SS" updating every second. |
| ☐ | If you saved a vessel name in profile, it shows here. | Otherwise "Active Trip". |
| ☐ | "From … → …" line. | If both blank → "In progress". Otherwise both shown (one may be `—`). |
| ☐ | Two top-right buttons: **Alert Vendors (0)** disabled "No catches yet", and **End Trip**. | Verify Alert Vendors button is **present** (this was missing before). |
| ☐ | Click **End Trip** while you have no catches. | Trip moves to "Past" tab. Timer stops. |

### 3.4 Past Trips tab
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Switch to **Past** tab. | Table with Vessel / Departed / Returned / Status columns. |
| ☐ | Click any row. | Expands inline; shows from/target, notes, and catches list. |
| ☐ | "Status" chip shows `COMPLETED`. | Color is muted/neutral, not red. |
| ☐ | Click row again. | Collapses. |

---

## 4. Add Catch form — **strict-select species**

> Pre: start a new trip (any blanks OK), it must be ACTIVE.

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | On the Active Trip card → **+ Add Catch**. | Form opens with: Species **(dropdown)**, Quantity estimate, Exact kg, Price/kg, Notes. |
| ☐ | The **Species** field is a real `<select>` dropdown — typing free text is impossible. | This is the recent fix. Confirm no combobox/search. |
| ☐ | Submit with no species selected. | Inline error "Please select a species". |
| ☐ | Pick a species, leave Quantity estimate blank, leave Exact kg blank. | Error: "Quantity estimate or exact kg is required". |
| ☐ | Pick a species, Exact kg = `0.05` → submit. | Error: "Quantity must be at least 0.1 kg". |
| ☐ | Pick a species, Exact kg = `0.1`, leave estimate blank. | Submits — estimate auto-derived as "0.1 kg". |
| ☐ | Pick a species, Estimate "1 banyera", Exact kg blank, Price blank. | Submits successfully. |
| ☐ | Pick a species, fill all fields including Price `120` and Notes "fresh today". | Submits successfully. Catches list updates with new row. |
| ☐ | **NPE regression test:** Pick species, Estimate "test", Exact kg blank, Price blank → submit. | Status 201. **No** Java `NullPointerException` in backend logs. (This was the `BigDecimal.valueOf(null)` bug — verify the fix.) |
| ☐ | Network tab → request body for POST `/api/trips/{id}/catches`. | Confirm `quantityKg` / `estimatedPricePerKg` simply **not present** in JSON when blank (or `null` — either is acceptable; both must avoid the NPE). |

---

## 5. Alert Vendors button (My Trips)

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Have an active trip with **2+ catches** logged. | Alert Vendors button label reads "Alert Vendors (2)". |
| ☐ | Click **Alert Vendors**. | Button shows "Alerting…". Within 1–2s a green message appears: "Alerted vendors about 2 catches." |
| ☐ | Button label updates to "All alerted" and becomes disabled. | Refresh the page — still disabled (catches recognized as already alerted). |
| ☐ | Add a **3rd catch**. | After form closes, Alert Vendors button auto-updates to "Alert Vendors (1)". |
| ☐ | Click it → success → "All alerted". | |
| ☐ | Network tab → 3 separate `POST /api/catch-alerts` requests, all 201. | Each carries the correct `catchLogId`, `speciesId`, `expiresInHours: 4`. |
| ☐ | Go to **Catch Alerts** page. | New alerts appear under Active alerts with CA-N IDs. |

---

## 6. Catch Alerts page (`/fisherman/catch-alerts`)

### 6.1 List rendering
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Page loads with stats strip on top: Active alerts / Total offered / Potential revenue / Open offers / Match rate. | No `NaN`. "Total offered" matches sum of kg you logged. |
| ☐ | "Open offers" reads `0` immediately after creating alerts (no vendor has offered yet). | Critical — this was the "auto-offer" bug. |
| ☐ | Active alerts grid shows each alert with species, qty, asking price, time-left. | Time-left counts down. Below 1h it turns red ("Expires soon" chip). |

### 6.2 "Notify vendors" trip banner
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | If you still have an active trip with unalerted catches, the green banner up top shows them. | Lists each catch row with species + qty. |
| ☐ | Click **Alert All Vendors** in the banner. | Banner switches to "Vendors have been notified". All catches show "Alerted" chip. |

### 6.3 Offers modal (NEW)
> Pre-condition: log in as VENDOR in a **second browser** (or incognito) and place an offer on one of your alerts via the marketplace → Make Offer. Switch back to fisherman browser.

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | After vendor offers, fisherman alert card now shows initials avatars + a button labelled **"1 offer · 1 new"**. | The count reflects the **real** vendor order, not a matching demand listing. |
| ☐ | Click the button. | Modal opens "Vendor Offers (1)" with the vendor's name, order #, price/kg, qty, dispatch, notes, and Accept / Decline buttons. |
| ☐ | Click **Decline**. | Modal updates → status chip flips to `CANCELLED`. Backend: `PUT /orders/{id}/cancel` 200. |
| ☐ | Have the vendor place another offer. Refresh. Click "1 offer". | New row visible with status `PENDING`. |
| ☐ | Click **Accept Offer**. | Status flips to `CONFIRMED`. The order now appears in Orders page (next section). |
| ☐ | Close modal. | Alert card now shows "1 offer" (no "new" badge since none are pending). |

### 6.4 Cancelling an alert
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | On an active alert card, click the **X** (cancel). | Card disappears or moves to Expired section with `CANCELLED` chip. |
| ☐ | Network: `DELETE /api/catch-alerts/{id}` 200. | No errors. |
| ☐ | Refresh → still cancelled. | Persisted. |

### 6.5 Expiry / Relist
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Wait for one of your alerts to expire (or shorten `expiresInHours` server-side). | Card moves to Expired section. Status chip `EXPIRED`. |
| ☐ | Click **Relist**. | Either creates a new alert or shows "Coming soon" — note current behavior. |

---

## 7. Orders page (`/fisherman/orders`) — full handoff + payment

> Pre: you just accepted a vendor offer (§6.3). That order is now `CONFIRMED`.

### 7.1 Pipeline / list
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Orders page loads. Stats strip: Pending / Confirmed / In transit / Completed / Open value. | Counts match what you've done. |
| ☐ | "Pipeline this week" bars render. | No zero-width bars (each has `flex: Math.max(N, 1)`). |
| ☐ | Filter chips: All / Pending / Confirmed / Completed / Cancelled / Disputed. | Count badges accurate. |
| ☐ | Switch filter to **Confirmed**. The accepted order is listed. | Row shows: #ID, vendor, species, kg, ₱price, step indicators (2/4 dots filled), status, date. |

### 7.2 Order detail modal
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Click **Open** on the order row. | Modal "Order #N" opens. Step tracker at top: Placed → Confirmed (current) → Handoff → Payment. |
| ☐ | Order body: species, date, status chip, buyer + seller avatars/names, price-per-kg, qty, BFAR ref price. | All populated. |
| ☐ | Buttons section: **Record Handoff** (since no handoff yet). | Other actions not yet visible. |

### 7.3 Handoff
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Click **Record Handoff**. Modal "Record Handoff". | Two fields: Actual Weight, Final Price. |
| ☐ | Submit blank. | Inline error "Both fields are required." |
| ☐ | Enter actual qty `4.5`, final price `120`. Live "Total: ₱540.00" appears. | Total matches qty × price. |
| ☐ | Click Record Handoff. | Returns to order. Handoff section appears with Seller pending / Buyer pending chips. |
| ☐ | Click **Confirm Weight** (seller side). | Seller chip flips to "confirmed" with check. Order status still CONFIRMED until both sides confirm. |
| ☐ | In vendor browser, confirm buyer-side. | Both chips green. Order status → `COMPLETED`. Step tracker advances. Linked catch alert moves to `SOLD`. |

### 7.4 Payment
> Pre: order is `COMPLETED`, handoff `CONFIRMED`. Switch to VENDOR browser to record payment.

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | As vendor, open the order → **Record Payment**. | Modal pre-fills amount with handoff total. |
| ☐ | Choose CASH, blank proof, submit. | 201. Payment section appears "Payment Pending". |
| ☐ | Back as fisherman, refresh Orders page → open same order → **Confirm Receipt** button visible. | Click it. Status flips "Payment Confirmed". Step 4 of tracker green. |
| ☐ | Backend → CatchLog auto-marked settled. Check via Past Trips → expand row → catch should show settled state if UI exposes it. | If not exposed, verify via DB or `/trips/{id}/catches` JSON. |

### 7.5 Decline / Cancel paths
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Make vendor place a **fresh** offer. As fisherman, in Orders detail modal (status PENDING) click **Decline**. | Status → CANCELLED. No handoff/payment options. |
| ☐ | Try cancelling a `COMPLETED` order. | Backend returns 400 "Cannot cancel a completed order". |

---

## 8. Procurement page (`/fisherman/procurement`)

> This is the **separate** procurement pipeline (different from Orders/§7).
> Have the vendor add items to their procurement cart and check out — those
> orders appear here under `PENDING`.

### 8.1 List & flicker test
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Page loads with bucket pills: Pending / Accepted / Ready / Completed / Cancelled / Disputed. | Active pill highlighted. |
| ☐ | Click each bucket. | Loads orders for that bucket. No console errors. |
| ☐ | **Flicker regression**: park your mouse on a pending order card. Watch the status pill for 60 seconds without moving. | Status pill must remain stable — no disappearance / reappearance. (This was the bug.) |
| ☐ | Inspect Network tab over the 60s. | Polls at ~30s interval (was 10s). When data unchanged the UI must not re-render the card. |

### 8.2 Lifecycle
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | On a `PENDING` order, click **Accept**. | Moves to ACCEPTED bucket. Status chip uses correct color. |
| ☐ | On `PENDING`, click **Decline** → enter reason. | Moves to CANCELLED. Backend: cancel reason persisted. |
| ☐ | On `ACCEPTED`, click **Mark ready**. | Moves to READY. |
| ☐ | On `READY`, click **Mark completed**. | Moves to COMPLETED. Inventory lot created backend-side. |
| ☐ | On `READY` or `COMPLETED`, click **Report dispute**. Fill weight/quality/notes → submit. | Bucket flips to DISPUTED. Status pill DISPUTED. |
| ☐ | On `DISPUTED`, click **View dispute**. | Modal shows status, raised-by, claimed weight, quality, notes. |
| ☐ | Refresh page (`Stale` chip should briefly appear if polling failed). | Clears on next successful poll. |

### 8.3 Edge cases
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Invalid transition (e.g. via direct API call try to skip PENDING→READY). | Backend returns 400 "Cannot transition…". |
| ☐ | Two browsers: fisherman accepts in one, the other shows the old state. | Within 30s, the second browser's poll updates the pill. |

---

## 9. Messages (`/fisherman/messages`)

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Page opens. Left contact list visible. | If empty, "No conversations yet". |
| ☐ | Send vendor a message from vendor side. Refresh fisherman messages. | Vendor appears in contact list with unread badge. |
| ☐ | Click vendor row. Thread opens, messages load. | Date separators between days. Time stamps render. |
| ☐ | Type a reply, press Enter. | Message sent (appears as "mine" bubble on the right). Vendor receives it in real time (no manual refresh on vendor side). |
| ☐ | Press Shift+Enter while typing. | Inserts newline, does NOT send. |
| ☐ | Online/offline indicator. | If STOMP connected, "Online now". If you kill backend briefly, shows "Offline" within a few seconds. |
| ☐ | Send 30+ messages. | Thread auto-scrolls to bottom on new message. |
| ☐ | Click a listing-interest formatted message (if any exists). | Renders as a "Re: listing" quote card. |
| ☐ | Search contacts. | Filter narrows list. |

---

## 10. Earnings (`/fisherman/earnings`)

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Page loads. Numbers match the orders you've completed. | No NaN / undefined. |
| ☐ | If there's a date filter, change range. | Numbers respond. |
| ☐ | Drill-down into an earnings row. | Links back to the source order/catch. |

---

## 11. Notifications

| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Bell icon shows badge count when unread. | Badge clears on open. |
| ☐ | Trigger from another action (e.g. vendor sends offer). | Notification arrives within polling interval. |
| ☐ | Click a notification with a link (e.g. catch alert highlight). | Navigates to the right page. |

---

## 12. Cross-cutting / Non-functional

### 12.1 Responsiveness
| ✓ | Page | Resize browser to 360px width. What to look for |
|---|------|--------------------------------------------------|
| ☐ | Home | No horizontal scroll. Stat tiles stack. |
| ☐ | Trips | Modal still usable. Active card stacks buttons. |
| ☐ | Catch Alerts | Cards stack one per row. Stats strip wraps. |
| ☐ | Orders | Order row uses overflow-x scroll or stacks. |
| ☐ | Procurement | Cards reflow to single column. |
| ☐ | Messages | 3-pane collapses to single pane with back nav. |

### 12.2 Loading / empty / error states
| ✓ | Page | What to look for |
|---|------|------------------|
| ☐ | Throttle network to "Slow 3G" in DevTools. Open each page. | Skeleton loaders appear (not blank white). |
| ☐ | Stop backend. Reload Trips. | Friendly error banner, not "TypeError: Failed to fetch". |
| ☐ | Restart backend, click Refresh button on the page. | Recovers cleanly. |
| ☐ | Fresh fisherman account with zero data — open every page. | Each shows a proper empty state with CTA, not a crash. |

### 12.3 Auth / authorization
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Let JWT expire (or edit token). Try any action. | 401 → redirect to login. No infinite loop. |
| ☐ | As fisherman, hit `GET /api/vendor/inventory` via DevTools. | 403 Forbidden. |
| ☐ | As fisherman, manipulate URL to `/vendor`. | Either 403 page or redirect home. |

### 12.4 Concurrent edits
| ✓ | Step | What to look for |
|---|------|------------------|
| ☐ | Two tabs as same fisherman. Tab A: end a trip. Tab B: still shows active. | Within 30s (polling) or after manual refresh, Tab B reflects ended. |
| ☐ | Try to add a catch in Tab B after trip ended in Tab A. | Backend 409 / TripNotActive. UI shows friendly error. |

### 12.5 Console hygiene
| ✓ | After full pass, scroll the browser console. | Zero red errors. Zero React warnings about keys / setState in unmounted components. |
| ☐ | Scroll backend logs. | No stack traces (NPE, ClassCast, etc). |

---

## 13. Defects log template

Copy this for each issue you find:

```
ID:          FISH-001
Severity:    Blocker | Critical | Major | Minor | Cosmetic
Page:        /fisherman/...
Steps:
  1.
  2.
  3.
Expected:
Actual:
Screenshot:
Console error:
Network response:
Browser/OS:
```

---

## 14. Sign-off

| ✓ | Check |
|---|-------|
| ☐ | All sections 1–12 walked through end-to-end. |
| ☐ | Every checked box was actually verified, not assumed. |
| ☐ | All defects logged with reproducible steps. |
| ☐ | No P0/P1 defects open. |
| ☐ | Tested on at least one mobile-width view. |
| ☐ | Tested at least one full happy path: trip → catch → alert → vendor offer → accept → handoff → payment → settled. |

**Tester:** ______________________  **Date:** ______________  **Build:** _____________
