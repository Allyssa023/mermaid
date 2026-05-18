# MERMAID Development Plan — Weeks 6–9

> Continuation from Week 5 (ended April 8, 2026). Covers the buyer role, vendor modernization, payment integration, fisherman dashboard, deal negotiation, and admin dashboard.

---

## Week 6 — Buyer Experience & Trip Management
**Sprint dates: April 9 – April 22, 2026**

| Task | Assignee | Status | Date | Notes |
|------|----------|--------|------|-------|
| Design Buyer Role Architecture | Zaimond | Completed | 4/9/2026 | Defined buyer user type, cart, checkout, and address domains |
| Implement Buyer Registration & Auth | Allyssa | Completed | 4/9/2026 | Added BUYER role to registration flow and JWT claims |
| Create Buyer Marketplace Browse API | Zaimond | Completed | 4/15/2026 | Endpoint returns active storefront listings with filters |
| Build Cart & Cart Item Backend | Zaimond | Completed | 4/15/2026 | Cart entity, CartItemRepository, CartService with add/remove/clear |
| Implement Buyer Address Management | Allyssa | Completed | 4/15/2026 | CRUD for saved delivery addresses linked to buyer account |
| Build Favorites & Reviews Backend | Allyssa | Completed | 4/15/2026 | Favorites toggle and star-rating review entity with write/read endpoints |
| Design Buyer Dashboard UI | Zaimond | Completed | 4/15/2026 | Multi-page dashboard: Marketplace, Cart, Orders, Favorites, Profile |
| Implement Cart Frontend | Zaimond | Completed | 4/22/2026 | Cart page with quantity controls, subtotal, and proceed-to-checkout |
| Build Checkout Flow Frontend | Allyssa | Completed | 4/22/2026 | Address selection, delivery-fee display, order confirmation |
| Display Buyer Order History | Allyssa | Completed | 4/22/2026 | Order list with status badges and receipt detail view |
| Define Trip Session Data Structure | Allyssa | Completed | 4/9/2026 | Trip entity with ACTIVE/ENDED lifecycle and safety checklist fields |
| Create Trip Session API Endpoint | Zaimond | Completed | 4/9/2026 | Start/end trip with checklist validation; linked to authenticated fisherman |
| Implement Fisherman Trip Frontend | Zaimond | Completed | 4/15/2026 | Active trip card, start/end buttons, trip history list |
| Build Safety Checklist on Trip Start | Allyssa | Completed | 4/22/2026 | Checklist modal before confirming departure; blocks trip if skipped |
| Add Trip Earnings Summary View | Allyssa | Completed | 4/22/2026 | Per-trip earnings aggregated from completed catch alert orders |
| Implement Google OAuth2 Login | Zaimond | Completed | 4/22/2026 | Spring Security OAuth2 client; issues JWT on first login and links account |
| Email Verification Flow | Allyssa | Completed | 4/22/2026 | Sends verification link on register; blocks login until verified |
| Push Week 6 to GitHub | Zaimond | Completed | 4/22/2026 | Uploaded Week 6 implementation |

---

## Week 7 — Vendor Modernization & Real-time Foundation
**Sprint dates: April 23 – May 6, 2026**

| Task | Assignee | Status | Date | Notes |
|------|----------|--------|------|-------|
| Design Vendor Inventory System | Zaimond | Completed | 4/23/2026 | InventoryLot + InventoryMovement entities with cost-basis tracking |
| Implement Inventory Lot Management | Zaimond | Completed | 4/27/2026 | CRUD for lots, manual adjustments with reason codes, remaining-kg tracking |
| Build Storefront Listing Editor | Allyssa | Completed | 4/27/2026 | Vendors create/edit listings with species, price, stock, and image |
| Create Vendor Shop Profile | Allyssa | Completed | 4/27/2026 | ShopProfile entity with name, bio, cover photo, and location |
| Implement Vendor Analytics Backend | Zaimond | Completed | 5/1/2026 | Revenue, top-species, procurement-spend, and order-count endpoints |
| Build Procurement Cart (Vendor) | Zaimond | Completed | 5/1/2026 | Vendors add CatchAlerts to cart before starting a deal |
| Implement Vendor Watchlist | Allyssa | Completed | 5/1/2026 | Vendors bookmark catch alerts for quick access |
| Design Vendor Storefront Dashboard UI | Allyssa | Completed | 4/27/2026 | Tabbed layout: Inventory, Listings, Orders, Analytics, Payouts, Profile |
| Build Inventory Frontend | Zaimond | Completed | 5/1/2026 | Lot table with remaining-kg, cost-per-kg, adjust modal |
| Implement Vendor Orders Inbox | Allyssa | Completed | 5/1/2026 | Incoming retail orders with confirm, dispatch, and delivery actions |
| Set Up STOMP WebSocket Infrastructure | Zaimond | Completed | 5/1/2026 | SockJS + STOMP endpoint at /ws; per-user queues for messages, deals, notifications |
| Implement Notification Entity & Service | Allyssa | Completed | 5/1/2026 | Notification domain, repository, and ApplicationEvent listener |
| Build Real-time Deal Event Queue | Zaimond | Completed | 5/6/2026 | Pushes NEGOTIATING/AGREED/EXPIRED/CANCELLED transitions to /user/queue/deals |
| Implement Notification Bell Frontend | Allyssa | Completed | 5/6/2026 | Bell icon with unread count, dropdown list; marks read on click |
| Build Vendor Analytics Dashboard | Zaimond | Completed | 5/6/2026 | Revenue chart, top species bar, procurement spend, order stats |
| Implement Vendor Payout View | Allyssa | Completed | 5/6/2026 | Earnings summary by period with pending/released breakdown |
| Add File Upload for Shop & Listing Images | Zaimond | Completed | 5/6/2026 | FileUploadController + LocalStorageService; images served via /api/uploads |
| Push Week 7 to GitHub | Zaimond | Completed | 5/6/2026 | Uploaded Week 7 implementation |

---

## Week 8 — Payments, Fisherman Modernization & Data Wiring
**Sprint dates: May 7 – May 13, 2026**

| Task | Assignee | Status | Date | Notes |
|------|----------|--------|------|-------|
| Design Xendit Payment Integration | Zaimond | Completed | 5/7/2026 | GCash, PayMaya, and card flows via Xendit /v3/payment_requests |
| Implement Xendit GCash/PayMaya Flow | Zaimond | Completed | 5/8/2026 | Creates payment request, returns redirect URL to buyer |
| Implement Xendit Card Payment Flow | Allyssa | Completed | 5/8/2026 | Card tokenization and charge via same payment-request API |
| Build Payment Webhook Handler | Zaimond | Completed | 5/8/2026 | POST /payments/webhook verifies signature, updates order on SUCCEEDED |
| Add Payment Return Page (Buyer) | Allyssa | Completed | 5/8/2026 | Handles Xendit redirect; polls status and shows success/failure screen |
| Implement BFAR Reference Price Lookup | Zaimond | Completed | 5/8/2026 | BfarReferencePrice table seeded from BFAR data; lookup by species |
| Modernize Fisherman Dashboard UI | Allyssa | Completed | 5/10/2026 | Rebuilt with mermaid-v2 design tokens; tabbed: Trips, Alerts, Feed, Earnings |
| Build Catch Alert System (Fisherman) | Zaimond | Completed | 5/10/2026 | Post catch with species, kg, price, location; alert visible in vendor feed |
| Implement Procurement Feed (Fisherman) | Allyssa | Completed | 5/10/2026 | Fisherman views active deals and negotiation proposals from vendors |
| Build Fisherman Earnings Page | Zaimond | Completed | 5/10/2026 | Aggregated revenue from completed orders, breakdown by species |
| Implement Fisherman Profile Edit | Allyssa | Completed | 5/13/2026 | Bio, boat info, profile photo; linked to JWT user |
| Wire Real Backend Data — Fisherman | Zaimond | Completed | 5/13/2026 | Replaced all mock data in fisherman pages with live API calls |
| Wire Real Backend Data — Vendor | Allyssa | Completed | 5/13/2026 | Replaced all mock data in vendor pages with live API calls |
| Wire Real Backend Data — Buyer | Zaimond | Completed | 5/13/2026 | Replaced all mock data in buyer pages with live API calls |
| Implement Buyer Favorites Frontend | Allyssa | Completed | 5/13/2026 | Favorites page; heart toggle on listing cards updates backend |
| Implement Buyer Reviews Frontend | Zaimond | Completed | 5/13/2026 | Star-rating form on completed orders; review display on shop page |
| Add Product Recommendations (Buyer) | Allyssa | Completed | 5/13/2026 | Recommends listings based on order history and species preference |
| Push Week 8 to GitHub | Zaimond | Completed | 5/13/2026 | Uploaded Week 8 implementation |

---

## Week 9 — Deal Negotiation, Admin Dashboard & Polish
**Sprint dates: May 14 – May 20, 2026**

| Task | Assignee | Status | Date | Notes |
|------|----------|--------|------|-------|
| Design Deal Negotiation System | Zaimond | Completed | 5/14/2026 | Deal + DealProposal entities; partial unique index enforces one pending proposal per deal |
| Implement Deal & Proposal Backend | Zaimond | Completed | 5/15/2026 | Create deal from cart, counter-propose, accept; creates Order on acceptance |
| Build Deal Expiry Sweeper | Allyssa | Completed | 5/15/2026 | Scheduled task every 60 s expires stale NEGOTIATING deals |
| Implement Chat Messaging Backend | Zaimond | Completed | 5/15/2026 | Messages entity with dealId; ChatController broadcasts via /user/queue/messages |
| Build Vendor Procurement Feed UI | Allyssa | Completed | 5/15/2026 | Browse catch alerts, add to cart, start negotiation from cart |
| Implement Fisherman Active Deals UI | Zaimond | Completed | 5/15/2026 | View incoming proposals, counter or accept; AGREED deal shows linked order |
| Build Shared Deal Chat Frontend | Allyssa | Completed | 5/15/2026 | DealChatPane reused by both vendor and fisherman Messages pages |
| Add Freshness Photo Upload (Storefront) | Zaimond | Completed | 5/17/2026 | Five freshness photo slots per listing; displayed in grid on listing detail |
| Build Listing Detail Page (Buyer) | Allyssa | Completed | 5/17/2026 | Full listing view with freshness photos, AddToCartModal, reviews |
| Implement Retail Order Lifecycle | Zaimond | Completed | 5/17/2026 | PENDING → CONFIRMED → COMPLETED with seller-then-buyer handoff and payment sub-steps |
| Auto-complete Order on Payment Confirmed | Allyssa | Completed | 5/17/2026 | Xendit webhook completion triggers order status → COMPLETED and inventory auto-fill |
| Wire Admin Dashboard to Real Backend | Zaimond | Completed | 5/18/2026 | All admin pages (users, species, locations, advisories) call live endpoints |
| Implement Admin Telemetry — DAU & Metrics | Allyssa | Completed | 5/18/2026 | 30-day DAU chart, active users, total revenue, order count, login events table |
| Build Admin Audit Log | Zaimond | Completed | 5/18/2026 | AuditLogService records admin writes; audit table viewable in dashboard |
| Implement Admin Health Monitor | Allyssa | Completed | 5/18/2026 | Shows DB, marine service, and storage health with response-time indicators |
| Fix Vendor Analytics Per-Species Chart | Zaimond | In Progress | 5/18/2026 | Procurement spend endpoint returning array grouped by species |
| Auto-Populate Vendor Inventory from Orders | Allyssa | In Progress | 5/18/2026 | InventoryService.addLotFromProcurement wired into order completion path |
| Set Up Docker Compose Orchestration | Zaimond | Pending | | Define services for backend, frontend, marine-service, and PostgreSQL |
