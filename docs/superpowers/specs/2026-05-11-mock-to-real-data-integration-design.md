# MERMAID — Mock-to-Real Data Integration Design
**Date:** 2026-05-11  
**Branch:** need-tuloy  
**Author:** limmonjuice  

---

## 1. Goal

Replace all inline mock data constants across the redesigned `frontend/src` pages (fisherman, vendor, buyer roles) with real data from the Spring Boot backend. Implement any missing backend endpoints. Redesign the ordering flow with proper action-driven modals and a clear visual lifecycle.

**Constraint:** The frontend is the source of truth. Whatever a page currently displays in mock data, the backend must serve in the same shape. No UI layout changes — only data wiring, loading states, and ordering UX.

---

## 2. Approach

**Domain-by-domain vertical slices (Option B).** Each domain is completed end-to-end (backend gap fix → API module → frontend page wired → loading/error states) before moving to the next. This catches contract mismatches early and allows incremental demo.

---

## 3. Shared Infrastructure (Do First)

### 3.1 React Query
- Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
- Create `frontend/src/lib/queryClient.js` — configure `QueryClient` with sensible defaults (`staleTime: 30s`, `retry: 2`)
- Wrap `App.jsx` in `<QueryClientProvider client={queryClient}>`
- Replace all `useFishermanPolling` / `useVendorPolling` hooks with React Query `refetchInterval`

### 3.2 Loading + Error Components
- `frontend/src/components/Skeleton.jsx` — animated gray bar primitive + composite skeletons:
  - `<CardSkeleton />` — generic card shape
  - `<TableRowSkeleton rows={n} />` — table/list rows
  - `<StatTileSkeleton />` — KPI tile
  - `<OrderCardSkeleton />` — order card shape
- `frontend/src/components/ApiError.jsx` — error banner with message + retry button; accepts `onRetry` prop

### 3.3 Reference Data
- Create `frontend/src/api/lookup.js`:
  - `fetchSpecies()` → `GET /api/species`
  - `fetchMarketLocations()` → `GET /api/market-locations`
- Replace hardcoded `SPECIES` and `LOCATIONS` arrays in all pages with `useQuery(['species'], fetchSpecies)` and `useQuery(['locations'], fetchMarketLocations)`

---

## 4. Domain Work Breakdown

### D1 — Marine Conditions + Advisories
**Backend:** `MarineController` (`GET /marine/conditions`, `GET /marine/conditions/{zone}`), `AdvisoryController` (`GET /advisories`)  
**Create:** `frontend/src/fisherman/api/marine.js`  
**Wire:** `fisherman/Home.jsx`, `fisherman/Planner.jsx`  

### D2 — Trips + Catch Logs
**Backend:** `TripController` + `CatchLogController` — both fully implemented (controller, service, mapper, domain entity, and repository all confirmed present; CLAUDE.md note about this being pending is outdated)  
**Existing:** `fisherman/api/trips.js` — extend with catch log functions:
- `listCatchLogs(tripId)` → `GET /trips/{id}/catch-logs`
- `createCatchLog(tripId, body)` → `POST /trips/{id}/catch-logs`
- `updateCatchLog(tripId, logId, body)` → `PUT /trips/{tripId}/catch-logs/{logId}`
- `deleteCatchLog(tripId, logId)` → `DELETE /trips/{tripId}/catch-logs/{logId}`
- `settleCatchLog(tripId, logId, body)` → `POST /trips/{tripId}/catch-logs/{logId}/settle`  
**Wire:** `fisherman/Trips.jsx`, `fisherman/Planner.jsx`

### D3 — Catch Alerts
**Backend:** `CatchAlertController` (fisherman), `VendorProcurementController` (vendor browse)  
**Existing:** `fisherman/api/catchAlerts.js`, `vendor/api/procurement.js`  
**Wire:** `fisherman/CatchAlerts.jsx`, `vendor/ProcurementFeed.jsx`

### D4 — Demand Listings / Fisherman Marketplace
**Backend:** `VendorDemandListingController` (vendor CRUD), `MarketplaceController` (fisherman browse)  
**Create:** `frontend/src/fisherman/api/marketplace.js`:
- `browseDemandListings(params)` → `GET /fisherman/marketplace/demand-listings`
- `expressInterest(listingId, body)` → `POST /fisherman/marketplace/demand-listings/{id}/interest`  
**Wire:** `fisherman/Marketplace.jsx`, `fisherman/Planner.jsx`

### D5 — Orders (Fisherman ↔ Vendor, catch alert flow)
**Backend:** `OrderController`  
**Create:** `frontend/src/fisherman/api/orders.js`:
- `listOrders(status)` → `GET /orders?status=...`
- `confirmOrder(id)` → `POST /orders/{id}/confirm`
- `cancelOrder(id, reason)` → `POST /orders/{id}/cancel`
- `initiateHandoff(id, body)` → `POST /orders/{id}/handoff`
- `confirmHandoff(id)` → `POST /orders/{id}/handoff/confirm`
- `recordPayment(id, body)` → `POST /orders/{id}/payment`
- `confirmPayment(id)` → `POST /orders/{id}/payment/confirm`
- `getTimeline(id)` → `GET /orders/{id}/timeline`  
**Wire:** `fisherman/Orders.jsx`

### D6 — Earnings (Fisherman)
**Backend:** `EarningsController` — exists  
**Existing:** `fisherman/api/earnings.js`  
**Wire:** `fisherman/Earnings.jsx` — wire range selector to `?from=&to=` params

### D7 — Fisherman Procurement Orders
**Backend:** `FishermanProcurementController` — exists  
**Existing:** `fisherman/api/procurement.js`  
**Wire:** `fisherman/Procurement.jsx`

### D8 — Fisherman Profile
**Backend:** `FishermanProfileController` — exists  
**Existing:** `fisherman/api/profile.js`  
**Wire:** `fisherman/Profile.jsx`

### D9 — Vendor Dashboard Home
**Backend:** `VendorHomeController` (`GET /vendor/home`)  
**Existing:** `vendor/api/home.js`  
**Wire:** `vendor/Home.jsx`

### D10 — Vendor Inventory + Storefront
**Backend:** `VendorInventoryController`, `VendorStorefrontController` — both exist  
**Existing:** `vendor/api/inventory.js`, `vendor/api/storefront.js`  
**Wire:** `vendor/Inventory.jsx`, `vendor/StorefrontEditor.jsx`

### D11 — Vendor Orders Inbox
**Backend:** `VendorOrdersController` — exists  
**Existing:** `vendor/api/orders.js`  
**Wire:** `vendor/OrdersInbox.jsx`

### D12 — Vendor Procurement (as buyer of catch)
**Backend:** `VendorProcurementController` — exists  
**Existing:** `vendor/api/procurement.js`  
**Wire:** `vendor/ProcurementFeed.jsx`, `vendor/ProcurementCart.jsx`, `vendor/ProcurementOrders.jsx`

### D13 — Vendor Analytics, Reviews, Payouts, Watchlist, Shop Profile
**Backend:** all controllers exist  
**Existing:** all `vendor/api/*.js` modules exist  
**Wire:** `vendor/Analytics.jsx`, `vendor/Reviews.jsx`, `vendor/Payouts.jsx`, `vendor/Watchlist.jsx`, `vendor/ShopProfile.jsx`

### D14 — Buyer Domain
**Backend:** all buyer controllers exist; `BuyerHomeController` is **missing**  
**Implement:** `BuyerHomeController.java` — `GET /buyer/home` aggregating:
  - Recent orders (last 5 from `BuyerOrderController`)
  - Order stats (pending/confirmed counts)
  - Fresh listings (top 3 from `BuyerMarketplaceController`)
  - Activity feed (from `NotificationController`)  
**Create all buyer API modules:**
- `buyer/api/marketplace.js` — browse storefront listings, listing detail
- `buyer/api/orders.js` — list orders, get order, timeline
- `buyer/api/cart.js` — get cart, add/update/remove item, checkout
- `buyer/api/favorites.js` — list, save, remove favorites
- `buyer/api/profile.js` — get/update buyer profile
- `buyer/api/home.js` — fetch buyer home dashboard  
**Wire:** all buyer pages

### D15 — Messages (WebSocket)
**Backend:** `ChatController` (REST history + STOMP) + `WebSocketConfig` — fully implemented  
**Install:** `@stomp/stompjs`  
**Create:** `frontend/src/hooks/useWebSocket.js` — STOMP client singleton:
  - Connects to `/ws-chat` on mount; authentication is handled by the browser sending the `jwt` HttpOnly cookie automatically on the WebSocket upgrade request (extracted by `JwtCookieHandshakeInterceptor` in `WebSocketConfig`); no manual Authorization header needed
  - Subscribes to `/user/queue/messages`
  - Exposes `sendMessage(recipientId, content)` and `messages` state  
**Create:** `frontend/src/api/messages.js`:
  - `getChatContacts()` → `GET /messages/users`
  - `getConversation(userId)` → `GET /messages/{userId}`  
**Wire:** `fisherman/Messages.jsx`, `vendor/Messages.jsx` (if exists)

### D16 — Notifications
**Backend:** `NotificationController` — exists  
**Create:** `frontend/src/api/notifications.js`:
  - `getNotifications()` → `GET /notifications`
  - `markRead(id)` → `PATCH /notifications/{id}/read`
  - `markAllRead()` → `POST /notifications/read-all`
  - `getUnreadCount()` → `GET /notifications/unread-count`  
**Wire:** `NotificationsBell` in fisherman, vendor, and buyer layouts — use `useQuery` with `refetchInterval: 30000`

---

## 5. Ordering Flow Redesign

### 5.1 Two Order Types

**Type A — Catch Alert Orders (fisherman ↔ vendor)**
```
PENDING → CONFIRMED → Handoff(PENDING→CONFIRMED) → Payment(PENDING→CONFIRMED) → COMPLETED
                    ↘ CANCELLED                     ↘ DISPUTED
```

**Type B — Storefront Orders (vendor ↔ buyer)**
```
NEW → PREPARING → READY → COMPLETED → (buyer leaves Review)
    ↘ CANCELLED at any point
```

### 5.2 Shared OrderCard Component
`frontend/src/components/OrderCard.jsx` — used in fisherman Orders, vendor OrdersInbox, and buyer Orders. Renders differently based on `currentUserRole` and `order.status`.

**"Whose turn" banner** — one line above the primary action:
- `"Your turn: [action description]"` — highlighted
- `"Waiting for [counterparty name] to [action]"` — muted

**Primary action button** per role × status:

| Status | Fisherman | Vendor | Buyer |
|---|---|---|---|
| PENDING | Confirm / Decline | Waiting | Waiting |
| CONFIRMED | Waiting | Initiate Handoff | Waiting |
| HANDOFF_PENDING | Confirm Handoff | Waiting | — |
| HANDOFF_CONFIRMED | Waiting | Record Payment | — |
| PAYMENT_PENDING | Confirm Payment | Waiting | — |
| COMPLETED | → Earnings | → Payout (if cash) | → Review |
| CANCELLED | — | — | — |
| DISPUTED | Respond | Respond | — |

For Type B (storefront) — uses `VendorOrdersController` status enum `[NEW, PREPARING, READY, COMPLETED, CANCELLED]`:

| Status | Vendor | Buyer |
|---|---|---|
| NEW | Accept → PREPARING / Cancel | Cancel |
| PREPARING | Mark Ready → READY | Track |
| READY | Mark Complete → COMPLETED | Confirm Receipt |
| COMPLETED | → Payouts | → Review |

### 5.3 Visual Timeline
Each order detail view includes `<OrderTimeline />` — a horizontal stepper fed from `GET /orders/{id}/timeline` (`OrderStatusEvent[]`). Each node shows: status label, timestamp, actor name. Current step is highlighted; completed steps show a check; future steps are dimmed.

The handoff confirmation uses the dock receipt metaphor: "Here is what was handed over — X kg at ₱Y/kg = ₱Z total."

### 5.4 Action Modals

All modals share a consistent structure: header with order code, body with form or summary, footer with cancel + confirm buttons. Confirm button shows a spinner while the API call is in flight and is disabled to prevent double-submit.

| Modal | Triggered by | Fields |
|---|---|---|
| `ConfirmOrderModal` | Fisherman, PENDING | Review: species, qty, price, dispatchMode. Buttons: Confirm / Decline |
| `InitiateHandoffModal` | Vendor, CONFIRMED | actual kg, final price/kg, auto-calc total |
| `ConfirmHandoffModal` | Fisherman, HANDOFF_PENDING | Show vendor's numbers, confirm or Raise Dispute |
| `RecordPaymentModal` | Vendor, HANDOFF_CONFIRMED | method (GCash/Maya/Cash/BankTransfer), reference number, amount |
| `ConfirmPaymentModal` | Fisherman, PAYMENT_PENDING | Show payment details, confirm receipt |
| `CancelOrderModal` | Either party | Reason (required), show consequences |
| `DisputeModal` | Either party at handoff | Reason, described discrepancy |
| `CrudModal` | All CRUD ops | Generic: title, body (form), confirm label — used for listing create/edit/delete, catch alert create, inventory adjustments, etc. |

### 5.5 Post-Completion State
Order card flips to a summary state showing: final amounts, payment method confirmed, and role-specific next step:
- **Fisherman:** "View in Earnings" link
- **Vendor:** "Initiate Payout" button if payment was CASH (triggers GCash/Maya payout via `OrderPayoutController`)
- **Buyer:** "Leave a Review" prompt (available for 7 days)

---

## 6. Missing Files Summary

| Type | File | Reason |
|---|---|---|
| New backend | `BuyerHomeController.java` | No `/buyer/home` endpoint exists |
| New frontend | `frontend/src/lib/queryClient.js` | React Query setup |
| New frontend | `frontend/src/components/Skeleton.jsx` | Loading states |
| New frontend | `frontend/src/components/ApiError.jsx` | Error states |
| New frontend | `frontend/src/components/OrderCard.jsx` | Shared order card |
| New frontend | `frontend/src/components/OrderTimeline.jsx` | Timeline stepper |
| New frontend | `frontend/src/components/modals/ConfirmOrderModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/InitiateHandoffModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/ConfirmHandoffModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/RecordPaymentModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/ConfirmPaymentModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/CancelOrderModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/DisputeModal.jsx` | Order flow |
| New frontend | `frontend/src/components/modals/CrudModal.jsx` | Generic CRUD |
| New frontend | `frontend/src/api/lookup.js` | Reference data |
| New frontend | `frontend/src/api/notifications.js` | Notifications |
| New frontend | `frontend/src/api/messages.js` | Chat REST |
| New frontend | `frontend/src/hooks/useWebSocket.js` | STOMP client |
| New frontend | `fisherman/api/marketplace.js` | Demand listings browse |
| New frontend | `fisherman/api/orders.js` | Fisherman orders as seller |
| New frontend | `fisherman/api/marine.js` | Marine conditions |
| New frontend | `buyer/api/home.js` | Buyer dashboard |
| New frontend | `buyer/api/marketplace.js` | Storefront browse |
| New frontend | `buyer/api/orders.js` | Buyer orders |
| New frontend | `buyer/api/cart.js` | Cart + checkout |
| New frontend | `buyer/api/favorites.js` | Favorites |
| New frontend | `buyer/api/profile.js` | Buyer profile |
| Extended | `fisherman/api/trips.js` | Add catch log functions |

---

## 7. Execution Order

1. **Infrastructure** — React Query setup, Skeleton, ApiError, queryClient.js
2. **D1** — Reference data (species, locations)
3. **D2** — Marine conditions + advisories → wire Home, Planner
4. **D3** — Trips + catch logs → wire Trips, Planner
5. **D4** — Catch alerts → wire CatchAlerts (fisherman), ProcurementFeed (vendor)
6. **D5** — Demand listings / fisherman marketplace → wire Marketplace, Planner
7. **Ordering flow** — OrderCard, OrderTimeline, all 8 modals (must be done before wiring any Orders page)
8. **D6** — Orders (fisherman as seller) → wire fisherman/Orders.jsx
9. **D7** — Earnings → wire fisherman/Earnings.jsx
10. **D8** — Fisherman procurement orders → wire fisherman/Procurement.jsx
11. **D9** — Fisherman profile → wire fisherman/Profile.jsx
12. **D10** — Vendor home → wire vendor/Home.jsx
13. **D11** — Vendor inventory + storefront → wire Inventory, StorefrontEditor
14. **D12** — Vendor orders inbox (Type B storefront flow) → wire vendor/OrdersInbox.jsx
15. **D13** — Vendor procurement as buyer → wire ProcurementFeed, ProcurementCart, ProcurementOrders
16. **D14** — Vendor analytics, reviews, payouts, watchlist, shop profile
17. **D15** — Buyer domain: implement `BuyerHomeController` first, create all `buyer/api/` modules, wire all buyer pages
18. **D16** — Messages: install `@stomp/stompjs`, build `useWebSocket`, wire Messages pages
19. **D17** — Notifications: wire all three NotificationsBell components
20. **Final pass** — grep for remaining `// ── Inline mock data` or `const MOCK_` constants, confirm zero remaining

---

## 8. Testing Notes

- Each wired page should be manually verified: start backend + marine service, log in as the relevant role, confirm real data appears where mocks were
- Order flow should be tested end-to-end: log in as fisherman + vendor in two tabs, walk through PENDING → COMPLETED
- WebSocket messages: two browser tabs, verify real-time delivery
