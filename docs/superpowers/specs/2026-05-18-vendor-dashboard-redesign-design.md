# Vendor Dashboard Redesign — Design Spec

## Overview

Full visual and UX redesign of all 8 vendor pages (`VendorDashboard.jsx` shell + Home, StorefrontEditor, Inventory, OrdersInbox, ProcurementFeed, Messages, Analytics, Reviews, ShopProfile) using the MERMAID v2 dark design system already adopted by the fisherman side. Visual reference is `mermaid_vendor2/` (Sentri marine palette). Data and flows stay bound to existing backend APIs — no mock data, no placeholders.

Three small backend additions:
1. Listing view count column + increment on public shop view.
2. New endpoint for per-species daily revenue/qty series (powers dashboard sparklines).
3. Derived `tier` field on `repeatBuyers` analytics DTO (VIP / Regular / New).

All other design features without backing data are dropped (Pin, Share, Followers, Certificates grid, Fuel index, Conversion %, Auto-bid, Alert team, Reschedule lots, Connect tide buoy, Switch-account dropdown, Closest-fisher distance, Super Tier CTA, Sidebar search, Settings cog, Receipt PDF, Reopen cancelled, Avg response time).

Marine advisory is merged into the Dashboard hero rather than a new sidebar page.

Project scope is La Union only — no hardcoded Cebu/Bohol/Manila locations.

---

## Design System Tokens

Loaded from a new `frontend/src/vendor/vendor-shell.css` scoped via `[data-vendor-shell]`, parallel to the fisherman's `fisherman-shell.css`. Token names match the fisherman shell so the two systems share a vocabulary.

```css
--bg-app:                 #0e0820;
--bg-canvas:              #1f1633;
--bg-card:                #1a1230;
--bg-card-2:              #221940;
--bg-card-3:              #2a2050;
--bg-elev:                rgba(255,255,255,0.04);
--bg-input:               rgba(255,255,255,0.04);
--hairline:               rgba(255,255,255,0.08);
--hairline-2:             rgba(255,255,255,0.05);
--hairline-violet:        #362d59;
--ink-1:                  #ffffff;
--ink-2:                  rgba(255,255,255,0.78);
--ink-3:                  rgba(255,255,255,0.56);
--ink-4:                  rgba(255,255,255,0.38);
--ink-5:                  rgba(255,255,255,0.22);
--safe:                   #6ee7b7;
--caution:                #fcd34d;
--unsafe:                 #fb7185;
--accent-lime:            #c2ef4e;
--accent-violet:          #6a5fc1;
--accent-violet-deep:     #422082;
--accent-violet-mid:      #79628c;
/* vendor-specific marine extensions ported from mermaid_vendor2 */
--tide:                   #5ec8e6;   /* data accent */
--tide-soft:              rgba(94,200,230,0.14);
--kelp:                   #46d39a;
--kelp-soft:              rgba(70,211,154,0.16);
--coral:                  #ff8a6b;
--coral-soft:             rgba(255,138,107,0.16);
--rail-w:                 76px;
--rail-w-open:            256px;
--accent-soft:            rgba(194,239,78,0.12);
```

Typography: Space Grotesk (display headings), Rubik (UI), JetBrains Mono (monospace data — codes, amounts, timestamps). Already loaded by the fisherman shell; vendor shell `@import`s the same Google Fonts URL.

---

## Architecture

**Base shell:** `VendorDashboard.jsx` keeps its `useState`-based page switching (no migration to React Router for this redesign — backwards-compatible with the existing payment-return / messages routing logic that already lives in `useEffect`s).

**Data fetching:** Each page continues to own its `useQuery` hooks against the existing `vendor/api/*.js` modules. Exception: the shell adds one shell-level `useQuery` for `getVendorHome()` to power the rail's notification badge counts (Inventory `lots.length`, Orders `openOrders.new + openOrders.preparing`, Source Catch matched alerts, Messages unread). Pages reuse the same cached result.

**Animations:** GSAP (`gsap@3.15.0`, already installed). Used for:
- Rail label fade-in on hover-expand.
- Page transitions (opacity fade, 120ms out / 200ms in, mirrors fisherman pattern).
- KPI count-up on first mount (200ms).
- Sparkline draw-in (`drawSVG` path animation isn't in free plugins — use a CSS `stroke-dashoffset` transition instead, triggered via GSAP `fromTo`).

**Charts:** Recharts (`recharts@3.8.1`, already installed). Replaces all hand-rolled SVG sparklines and bar charts from `mermaid_vendor2/charts.jsx`.

**Backend:** Three small additions documented in §3. No breaking API changes.

---

## Section 1: Shell & Rail (`VendorDashboard.jsx` + `vendor-shell.css`)

### Hover-expand Rail
Mirrors fisherman exactly:
- Collapsed `76px`, expanded `256px`.
- Triggered by `onMouseEnter` / `onMouseLeave` on the `<nav>` element.
- `data-rail-open={String(railOpen)}` on the root wrapper `<div data-vendor-shell>`.
- CSS width transition `250ms ease`.
- Labels animate via CSS opacity transition driven by the `[data-rail-open="true"]` selector (`80ms` delay so they appear after width settles). No GSAP needed for labels — pure CSS like fisherman.
- Active item: inset 3px left border in `--accent-lime` + soft glow.

### Rail Items (8 entries, single group)
```
Dashboard       Dashboard icon
Storefront      Store icon
Inventory       Box icon          + count badge from lots.length
Orders          Clipboard icon    + count badge from open orders
Source Catch    Fish icon         + count badge from matched alerts
Messages        Message icon      + unread badge
Analytics       Bars icon
Reviews         Heart icon
Shop profile    User icon
```

Badges show on collapsed rail as a small dot in the top-right of the icon; on expanded rail as a `--accent-soft` pill on the right of the label.

### Removed from rail
- Vendor / Public-shop segmented mode toggle (no backend mode concept).
- "Active listings" expandable sub-tree (would need yet another nested rail interaction).
- "Activate Super Tier" CTA card (no tier upgrade product).
- Workspace / Insights group labels (flat 8-item list per fisherman pattern).

### Rail bottom: user profile card
- Avatar (initials from `user.fullName`).
- Name + `VENDOR · {user.businessName}` subline.
- Click → logout.
- Matches `.f-rail__user` styling exactly.

### Topbar
- Sticky `64px` bar.
- Breadcrumbs: `Mermaid / Vendor / {currentPageLabel}` (Mermaid in `--ink-3`, Vendor in `--ink-4`, current bold in `--ink-1`).
- Right-aligned: notifications bell (existing `VendorNotificationsBell` component, restyled), help icon.
- Removed: search input + `⌘K`, settings cog, account dropdown.

### Page transition
On `navigate(id)`:
```js
gsap.to(pageRef.current, {
  opacity: 0, duration: 0.12,
  onComplete: () => {
    setPage(id)
    gsap.fromTo(pageRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' })
  }
})
```
Wrap `<PageContent>` in `<div ref={pageRef}>` so the same `pageRef` survives state changes.

---

## Section 2: Page-by-page bindings

### 2.1 Dashboard (`Home.jsx`)

**Header:** "Good morning, *{firstName}*" + business sub. Actions: "New listing" (jumps to Storefront with create-modal open), "Browse catch" (jumps to Source Catch feed tab).

**Top species row (3 cards + promo card):**
- Each species card: species local name + common name, lots count, revenue share %, +/- delta %, 30-pt sparkline (recharts `<LineChart>` with gradient fill, 76px tall, no axes).
- Data from **new endpoint** `GET /vendor/analytics/species-series?days=30` (see §3.2). Returns the vendor's top 3 species by revenue with a 30-day daily revenue + qty series.
- Promo card: "MERMAID Advisory" with single CTA "Open advisory" → scrolls to the advisory hero card on the same dashboard (since we merged advisory into dashboard, there's no separate page). Drop "Connect tide buoy".

**Active listing hero (full-width card):**
- LIVE pill + "Last update {n}m ago" (from listing's `updatedAt`).
- Featured = highest-stock PUBLISHED listing for this vendor (`/vendor/storefront` sorted by `lots[].remainingKg` desc, first match).
- Species local + common + photos count + rating + reviews count.
- "Current sold-thru — kg" big figure: `(lot.initialKg - lot.remainingKg).toFixed(2)`.
- Pills next to figure:
  - "Edit listing" → opens Storefront editor for this listing (renamed from "Restock" in design; same target).
  - "Unlist" → calls `unpublishListing(id)`.
- Footer line: `₱{pricePerKg}/kg ask · ₱{costPerKg}/kg cost · {remainingKg}kg remaining · margin +{((price-cost)/cost*100).toFixed(0)}%`.
- **Freshness window timeline** (right side of hero):
  - Derived from `(now - lot.receivedAt) / (6 * 86400 * 1000) * 100` clamped 0–100.
  - Visual ticks: `Iced D0 / D1 / D2 / D3 / D4 / D5 / Spoil`.
  - Pin marker at computed %, with label `Day {n.toFixed(1)}`.
  - Sold-thru target line: drop (no target tracking).
  - Drop "BFAR cert window OK" subline (no cert tracking).

**4 mini stats:**
| Slot | Label | Value | Source |
|---|---|---|---|
| 1 | Avg agreed/kg | `₱{avg}` | Mean `agreedPricePerKg` across vendor's COMPLETED orders, last 24h |
| 2 | Sell ratio | `{(soldKg/initialKg*100).toFixed(0)}%` | Featured lot turnover |
| 3 | Margin | `+{margin}%` | `(price - cost) / cost * 100` for featured lot |
| 4 | Days in inventory | `{daysSinceLanded}d` | `(now - lot.receivedAt) / 86400000` |

Drop "Sell-through kg/hr" (no hour-level tracking). Drop "Reward 48h" dual-delta (no 48h bucket).

**Lower grid (orders + advisory + low stock):**

- **Orders inbox panel** (left, wider): first 5 orders by `createdAt` desc from `/vendor/orders`. Status chip + action button per row (Confirm / Mark ready / Handoff / View). "View all" → Orders page.
- **Advisory hero card** (right column, top — the merged Marine Advisory): calls `marineService.getConditions(la_union_default_coord)` once. Shows:
  - Risk level badge (SAFE / CAUTION / UNSAFE) using `--kelp` / `--caution` / `--coral`.
  - Headline: "{level} conditions · La Union coast" (no station drill-down).
  - Three readouts: wave height (m), wind (kt), gusts (kt).
  - One CTA: "Refresh" (refetch).
  - Below: top 3 active advisories from existing `admin/advisories` table where `isActive=true`, scoped to vendor's region (or all if no region scoping). Each row: dot + title + sub + relative time.
- **Low stock panel** (right column, bottom): existing `home.lowStock`, restyled as the design's stock-row component (icon + name + meter bar + qty).

**Procurement panel (bottom, full-width):**
- Existing matched catch alerts from `home.recentMatchedCatchAlerts`.
- Card grid: code, match% (100 if species in watchlist else 60), species local + common, fisher name, qty, ask, expires-in, "Add to cart" + "Start deal" CTAs.
- Drop "Best match / Closest / Expiring" sort pills (only Best match works; the others have no data).

---

### 2.2 Storefront (`StorefrontEditor.jsx`)

**Header:** "Your public *listings*" + sub. Actions: "Preview shop" (opens `/shop/{slug}` in new tab), "New listing" (modal).

**KPI strip (5 cells):**
- Listings count
- Views 30d — **new column** (see §3.1), sum across vendor's listings
- Sold 30d (sum of `sold30dKg` from existing data)
- Avg rating (from existing review aggregation)
- Active count

Drop "Conversion %".

**Tab strip:** All / Active / Drafts / Paused. Map to:
- Active → `status IN (PUBLISHED, SOLD_OUT)`
- Drafts → `status = DRAFT`
- Paused → `status = UNPUBLISHED`

**Listing grid (cards):**
- Photo (cover) with status badge top-left, action menu top-right.
- Species local · common code.
- Title + price/kg.
- Stats row: Stock kg / Sold 30d kg / Views (new).
- Actions: Edit (opens modal — existing flow), View (opens `/shop/{slug}/listing/{id}`).
- Drop: Pin, Share, three-dot menu items beyond Edit/View.

---

### 2.3 Inventory (`Inventory.jsx`)

**Header:** "Your *lots*" + sub. Actions: "Export" (CSV via existing `/vendor/lots/export` if it exists — confirm during plan; if not, scope-cut), "Adjust lot" (opens existing lot-edit modal).

**KPI strip (5 cells):**
- On-hand kg (sum of `remainingKg`)
- Cost value (sum of `remainingKg * costPerKg`, in ₱k)
- Turnover % (`((initial - remaining) / initial) * 100` across all lots)
- Low stock count (lots below the threshold input)
- Avg age (mean `(now - receivedAt) / 86400000`)

**Controls row:** Threshold number input + Species select + filter pills (Active / Low / Sold out).

**Lot row cards:** Existing `/vendor/lots` data, restyled to match design's `.lot-row-card` (icon block + label/value pairs + meter bar). Per-row actions: Edit, List (calls `publishListing` if there's an existing draft, otherwise opens "create listing from lot" modal — confirm existing flow during plan), Sold-out chip when `remainingKg === 0`.

Drop "trash" icon — soft-delete is not surfaced from inventory in current UX.

---

### 2.4 Orders (`OrdersInbox.jsx`)

**Header:** "Order *inbox*" + sub. Actions: "Export CSV" (existing `exportOrders`). Drop "Advanced filter".

**KPI strip (5 cells):** Pending, Confirmed, Completed (7d), Cancelled (7d), Open value (sum of non-terminal order totals).

**Pipeline visualizer:** 4 bars showing relative distribution of open orders across stages:
- Pending = count where `status === 'PENDING'`
- Confirmed = count where `status === 'CONFIRMED'`
- In transit = count where `status IN (PREPARING, READY, OUT_FOR_DELIVERY, AWAITING_RECEIPT)`
- Completed = count where `status === 'COMPLETED'` (last 7d)
- DISPUTED and CANCELLED render as off-track chips beside the visualizer, not as bars.

Bar widths via `flex` proportional to counts (min `flex: 0.5` per stage so empty buckets still show). Colors: `--accent-lime` / `--tide` / `--accent-pink` / `--accent-violet-mid`.

**Filter pills:** All / Pending / Confirmed / In transit / Completed / Cancelled. Existing `STATUS_FILTERS` extended with an "in transit" pseudo-filter that maps to the 4 sub-statuses.

**Order cards:** Existing `OrderCard` component, restyled to match design's `.order-card`:
- Left vertical accent pipe colored by status.
- Code + status chip.
- Buyer name + species line + pickup date.
- Quantity / Total columns with kg and ₱.
- Action row uses existing `OrderCard` actions (Confirm / Mark ready / Handoff / Dispute / Cancel — *no* Receipt PDF, *no* Reopen).

---

### 2.5 Source Catch (`ProcurementFeed.jsx`)

**Header:** "Source fresh *catch*" + sub. Actions: "Edit watchlist" (opens existing watchlist modal), drop "Auto-bid setup".

**Tab strip (4 tabs, all existing):** Live feed / Cart / My orders / Credits. Labels and counts:
- Live feed: count from `feedQ.data.length`
- Cart: count from `cartItems.length`
- My orders: count from `supplierOrders.length`
- Credits: count from `creditOrders.length`

**Live feed tab:**
- KPI strip: Open alerts, On watchlist (match ≥ 60%), Avg ask, Spend 30d (sum of `creditOrders + completed supplier orders`). Drop "Closest fisher".
- Card grid: alert cards with code, match%, species, fisher, qty, ask, expires-in, CTAs (Cart, Start deal). Match% is the binary-derived score described in §2.1.
- Sort pills: Best match (default) / Expiring. Drop Closest.

**Cart tab:** Existing cart table, restyled. "Start deals (n)" button bulk-starts deals for cart items without one.

**My orders tab:** Existing supplier-orders list using `OrderCard` (vendor-as-buyer viewer role). Restyled to design's `.order-card` like the main Orders page.

**Credits tab:** Existing `creditOrders` filter. Table with Order / Fisher / Species / Amount / Aged / "Settle now" button → opens existing `SettleCreditModal`.

---

### 2.6 Messages (`Messages.jsx` + `DealChatPane.jsx`)

**Header:** "Negotiate *in flight*" + sub. Action: "New deal" (jumps to Source Catch).

**Split layout:** `msg-list` (350px) + `msg-thread` (flex 1).

**Conversation list:**
- Filter tabs: All / Unread / Negotiating / Agreed.
- Item rows: avatar (initials), fisher name, last-message time, last-message preview, code + species sub, status chip, unread count badge.

**Thread:**
- Header: avatar + name + code/species/qty + buttons (Catch alert → opens alert detail; More → existing actions). Drop Pin.
- Body: existing `DealChatPane` content, restyled. Offer/Counter bubble cards (`.msg-offer`) with Accept / Counter / Decline action buttons (the existing proposal flow).
- Composer: + (attach — keep existing if supported), text input, "Counter" button (opens counter-offer modal), "Send" primary button.

---

### 2.7 Analytics (`Analytics.jsx`)

**Header:** "How your shop is *performing*" + sub. Action: range tabs 7d / 30d / 90d / 1y.

**KPI strip (5 cells):** Orders, Revenue, Volume, AOV, Repeat rate. All from existing `/vendor/analytics` summary.

**Two-column charts row:**
- Revenue by species — recharts `<BarChart>` horizontal layout.
- Procurement spend by species — recharts `<BarChart>` horizontal, alt color (`--accent-pink`).

**Repeat buyers table:**
- Columns: Buyer / Tier / Orders / Total spent / Last order / actions.
- **Tier chip is new:** derived in `AnalyticsService.repeatBuyers()` (§3.3). VIP = `orders ≥ 10`, Regular = `orders ≥ 3`, New otherwise.
- VIP chip: lime; Regular: tide; New: muted.
- Action: "View orders" → Orders page filtered by `buyerId` (existing `pageState.buyerId` pattern).

---

### 2.8 Reviews (`Reviews.jsx`)

**Header:** "Customer *reviews*" + sub.

**Top row (two panels):**
- Rating snapshot: big avg star figure + distribution bar rows (5★ → 1★).
- Quick stats: Reply rate (`replied / total`), Awaiting reply (count of `!reply`). Drop "Avg response time".

**Review cards:** Existing data, restyled. Avatar (initials), reviewer name, stars, date, order code chip, species + qty, comment text, reply card if present (with "Your reply" eyebrow), otherwise "Reply" button → expands inline textarea + "Cancel" / "Post reply" buttons.

---

### 2.9 Shop Profile (`ShopProfile.jsx`)

**Header:** "Your *public shop*" + sub showing `mermaid.ph/shop/{slug}`. Actions: "Preview", "Save changes".

**Banner + logo:** Existing `bannerUrl` / `logoUrl`. Banner has a "Change banner" overlay button → existing file upload flow.

**KPI strip (3 cells, narrowed from 4):**
- Repeat rate (from `analytics.repeatRate`)
- Fulfillment % (`completed / (completed + cancelled)` across last 30d)
- Listings count

Drop Followers (no follow system). Drop Avg response (no timestamp tracking).

**Two-column form:**
- Basic info: Display name / Public slug (with `mermaid.ph/shop/` prefix) / Bio / Pickup location.
- Business hours: 7-row day editor matching design's `.hours-row` (day label + open time + close time + closed toggle).

**Certificates section:** **Drop entirely** — no certificate entity in backend.

---

## Section 3: Backend additions

### 3.1 Listing view count

**Migration `backend/src/main/resources/db/migration/V65__storefront_listing_view_count.sql`:**
```sql
ALTER TABLE storefront_listings ADD COLUMN view_count INT NOT NULL DEFAULT 0;
CREATE INDEX idx_storefront_listings_view_count ON storefront_listings(view_count DESC) WHERE is_deleted = false;
```

**Increment in `PublicShopController.getListing(id)`:** call `storefrontListingService.incrementViewCount(id)` before returning the DTO. Service method uses a JPQL `UPDATE storefront_listings SET view_count = view_count + 1 WHERE id = :id AND is_deleted = false` to avoid race conditions.

**Aggregation endpoint:** Add `GET /vendor/storefront/stats` returning `{ totalViews30d, totalViews7d, byListing: [{ listingId, views }] }`. View counts are cumulative (column is monotonic); for "30d" we approximate using cumulative count (simplest first pass — accept that early-life listings will have fewer views simply because they're younger). If finer granularity is needed in the future, add a separate `listing_views` audit table — out of scope for this redesign.

**Generated DTOs:** Add `viewCount` to `StorefrontListingDTO` in `api.yaml`.

### 3.2 Per-species daily revenue series

**New endpoint:** `GET /vendor/analytics/species-series?days=30`.

**Response shape (added to `api.yaml`):**
```yaml
VendorAnalyticsSpeciesSeries:
  type: object
  properties:
    series:
      type: array
      items:
        type: object
        properties:
          speciesId: { type: integer, format: int64 }
          commonName: { type: string }
          localName: { type: string }
          revenueShare: { type: number, format: float }  # 0..100 across vendor's top species
          revenueDelta: { type: number, format: float }  # vs prior window of equal length
          lotsCount: { type: integer }
          pricePerKg: { type: number }  # current avg agreed price
          lastWindowRevenue: { type: number }
          daily:
            type: array
            items:
              type: object
              properties:
                date: { type: string, format: date }
                revenue: { type: number }
                qtyKg: { type: number }
```

**Service:** `AnalyticsService.getSpeciesSeries(vendorId, days)` runs a single SQL aggregation:
```sql
SELECT
  o.species_id,
  DATE(o.completed_at) AS day,
  SUM(o.total_amount) AS revenue,
  SUM(o.ordered_qty_kg) AS qty_kg
FROM orders o
WHERE o.vendor_id = :vendorId
  AND o.status = 'COMPLETED'
  AND o.completed_at >= NOW() - INTERVAL ':days days'
GROUP BY o.species_id, DATE(o.completed_at)
ORDER BY o.species_id, day
```
Map into the top 3 species by total revenue. Fill missing dates with zero-revenue points so each series is exactly `days` long.

`revenueDelta` = `(currentWindowRevenue - priorWindowRevenue) / priorWindowRevenue * 100`. If prior is 0 and current > 0 → `+100`. If both 0 → `0`.

### 3.3 Buyer tier derivation

**No migration.** Update `AnalyticsService.repeatBuyers()` to attach a `tier` field on each row:

```java
private String deriveTier(int orderCount) {
  if (orderCount >= 10) return "VIP";
  if (orderCount >= 3)  return "REGULAR";
  return "NEW";
}
```

**Add `tier` field to the existing `RepeatBuyerSummary` schema in `api.yaml`** (enum: `[VIP, REGULAR, NEW]`).

Frontend renders the chip with these colors: VIP=lime, REGULAR=tide, NEW=muted.

---

## Section 4: Dropped features (no UI, no backend stub)

| Feature | Where it appeared | Why dropped |
|---|---|---|
| "Connect tide buoy" | Dashboard promo card | No IoT integration |
| "Auto-bid setup" | Source Catch header | No auto-bidding logic |
| "Alert team" | Advisory hero | No team/notification fanout |
| "Reschedule lots" | Advisory hero | No lot-handoff calendar |
| Pin icon | Listing hero, Messages header | No pin/favorite per-vendor |
| Share icon | Listing hero, Storefront cards | No share-link generator |
| Followers KPI | Shop Profile | No follow system |
| Switch-account dropdown | Topbar | Auth is single-tenant per session |
| Vendor / Public-shop mode toggle | Sidebar | No mode swap concept |
| "Activate Super Tier" CTA | Sidebar bottom | No tier-upgrade product |
| Sidebar search + ⌘K | Topbar | No backend search |
| Settings cog | Topbar | Shop Profile covers settings |
| Conversion % | Storefront KPI | Requires order-attribution per listing view; punt |
| Closest fisher / distance | Source Catch KPI | No fisher coords |
| Fuel index sparkline | Advisory | No fuel API |
| Coastal stations grid | Advisory | Scope is single coord (La Union) |
| Numeric risk score 72/100 | Advisory | marine-service returns levels, not numerics |
| Tide chart 24h | Advisory | Requires exposing tide series; descoped |
| Certificates & trust grid | Shop Profile | No certificate entity |
| Avg response time | Reviews + Shop Profile | No reply-time tracking |
| Receipt PDF | Orders action | No PDF endpoint |
| Reopen cancelled | Orders action | Cancelled is terminal |
| BFAR cert window | Listing hero | No cert tracking |
| Advanced filter dropdown | Orders header | No backend-supported filters beyond status |
| Order kg/hr sell-through | Dashboard mini-stat | No hour-level tracking |
| 48h dual delta | Dashboard mini-stat | No 48h bucket |
| "Active listings" sidebar dropdown | Sidebar | Replaced by Storefront page |
| Sold-thru target line | Listing hero timeline | No target tracking |
| Three-dot listing action menu | Storefront cards | Edit/View buttons cover all actions |
| Trash icon on lot rows | Inventory | Soft-delete not surfaced from inventory |

---

## Section 5: Testing strategy

**Visual regression:** Manual. Open each redesigned page side-by-side with the corresponding mermaid_vendor2 screenshot (`mermaid_vendor2/screenshots/*.png`). Confirm visual match within reasonable token interpretation (we don't need to match `mermaid_vendor2`'s lighter background tones exactly because we're aligning with the fisherman dark shell).

**Component tests:** Per-page Vitest spec under `frontend/src/vendor/__tests__/*.test.jsx`. Existing tests for Home, Analytics, ProcurementFeed must still pass — update them only if a removed-feature assertion exists. Add new tests:
- Dashboard freshness timeline computes correct percentage from `receivedAt`.
- Orders pipeline buckets in-transit statuses correctly.
- Storefront tab filter maps Drafts/Paused/Active to backend status correctly.
- Source Catch match% returns 100 for in-watchlist, 60 otherwise.

**Backend tests:**
- `StorefrontListingServiceTest`: assert `incrementViewCount` is monotonic and idempotent on missing IDs.
- `AnalyticsServiceTest`: assert species-series fills missing days with zero and computes correct revenueDelta when prior window is empty.
- `AnalyticsServiceTest`: assert tier derivation thresholds.

**Manual smoke test:** Log in as vendor, click through all 8 pages, verify:
- Rail hover-expand smooth (no layout jank).
- Each KPI cell shows a non-zero value with seeded data.
- New listing → publish → appears in Storefront tab "Active".
- Order PENDING → CONFIRMED → handoff initiated → bucket moves Pending → Confirmed → In transit.
- Start deal from Source Catch → lands in Messages with correct alert/species context.
- Advisory hero shows current marine conditions for La Union.

---

## Section 6: Phasing & rollout

Single PR. The redesign is large but each page can be reviewed independently within the PR. Suggested commit order (informational — actual sequencing handled in the implementation plan):

1. `vendor-shell.css` tokens + shell layout shell (no page changes yet).
2. Rail + topbar (with stub pages still rendering old content).
3. Backend additions (view count migration, species series endpoint, tier derivation) + tests.
4. Dashboard page.
5. Storefront page.
6. Inventory page.
7. Orders page.
8. Source Catch page.
9. Messages page (mostly DealChatPane restyling).
10. Analytics page.
11. Reviews page.
12. Shop Profile page.

No feature flag needed — the redesign replaces the old vendor styling wholesale. Buyer, fisherman, and admin styling is unaffected because the new CSS is scoped under `[data-vendor-shell]`.

---

## Open questions resolved during brainstorming

| Question | Decision |
|---|---|
| All 8 pages or subset? | All 8 in one spec. |
| "Procurement" → "Source Catch" naming? | Yes (route stays `/vendor/procurement`). |
| 3 or 4 pipeline stages on Orders? | 4 — In transit = PREPARING/READY/OUT_FOR_DELIVERY/AWAITING_RECEIPT. |
| Source Catch Credits tab? | Keep — already wired to `payment.method=CREDIT` flow. |
| Marine Advisory as own page? | No — merge hero card into Dashboard. |
| Freshness timeline on dashboard? | Keep — derive from `receivedAt`, no backend change. |
| Backend additions worth doing? | Listing view count, per-species daily series, buyer tier derivation. |
| CSS organization? | `vendor-shell.css` scoped via `[data-vendor-shell]`, parallel to fisherman. |
| Library choices? | gsap (already installed) for transitions, recharts (already installed) for charts. |
| Geographic scope? | La Union only — no Cebu/Bohol/Manila hardcoding. |
