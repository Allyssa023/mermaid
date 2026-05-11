# Mermaid v2 redesign — page inventory

## Existing prototype file
- `Mermaid Dashboard.html` — current shell, has FISHERMAN + BUYER (legacy) + VENDOR (legacy) + ADMIN routes
- design system in `mermaid.css` (?), accents: sage (buyer), warm (vendor)
- Components live as JSX scripts loaded via Babel

## NEW routes (from updated codebase)

### FISHERMAN (`data-accent` default)
- `home` — Sea Status hero (overall risk: favorable/manageable/dangerous), 4 KPIs (safe zones, caution zones, avg wave m, max wind km/h), zone carousel (wave/wind/temp + secondary: wind dir, gusts, rain, swell, swell period, cloud cover, advisory), quick actions grid (Start trip, Marketplace, Catch alerts, My orders, Procurement, Earnings), active trip card, advisories list, pending orders mini-table
- `trips` — existing
- `catch-alerts` — existing
- `orders` — existing (buyer→fisherman direct orders)
- `procurement` — NEW: Vendor Orders (orders FROM vendors). Bucket tabs PENDING/ACCEPTED/READY/COMPLETED/CANCELLED/DISPUTED. Card per order: species + qty + ₱/kg + vendor + cash/credit chip, status, action buttons (Accept/Cancel, Mark Ready, Complete/Dispute, View Dispute). Preorder badge.
- `marketplace` — existing (browsing vendor demand listings)
- `earnings` — NEW: date range, 4 KPIs (Total Gross, Cash Collected, Outstanding Utang, Orders), ledger table (order, date, species, qty, gross, payment chip cash/utang)
- `messages` — existing
- `profile` — NEW: vessel info card (full name, vessel name, landing site), safety contact card with SMS preview, e-wallet card (GCash/Maya for payouts). Warning banner if no e-wallet.

### VENDOR (accent: warm)
- `home` — NEW: KPI tiles (Today's Revenue, Open Orders, Unread Notifications), Open Orders breakdown chips (new/preparing/ready), Low Stock Alert card with lot chips, Recent Matched Catch Alerts (2-col grid of alert-cards: species, fisher, qty kg, date)
- `storefront` — NEW: Listings table (title, species, price/kg, min qty, status chip Published/Sold Out/Draft/Unpublished). New/Edit modal with lot multiselect.
- `orders` — orders inbox (existing-ish)
- `procurement` — NEW (browse fishermen catch alerts feed)
- `procurement/cart` — NEW
- `procurement/orders` — NEW
- `inventory` — NEW: Lots table (lot id kbd, species, received date, initial kg, remaining kg w/ Low badge, cost/kg, Adjust button). Threshold filter input + species filter.
- `watchlist` — NEW: list of subscription cards (species + market location + radius km). Add Subscription modal.
- `shop-profile` — NEW: 2-col grid. Left card: Basic Info (Display Name, slug, Bio, Pickup Location). Right column: Media card (logo/banner URLs) + Business Hours card (per day open/close/closed checkbox).
- `analytics` — NEW: date range, 5 KPI strip (Total Orders, Revenue, Volume kg, AOV, Unique Buyers), Revenue by Species bar chart, Procurement Spend bar chart, Repeat Buyers table.
- `reviews` — NEW: review cards (avatar initial, name, stars, comment, vendor reply box with Edit button)
- `payouts` — NEW: 2 KPIs (Pending Payout ₱ caution, Total Paid Out ₱ safe), date filter, Ledger table (order kbd, date, buyer, species, qty, gross, status pill Pending/Paid)

### BUYER (accent: sage)
- `dashboard` (Home) — NEW redesign: greeting, 4 stats strip (Pending Orders, Confirmed, Recent Orders, Listings Available), 2-col grid Recent Orders table + Fresh Listings list with "Order now" buttons, second 2-col grid Recent Activity feed + Recommended for you list
- `browse` (Marketplace) — existing-ish
- `listing/:id` — NEW listing detail
- `vendor/:id` — NEW public shop view
- `cart` — NEW: vendor-grouped cards, per item qty +/- and remove, sticky grand total + Proceed to checkout
- `checkout` — NEW: per-vendor pickup/delivery toggle + address radios + notes textarea; Payment method 2x2 grid (Cash/GCash/Maya/Card); Address book with Add new form; sticky Grand total + Place orders
- `instant-checkout` — NEW: single-listing variant of checkout from "Order now" buttons
- `payment-return` — NEW: post-redirect status page
- `orders` — existing
- `saved` (Favorites) — existing
- `messages` — existing
- `profile` — NEW: avatar uploader, full name input, email (disabled), member since + counts strip

### ADMIN
- Single `AdminDashboard` (existing) — keep current screens

## Design strategy
Build a SECOND file: `Mermaid v2.html` that has all new routes. Reuse design system. 
Layouts confirmed:
- Fisherman default accent
- Vendor: warm
- Buyer: sage

Add as TWEAKS / page-selector to switch roles + pages quickly.

## Component vocabulary to reuse
- `.page` `.page__head` `.eyebrow` `.page__title` (with `<em>` italic), `.page__sub`, `.page__actions`
- `.card` `.card__head` `.card__title` `.card__sub`
- `.kpi` `.kpi__label` `.kpi__value` `.kpi__foot`
- `.grid--kpi` `.grid--2-1`
- `.stat` with `.l` `.v` `.s` and `.orders-strip orders-strip--4`
- `.chip` `.chip--dot` `.chip--safe` `.chip--caution` `.chip--unsafe` `.chip--accent`
- `.btn` `.btn--primary` `.btn--accent` `.btn--ghost` `.btn--sm`
- `.status status--pending|confirmed|active|completed|cancelled|disputed` with `.status__dot`
- `.tbl` (data table)
- `.kbd` (small mono pill for #ID)
- `.form-grid` `.form-row` `.input`
- `.modal-overlay` `.modal` `.modal__head` `.modal__title` `.modal__sub` `.modal__foot`
- `.seg seg__btn` (segmented control)
- `.empty empty__title`
- `.muted-data`, `.data`
- `.alert-card` with `.alert-card__head` `.alert-card__species` `.alert-card__sub` `.alert-card__stats`
- `.skeleton`
- `.rail` shell with `.rail__items` etc.
- `data-accent="sage|warm"` data-density="balanced"

## Next steps when context resumes
1. List the existing project files
2. Decide whether to overwrite `Mermaid Dashboard.html` or add a v2
3. Build the new pages role by role, sharing data
4. Hook up role+page switcher tweaks
