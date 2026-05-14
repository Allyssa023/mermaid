# Deals — Chat-Based Price Negotiation Between Vendors and Fishermen

**Date:** 2026-05-15
**Status:** Approved design, awaiting implementation plan
**Affects:** backend (Spring Boot), frontend (React), database schema

---

## 1. Context and Motivation

Today the procurement flow has a structural bug: a vendor cannot place an order on a catch alert that has no asking price, because `orders.agreed_price_per_kg` is `NOT NULL` and the alert provides no price for checkout to copy. We hit this in production as a 500 on `POST /vendor/procurement/checkout`.

More importantly, asking-price-up-front does not match how fish trading actually works in Philippine wet markets. Prices are negotiated 1:1 between a vendor and a fisherman, often face-to-face at the landing site. The current system forces the fisherman to commit to a price before any conversation happens, and then has no mechanism for the vendor to disagree short of refusing to buy.

This design replaces the "asking price → instant order" model with a **chat-based negotiation flow** anchored to a new domain object — a **Deal**.

---

## 2. High-Level Concept

A **Deal** is a 1:1 chat-based negotiation between one vendor and one fisherman, anchored to one catch alert, that produces at most one order.

**Lifecycle:**

1. Vendor adds an alert to their cart (a draft list).
2. Vendor clicks **Start deal** on a cart row → backend creates a `Deal`, opens a chat thread, and auto-seeds an opening proposal `{ cart.qty_kg, alert.asking_price_per_kg }`.
3. Either party submits new proposals `{ qtyKg, pricePerKg }` via a structured composer. Free-text chat is allowed for banter but never parsed as offers.
4. The counterparty of any pending proposal may **Accept** it (locks the price, creates the order), **Reject** it (proposal closes, deal stays open for counter), or **Counter** (submits a new proposal of their own).
5. When a proposal is accepted, `claimed_kg` on the alert increments by the agreed qty under a row lock; an order is created in `PENDING`; the deal transitions to `AGREED`; the cart row is deleted.
6. Settlement at handoff and dispute resolution happen against the resulting order using the existing flows; the deal's chat thread is reused for dispute communication.

**Multi-vendor competition:** Multiple vendors may negotiate the same alert simultaneously. Each pair gets their own private chat. `claimed_kg` only moves on `AGREED`, allowing partial fills. When one vendor accepts a partial qty, other vendors' deals stay alive against the remaining inventory; proposals that now overcommit are auto-superseded with a chat note prompting a counter.

---

## 3. Design Decisions (Confirmed)

| # | Decision | Outcome |
|---|---|---|
| 1 | Negotiation unit | One deal per cart item |
| 2 | Deal trigger | Explicit `Start deal` button on the cart row (no auto-start at add-to-cart) |
| 3 | Agreement mechanism | Free chat + structured propose-and-confirm |
| 4 | Who can propose | Both parties freely |
| 5 | Cart checkout | **Removed.** Orders are auto-created the moment a proposal is accepted |
| 6 | Asking price role | Required on the catch log; seeds the opening proposal |
| 7 | Qty negotiability | Both qty and price are part of every proposal |
| 8 | Settlement model | Three layers: agreed (chat) → settled (handoff) → disputed (back to same chat) |
| 9 | Multi-vendor visibility | Privacy-preserving "X others bidding" counter; deals stay 1:1 private |
| 10 | Overcommit handling | Auto-supersede pending proposals when accepted qty makes them infeasible |
| 11 | Notification noise | 30s coalescing window per (recipient, deal, kind) |
| 12 | Chat UI placement | Extends the existing `/messages` page |
| 13 | Alert expiry mid-deal | 30 min grace beyond `alert.expires_at`, then auto-cancel |
| 14 | Row-level triage | **Fisherman:** Accept (engage) / Reject (close deal). **Vendor:** Open chat only |
| 15 | In-chat price lock | Either party can accept the other's pending proposal via the proposal card |
| 16 | Sold-out cleanup | Other NEGOTIATING deals on a fully sold alert auto-cancel with system note |
| 17 | Free-text parsing | None. Structured composer is the only way to submit a proposal |
| 18 | Required catch-log fields | Species, quantity (kg), price/kg. Notes optional |

---

## 4. Data Model

### 4.1 New tables

```sql
CREATE TABLE deals (
    id                   BIGSERIAL PRIMARY KEY,
    catch_alert_id       BIGINT       NOT NULL REFERENCES catch_alerts(id),
    vendor_id            BIGINT       NOT NULL REFERENCES users(id),
    fisherman_id         BIGINT       NOT NULL REFERENCES users(id),
    status               VARCHAR(20)  NOT NULL DEFAULT 'NEGOTIATING'
        CHECK (status IN ('NEGOTIATING','AGREED','REJECTED','EXPIRED','CANCELLED')),
    agreed_qty_kg        NUMERIC(10,2),
    agreed_price_per_kg  NUMERIC(10,2),
    agreed_at            TIMESTAMPTZ,
    order_id             BIGINT REFERENCES orders(id),
    fisherman_engaged_at TIMESTAMPTZ,
    expires_at           TIMESTAMPTZ  NOT NULL,
    closed_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_deals_open_pair
    ON deals (vendor_id, catch_alert_id) WHERE status = 'NEGOTIATING';
CREATE INDEX idx_deals_fisherman ON deals (fisherman_id);
CREATE INDEX idx_deals_alert     ON deals (catch_alert_id);
CREATE INDEX idx_deals_status    ON deals (status);

CREATE TABLE deal_proposals (
    id              BIGSERIAL PRIMARY KEY,
    deal_id         BIGINT       NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    proposed_by_id  BIGINT       NOT NULL REFERENCES users(id),
    qty_kg          NUMERIC(10,2) NOT NULL CHECK (qty_kg >= 0.1),
    price_per_kg    NUMERIC(10,2) NOT NULL CHECK (price_per_kg >= 0),
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','ACCEPTED','REJECTED','SUPERSEDED')),
    superseded_reason VARCHAR(20)
        CHECK (superseded_reason IN ('NEW_PROPOSAL','OVERCOMMIT')),
    responded_by_id BIGINT REFERENCES users(id),
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_proposals_deal ON deal_proposals (deal_id);
CREATE UNIQUE INDEX uq_deal_proposals_pending
    ON deal_proposals (deal_id) WHERE status = 'PENDING';
```

### 4.2 Touched tables

```sql
ALTER TABLE messages              ADD COLUMN deal_id BIGINT REFERENCES deals(id);
CREATE INDEX idx_messages_deal ON messages (deal_id);

ALTER TABLE procurement_cart_items ADD COLUMN deal_id BIGINT REFERENCES deals(id);

ALTER TABLE orders                 ADD COLUMN deal_id BIGINT REFERENCES deals(id);
CREATE INDEX idx_orders_deal ON orders (deal_id);
```

`orders.deal_id` links a settled order back to the chat thread that produced it — used by the dispute UI to "return to deal chat."

### 4.3 Existing constraints relaxed

- `procurement_cart_items.offered_price_per_kg` — already nullable; remains so, now purely decorative. The order's `agreed_price_per_kg` comes from the accepted proposal, never from this column.
- `catch_alerts.asking_price_per_kg` — drop `nullable: true` in the OpenAPI spec going forward; legacy null rows backfilled in V53.

### 4.4 Enums

```java
public enum DealStatus     { NEGOTIATING, AGREED, REJECTED, EXPIRED, CANCELLED }
public enum ProposalStatus { PENDING, ACCEPTED, REJECTED, SUPERSEDED }
```

### 4.5 Java entities

| Entity | Repository | Mapper | Service |
|---|---|---|---|
| `Deal` | `DealRepository` | `DealMapper` | `DealService` |
| `DealProposal` | `DealProposalRepository` | (inline in `DealMapper`) | — (managed via `DealService`) |
| `Message` (existing) | (existing) | extend DTO with `dealId` | (existing) |
| `ProcurementCartItem` (existing) | (existing) | extend DTO with `dealId`, `dealStatus`, `latestProposal` | extended |

---

## 5. State Machines

### 5.1 Deal

```
                  (vendor: POST /cart/items/{id}/deal)
                                 │
                                 ▼
   ┌──────────────────────────────────────┐
   │         NEGOTIATING                  │ ── proposal accepted ──▶ AGREED   (terminal, order_id set)
   │  (free chat + propose-and-confirm)   │
   │                                      │ ── fisherman row-reject ▶ REJECTED (terminal)
   │                                      │
   │                                      │ ── either party cancels ▶ CANCELLED (terminal)
   └──────────────────────────────────────┘
                                 │
                          alert.expires_at + 30 min grace
                                 │
                                 ▼
                              EXPIRED (terminal, scheduled sweep)
```

### 5.2 Proposal

```
                            PENDING
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
counterparty Accept    counterparty Reject    new proposal submitted
        │                     │                     │
        ▼                     ▼                     ▼
     ACCEPTED              REJECTED            SUPERSEDED (reason: NEW_PROPOSAL)
   → deal AGREED      (deal stays open)
                                                  ▲
                                                  │ alert claimed_kg sweep
                                                  │
                                            SUPERSEDED (reason: OVERCOMMIT)
                                            (deal stays open for counter)
```

**Invariants:**

- At most one `PENDING` proposal per deal (enforced by partial unique index).
- A deal in any terminal state has no `PENDING` proposals (cascade-handled by the same transaction that transitions the deal).
- `AGREED` deals have non-null `agreed_qty_kg`, `agreed_price_per_kg`, `agreed_at`, `order_id`.

---

## 6. API Surface

All `/deals/*` routes require an authenticated user who is either `deal.vendor_id` or `deal.fisherman_id`; otherwise 403.

| Method | Path | Body | Roles | Purpose |
|---|---|---|---|---|
| POST | `/vendor/procurement/cart/items/{itemId}/deal` | — | VENDOR | Start deal from a cart item; creates `Deal` + opening proposal `{cart.qty_kg, alert.asking_price}` + system chat message. Returns `DealDto`. |
| GET  | `/deals/mine` | — | VENDOR, FISHERMAN | List my deals; query `?status=…`. Returns `DealSummary[]`. |
| GET  | `/deals/{id}` | — | participant | Full deal incl. counterparty, latest proposal, agreed snapshot, order_id if AGREED. |
| GET  | `/deals/{id}/messages` | — | participant | Paginated chat history filtered by `deal_id`. |
| POST | `/deals/{id}/proposals` | `{ qtyKg, pricePerKg }` | participant | Submit proposal; supersedes prior PENDING; posts structured chat message. |
| POST | `/deals/{id}/proposals/{proposalId}/accept` | — | counterparty only | Row-locked accept: creates order, increments claimed_kg, transitions deal to AGREED, sweeps other deals. |
| POST | `/deals/{id}/proposals/{proposalId}/reject` | `{ reason? }` | counterparty only | Reject single proposal; deal stays NEGOTIATING. |
| POST | `/deals/{id}/engage` | — | FISHERMAN only | Sets `fisherman_engaged_at`; idempotent. Used by fisherman row Accept. |
| POST | `/deals/{id}/reject` | `{ reason? }` | FISHERMAN only | Closes deal (terminal REJECTED). Used by fisherman row Reject. |
| POST | `/deals/{id}/cancel` | `{ reason? }` | participant | Closes deal (terminal CANCELLED). Used by chat header Cancel. |
| GET  | `/fisherman/alerts/{alertId}/deals` | — | FISHERMAN only | All deals on a given alert (grouping for the Active Deals page). |
| GET  | `/deals/{id}/competitor-count` | — | VENDOR (deal vendor) only | `{ count }` = open deals on the same alert excluding caller's. |

**Removed:** `POST /vendor/procurement/checkout` and `ProcurementCartService.checkoutAll`. Orders are created at proposal Accept, not via batch checkout.

### 6.1 Accept transaction

This is the only critical transaction in the system; outlined for clarity:

```
BEGIN
  SELECT * FROM catch_alerts WHERE id = :alertId FOR UPDATE
  IF alert.claimed_kg + proposal.qty_kg > alert.quantity_kg:
    proposal → SUPERSEDED (reason OVERCOMMIT)
    post system chat message
    publish PROPOSAL_SUPERSEDED
    throw ListingClosedException → 409
  END

  INSERT order (kind=RETAIL, qty=proposal.qty_kg, price=proposal.price_per_kg, status=PENDING,
                buyer=vendor, seller=fisherman, catch_alert_id, deal_id)
  UPDATE catch_alerts SET claimed_kg = claimed_kg + proposal.qty_kg
  UPDATE deals SET status='AGREED', agreed_qty_kg=…, agreed_price_per_kg=…, agreed_at=now(), order_id=newOrder.id
  UPDATE deal_proposals SET status='ACCEPTED', responded_by_id=caller, responded_at=now() WHERE id=proposalId
  DELETE FROM procurement_cart_items WHERE deal_id=:dealId

  -- Sweep other open deals on this alert
  remaining = alert.quantity_kg - alert.claimed_kg
  FOR each other deal on this alert in NEGOTIATING:
    IF remaining == 0:
      deal → CANCELLED (reason ALERT_SOLD_OUT); post system chat; publish DEAL_CLOSED
    ELSE IF its PENDING proposal qty_kg > remaining:
      proposal → SUPERSEDED (reason OVERCOMMIT); post system chat; publish PROPOSAL_SUPERSEDED
COMMIT

publish DEAL_AGREED to both participants (after-commit synchronization)
publish COMPETITOR_COUNT_CHANGED to all remaining vendors on this alert
```

### 6.2 Authorization rules

- **Accept** must be the counterparty: caller ≠ `proposal.proposed_by_id`.
- **Reject (proposal-scoped)** same as above.
- **Engage** and **Reject (deal-scoped)** are fisherman-only.
- **Cancel** can be either participant.

---

## 7. WebSocket Events

Reuses existing STOMP `/ws-chat` endpoint with JWT-from-cookie handshake. Three user queues are involved:

| Queue | Existing? | New event kinds |
|---|---|---|
| `/user/queue/messages` | yes | (extended) chat messages can carry `dealId` and `kind` ∈ `TEXT`/`SYSTEM`/`PROPOSAL` |
| `/user/queue/notifications` | yes | adds `DEAL_NEW_PROPOSAL`, `DEAL_AGREED` |
| `/user/queue/deals` | **new** | deal/proposal lifecycle events |

### 7.1 `/user/queue/deals` payloads

| Kind | Payload |
|---|---|
| `DEAL_STARTED` | `{ dealId, alertId, vendorId, fishermanId, openingProposal }` |
| `PROPOSAL_CREATED` | `{ dealId, proposalId, proposedById, qtyKg, pricePerKg, supersededProposalId? }` |
| `PROPOSAL_RESPONDED` | `{ dealId, proposalId, status, respondedById, reason? }` |
| `PROPOSAL_SUPERSEDED` | `{ dealId, proposalId, reason: NEW_PROPOSAL\|OVERCOMMIT }` |
| `DEAL_AGREED` | `{ dealId, orderId, agreedQtyKg, agreedPricePerKg }` |
| `DEAL_CLOSED` | `{ dealId, status: REJECTED\|CANCELLED\|EXPIRED, reason? }` |
| `COMPETITOR_COUNT_CHANGED` | `{ alertId, count }` (pushed to all vendors with an open deal on that alert) |

### 7.2 Publisher

```java
@Component
public class DealEventPublisher {
    void publishToParticipants(Deal deal, String kind, Object payload);
    void publishCompetitorCountChange(Long alertId);
}
```

Events fire **after** transaction commit via `TransactionSynchronizationManager.registerSynchronization` to guarantee the DB has the state the client will fetch.

### 7.3 Notification coalescing

In-memory map per app instance: `Map<DedupeKey, Instant>` where `DedupeKey = (recipientId, dealId, kind)`. If the last push under that key was < 30s ago, suppress the `/notifications` toast but still publish the `/deals` event (UI re-renders silently). Map TTL 60s; no Redis needed for v1.

### 7.4 Frontend subscriptions

A single `StompProvider` component mounted at app root subscribes to all three queues once per session. Incoming events update react-query caches:

- `/messages` → cache for `['deal', dealId, 'messages']`
- `/deals` → invalidate `['deal', dealId]` and `['deals', 'mine']`
- `/notifications` → existing bell

Per-deal panes read from cache and re-render reactively. Subscription count stays at 3 regardless of how many deals are open.

---

## 8. UI

### 8.1 Vendor `ProcurementFeed.jsx`

**Live feed tab.** Alert card actions become `[ Add to cart ][ Start deal ]`. `Start deal` adds the row to the cart at `availableKg`, then calls `POST /vendor/procurement/cart/items/{id}/deal` and navigates to `/messages` with the new thread auto-selected. A small `N others bidding` chip appears on cards where the vendor already has an open deal.

**Cart tab — status-aware list, no totals:**

| Cart row state | Right-side action |
|---|---|
| `DRAFT` (no `deal_id`) | `Start deal` |
| `NEGOTIATING` | `Open chat` + countdown to alert expiry |
| `AGREED` | (row removed; vendor sees order in My orders) |
| `REJECTED` / `CANCELLED` / `EXPIRED` | `Restart` (creates new deal) + delete |

The "Place procurement orders" footer and grand-total UI are removed.

### 8.2 Fisherman `ActiveDeals.jsx` (new page)

Added to fisherman side nav between Catch Alerts and Orders. Rows grouped by catch alert; within a group sort by `qty × price` desc:

```
CA-42 · Bangus · 30kg posted · 10kg remaining
  Rosario  · 20kg @ ₱240 · 2m ago  ⚠ overcommits      [ Accept ][ Reject ]
  Maritess · 10kg @ ₱260 · 6m ago                     [ Accept ][ Reject ]
  Luz      · 25kg @ ₱220 · 18m ago ⚠ overcommits      [ Accept ][ Reject ]
```

**Row actions (fisherman-only triage):**

- **Accept** → `POST /deals/{id}/engage`, then navigates to the chat. No price lock.
- **Reject** → `POST /deals/{id}/reject` → deal `REJECTED` terminal. Row disappears.

The `⚠ overcommits` badge is computed client-side from the alert's current `available_kg`. It is informational only — Accept still opens the chat where the qty can be renegotiated.

### 8.3 `Messages.jsx` extended

**Left rail** gains an "Active deals" section above existing "Direct messages." Each row: counterparty name + alert code + latest proposal preview + unread dot.

**Conversation pane** for a deal:

- **Top context bar:** alert code, species, posted kg, remaining kg, counterparty name, competitor count, `View alert`, `Cancel deal` (both parties).
- **Chat scroll** with three message kinds:
  - **TEXT** — normal chat bubbles.
  - **SYSTEM** — italic centered notes ("Only 10kg remaining — please counter-propose," "Deal agreed at 20kg @ ₱240," etc.).
  - **PROPOSAL** — bordered card showing qty + price + proposer + timestamp. Counterparty sees `[ Accept ][ Reject ][ Counter ]`. Proposer sees `awaiting response…`.
- **Composer** with two tabs `[ 💬 Chat │ 💼 Propose ]`:
  - Chat tab: text input + Send.
  - Propose tab: two integer inputs (Qty kg, Price ₱/kg), both required, Send proposal.
  - `Counter` on a proposal card switches to the Propose tab pre-filled with the prior values.

Once a proposal is accepted, the composer disables, and a final system message appears: `✅ Deal agreed at Xkg @ ₱Y. Order O-… created.` (linked).

### 8.4 Bell notifications

`NotificationsBell` adds two notification kinds:

- `DEAL_NEW_PROPOSAL` → "Rosario proposed 20kg @ ₱240 on CA-42." Click → opens the deal chat.
- `DEAL_AGREED` → "Order placed: 20kg @ ₱240 with Rosario." Click → opens the order detail.

30s coalescing applies to `DEAL_NEW_PROPOSAL` only (the only spammy event).

### 8.5 Onboarding hint

On the first deal a user ever opens, a small one-time row appears in the chat:
> 💡 To make an offer, tap **💼 Propose**.

Dismiss state stored per-user in `user_preferences` (existing table; reuse).

---

## 9. Migrations and Rollout

### 9.1 Flyway migrations

| # | File | Contents |
|---|---|---|
| V50 | `V50__create_deals.sql` | `deals` + `deal_proposals` tables, partial unique indexes, FKs |
| V51 | `V51__messages_deal_id.sql` | `messages.deal_id` column + index |
| V52 | `V52__procurement_cart_deal_link.sql` | `procurement_cart_items.deal_id` column |
| V53 | `V53__backfill_catch_alert_prices.sql` | For each `catch_alerts.asking_price_per_kg IS NULL`: set to species' BFAR reference price; if no reference, set to 0 and emit a row in `admin_audit_log` |
| V54 | `V54__backfill_catch_log_required_fields.sql` | Set `estimated_price_per_kg = 0` where null; then `ALTER COLUMN ... SET NOT NULL` on `quantity_kg` and `estimated_price_per_kg`. **Notes column untouched and remains nullable.** |
| V55 | `V55__orders_deal_id.sql` | `orders.deal_id` column + index |

### 9.2 OpenAPI spec changes

- Add all `/deals/*` paths and the `POST /vendor/procurement/cart/items/{itemId}/deal` endpoint.
- Add schemas: `DealDto`, `DealSummary`, `DealProposalDto`, `CreateProposalRequest`, `RejectProposalRequest`, `CancelDealRequest`, `CompetitorCountDto`, `EngageDealResponse`.
- `CatchLogCreateRequest`: mark `quantityKg`, `estimatedPricePerKg` as `required`. `notes` stays optional and nullable.
- `CatchAlert.askingPricePerKg`: drop `nullable: true`.
- Delete `POST /vendor/procurement/checkout` from the spec.
- `ProcurementCartItemDto`: add `dealId`, `dealStatus`, `latestProposal` (all nullable).

### 9.3 Rollout phases

**Phase 1 — Data foundation:** V50–V55 migrations; `Deal`, `DealProposal` entities + repos; `DealService` with all methods + sweep + scheduled expiry; new endpoints exposed but unused by UI. Cart and orders untouched.

**Phase 2 — Vendor side:** `ProcurementFeed.jsx` adopts `Start deal`; cart row gets status-aware actions; `POST /checkout` calls removed from frontend; catch-log form requires species/qty/price (notes optional).

**Phase 3 — Fisherman side + chat:** new `ActiveDeals.jsx`; `Messages.jsx` extended with deal pane + composer tabs + proposal cards; bell gains `DEAL_NEW_PROPOSAL` and `DEAL_AGREED`.

**Phase 4 — Polish:** competitor-count nudge, 30s coalescing, onboarding hint, "looks like an offer" inline tip.

Each phase is its own PR; the system is functional after Phase 2 (vendor starts deals, fisherman responds via existing Messages) but the full UX needs Phase 3.

### 9.4 Code removal

- `ProcurementCartService.checkoutAll` — delete.
- `VendorProcurementController.checkoutProcurementCart` — delete.
- Frontend: `checkoutMut`, "Place procurement orders" footer, grand-total UI in `ProcurementFeed.jsx`; `checkout()` and `orderNow()` helpers in `procurement.js`.
- Tests covering the old checkout flow — delete.

---

## 10. Edge Cases

| Case | Handling |
|---|---|
| Two parties submit proposals at the same instant | `submitProposal` is transactional; the `uq_deal_proposals_pending` partial unique index serializes. Loser retries after refetching latest. |
| Two parties Accept different pending proposals at the same instant | Catch-alert `FOR UPDATE` lock serializes accepts. Winner commits; loser sees deal already `AGREED` and returns 409 with the actual agreed values. |
| Vendor cancels while fisherman is mid-Accept | Both transactions lock the deal row at start; first to commit wins; loser gets 409. |
| Cart row deleted while deal is NEGOTIATING | Cart DELETE cascades to `DealService.cancelDeal(deal_id, "CART_REMOVED")`. Both sides see `DEAL_CLOSED`. |
| Alert reaches `expires_at` mid-deal | `@Scheduled(fixedDelay=60_000)` `sweepExpired` transitions deals where `now > expires_at` to `EXPIRED`. Idempotent. |
| Order from an AGREED deal is cancelled later | Existing `cancelOrder` decrements `claimed_kg`. The deal stays `AGREED` for history. Vendor must start a fresh deal to re-buy — conscious decision to keep a clean audit trail. |
| Dispute after handoff | Existing `/orders/{id}/dispute` flow opens; frontend dispute UI links back to the deal chat via `order.deal_id`. The chat composer re-enables for dispute talk. |
| Vendor opens two cart rows for same alert | Existing `uq_procurement_cart_vendor_alert` blocks it. No change. |
| Alert `quantity_kg` null (legacy) | Backfill in V53 does not touch quantity. If null, Start deal returns 400. Won't happen for new alerts (form requires kg). |
| Proposal qty > current available at submit time | Allowed. Negotiation can include "I want more if you have it." Only Accept enforces feasibility. |
| Overcommit at Accept time | Proposal → SUPERSEDED with reason OVERCOMMIT; deal stays open; chat note pushed. Fisherman can counter. |
| WebSocket disconnect during negotiation | `/ws-chat` already auto-reconnects. On reconnect, client refetches `GET /deals/{id}`. WS events are notifications, not the source of truth. |
| User changes role | Authorization compares JWT subject to deal participant IDs. Role mismatch → 403. |
| Notes field empty on legacy catch logs | Renders as `—`. No DB change needed (notes already nullable). |

---

## 11. Tests

### 11.1 Backend (`./mvnw test`)

- `DealServiceTest` — every state transition; sweep with multiple parallel deals; expiry sweep; idempotency.
- `DealControllerTest` (`@WebMvcTest`) — auth 403 for non-participant; happy-path Accept → order; overcommit → 409; fisherman Reject closes deal.
- `ProcurementCartServiceTest` — verifies removed `checkoutAll`; retained add/update/remove.
- `MigrationSmokeTest` — Flyway V50–V55 on a fresh container; constraints exist; legacy-data fixture survives the backfill.
- **Concurrency integration test** — two threads racing `acceptProposal` on the same alert; assert exactly one order, `claimed_kg` matches the winner. Most critical test in the feature.

### 11.2 Frontend (`npm test` — Vitest + RTL)

- `Trips.AddCatchModal.test.jsx` — submit disabled until species + quantity + price are present; notes optional.
- `ProcurementFeed.test.jsx` — `Start deal` calls correct mutation; cart row renders correct action per `dealStatus`; competitor-count chip renders when count > 0.
- `ActiveDeals.test.jsx` — rows grouped by alert; Accept/Reject hit correct endpoints; overcommit badge when proposal qty > available; Reject removes row.
- `DealChat.test.jsx` — proposal card shows Accept/Reject only to counterparty; Counter pre-fills composer; structured proposal renders distinctly from text; `💬`/`💼` tab swap works.
- `Messages.test.jsx` — left-rail "Active deals" section renders; clicking opens the right pane.

**No Playwright in scope for v1.** Component tests cover interaction; backend concurrency test covers the only race that matters.

---

## 12. Observability

- `DealService` logs every transition at INFO: `deal {id} {old}->{new} by user {uid}`.
- Metrics: `deals_created_total{role}`, `deals_terminal_total{status}`, `deal_accept_latency_ms` histogram.
- Future admin "Deal audit" view (out of scope for v1) lists deal + proposal history for any order ID — useful for dispute support.

---

## 13. Out of Scope (YAGNI for v1)

- Group deals (one chat with multiple vendors)
- Time-boxed auctions
- Saved deal templates
- Soft inventory reservation on Start deal
- Admin override of deal terms
- Tagalog/English toggle on proposal cards (the cards are just numbers)
- NLP parsing of free chat for offers

These are easy to bolt on if real usage demands them.

---

## 14. Open Questions

None at the time of writing. All decisions in §3 are confirmed by the user during brainstorming.
