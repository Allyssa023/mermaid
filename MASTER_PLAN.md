# MERMAID — Master Development Plan
> Consolidates REMODEL_PLAN.md + all 3 research files into one actionable build order.

---

## The Complete Flow We Are Building

```
Isidro checks marine conditions (SAFE/CAUTION/UNSAFE)
    ↓
Starts trip + completes safety checklist
    ↓
Goes fishing → returns to shore
    ↓
Logs catch (species, estimate, notes) → sees BFAR reference price
    ↓
Posts catch alert: "30kg galunggong, landing Damortis 6am"
    ↓
System notifies Rosario (matches her open demand listing)
    ↓
Rosario sees catch alert → places order with offer price
    ↓
Isidro accepts → Order confirmed
    ↓
Fish weighed at market → Handoff confirmed (actual kg)
    ↓
Rosario pays → Payment recorded (cash/GCash/COD)
    ↓
Both rate each other → Isidro sees trip earnings vs BFAR reference
    ↓
Trip ended → earnings archived
```

---

## Feature List (Build Order)

---

### FEATURE 1 — CatchLog Domain Layer
**Priority: CRITICAL — blocks everything else**

The V9 migration (DB table) and api.yaml endpoints already exist.
Only the Java entity/service/mapper/controller are missing.

#### What it does
- Isidro records what he caught during an active trip
- At sea: logs by estimate ("2 baskets", "3 bilog") — no kg required yet
- At market: settles catch with actual kg + agreed price

#### Backend
- `domain/CatchLog.java` — fields: id, tripId, speciesId, quantityEstimate (text), quantityKg (nullable), estimatedPricePerKg, isSettled, settledKg, settledPricePerKg, settledAt, settledWithVendorId, matchedListingId, notes, loggedAt
- `repository/CatchLogRepository.java`
- `mapper/CatchLogMapper.java`
- `service/CatchLogService.java` — methods: listByTrip, create, update, delete, settle
- Flyway: `V14__catch_settlement_fields.sql` — alter catch_logs to add settle fields + make quantity_kg nullable

#### API Endpoints (already in api.yaml, just implement)
- `GET /trips/{tripId}/catch-logs`
- `POST /trips/{tripId}/catch-logs` — body: speciesId, quantityEstimate, notes (no kg required)
- `PUT /trips/{tripId}/catch-logs/{catchId}`
- `DELETE /trips/{tripId}/catch-logs/{catchId}`
- `PUT /trips/{tripId}/catch-logs/{catchId}/settle` — NEW: body: settledKg, settledPricePerKg, vendorId

#### UI — Catch Log Screen (inside Trip detail)
```
┌─────────────────────────────────────┐
│  Trip: June 15 · Damortis           │
│  Status: ACTIVE  ⏱ 4h 32m          │
├─────────────────────────────────────┤
│  + Add Catch                        │
├─────────────────────────────────────┤
│  🐟 Galunggong                      │
│  "2 baskets"  |  Not yet settled    │
│  [Settle] [Edit] [Delete]           │
├─────────────────────────────────────┤
│  🦑 Pusit                           │
│  "1 sack"  |  ₱3,200 settled       │
│  28kg × ₱114/kg                    │
└─────────────────────────────────────┘
```

**Add Catch Modal:**
```
Species: [dropdown — Galunggong ▼]
Estimate: [text — "2 baskets / 3 bilog / 1 sack"]
Notes: [optional]
[Save Catch]
```

**Settle Catch Modal (at market):**
```
BFAR Reference: ₱180/kg  ← always visible
Actual weight: [___] kg
Agreed price:  [___] /kg
Sold to: [Vendor name or free text]
[Confirm Settlement]
```

---

### FEATURE 2 — BFAR Reference Price Table
**Priority: HIGH — fisher welfare, anchors all pricing**

#### What it does
- Admin sets the weekly reference price per species
- Displayed on catch settlement, catch alert, and order screens
- Fishers can compare what they're being offered vs. the benchmark

#### Backend
- Flyway: `V15__bfar_reference_prices.sql`
  ```sql
  CREATE TABLE bfar_reference_prices (
    id BIGSERIAL PRIMARY KEY,
    species_id BIGINT NOT NULL REFERENCES fish_species(id),
    min_price_per_kg NUMERIC(10,2) NOT NULL,
    max_price_per_kg NUMERIC(10,2) NOT NULL,
    source VARCHAR(200) DEFAULT 'BFAR Region 1 NCPMR',
    effective_date DATE NOT NULL,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `domain/BfarReferencePrice.java`
- `service/BfarPriceService.java` — getLatestBySpecies, create, update (admin only)
- `controller/AdminBfarPriceController.java` — `POST/PUT /admin/bfar-prices`
- `controller/LookupController.java` — add `GET /lookups/bfar-prices?speciesId=X`

#### UI
- Admin panel: table of species + price range + effective date, editable inline
- On every price field in the app: small badge "BFAR ref: ₱140–₱180/kg"
- Color code: green if agreed price ≥ BFAR min, yellow if slightly below, red if significantly below

---

### FEATURE 3 — Catch Alert (Availability Post)
**Priority: HIGH — turns catch log into marketplace supply**

This is the "digital auctioneer shout at the beach." One tap after logging catch.

#### What it does
- After logging catch, Isidro posts a brief public alert
- System auto-matches against open vendor demand listings for same species
- Matched vendors get notified
- Vendors who subscribed to a species also get notified
- Alert expires automatically (fish is perishable)

#### Backend
- Flyway: `V16__catch_alerts.sql`
  ```sql
  CREATE TABLE catch_alerts (
    id BIGSERIAL PRIMARY KEY,
    fisherman_id BIGINT NOT NULL REFERENCES users(id),
    catch_log_id BIGINT REFERENCES catch_logs(id),
    species_id BIGINT NOT NULL REFERENCES fish_species(id),
    quantity_estimate VARCHAR(100),
    quantity_kg NUMERIC(10,2),
    landing_site VARCHAR(200),
    municipality VARCHAR(100),
    estimated_arrival TIMESTAMPTZ,
    asking_price_per_kg NUMERIC(10,2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','MATCHED','EXPIRED','CANCELLED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `domain/CatchAlert.java`
- `service/CatchAlertService.java`
  - `post(fishermanId, request)` — creates alert, triggers match check
  - `findMatchingDemandListings(speciesId, municipality)` — finds open demand listings
  - `notifyMatchedVendors(alert, matchedListings)` — in-app notification (or future SMS)
  - `expireStaleAlerts()` — scheduled job, runs every hour
- `controller/CatchAlertController.java`

#### API Endpoints
- `POST /fisherman/catch-alerts` — post new alert
- `GET /fisherman/catch-alerts` — fisherman's own alerts
- `PUT /fisherman/catch-alerts/{id}/cancel`
- `GET /marketplace/catch-alerts` — all ACTIVE alerts (vendors browse this)
- `GET /marketplace/catch-alerts?speciesId=X&municipality=Y` — filtered

#### UI — Fisherman Side
**Post Alert (after logging catch):**
```
┌─────────────────────────────────────┐
│  📢 Post Catch Alert                │
│  Let vendors know you're landing!   │
├─────────────────────────────────────┤
│  Species:   Galunggong              │
│  Estimate:  2 baskets (~30kg)       │
│  Landing:   [Damortis, Sto. Tomas ▼]│
│  ETA:       [6:00 AM ▼]            │
│  Ask price: [optional ₱____/kg]    │
│  Notes:     [optional]              │
│  Expires:   4 hours from now        │
│                                     │
│  [Post Alert]   [Skip]              │
└─────────────────────────────────────┘
```

#### UI — Vendor Side (new tab in marketplace)
```
┌─────────────────────────────────────┐
│  🔔 Catch Alerts Near You           │
│  Updated 3 min ago                  │
├─────────────────────────────────────┤
│  🐟 Galunggong                      │
│  Isidro D. · Damortis               │
│  ~30kg · ETA 6:00 AM                │
│  BFAR ref: ₱140–₱180/kg            │
│  Expires in 3h 40m                  │
│  [Make Offer]  [Message]            │
├─────────────────────────────────────┤
│  🦐 Sugpo                           │
│  Rodel A. · San Fernando Port       │
│  ~5kg · ETA 7:30 AM                 │
│  ₱450/kg asking                     │
│  [Make Offer]  [Message]            │
└─────────────────────────────────────┘
```

---

### FEATURE 4 — Order (Confirmed Transaction)
**Priority: HIGH — formalizes the deal**

#### What it does
- Created when Rosario accepts a catch alert or Isidro accepts a demand listing
- Locks in: buyer, seller, species, quantity, agreed price
- Status lifecycle: PENDING → CONFIRMED → COMPLETED → CANCELLED/DISPUTED

#### Backend
- Flyway: `V17__orders.sql`
  ```sql
  CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL REFERENCES users(id),
    seller_id BIGINT NOT NULL REFERENCES users(id),
    catch_alert_id BIGINT REFERENCES catch_alerts(id),
    demand_listing_id BIGINT REFERENCES demand_listings(id),
    species_id BIGINT NOT NULL REFERENCES fish_species(id),
    ordered_qty_estimate VARCHAR(100),
    ordered_qty_kg NUMERIC(10,2),
    agreed_price_per_kg NUMERIC(10,2) NOT NULL,
    bfar_reference_price NUMERIC(10,2),
    dispatch_mode VARCHAR(20) CHECK (dispatch_mode IN ('PICKUP','DELIVERY')),
    expected_handoff_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','DISPUTED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `domain/Order.java`
- `service/OrderService.java` — create, confirm, cancel, complete
- `controller/OrderController.java`

#### API Endpoints
- `POST /orders` — create (vendor makes offer on catch alert)
- `GET /orders/mine` — both buyer and seller see their orders
- `PUT /orders/{id}/confirm` — seller accepts
- `PUT /orders/{id}/cancel`
- `PUT /orders/{id}/complete` — triggered by handoff

#### UI — Order Card
```
┌─────────────────────────────────────┐
│  Order #1042  · PENDING             │
│  Galunggong · ~30kg                 │
│  Offer: ₱160/kg                     │
│  BFAR ref: ₱180/kg  ← -₱20/kg     │
│  Pickup: Damortis 6:00 AM           │
│  From: Rosario M.                   │
│                                     │
│  [Accept]  [Counter]  [Decline]     │
└─────────────────────────────────────┘
```

---

### FEATURE 5 — Handoff Confirmation
**Priority: HIGH — actual weight = settlement truth**

#### What it does
- At pickup/delivery: actual weight confirmed (may differ from estimate)
- Both sides confirm or flag dispute
- Triggers final price recalculation
- Auto-completes the Order

#### Backend
- Flyway: `V18__handoffs.sql`
  ```sql
  CREATE TABLE handoff_confirmations (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    actual_qty_kg NUMERIC(10,2) NOT NULL,
    final_price_per_kg NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) GENERATED ALWAYS AS (actual_qty_kg * final_price_per_kg) STORED,
    confirmed_by_buyer BOOLEAN DEFAULT FALSE,
    confirmed_by_seller BOOLEAN DEFAULT FALSE,
    dispute_reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','CONFIRMED','DISPUTED')),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `service/HandoffService.java` — create, confirmBuyer, confirmSeller, dispute

#### UI — Handoff Screen
```
┌─────────────────────────────────────┐
│  ✅ Confirm Handoff                 │
│  Order #1042 · Galunggong           │
├─────────────────────────────────────┤
│  Estimated:  ~30 kg                 │
│  Actual weight: [28.5] kg           │
│  Price/kg:      ₱160               │
│  Total:         ₱4,560             │
│  BFAR ref:      ₱5,130  (-₱570)   │
├─────────────────────────────────────┤
│  [Confirm Handoff]  [Flag Dispute]  │
└─────────────────────────────────────┘
```

---

### FEATURE 6 — Payment Record
**Priority: HIGH — closes the transaction loop**

#### What it does
- Records how Rosario paid Isidro
- Supports: CASH, GCASH, MAYA, COD, CREDIT
- Generates a receipt both sides can view

#### Backend
- Flyway: `V19__payments.sql`
  ```sql
  CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    handoff_id BIGINT REFERENCES handoff_confirmations(id),
    payer_id BIGINT NOT NULL REFERENCES users(id),
    payee_id BIGINT NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    method VARCHAR(20) CHECK (method IN ('CASH','GCASH','MAYA','COD','CREDIT','BANK_TRANSFER')),
    proof_reference VARCHAR(200),
    status VARCHAR(20) DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','CONFIRMED','DISPUTED')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `service/PaymentService.java` — record, confirm, dispute

#### UI — Payment Screen
```
┌─────────────────────────────────────┐
│  💰 Record Payment                  │
│  Order #1042 · Total ₱4,560         │
├─────────────────────────────────────┤
│  Payment method:                    │
│  ○ Cash  ● GCash  ○ Maya  ○ COD    │
│                                     │
│  Reference no: [GCash ref optional] │
│                                     │
│  [Record Payment]                   │
├─────────────────────────────────────┤
│  RECEIPT                            │
│  Galunggong 28.5kg × ₱160 = ₱4,560 │
│  Paid via: GCash                    │
│  Date: June 15, 2026 6:24 AM       │
│  Buyer: Rosario M.                  │
│  Seller: Isidro D.                  │
└─────────────────────────────────────┘
```

---

### FEATURE 7 — Trip Earnings Summary
**Priority: MEDIUM — makes trips purposeful, key welfare metric**

#### What it does
- After trip ends, Isidro sees total earnings
- Per catch: actual kg × agreed price
- vs BFAR reference: shows how much he left on the table
- Weekly/monthly aggregation on dashboard

#### Backend
- No new table needed — computed from payments + handoffs + orders
- `service/TripAnalyticsService.java`
  - `getTripSummary(tripId)` → totalCatches, settledCount, totalEarned, bfarTotalReference, priceGap
  - `getFishermanAnalytics(fishermanId)` → weeklyEarnings, topSpecies, avgPriceGap

#### UI — Trip Summary
```
┌─────────────────────────────────────┐
│  Trip Summary · June 15             │
│  Damortis → Lingayen Gulf           │
├─────────────────────────────────────┤
│  Catch           Earned   BFAR ref  │
│  Galunggong 28kg ₱4,560  ₱5,130    │
│  Sapsap 8kg      ₱2,240  ₱2,560    │
├─────────────────────────────────────┤
│  Total earned:   ₱6,800            │
│  BFAR reference: ₱7,690            │
│  Price gap:      -₱890 (-11.6%)    │
└─────────────────────────────────────┘
```

#### UI — Fisherman Dashboard earnings widget
```
This week:    ₱18,400
Last week:    ₱12,100
Avg gap vs BFAR: -9.2%
Best species: Sapsap (closest to reference)
```

---

### FEATURE 8 — Fish Freshness Photo + AI Verification
**Priority: MEDIUM — addresses professor's trust/scam concern**

#### What it does
- Fisherman uploads photos of catch when posting a catch alert
- AI (Gemma 4 via Ollama) analyzes freshness from eye, gill, and body shots
- Freshness badge appears on listing: VERY FRESH / FRESH / ACCEPTABLE / NOT RECOMMENDED
- Short Taglish explanation shown to vendors

#### Backend
- `V20__catch_photos_freshness.sql`
- `service/PhotoStorageService.java` — local filesystem storage
- `service/FreshnessAnalysisService.java` — calls Ollama Gemma 4 vision
- `controller/CatchPhotoController.java`

#### UI — Photo Upload (part of catch alert form)
```
┌─────────────────────────────────────┐
│  📷 Add Fish Photos (optional)      │
│  Builds buyer trust                 │
├─────────────────────────────────────┤
│  [📸 Whole fish]  [👁️ Eyes]        │
│  [🩸 Gills]       [+ More]         │
│                                     │
│  AI will analyze freshness          │
│  automatically after upload         │
└─────────────────────────────────────┘
```

**Freshness badge on catch alert card:**
```
🟢 VERY FRESH
"Maliwanag ang mata, pula ang hasang —
bago pa ito!"  (confidence: 94%)
```

---

### FEATURE 9 — Buyer Role + Vendor Inventory
**Priority: MEDIUM — from professor feedback**

#### What it does
- New BUYER role (restaurants, households, resellers)
- Vendors can also post what they HAVE (inventory listings)
- Buyers browse vendor inventory and reserve fish

#### Backend
- Add BUYER to role enum
- New table: `vendor_inventory_listings`
- New table: `buyer_reservations`
- (See REMODEL_PLAN.md Feature 1 for full spec)

#### UI — Vendor Inventory Tab
```
┌─────────────────────────────────────┐
│  My Inventory  [+ Post What I Have] │
├─────────────────────────────────────┤
│  🐟 Galunggong · 25kg              │
│  ₱180/kg · San Fernando Market     │
│  3 reservations pending             │
│  [View]  [Close]                    │
└─────────────────────────────────────┘
```

---

### FEATURE 10 — SOS Emergency Button
**Priority: MEDIUM — safety, strong demo feature**

#### What it does
- During an ACTIVE trip, Isidro taps SOS
- System records alert with timestamp and (optional) GPS
- Notifies registered emergency contact

#### Backend
- `V21__sos_emergency.sql`
- `domain/EmergencyContact.java`, `domain/SosAlert.java`
- `service/SosAlertService.java`
- (See REMODEL_PLAN.md Feature 7 for full spec)

#### UI
```
┌─────────────────────────────────────┐
│  Active Trip · Lingayen Gulf        │
│                                     │
│        🆘 EMERGENCY SOS             │
│     Hold 3 seconds to activate      │
│                                     │
│  Emergency contact: Aling Nena      │
│  +63 912 345 6789                   │
└─────────────────────────────────────┘
```

---

### FEATURE 11 — Rating & Trust System
**Priority: MEDIUM — professor's scam concern**

#### What it does
- After handoff confirmed + payment recorded, both sides rate each other (1–5 stars)
- Ratings visible on user profiles in marketplace
- Suki marker: Isidro marks Rosario as trusted repeat buyer

#### Backend
- `V22__ratings.sql`
- `service/RatingService.java`
- (See REMODEL_PLAN.md Feature 8 for full spec)

#### UI — Rating Modal (post-transaction)
```
┌─────────────────────────────────────┐
│  Rate Rosario M.                    │
│  ⭐⭐⭐⭐⭐                         │
│  Comment: [optional]                │
│  [Mark as Suki] ← trust signal      │
│  [Submit Rating]                    │
└─────────────────────────────────────┘
```

---

### FEATURE 12 — Merman Bot AI Assistant
**Priority: LOW-MEDIUM — impressive demo, built last**

#### What it does
- Floating chat widget on all dashboards
- Understands Taglish
- Can read data (conditions, listings, prices) and perform actions (log catch, post alert) with confirmation
- (See REMODEL_PLAN.md Feature 5 for full spec)

#### UI
```
                      ┌──────────────┐
                      │  🤖 Merman   │
                      ├──────────────┤
                      │ Isidro: Ligtas│
                      │ ba lumabas?  │
                      │              │
                      │ Merman: SAFE │
                      │ ang Bauang.  │
                      │ Kaya na!     │
                      └──────────────┘
                                  🐟
```

---

### FEATURE 13 — Local Names + Seasonality Flags (La Union Polish)
**Priority: LOW — credibility with La Union users**

#### What it does
- Add `localName` (Ilocano) to fish species: galunggong/tamodios, dilis/monamon
- Add seasonal flags: Amihan (Nov–Feb), closed seasons, ipon season
- Municipality home selection for fisherman profile

#### Backend
- `V23__la_union_polish.sql` — add local_name, season_flag columns to fish_species

---

## Build Order Summary

| # | Feature | Backend | Frontend | Priority |
|---|---------|---------|---------|---------|
| 1 | CatchLog domain layer | ✅ implement | catch log UI in trip | CRITICAL |
| 2 | BFAR reference price | new table + admin UI | price badge everywhere | HIGH |
| 3 | Catch alert | new table + service | post alert form + vendor browse | HIGH |
| 4 | Order | new table + service | order card + accept/decline | HIGH |
| 5 | Handoff confirmation | new table + service | handoff screen | HIGH |
| 6 | Payment record | new table + service | payment + receipt screen | HIGH |
| 7 | Trip earnings summary | computed query | dashboard widget + trip summary | MEDIUM |
| 8 | Fish freshness photos + AI | Ollama integration | photo upload + freshness badge | MEDIUM |
| 9 | Buyer role + vendor inventory | new tables | new buyer dashboard | MEDIUM |
| 10 | SOS emergency button | new tables | SOS button in trip UI | MEDIUM |
| 11 | Rating + suki marker | new table | post-transaction modal | MEDIUM |
| 12 | Merman Bot | Spring AI + Ollama | floating chat widget | LOW |
| 13 | Ilocano names + seasons | schema additions | species picker polish | LOW |

---

## Database Migration Sequence

```
V14 — catch_settlement_fields (alter catch_logs)
V15 — bfar_reference_prices (new table)
V16 — catch_alerts (new table)
V17 — orders (new table)
V18 — handoff_confirmations (new table)
V19 — payments (new table)
V20 — catch_photos + freshness_verifications (new tables)
V21 — vendor_inventory_listings + buyer_reservations (new tables)
V22 — sos_alerts + emergency_contacts (new tables)
V23 — ratings (new table)
V24 — ai_conversations (new table)
V25 — la_union_polish (alter fish_species)
```

---

## The Story to Tell (Demo Flow)

```
1. Isidro opens app → checks marine conditions → SAFE
2. Starts trip, completes safety checklist (fuel ✅ engine ✅ etc.)
3. Goes out → returns → logs catch: "Galunggong, 2 baskets"
4. Sees BFAR reference: ₱140–₱180/kg
5. Posts catch alert: "Landing Damortis 6am"
6. Rosario gets notified (she had open demand for galunggong)
7. Rosario makes offer: ₱160/kg, wants 20kg
8. Isidro sees offer vs BFAR → accepts
9. Fish weighed at market: 21.5kg confirmed
10. Rosario pays via GCash → receipt generated
11. Both rate each other ⭐⭐⭐⭐⭐
12. Isidro marks Rosario as Suki
13. Trip summary: earned ₱3,440 (BFAR ref was ₱3,870, gap -11%)
```
