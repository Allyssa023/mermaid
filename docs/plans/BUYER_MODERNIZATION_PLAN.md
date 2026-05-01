# Buyer Modernization Plan

**Goal:** Transform the buyer experience from a single-modal listing browser into a modern shopping app comparable to Shopee/Lazada — with cart, checkout, address book, reviews, favorites, real payments, and order tracking.

**Scope:** Buyer role only. Other roles (Vendor, Fisherman, Admin) are touched only where data flows demand it (e.g., Vendor must see incoming cart-based orders; reviews appear on vendor storefront).

**Out of scope (for now):** Vouchers/promo codes, "buy again" reorder, vendor analytics dashboards. Deferred to a possible Phase 5.

---

## Architectural Conventions

All work follows existing project patterns:
- **API-first** — every new endpoint defined in `backend/src/main/resources/openapi/api.yaml` first, then code-generated.
- **Service–Repository–Mapper triad** for every new domain entity.
- **Soft delete** via boolean flag — never `deleteById()`.
- **Flyway migrations** — append `V{n}__description.sql`; never modify existing migrations.
- **JWT role-based auth** — buyer endpoints require `ROLE_BUYER` via `@PreAuthorize`.
- **Frontend** — extend existing `BuyerDashboard.jsx` tab system; introduce React Router only if multi-page navigation becomes essential (decision deferred to Phase 1.2).

---

# PHASE 1 — Shopping Core (target: 2 weeks)

The minimum surface that makes buyer feel like a real shopping app.

## 1.1 Search & Filter on Marketplace

**Problem:** `/buyer/marketplace/listings` returns flat array. No way to narrow by species, price, location, or sort.

**Backend:**
- Extend `getBuyerMarketplaceListings` in `api.yaml` with query params:
  - `species` (FishSpecies ID, optional)
  - `marketLocation` (MarketLocation ID, optional)
  - `minPrice`, `maxPrice` (decimal, optional)
  - `maxDistanceKm` (decimal, optional — requires buyer's lat/lng query params or stored profile location)
  - `sort` (enum: `PRICE_ASC`, `PRICE_DESC`, `RATING_DESC`, `DISTANCE_ASC`, `RECENT`)
  - `page`, `size` (pagination — default `page=0`, `size=20`)
- Update `BuyerMarketplaceController` and `MarketplaceService` to apply filters. Use Spring Data `Specification` for composable predicates.
- Distance calc: PostgreSQL `earthdistance` extension or simple haversine in service layer (start with haversine, optimize later).

**Frontend:**
- New `MarketplaceFilters.jsx` component above the listing grid:
  - Search box (debounced 300ms, hits `q` text-search param — also add `q` to api.yaml)
  - Species dropdown (uses `/lookups/fish-species`)
  - Location dropdown (uses `/lookups/market-locations`)
  - Price range slider (₱0 – ₱2000)
  - Sort dropdown
- Filter state in URL query string (so back-button works) — even without React Router we can use `URLSearchParams` and `window.history.replaceState`.

**Migration:** None — existing schema sufficient.

**Tests:** Controller test for each filter combo; service test for haversine math.

---

## 1.2 Listing Detail Page

**Problem:** Tapping a listing opens a small `OrderModal`. No room for vendor info, photos, full description, reviews, or "add to cart vs buy now" choice.

**Backend:**
- New endpoint `GET /buyer/marketplace/listings/{id}` returns a richer DTO `BuyerListingDetail`:
  - All current listing fields
  - `vendor`: id, name, avatarUrl (Phase 3), avgRating (Phase 2), totalReviews, responseTimeMins, joinedDate
  - `photos[]`: array of image URLs (Phase 3 wires uploads; for now empty array)
  - `relatedListings[]`: 4 other listings from same vendor or same species

**Frontend:**
- New `ListingDetailPage.jsx` (or `ListingDetailView.jsx` if staying in tab system).
- Decision point: **Introduce React Router or keep tab-state navigation?**
  - Recommend: React Router. Listing detail needs a URL (`/buyer/listing/123`) for shareability and back-button. Wire it carefully so existing tabs become routes.
- Layout: photo carousel left, info right (price, qty, vendor card), description below, reviews below, related listings at bottom.
- Two CTAs: **"Add to Cart"** (Phase 1.3) and **"Buy Now"** (jumps directly to checkout).

**Migration:** None.

**Tests:** Controller test for detail endpoint; frontend snapshot test for layout.

---

## 1.3 Cart System

**Problem:** No way to add multiple items before checkout. Direct order only.

**Domain:**
- `Cart` entity per buyer (one-to-one with User; lazy-created on first add).
  - Fields: `id`, `buyerId`, `createdAt`, `updatedAt`
- `CartItem` entity:
  - Fields: `id`, `cartId`, `listingId`, `quantityKg`, `unitPriceSnapshot` (price at time of add — protects buyer from price changes), `notes`, `addedAt`
  - Index on `(cart_id, listing_id)` — at most one item per listing per cart (adding again increments qty).
- Multi-vendor allowed; cart simply groups items. Checkout will split into separate Orders per vendor.

**Endpoints (`/buyer/cart` — all `ROLE_BUYER`):**
- `GET /buyer/cart` — full cart with items grouped by vendor, totals
- `POST /buyer/cart/items` — add item `{listingId, quantityKg, notes}`
- `PATCH /buyer/cart/items/{id}` — update qty/notes
- `DELETE /buyer/cart/items/{id}` — remove
- `DELETE /buyer/cart` — clear

**Validation rules:**
- `quantityKg` must be ≤ listing's available qty
- Listing must be `OPEN`
- Cart returns warnings if any item's listing has closed or qty no longer satisfiable (don't auto-remove; let buyer decide).

**Frontend:**
- Cart icon in top bar with badge (item count). Drawer slides in from right, or full `CartPage`.
- Group by vendor. Per-vendor subtotal. Grand total.
- Each item: thumbnail, name, vendor, qty stepper, price, remove button.
- "Proceed to Checkout" CTA (Phase 1.4).
- Persistent — backend-stored, syncs across devices.

**Migration:** `V26__create_cart.sql` creates `carts` and `cart_items` tables.

**Tests:** Service test for add/update/remove, qty validation, snapshot pricing; controller test for endpoints; frontend test for stepper.

---

## 1.4 Checkout Flow + Address Book

**Problem:** `OrderModal` collects address as free text every time. No saved addresses. No order summary.

**Domain:**
- `BuyerAddress` entity:
  - Fields: `id`, `buyerId`, `label` (e.g., "Home", "Restaurant"), `recipientName`, `phone`, `addressLine1`, `addressLine2`, `barangay`, `city`, `province`, `postalCode`, `latitude`, `longitude`, `isDefault`, `active`
- Soft delete via `active` flag.

**Endpoints (`/buyer/addresses`):**
- `GET /buyer/addresses` — list active
- `POST /buyer/addresses` — create
- `PATCH /buyer/addresses/{id}` — edit
- `DELETE /buyer/addresses/{id}` — soft-delete
- `PUT /buyer/addresses/{id}/default` — set default

**Checkout flow:**
- Frontend `CheckoutPage.jsx` with steps:
  1. **Delivery method** per vendor group (pickup vs delivery)
  2. **Delivery address** (only if delivery — picker from address book + "Add new")
  3. **Payment method** (Phase 3 — for now show "Cash on handoff" only)
  4. **Review** — line items, fees, grand total, place order
- "Place Order" creates one `Order` per vendor group (existing `Order` entity). Cart cleared on success.

**Migration:** `V27__create_buyer_addresses.sql`.

**Tests:** Address CRUD service/controller tests; checkout integration test (cart with 2 vendors → 2 orders created → cart cleared).

---

# PHASE 2 — Trust & Engagement (target: 2 weeks)

## 2.1 Real Favorites/Wishlist

Replace `MOCK_FAVORITES` with backed entity.

**Domain:**
- `Favorite` entity: `id`, `buyerId`, `targetType` (`LISTING` or `VENDOR`), `targetId`, `createdAt`. Unique on `(buyerId, targetType, targetId)`.

**Endpoints:**
- `GET /buyer/favorites?type=LISTING|VENDOR`
- `POST /buyer/favorites` — `{targetType, targetId}`
- `DELETE /buyer/favorites/{id}` (or `DELETE /buyer/favorites?targetType=&targetId=`)

**Frontend:**
- Heart icon on every listing card and vendor card. Tap to toggle.
- "Saved" tab in BuyerDashboard with two sub-tabs: Listings | Vendors.
- Notification (Phase 3) when a favorited vendor posts a new listing.

**Migration:** `V28__create_favorites.sql`.

---

## 2.2 Reviews & Ratings

**Domain:**
- `Review` entity: `id`, `orderId` (one review per order), `reviewerId` (buyer), `vendorId`, `rating` (1–5), `comment`, `photos[]` (stored as JSONB array of URLs for now), `createdAt`. Unique on `orderId`.
- Vendor `User.avgRating` and `User.reviewCount` denormalized columns updated by service on review create.

**Endpoints:**
- `POST /buyer/orders/{orderId}/review` — only allowed when order status `COMPLETED`.
- `GET /vendors/{vendorId}/reviews?page=&size=` — public, no auth needed for reading.
- `GET /buyer/orders/{orderId}/review` — get own review (for editing).
- `PATCH /buyer/orders/{orderId}/review` — edit within 7 days.

**Frontend:**
- Post-delivery banner: "Rate your order with Marina Seafoods" → modal with stars + comment + photo upload (Phase 3).
- Reviews section on listing detail page and vendor storefront.
- Star rating displays everywhere a vendor name appears.

**Migration:** `V29__create_reviews_and_vendor_aggregates.sql`.

---

## 2.3 Vendor Storefront

**Endpoint:** `GET /vendors/{vendorId}/storefront` returns:
- Vendor profile (name, avatar, joined, response time, avg rating, review count, total trades)
- All OPEN listings from this vendor
- Recent reviews (5 latest)

**Frontend:**
- Tapping a vendor name anywhere navigates to `/vendor/{id}`.
- Layout: hero with vendor info, tabs for "Listings" and "Reviews".

---

## 2.4 Order Tracking Timeline + Status Enum

**Refactor:**
- Replace `Order.status: String` with `OrderStatus` enum:
  `PENDING → CONFIRMED → PREPARING → IN_TRANSIT → DELIVERED → COMPLETED`
  `CANCELLED` and `DISPUTED` as terminal alt states.
- Service-layer state machine validates transitions. Invalid transitions → 409.
- New entity `OrderStatusEvent`: `id`, `orderId`, `status`, `actorId`, `note`, `at`. Append-only audit log.

**Endpoints:**
- `GET /orders/{orderId}/timeline` — list of status events.
- Vendor endpoints to advance status (`PUT /orders/{orderId}/status`) — already partially exist; refactor.
- WebSocket topic `/topic/orders/{buyerId}` pushed on status change.

**Frontend:**
- Order detail page shows vertical timeline with icons per status.
- Real-time updates via STOMP subscription (extend the existing chat infrastructure).

**Migration:** `V30__order_status_enum_and_events.sql`. Data migration: convert existing string statuses to enum values.

---

# PHASE 3 — Payments, Notifications, Uploads (target: 2 weeks)

## 3.1 PayMongo Integration

**Backend:**
- Add `paymongo-java-sdk` (or wrap REST API directly with `RestTemplate`/`WebClient`).
- Env vars: `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`.
- New `PaymentIntentService`:
  - `createPaymentIntent(orderId)` — calls PayMongo, returns `clientKey`.
  - `confirmPaymentSource(orderId, sourceId)` — for GCash/GrabPay redirect flow.
- New endpoint `POST /buyer/orders/{id}/payment-intent` returns `{clientKey, publicKey}`.
- Webhook endpoint `POST /webhooks/paymongo` (public, signature-verified) updates `Payment.status` and triggers `Order` status change.

**Frontend:**
- Checkout payment step shows PayMongo's hosted method picker (GCash, Maya, Card, GrabPay).
- On success, redirect back to `/buyer/orders/{id}/success`.
- "Cash on handoff" remains as a non-PayMongo option.

**Security:**
- Verify webhook signatures.
- Idempotency keys on `createPaymentIntent` to prevent duplicates.
- Store PayMongo IDs (`paymentIntentId`, `paymentMethodId`, `sourceId`) on `Payment` entity.

**Migration:** `V31__paymongo_payment_fields.sql` adds columns to `payments` table.

---

## 3.2 Notifications

**Channels:**
1. **In-app** (always-on)
2. **Email** (SendGrid or Resend — both have generous free tiers)
3. **Web push** (deferred to Phase 4 if time-boxed)

**Domain:**
- `Notification` entity: `id`, `userId`, `type` (`ORDER_STATUS`, `NEW_LISTING`, `MESSAGE`, `REVIEW_REMINDER`, `ADVISORY`), `title`, `body`, `link`, `readAt`, `createdAt`.
- `NotificationPreference` entity per user with channel toggles.

**Endpoints:**
- `GET /notifications?unreadOnly=true&page=&size=`
- `PUT /notifications/{id}/read`
- `PUT /notifications/read-all`
- `GET/PUT /notifications/preferences`

**Triggers (event-driven via Spring `ApplicationEventPublisher`):**
- Order status change → notify buyer
- New listing from favorited vendor → notify favoriters
- New message → notify recipient
- Order delivered → review reminder after 24h
- New advisory in user's region → notify

**Frontend:**
- Bell icon with unread badge. Dropdown with last 10. Full `NotificationsPage` for history.

**Migration:** `V32__create_notifications.sql`.

---

## 3.3 File Upload (avatars, listing photos, review photos)

**Backend:**
- Storage: **local filesystem under `uploads/` for dev**, swappable to S3-compatible (MinIO/Wasabi/AWS S3) for prod via `StorageService` interface.
- New `FileUploadController`:
  - `POST /uploads` (multipart, requires auth) — returns `{url, fileId}`.
- Validation: max 5MB, JPEG/PNG/WebP only, virus scan deferred.
- Image processing: resize to max 1600px, generate 400px thumbnail (use `imgscalr-lib` or `Thumbnailator`).

**Backend integrations:**
- `User.avatarUrl` column (avatar upload).
- `Listing.photoUrls[]` column (array, max 5).
- `Review.photoUrls[]` column.

**Frontend:**
- Reusable `ImageUpload.jsx` component with preview, drag-drop, progress.
- Profile page avatar picker.
- Vendor listing form (vendor side) gets photo carousel input.
- Review modal gets photo input.

**Migration:** `V33__add_image_url_columns.sql`.

---

## 3.4 Profile Page

**Endpoint:** `GET /buyer/profile`, `PATCH /buyer/profile`.

**Frontend:**
- Buyer profile tab: avatar, name, email, phone, addresses (manage), notification preferences, password change.
- Order history with filters (status, date range).
- Saved listings/vendors shortcut.

---

# PHASE 4 — Polish & Delight (target: 1 week)

## 4.1 Real-Time Activity Feed

Replace `MOCK_ACTIVITY`. Aggregate the `Notification` stream and recent order/message events into a unified feed for the dashboard home.

**Endpoint:** `GET /buyer/activity?limit=20` — merges Notification, OrderStatusEvent, and Message into a polymorphic feed.

## 4.2 "Buy Again" Reorder

Button on completed orders → pre-fills cart with same items. If listing closed, show fallback to similar species from same vendor.

## 4.3 Listing Recommendations

Simple algorithm: most-bought species per buyer × OPEN listings × sorted by vendor rating. New endpoint `GET /buyer/recommendations`.

## 4.4 Empty/Loading/Error States

Replace bare loading spinners with skeleton screens. Polished empty states (illustrated SVG + clear CTA) for empty cart, no orders, no favorites.

## 4.5 Accessibility Pass

ARIA labels on icons, alt text on images, keyboard navigation, focus management on modals/drawers. Run axe-core audit and fix top issues.

---

# Summary of New Database Migrations

| Migration | Phase | Purpose |
|---|---|---|
| V26 | 1.3 | `carts`, `cart_items` |
| V27 | 1.4 | `buyer_addresses` |
| V28 | 2.1 | `favorites` |
| V29 | 2.2 | `reviews` + vendor aggregate columns |
| V30 | 2.4 | Order status enum migration + `order_status_events` |
| V31 | 3.1 | PayMongo fields on `payments` |
| V32 | 3.2 | `notifications` + `notification_preferences` |
| V33 | 3.3 | Image URL columns on `users`, `listings`, `reviews` |

# Summary of New Domain Entities

`Cart`, `CartItem`, `BuyerAddress`, `Favorite`, `Review`, `OrderStatusEvent`, `Notification`, `NotificationPreference`. Plus `OrderStatus` enum refactor.

# Summary of New API Tags

`Buyer Cart`, `Buyer Addresses`, `Buyer Favorites`, `Reviews`, `Vendor Storefront`, `Notifications`, `Uploads`, `Webhooks`.

---

# Locked Decisions

1. ✅ **React Router** — introduced in Phase 1.2 to give listing detail and vendor storefront real URLs.
2. ✅ **PayMongo** — open-source SDKs, free sandbox, no upfront cost; ~3.5% + ₱15 per real transaction (deducted from payouts).
3. ✅ **Local filesystem storage** for now — abstract behind a `StorageService` interface so we can swap to S3/MinIO later without touching call sites.
4. ✅ **Resend** for email — 3,000/mo free tier, modern API, best free-tier deliverability in 2025. Migration path to AWS SES later if volume justifies it.
5. **Phase ordering** — open to revisit after Phase 1 retro.

---

# Estimated Effort

| Phase | Backend | Frontend | Total |
|---|---|---|---|
| 1 — Shopping Core | 4d | 5d | ~2 wks |
| 2 — Trust & Engagement | 4d | 4d | ~2 wks |
| 3 — Payments, Notifications, Uploads | 5d | 4d | ~2 wks |
| 4 — Polish & Delight | 2d | 3d | ~1 wk |
| **Total** | **~3 wks** | **~3.5 wks** | **~7 wks** |

(Assumes one developer working sequentially. Parallelizable across two devs to ~4 weeks.)
