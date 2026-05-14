# Deals Negotiation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace asking-price-up-front procurement with a chat-based negotiation system where vendors and fishermen lock prices via structured propose-and-accept messages, and orders are created at the moment of acceptance.

**Architecture:** A new `Deal` domain object anchors a 1:1 negotiation between a vendor and a fisherman on a single catch alert. Either party submits `DealProposal` rows `{qty, price}`; the counterparty accepts inside a row-locked transaction that creates the order and sweeps other vendors' overcommitted proposals on the same alert. WebSocket events on three STOMP user queues drive real-time UI updates.

**Tech Stack:** Spring Boot 3 + Spring Security OAuth2 resource server + Spring Data JPA + Flyway + PostgreSQL + STOMP over WebSocket (existing `/ws-chat`). React 19 + Vite + react-query + `@stomp/stompjs` + Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-15-deals-negotiation-design.md` is the source of truth for the model — refer back when in doubt.

---

## File Structure

### Backend — new files

```
backend/src/main/resources/db/migration/
  V50__create_deals.sql
  V51__messages_deal_id.sql
  V52__procurement_cart_deal_link.sql
  V53__backfill_catch_alert_prices.sql
  V54__backfill_catch_log_required_fields.sql
  V55__orders_deal_id.sql

backend/src/main/java/com/mermaid/app/
  domain/Deal.java
  domain/DealProposal.java
  domain/DealStatus.java
  domain/ProposalStatus.java
  repository/DealRepository.java
  repository/DealProposalRepository.java
  service/DealService.java
  service/DealEventPublisher.java
  service/DealExpirySweeper.java          @Scheduled
  controller/DealController.java
  mapper/DealMapper.java
  exception/DealConflictException.java    → maps to 409

backend/src/test/java/com/mermaid/app/
  service/DealServiceTest.java
  service/DealServiceConcurrencyTest.java  Spring-loaded, real Postgres or H2 row lock
  controller/DealControllerTest.java
  service/DealExpirySweeperTest.java
```

### Backend — modified files

```
backend/src/main/resources/openapi/api.yaml
backend/src/main/java/com/mermaid/app/controller/VendorProcurementController.java
backend/src/main/java/com/mermaid/app/service/ProcurementCartService.java
backend/src/main/java/com/mermaid/app/service/ProcurementOrderService.java
backend/src/main/java/com/mermaid/app/domain/Message.java   add dealId field
backend/src/main/java/com/mermaid/app/domain/ProcurementCartItem.java   add deal FK
backend/src/main/java/com/mermaid/app/domain/Order.java   add dealId field
backend/src/main/java/com/mermaid/app/controller/ChatController.java   carry dealId
backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java
```

### Frontend — new files

```
frontend/src/
  vendor/api/deals.js
  fisherman/api/deals.js
  api/stomp.js                 single shared STOMP provider
  context/StompContext.jsx
  fisherman/ActiveDeals.jsx
  components/DealChatPane.jsx
  components/ProposalCard.jsx
  components/DealComposer.jsx  two-tab composer

  vendor/__tests__/ProcurementFeed.test.jsx
  fisherman/__tests__/ActiveDeals.test.jsx
  fisherman/__tests__/AddCatchModal.test.jsx
  components/__tests__/DealChatPane.test.jsx
  components/__tests__/DealComposer.test.jsx
```

### Frontend — modified files

```
frontend/src/vendor/ProcurementFeed.jsx
frontend/src/fisherman/Trips.jsx                AddCatchModal validation
frontend/src/buyer/Messages.jsx + fisherman/Messages.jsx + vendor/Messages.jsx
                                                 (left-rail deal section)
frontend/src/fisherman/FishermanLayout.jsx      add Deals nav entry
frontend/src/vendor/VendorLayout.jsx            wire StompProvider
frontend/src/fisherman/FishermanLayout.jsx      wire StompProvider
frontend/src/vendor/api/procurement.js          drop checkout(), orderNow()
frontend/src/App.jsx                            new routes /fisherman/deals
frontend/src/api/lookup.js                      no change but referenced
```

---

## Conventions

- **Tests first**, then minimal implementation, then refactor.
- Every task ends in a commit. Commit messages follow the existing convention: `feat(deals):`, `fix(deals):`, `refactor(...):`, `test(deals):`.
- Backend command: `./mvnw test -Dtest=<ClassName>` for one class; `./mvnw test` for all.
- Frontend command: `npm test -- <pattern>` from `frontend/`.
- All controller tests must `@MockitoBean JwtDecoder jwtDecoder` per existing `CLAUDE.md` guidance.
- All writes go through `@Transactional` services. Controllers stay thin.
- Soft-delete pattern is unused here — Deals use explicit terminal statuses.
- When in doubt about a Spring or schema detail, grep existing code for the closest example (`AdminUserService`, `CartService`, `ChatController`).

---

## Phase 1 — Backend Foundation

### Task 1: Database migrations

**Files:**
- Create: `backend/src/main/resources/db/migration/V50__create_deals.sql`
- Create: `backend/src/main/resources/db/migration/V51__messages_deal_id.sql`
- Create: `backend/src/main/resources/db/migration/V52__procurement_cart_deal_link.sql`
- Create: `backend/src/main/resources/db/migration/V53__backfill_catch_alert_prices.sql`
- Create: `backend/src/main/resources/db/migration/V54__backfill_catch_log_required_fields.sql`
- Create: `backend/src/main/resources/db/migration/V55__orders_deal_id.sql`

- [ ] **Step 1: Write V50** — `deals` and `deal_proposals` tables exactly as in spec §4.1.

- [ ] **Step 2: Write V51** — `ALTER TABLE messages ADD COLUMN deal_id BIGINT REFERENCES deals(id); CREATE INDEX idx_messages_deal ON messages (deal_id);`

- [ ] **Step 3: Write V52** — `ALTER TABLE procurement_cart_items ADD COLUMN deal_id BIGINT REFERENCES deals(id);`

- [ ] **Step 4: Write V53 backfill** — for each `catch_alerts.asking_price_per_kg IS NULL`, set to species' BFAR reference price (`bfar_reference_prices.price_per_kg`) joined by `species_id`; fallback to 0 when no reference. Wrap in a single `UPDATE … FROM` statement; no NOT NULL constraint yet (alerts may still be created without it until OpenAPI spec change ships).

- [ ] **Step 5: Write V54** — `UPDATE catch_logs SET estimated_price_per_kg = 0 WHERE estimated_price_per_kg IS NULL; ALTER TABLE catch_logs ALTER COLUMN quantity_kg SET NOT NULL; ALTER TABLE catch_logs ALTER COLUMN estimated_price_per_kg SET NOT NULL;`. Do NOT touch `notes`.

- [ ] **Step 6: Write V55** — `ALTER TABLE orders ADD COLUMN deal_id BIGINT REFERENCES deals(id); CREATE INDEX idx_orders_deal ON orders (deal_id);`

- [ ] **Step 7: Run** `./mvnw spring-boot:run` against a dev database; assert clean migration with no errors. Connect via psql and verify constraints (`\d deals`, `\d deal_proposals`).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V5{0,1,2,3,4,5}__*.sql
git commit -m "feat(deals): add deals + deal_proposals schema and backfills"
```

---

### Task 2: Domain entities

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/Deal.java`
- Create: `backend/src/main/java/com/mermaid/app/domain/DealProposal.java`
- Create: `backend/src/main/java/com/mermaid/app/domain/DealStatus.java`
- Create: `backend/src/main/java/com/mermaid/app/domain/ProposalStatus.java`
- Modify: `backend/src/main/java/com/mermaid/app/domain/Message.java` — add nullable `Deal deal` ManyToOne
- Modify: `backend/src/main/java/com/mermaid/app/domain/ProcurementCartItem.java` — add nullable `Deal deal`
- Modify: `backend/src/main/java/com/mermaid/app/domain/Order.java` — add nullable `Deal deal`

- [ ] **Step 1: Create the two enums.** Single-file each:

```java
package com.mermaid.app.domain;
public enum DealStatus { NEGOTIATING, AGREED, REJECTED, EXPIRED, CANCELLED }
```

```java
package com.mermaid.app.domain;
public enum ProposalStatus { PENDING, ACCEPTED, REJECTED, SUPERSEDED }
```

- [ ] **Step 2: Create `Deal.java`** — annotate `@Entity @Table(name = "deals")`. Fields: `id` (auto), `catchAlert` (ManyToOne lazy), `vendorId`, `fishermanId`, `status` (`@Enumerated(EnumType.STRING)`), `agreedQtyKg` (BigDecimal nullable), `agreedPricePerKg`, `agreedAt` (OffsetDateTime), `orderId` (Long nullable, no FK relation), `fishermanEngagedAt`, `expiresAt`, `closedAt`, `createdAt`. Getters/setters; no JPA lifecycle callbacks needed since timestamps come from app code.

- [ ] **Step 3: Create `DealProposal.java`** — `@Entity @Table(name = "deal_proposals")`. Fields: `id`, `deal` (ManyToOne lazy, `nullable=false`), `proposedById`, `qtyKg`, `pricePerKg`, `status`, `supersededReason` (String nullable), `respondedById`, `respondedAt`, `createdAt`.

- [ ] **Step 4: Modify `Message.java`** — add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "deal_id") private Deal deal;` and getter/setter. Existing rows keep `null`.

- [ ] **Step 5: Modify `ProcurementCartItem.java`** — add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "deal_id") private Deal deal;`.

- [ ] **Step 6: Modify `Order.java`** — add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "deal_id") private Deal deal;`.

- [ ] **Step 7: Compile** — `./mvnw compile`. Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/
git commit -m "feat(deals): add Deal/DealProposal entities and FK links"
```

---

### Task 3: Repositories

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/repository/DealRepository.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/DealProposalRepository.java`

- [ ] **Step 1: `DealRepository`** extends `JpaRepository<Deal, Long>`. Methods:

```java
List<Deal> findByVendorIdAndStatus(Long vendorId, DealStatus status);
List<Deal> findByFishermanIdAndStatus(Long fishermanId, DealStatus status);
List<Deal> findByCatchAlertIdAndStatus(Long alertId, DealStatus status);

Optional<Deal> findByVendorIdAndCatchAlertIdAndStatus(
    Long vendorId, Long alertId, DealStatus status);

// Concurrency-critical: fetch with pessimistic lock
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select d from Deal d where d.id = :id")
Optional<Deal> findByIdForUpdate(@Param("id") Long id);

@Query("select d from Deal d where d.status = 'NEGOTIATING' and d.expiresAt < :now")
List<Deal> findExpired(@Param("now") OffsetDateTime now);

@Query("select count(d) from Deal d where d.catchAlert.id = :alertId " +
       "and d.status = 'NEGOTIATING' and d.vendorId <> :excludeVendorId")
int countOpenDealsOnAlertExcludingVendor(
    @Param("alertId") Long alertId,
    @Param("excludeVendorId") Long vendorId);
```

- [ ] **Step 2: `DealProposalRepository`** extends `JpaRepository<DealProposal, Long>`:

```java
Optional<DealProposal> findFirstByDealIdAndStatus(Long dealId, ProposalStatus status);
List<DealProposal> findByDealIdOrderByCreatedAtAsc(Long dealId);
```

- [ ] **Step 3: Compile + commit.**

```bash
git add backend/src/main/java/com/mermaid/app/repository/Deal*.java
git commit -m "feat(deals): add Deal/DealProposal repositories"
```

---

### Task 4: OpenAPI spec changes

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Remove `POST /vendor/procurement/checkout`** path entirely.

- [ ] **Step 2: Add the new paths** under appropriate tags (`Deals`, `Vendor Procurement`):
  - `POST /vendor/procurement/cart/items/{itemId}/deal`
  - `GET /deals/mine` (`?status=`)
  - `GET /deals/{id}`
  - `GET /deals/{id}/messages` (paginated)
  - `POST /deals/{id}/proposals`
  - `POST /deals/{id}/proposals/{proposalId}/accept`
  - `POST /deals/{id}/proposals/{proposalId}/reject`
  - `POST /deals/{id}/engage`
  - `POST /deals/{id}/reject`
  - `POST /deals/{id}/cancel`
  - `GET /fisherman/alerts/{alertId}/deals`
  - `GET /deals/{id}/competitor-count`

- [ ] **Step 3: Add the schemas** — `DealDto`, `DealSummary`, `DealProposalDto`, `CreateProposalRequest`, `RejectProposalRequest`, `CancelDealRequest`, `CompetitorCountDto`, `EngageDealResponse`. See spec §6 for field shapes.

- [ ] **Step 4: Mark `CatchLogCreateRequest.quantityKg` and `.estimatedPricePerKg` as `required`** (in the `required:` array). Leave `notes` optional and nullable.

- [ ] **Step 5: Drop `nullable: true`** from `CatchAlert.askingPricePerKg`.

- [ ] **Step 6: Extend `ProcurementCartItemDto`** with: `dealId` (nullable long), `dealStatus` (nullable enum mirroring `DealStatus`), `latestProposal` (nullable `DealProposalDto`).

- [ ] **Step 7: Run** `./mvnw clean compile` — confirms generated interfaces compile. Expect generated method signatures like `DealsApi.acceptDealProposal(...)`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(deals): extend OpenAPI with /deals endpoints and remove checkout"
```

---

### Task 5: DealEventPublisher

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/DealEventPublisher.java`

This is the WebSocket fanout helper. Implement first so `DealService` can call it.

- [ ] **Step 1: Write skeleton** with `SimpMessagingTemplate`:

```java
@Component
public class DealEventPublisher {
    private final SimpMessagingTemplate ws;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final Map<String, Instant> notifyDedupe = new ConcurrentHashMap<>();
    private static final Duration COALESCE_WINDOW = Duration.ofSeconds(30);

    public DealEventPublisher(SimpMessagingTemplate ws, DealRepository dealRepo,
                              UserRepository userRepo) { ... }

    public void publishDealEvent(Deal deal, String kind, Object payload) {
        for (Long uid : List.of(deal.getVendorId(), deal.getFishermanId())) {
            ws.convertAndSendToUser(uid.toString(), "/queue/deals",
                Map.of("kind", kind, "dealId", deal.getId(), "payload", payload));
        }
    }

    public void publishProposalNotification(Long recipientId, Long dealId, String kind, String text) {
        String key = recipientId + ":" + dealId + ":" + kind;
        Instant now = Instant.now();
        Instant last = notifyDedupe.get(key);
        if (last == null || Duration.between(last, now).compareTo(COALESCE_WINDOW) > 0) {
            ws.convertAndSendToUser(recipientId.toString(), "/queue/notifications",
                Map.of("kind", kind, "dealId", dealId, "text", text));
            notifyDedupe.put(key, now);
        }
    }

    public void publishCompetitorCountChange(Long alertId) {
        // For every NEGOTIATING deal on this alert, push the new competitor count to its vendor.
        var open = dealRepo.findByCatchAlertIdAndStatus(alertId, DealStatus.NEGOTIATING);
        for (Deal d : open) {
            int count = dealRepo.countOpenDealsOnAlertExcludingVendor(alertId, d.getVendorId());
            ws.convertAndSendToUser(d.getVendorId().toString(), "/queue/deals",
                Map.of("kind", "COMPETITOR_COUNT_CHANGED",
                       "payload", Map.of("alertId", alertId, "count", count)));
        }
    }
}
```

- [ ] **Step 2: All public methods must be called AFTER transaction commit.** Add helper `runAfterCommit(Runnable)`:

```java
public void runAfterCommit(Runnable r) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override public void afterCommit() { r.run(); }
            });
    } else {
        r.run();
    }
}
```

- [ ] **Step 3: Unit test** with `@MockBean SimpMessagingTemplate` confirming that `publishDealEvent` sends to both participants and that the coalescing window suppresses a second push within 30s. Save to `DealEventPublisherTest.java`.

- [ ] **Step 4: Run** `./mvnw test -Dtest=DealEventPublisherTest`. Expected: 3+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/DealEventPublisher.java
git add backend/src/test/java/com/mermaid/app/service/DealEventPublisherTest.java
git commit -m "feat(deals): add WebSocket event publisher with coalescing"
```

---

### Task 6: DealService — start, propose, reject single, cancel

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/DealService.java`
- Create: `backend/src/test/java/com/mermaid/app/service/DealServiceTest.java`
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java` — handle new exception
- Create: `backend/src/main/java/com/mermaid/app/exception/DealConflictException.java` — maps to 409

TDD this method-by-method. Sample test pattern:

- [ ] **Step 1: Write failing test for `startFromCartItem`:**

```java
@Test
void startFromCartItem_createsDealAndOpeningProposal() {
    // given: a cart item with qty 20 on an alert with asking price 250
    ProcurementCartItem cart = givenCartItem(/*vendor*/V, /*alert*/A_with_price_250, /*qty*/20);

    // when
    Deal d = dealService.startFromCartItem(V.getId(), cart.getId());

    // then
    assertThat(d.getStatus()).isEqualTo(DealStatus.NEGOTIATING);
    assertThat(d.getVendorId()).isEqualTo(V.getId());

    DealProposal opening = proposalRepo.findFirstByDealIdAndStatus(d.getId(), ProposalStatus.PENDING).orElseThrow();
    assertThat(opening.getQtyKg()).isEqualByComparingTo(BigDecimal.valueOf(20));
    assertThat(opening.getPricePerKg()).isEqualByComparingTo(BigDecimal.valueOf(250));
    assertThat(opening.getProposedById()).isEqualTo(V.getId());

    // system chat message inserted
    var msgs = messageRepo.findByDealIdOrderBySentAt(d.getId());
    assertThat(msgs).anyMatch(m -> m.getKind().equals("SYSTEM"));

    // cart item linked
    assertThat(cartRepo.findById(cart.getId()).orElseThrow().getDeal().getId()).isEqualTo(d.getId());
}
```

- [ ] **Step 2: Implement `startFromCartItem`.** Validations: cart belongs to vendor (else 403 via Spring Security earlier — fine), alert is ACTIVE and not expired, asking price not null, no existing NEGOTIATING deal for (vendor, alert). Returns `Deal`. Publish `DEAL_STARTED` and `COMPETITOR_COUNT_CHANGED` after commit.

- [ ] **Step 3: Write tests + impl for `submitProposal`** — handles superseding prior PENDING (idempotent on race via partial unique index → retry once), inserts new proposal, inserts structured chat message of `kind=PROPOSAL`, publishes `PROPOSAL_CREATED` + notification (coalesced).

- [ ] **Step 4: Write tests + impl for `rejectProposal`** — counterparty-only (else `DealConflictException`); marks proposal REJECTED; deal stays NEGOTIATING; system chat note; publish `PROPOSAL_RESPONDED`.

- [ ] **Step 5: Write tests + impl for `cancelDeal`** — participant-only; transitions deal CANCELLED; supersedes any pending proposal; publish `DEAL_CLOSED`; publish competitor-count change.

- [ ] **Step 6: Write tests + impl for `rejectDeal` (fisherman row-level)** — fisherman-only; deal `REJECTED` terminal; publish `DEAL_CLOSED`.

- [ ] **Step 7: Write tests + impl for `engageDeal`** — fisherman-only; sets `fishermanEngagedAt = now`; idempotent.

- [ ] **Step 8: `DealConflictException`** — `extends RuntimeException`. Register in `GlobalExceptionHandler`:

```java
@ExceptionHandler(DealConflictException.class)
public ResponseEntity<Map<String, String>> handle(DealConflictException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
}
```

- [ ] **Step 9: Run** `./mvnw test -Dtest=DealServiceTest`. Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/DealService.java \
        backend/src/main/java/com/mermaid/app/exception/DealConflictException.java \
        backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java \
        backend/src/test/java/com/mermaid/app/service/DealServiceTest.java
git commit -m "feat(deals): start/propose/reject/cancel/engage deal flows"
```

---

### Task 7: DealService — acceptProposal (the critical transaction)

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/DealService.java`
- Modify: `backend/src/main/java/com/mermaid/app/service/ProcurementOrderService.java` — extract `createFromAgreement`
- Modify: `backend/src/test/java/com/mermaid/app/service/DealServiceTest.java`

- [ ] **Step 1: Extract `createFromAgreement` from `ProcurementOrderService.checkout`:**

```java
@Transactional
public Order createFromAgreement(Deal deal, DealProposal proposal) {
    CatchAlert alert = alertRepo.findByIdForUpdate(deal.getCatchAlert().getId())
        .orElseThrow(() -> new ResourceNotFoundException("Alert gone"));
    if (!"ACTIVE".equals(alert.getStatus()) || alert.getExpiresAt().isBefore(OffsetDateTime.now())) {
        throw new ListingClosedException("Alert " + alert.getId() + " no longer available");
    }
    BigDecimal newClaimed = alert.getClaimedKg().add(proposal.getQtyKg());
    if (alert.getQuantityKg() != null && newClaimed.compareTo(alert.getQuantityKg()) > 0) {
        throw new ListingClosedException("Only " + alert.getQuantityKg().subtract(alert.getClaimedKg()) + "kg remaining");
    }
    alert.setClaimedKg(newClaimed);
    if (alert.getQuantityKg() != null && newClaimed.compareTo(alert.getQuantityKg()) == 0) {
        alert.setStatus("SOLD");
    }
    alertRepo.save(alert);

    Order order = new Order();
    order.setKind(OrderKind.RETAIL);
    order.setBuyerId(deal.getVendorId());
    order.setSellerId(deal.getFishermanId());
    order.setSpecies(alert.getSpecies());
    order.setCatchAlertId(alert.getId());
    order.setDeal(deal);                              // link order back to deal
    order.setOrderedQtyKg(proposal.getQtyKg());
    order.setAgreedPricePerKg(proposal.getPricePerKg());
    order.setStatus("PENDING");
    Order saved = orderRepo.save(order);
    recordEvent(saved.getId(), "PENDING", deal.getVendorId(), "Order placed via deal " + deal.getId(),
                deal.getVendorId(), deal.getFishermanId());
    return saved;
}
```

- [ ] **Step 2: Delete the old `checkout()` body and its REST endpoint** in `VendorProcurementController` + remove from OpenAPI (already done in Task 4). Leave the cart repository methods intact.

- [ ] **Step 3: Write the acceptProposal test for the happy path:**

```java
@Test
void acceptProposal_createsOrderAndAgreesDeal() {
    // given: deal with pending proposal {15kg, ₱240}
    Deal d = givenNegotiatingDeal();
    DealProposal p = givenPendingProposal(d, /*by*/d.getVendorId(), 15, 240);

    // when fisherman accepts
    var result = dealService.acceptProposal(d.getFishermanId(), d.getId(), p.getId());

    // then
    assertThat(result.deal().getStatus()).isEqualTo(DealStatus.AGREED);
    assertThat(result.deal().getAgreedQtyKg()).isEqualByComparingTo(BigDecimal.valueOf(15));
    assertThat(result.deal().getOrderId()).isNotNull();
    assertThat(result.order().getStatus()).isEqualTo("PENDING");

    // cart row deleted
    assertThat(cartRepo.findByVendorIdAndCatchAlertId(d.getVendorId(),
               d.getCatchAlert().getId())).isEmpty();
}
```

- [ ] **Step 4: Write tests for sweep behavior:**
  - When Accept reduces available to N, other vendors' pending proposals with qty > N become SUPERSEDED with reason OVERCOMMIT.
  - When Accept brings available to 0, all other NEGOTIATING deals → CANCELLED with reason `ALERT_SOLD_OUT`.
  - Feasible deals stay untouched.

- [ ] **Step 5: Write test for self-accept rejection** — caller == `proposal.proposedById` → throws `DealConflictException`.

- [ ] **Step 6: Write test for accept on terminal deal** → 409.

- [ ] **Step 7: Implement `acceptProposal`:**

```java
@Transactional
public AcceptResult acceptProposal(Long callerUserId, Long dealId, Long proposalId) {
    Deal deal = dealRepo.findByIdForUpdate(dealId)
        .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
    if (deal.getStatus() != DealStatus.NEGOTIATING)
        throw new DealConflictException("Deal already " + deal.getStatus());
    if (!deal.getVendorId().equals(callerUserId) && !deal.getFishermanId().equals(callerUserId))
        throw new AccessDeniedException("Not a participant");

    DealProposal proposal = proposalRepo.findById(proposalId)
        .orElseThrow(() -> new ResourceNotFoundException("Proposal"));
    if (!proposal.getDeal().getId().equals(dealId)) throw new ResourceNotFoundException("Mismatch");
    if (proposal.getStatus() != ProposalStatus.PENDING)
        throw new DealConflictException("Proposal already " + proposal.getStatus());
    if (proposal.getProposedById().equals(callerUserId))
        throw new DealConflictException("Cannot accept your own proposal");

    Order order = procurementOrderService.createFromAgreement(deal, proposal);

    deal.setStatus(DealStatus.AGREED);
    deal.setAgreedQtyKg(proposal.getQtyKg());
    deal.setAgreedPricePerKg(proposal.getPricePerKg());
    deal.setAgreedAt(OffsetDateTime.now());
    deal.setOrderId(order.getId());
    deal.setClosedAt(OffsetDateTime.now());

    proposal.setStatus(ProposalStatus.ACCEPTED);
    proposal.setRespondedById(callerUserId);
    proposal.setRespondedAt(OffsetDateTime.now());

    cartRepo.deleteByDealId(dealId);
    insertSystemMessage(deal, "Deal agreed at " + proposal.getQtyKg() + "kg @ ₱" + proposal.getPricePerKg()
                              + ". Order O-" + order.getId() + " created.");

    sweepOtherDealsOnAlert(deal.getCatchAlert(), deal.getId());

    final Long alertId = deal.getCatchAlert().getId();
    eventPublisher.runAfterCommit(() -> {
        eventPublisher.publishDealEvent(deal, "DEAL_AGREED",
            Map.of("orderId", order.getId(),
                   "agreedQtyKg", proposal.getQtyKg(),
                   "agreedPricePerKg", proposal.getPricePerKg()));
        eventPublisher.publishCompetitorCountChange(alertId);
        eventPublisher.publishProposalNotification(
            proposal.getProposedById(), dealId, "DEAL_AGREED",
            "Order placed at " + proposal.getQtyKg() + "kg @ ₱" + proposal.getPricePerKg());
    });

    return new AcceptResult(deal, order);
}

private void sweepOtherDealsOnAlert(CatchAlert alert, Long excludeDealId) {
    BigDecimal remaining = alert.getQuantityKg().subtract(alert.getClaimedKg());
    List<Deal> others = dealRepo.findByCatchAlertIdAndStatus(alert.getId(), DealStatus.NEGOTIATING)
                                .stream().filter(d -> !d.getId().equals(excludeDealId)).toList();
    for (Deal other : others) {
        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            other.setStatus(DealStatus.CANCELLED);
            other.setClosedAt(OffsetDateTime.now());
            insertSystemMessage(other, "This catch is fully sold. Deal closed.");
            // pending proposal becomes SUPERSEDED via cancelDeal-internal helper
            supersedeAnyPending(other, "ALERT_SOLD_OUT");
            eventPublisher.runAfterCommit(() ->
                eventPublisher.publishDealEvent(other, "DEAL_CLOSED",
                    Map.of("status", "CANCELLED", "reason", "ALERT_SOLD_OUT")));
        } else {
            var pending = proposalRepo.findFirstByDealIdAndStatus(other.getId(), ProposalStatus.PENDING);
            if (pending.isPresent() && pending.get().getQtyKg().compareTo(remaining) > 0) {
                pending.get().setStatus(ProposalStatus.SUPERSEDED);
                pending.get().setSupersededReason("OVERCOMMIT");
                insertSystemMessage(other, "Only " + remaining + "kg remaining — please counter-propose.");
                eventPublisher.runAfterCommit(() ->
                    eventPublisher.publishDealEvent(other, "PROPOSAL_SUPERSEDED",
                        Map.of("proposalId", pending.get().getId(), "reason", "OVERCOMMIT")));
            }
        }
    }
}
```

- [ ] **Step 8: Run** `./mvnw test -Dtest=DealServiceTest`. All previous tests + new sweep tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/DealService.java \
        backend/src/main/java/com/mermaid/app/service/ProcurementOrderService.java \
        backend/src/main/java/com/mermaid/app/controller/VendorProcurementController.java \
        backend/src/test/java/com/mermaid/app/service/DealServiceTest.java
git commit -m "feat(deals): acceptProposal with row-locked sweep and order creation"
```

---

### Task 8: Concurrency test

**Files:**
- Create: `backend/src/test/java/com/mermaid/app/service/DealServiceConcurrencyTest.java`

This is the single most important test in the feature. It runs against the real `@SpringBootTest` context with the embedded Postgres / test profile DB.

- [ ] **Step 1: Test that two threads racing accept on the same alert produce exactly one Order:**

```java
@SpringBootTest
@ActiveProfiles("test")
class DealServiceConcurrencyTest {
    @Autowired DealService dealService;
    @Autowired OrderRepository orderRepo;
    @Autowired /* test data helpers */;

    @Test
    void twoSimultaneousAccepts_onlyOneOrderCreated() throws Exception {
        CatchAlert alert = givenAlert(/*qty*/30, /*claim*/0);
        Deal d1 = givenNegotiatingDeal(alert, vendorA);
        Deal d2 = givenNegotiatingDeal(alert, vendorB);
        DealProposal p1 = givenPendingProposal(d1, vendorA.getId(), 20, 240);
        DealProposal p2 = givenPendingProposal(d2, vendorB.getId(), 20, 250);

        ExecutorService ex = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        var fut1 = ex.submit(() -> { start.await(); return dealService.acceptProposal(fisherman.getId(), d1.getId(), p1.getId()); });
        var fut2 = ex.submit(() -> { start.await(); return dealService.acceptProposal(fisherman.getId(), d2.getId(), p2.getId()); });
        start.countDown();

        int success = 0;
        for (var f : List.of(fut1, fut2)) {
            try { f.get(); success++; } catch (ExecutionException e) {
                assertThat(e.getCause()).isInstanceOfAny(
                    ListingClosedException.class, DealConflictException.class);
            }
        }
        // qty 20 + 20 > 30 → exactly one accept can succeed
        assertThat(success).isEqualTo(1);
        assertThat(orderRepo.findAll().stream()
            .filter(o -> o.getCatchAlertId() != null && o.getCatchAlertId().equals(alert.getId()))
            .count()).isEqualTo(1);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=DealServiceConcurrencyTest`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/mermaid/app/service/DealServiceConcurrencyTest.java
git commit -m "test(deals): concurrent accept produces exactly one order"
```

---

### Task 9: DealExpirySweeper

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/DealExpirySweeper.java`
- Create: `backend/src/test/java/com/mermaid/app/service/DealExpirySweeperTest.java`

- [ ] **Step 1: Failing test** — given a NEGOTIATING deal with `expiresAt < now`, when `sweepExpired()` runs, then deal `EXPIRED`, system message present, `DEAL_CLOSED` event published.

- [ ] **Step 2: Implement:**

```java
@Component
public class DealExpirySweeper {
    private final DealService dealService;
    private final DealRepository dealRepo;

    @Scheduled(fixedDelayString = "${deals.expiry-sweep-interval-ms:60000}")
    public void sweepExpired() {
        OffsetDateTime now = OffsetDateTime.now();
        for (Deal d : dealRepo.findExpired(now)) {
            try { dealService.markExpired(d.getId()); } catch (Exception e) { /* log */ }
        }
    }
}
```

Add `dealService.markExpired(Long dealId)` — row lock, transitions to EXPIRED, supersedes pending, posts system note, publishes `DEAL_CLOSED`.

- [ ] **Step 3: Enable scheduling** by adding `@EnableScheduling` to a configuration class if not already enabled (check `MermaidAppApplication.java` first).

- [ ] **Step 4: Run** `./mvnw test -Dtest=DealExpirySweeperTest`. PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/DealExpirySweeper.java \
        backend/src/test/java/com/mermaid/app/service/DealExpirySweeperTest.java \
        backend/src/main/java/com/mermaid/app/MermaidAppApplication.java
git commit -m "feat(deals): scheduled expiry sweeper"
```

---

### Task 10: DealController

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/DealController.java`
- Create: `backend/src/main/java/com/mermaid/app/mapper/DealMapper.java`
- Create: `backend/src/test/java/com/mermaid/app/controller/DealControllerTest.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/ChatController.java` — when sending a message, persist `dealId` if set; include in DTO.

- [ ] **Step 1: `DealMapper`** — convert `Deal` → `DealDto`, `DealSummary`, `DealProposal` → `DealProposalDto`. Include `latestProposal` via `proposalRepo.findFirstByDealIdAndStatus(..., PENDING)`.

- [ ] **Step 2: `DealController`** implements the generated `DealsApi` interface plus extends `VendorProcurementApi` for the cart-item subroute. One method per endpoint, delegating to `DealService` and `DealMapper`. Each method extracts `SecurityUtils.currentUserId()` (existing helper).

- [ ] **Step 3: Tests** (use `@WebMvcTest(DealController.class)` + `MockMvc` + `@MockitoBean JwtDecoder jwtDecoder` per CLAUDE.md):
  - `POST /vendor/procurement/cart/items/{id}/deal` with valid JWT (VENDOR role) → 200 + DealDto.
  - `POST /deals/{id}/proposals` with non-participant JWT → 403.
  - `POST /deals/{id}/proposals/{pid}/accept` by self → 409 with proper message.
  - `POST /deals/{id}/engage` by vendor → 403 (fisherman-only).
  - `GET /deals/{id}/competitor-count` returns object with `count`.

- [ ] **Step 4: Update `ChatController.sendMessage`** to read `dealId` from `ChatMessage` payload, persist on `Message.deal_id`. No new endpoint; just plumbing.

- [ ] **Step 5: Run** `./mvnw test -Dtest=DealControllerTest`. PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/DealController.java \
        backend/src/main/java/com/mermaid/app/mapper/DealMapper.java \
        backend/src/main/java/com/mermaid/app/controller/ChatController.java \
        backend/src/test/java/com/mermaid/app/controller/DealControllerTest.java
git commit -m "feat(deals): REST controller wiring all deal endpoints"
```

---

## Phase 2 — Vendor Frontend

### Task 11: Vendor procurement API client

**Files:**
- Create: `frontend/src/vendor/api/deals.js`
- Modify: `frontend/src/vendor/api/procurement.js` — drop `checkout()`, `orderNow()`; add `startDealFromCartItem(itemId)`.

- [ ] **Step 1: Write `deals.js`:**

```javascript
import { apiGet, apiPost } from '../../api'

export const listMyDeals          = (status) => apiGet(`/deals/mine${status ? `?status=${status}` : ''}`)
export const getDeal              = (id)     => apiGet(`/deals/${id}`)
export const listDealMessages     = (id, page = 0, size = 50) =>
  apiGet(`/deals/${id}/messages?page=${page}&size=${size}`)
export const submitProposal       = (id, qtyKg, pricePerKg) =>
  apiPost(`/deals/${id}/proposals`, null, { qtyKg, pricePerKg })
export const acceptProposal       = (dealId, proposalId) =>
  apiPost(`/deals/${dealId}/proposals/${proposalId}/accept`, null, {})
export const rejectProposal       = (dealId, proposalId, reason) =>
  apiPost(`/deals/${dealId}/proposals/${proposalId}/reject`, null, { reason })
export const cancelDeal           = (id, reason) =>
  apiPost(`/deals/${id}/cancel`, null, { reason })
export const competitorCount      = (id)     => apiGet(`/deals/${id}/competitor-count`)
```

- [ ] **Step 2: Modify `procurement.js`** — remove `checkout()` and the deprecated `orderNow()` helper. Add:

```javascript
export const startDealFromCartItem = (itemId) =>
  apiPost(`/vendor/procurement/cart/items/${itemId}/deal`, null, {})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/api/
git commit -m "feat(deals): vendor frontend API client for deals"
```

---

### Task 12: ProcurementFeed UI overhaul

**Files:**
- Modify: `frontend/src/vendor/ProcurementFeed.jsx`
- Create: `frontend/src/vendor/__tests__/ProcurementFeed.test.jsx`

- [ ] **Step 1: Failing test** — render `<ProcurementFeed>` with a mock feed item; assert presence of `Start deal` button; click it → calls `startDealFromCartItem` and navigates to `/messages?deal=…`.

- [ ] **Step 2: Replace `orderNowMut` with `startDealMut`:**

```javascript
const startDealMut = useMutation({
  mutationFn: async (item) => {
    const qty = Number(item.availableKg)
    if (!qty || qty < 0.1) throw new Error('No quantity remaining')
    const cartItem = await addToCart(item.id, qty, undefined)
    const deal = await startDealFromCartItem(cartItem.id)
    return deal
  },
  onSuccess: (deal) => {
    qc.invalidateQueries({ queryKey: ['vendor', 'cart'] })
    navigate(`/vendor/messages?deal=${deal.id}`)
  },
})
```

- [ ] **Step 3: Cart tab rewrite** — render rows by `dealStatus`. For `DRAFT` show `Start deal`, for `NEGOTIATING` show `Open chat`, for `REJECTED/EXPIRED/CANCELLED` show `Restart` + delete. Drop the totals footer entirely.

- [ ] **Step 4: Run** `npm test ProcurementFeed`. PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/ProcurementFeed.jsx \
        frontend/src/vendor/__tests__/ProcurementFeed.test.jsx
git commit -m "feat(deals): vendor procurement feed adopts Start deal flow"
```

---

### Task 13: Tighten AddCatchModal validation

**Files:**
- Modify: `frontend/src/fisherman/Trips.jsx` (AddCatchModal section)
- Create: `frontend/src/fisherman/__tests__/AddCatchModal.test.jsx`

- [ ] **Step 1: Failing test** — render modal; assert submit is disabled until species + quantity (≥1) + price (≥1) are set. Notes can stay empty and submit should still be enabled.

- [ ] **Step 2: Confirm the existing disable guard** already covers this from earlier sessions:

```javascript
disabled={mut.isPending || !speciesId || !quantityKg || parseInt(quantityKg,10) < 1
                       || !pricePerKg || parseInt(pricePerKg,10) < 1}
```

No further code change needed; test exists to lock the behavior in.

- [ ] **Step 3: Run** `npm test AddCatchModal`. PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/fisherman/__tests__/AddCatchModal.test.jsx
git commit -m "test(deals): lock catch-log required-field validation"
```

---

## Phase 3 — Fisherman Frontend + Chat

### Task 14: Shared STOMP provider

**Files:**
- Create: `frontend/src/api/stomp.js`
- Create: `frontend/src/context/StompContext.jsx`
- Modify: `frontend/src/vendor/VendorLayout.jsx` — wrap with `<StompProvider>`
- Modify: `frontend/src/fisherman/FishermanLayout.jsx` — same

- [ ] **Step 1: `stomp.js`** wraps `@stomp/stompjs` `Client`; subscribes to `/user/queue/messages`, `/user/queue/deals`, `/user/queue/notifications`. Connect via the JWT cookie (handshake interceptor already extracts it on the server).

- [ ] **Step 2: `StompContext.jsx`** exposes `useStomp()` returning the client + a per-queue subscribe helper. Routes incoming messages to react-query cache invalidations:

```javascript
client.subscribe('/user/queue/deals', (frame) => {
  const evt = JSON.parse(frame.body)
  qc.invalidateQueries({ queryKey: ['deal', evt.dealId] })
  qc.invalidateQueries({ queryKey: ['deals', 'mine'] })
})
```

- [ ] **Step 3: Wrap layouts.** No tests for the provider itself (integration covered by component tests below).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/stomp.js frontend/src/context/StompContext.jsx \
        frontend/src/vendor/VendorLayout.jsx frontend/src/fisherman/FishermanLayout.jsx
git commit -m "feat(deals): shared STOMP provider with cache invalidation"
```

---

### Task 15: Fisherman ActiveDeals page

**Files:**
- Create: `frontend/src/fisherman/ActiveDeals.jsx`
- Create: `frontend/src/fisherman/api/deals.js`
- Create: `frontend/src/fisherman/__tests__/ActiveDeals.test.jsx`
- Modify: `frontend/src/fisherman/FishermanLayout.jsx` — add nav entry "Deals" between Catch Alerts and Orders
- Modify: `frontend/src/App.jsx` — route `/fisherman/deals`

- [ ] **Step 1: `fisherman/api/deals.js`** mirrors vendor's but adds `engageDeal(id)` and `rejectDeal(id, reason)`.

- [ ] **Step 2: Failing test** — render `<ActiveDeals>` with mock data (one alert, three deals); assert rows render grouped under the alert header; clicking Accept calls `engageDeal` then navigates to `/fisherman/messages?deal=…`; clicking Reject calls `rejectDeal` and the row disappears.

- [ ] **Step 3: Implement.** Query `GET /deals/mine?status=NEGOTIATING`, group by `catchAlert.id` in `useMemo`. Each row shows latest proposal, age, optional ⚠ overcommit chip when `proposal.qtyKg > alert.availableKg`. Two buttons only.

- [ ] **Step 4: Wire navigation.**

- [ ] **Step 5: Run** `npm test ActiveDeals`. PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/fisherman/ActiveDeals.jsx \
        frontend/src/fisherman/api/deals.js \
        frontend/src/fisherman/__tests__/ActiveDeals.test.jsx \
        frontend/src/fisherman/FishermanLayout.jsx \
        frontend/src/App.jsx
git commit -m "feat(deals): fisherman ActiveDeals page with Accept/Reject triage"
```

---

### Task 16: Deal chat pane + proposal card

**Files:**
- Create: `frontend/src/components/ProposalCard.jsx`
- Create: `frontend/src/components/DealComposer.jsx`
- Create: `frontend/src/components/DealChatPane.jsx`
- Create: `frontend/src/components/__tests__/ProposalCard.test.jsx`
- Create: `frontend/src/components/__tests__/DealComposer.test.jsx`
- Create: `frontend/src/components/__tests__/DealChatPane.test.jsx`

- [ ] **Step 1: `ProposalCard.jsx`** — props: `{ proposal, isCounterparty, onAccept, onReject, onCounter }`. Renders bordered card with qty + price + proposer + timestamp. Shows Accept / Reject / Counter only when `isCounterparty && proposal.status === 'PENDING'`. Otherwise shows status text.

- [ ] **Step 2: `DealComposer.jsx`** — props: `{ onSendText, onSendProposal, initial }`. Two-tab UI:

```javascript
const [tab, setTab] = useState(initial?.qtyKg ? 'propose' : 'chat')
const [text, setText] = useState('')
const [qty, setQty]   = useState(initial?.qtyKg ?? '')
const [price, setPrice] = useState(initial?.pricePerKg ?? '')
```

Two integer inputs in propose mode, both required, integer-only via `.replace(/[^0-9]/g, '')`.

- [ ] **Step 3: `DealChatPane.jsx`** — top context bar, scrollable thread (mixes TEXT/SYSTEM/PROPOSAL message kinds), composer at bottom. Reads `useQuery(['deal', dealId])` and `useQuery(['deal', dealId, 'messages'])`. Disables composer when `deal.status !== 'NEGOTIATING'`.

- [ ] **Step 4: Tests:**
  - `ProposalCard`: Accept/Reject/Counter only visible to counterparty.
  - `DealComposer`: tab switch works; submitting Propose with empty qty is blocked; Counter pre-fills.
  - `DealChatPane`: composer disabled when deal AGREED.

- [ ] **Step 5: Run** `npm test components/__tests__`. PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Proposal*.jsx \
        frontend/src/components/DealComposer.jsx \
        frontend/src/components/DealChatPane.jsx \
        frontend/src/components/__tests__/
git commit -m "feat(deals): chat pane + proposal card + two-tab composer"
```

---

### Task 17: Wire deal chat into Messages pages

**Files:**
- Modify: `frontend/src/fisherman/Messages.jsx`
- Modify: `frontend/src/vendor/components/MessagesRoute.jsx` (if separate) or `frontend/src/vendor/Messages.jsx`

- [ ] **Step 1: Add an "Active deals" section to the conversation list** populated from `useQuery(['deals', 'mine', 'NEGOTIATING'])`. Each row shows counterparty name, alert code, latest proposal preview, unread dot (driven by react-query cache freshness vs. last viewed timestamp stored in localStorage keyed by dealId).

- [ ] **Step 2: When a deal row is selected,** render `<DealChatPane dealId={…}>` in the right pane instead of the generic DM view.

- [ ] **Step 3: Read `?deal=…` query param on mount** to auto-select a deal when navigated from Start deal or Active Deals.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/fisherman/Messages.jsx frontend/src/vendor/components/MessagesRoute.jsx
git commit -m "feat(deals): integrate deal chat pane into Messages pages"
```

---

### Task 18: Bell notifications

**Files:**
- Modify: `frontend/src/vendor/components/NotificationsBell.jsx`
- Modify: `frontend/src/fisherman/components/NotificationsBell.jsx`

- [ ] **Step 1: Handle two new kinds** from `/user/queue/notifications`:
  - `DEAL_NEW_PROPOSAL` → "Counterparty proposed Xkg @ ₱Y on CA-Z." Click → `/messages?deal=...`.
  - `DEAL_AGREED` → "Order placed: Xkg @ ₱Y." Click → `/orders/...`.

- [ ] **Step 2: Server-side coalescing** (Task 5) already prevents spam; client just renders what arrives.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/components/NotificationsBell.jsx \
        frontend/src/fisherman/components/NotificationsBell.jsx
git commit -m "feat(deals): bell notifications for proposals and agreements"
```

---

## Phase 4 — Polish

### Task 19: Competitor count chip

**Files:**
- Modify: `frontend/src/components/DealChatPane.jsx`

- [ ] **Step 1:** add `useQuery(['deal', dealId, 'competitorCount'], () => competitorCount(dealId), { refetchInterval: 30000 })`. Render "X others bidding" inside the top context bar when count > 0.

- [ ] **Step 2: Update on WS event** — `StompContext` invalidates the competitor-count query whenever a `COMPETITOR_COUNT_CHANGED` event arrives for the visible alertId.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DealChatPane.jsx frontend/src/context/StompContext.jsx
git commit -m "feat(deals): competitor-count nudge in chat header"
```

---

### Task 20: Onboarding hint

**Files:**
- Modify: `frontend/src/components/DealChatPane.jsx`

- [ ] **Step 1:** check `localStorage['mermaid.deals.onboardingDismissed']`. If absent, render a small system-style row above the composer: "💡 To make an offer, tap 💼 Propose." With a × that sets the flag.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/DealChatPane.jsx
git commit -m "feat(deals): one-time onboarding hint for first deal"
```

---

### Task 21: Final integration check + docs

- [ ] **Step 1: Run full backend** `./mvnw test`. All green.
- [ ] **Step 2: Run full frontend** `npm test`. All green.
- [ ] **Step 3: Run dev stack** (`./mvnw spring-boot:run` + `npm run dev`) and walk the happy path manually:
  1. Fisherman logs catch with qty + price + species → catch alert posted.
  2. Vendor adds it to cart, Start deal → chat opens, opening proposal visible.
  3. Fisherman sees row in /fisherman/deals, clicks Accept → chat opens.
  4. Fisherman submits Counter via 💼 Propose tab.
  5. Vendor accepts the counter from the proposal card → ✅ system message, order created.
  6. Confirm `Order.deal_id` set in DB.

- [ ] **Step 4: Update `CLAUDE.md`** with a one-paragraph "Deals" entry under Project Status describing the new flow and pointing to this plan.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note deals negotiation feature in CLAUDE.md"
```

---

## Done criteria

- All 21 tasks committed.
- `./mvnw test` and `npm test` pass.
- Manual smoke walk-through in Task 21 succeeds end-to-end including a real WebSocket event delivery on both sides.
- `POST /vendor/procurement/checkout` is gone from the OpenAPI spec, the controller, and the frontend.
- `agreed_price_per_kg` is no longer the source of 500s — the column is always populated from a `DealProposal` row.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Race conditions on Accept produce duplicate orders | Pessimistic row lock on `catch_alerts` is reused from existing `findByIdInForUpdate`; concurrency test in Task 8 guards regressions. |
| WebSocket event arrives before transaction commits | All publishes wrapped in `runAfterCommit`. |
| Coalescing map leaks memory in long-running JVM | TTL eviction (60s after last entry write) on `DealEventPublisher`. Acceptable for single-instance deployment. Migrate to Redis if we scale out. |
| Legacy catch alerts without quantity_kg | Backfill V53 does not touch quantity. Start deal returns 400 cleanly; this state is rare and will fade as old alerts expire. |
| Frontend STOMP reconnect during negotiation | Existing reconnect logic on `/ws-chat`; UI always re-reads via REST on reconnect so cache stays consistent. |
