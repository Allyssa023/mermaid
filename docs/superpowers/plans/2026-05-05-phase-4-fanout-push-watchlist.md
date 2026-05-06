# Phase 4 — CatchAlert Fan-out + Push + Watchlist

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** When a fisherman fires a `CatchAlert`, fan it out to subscribed vendors via `CatchAlertFanoutService` (matches species OR market-location proximity), writing one `Notification(type=CATCH_ALERT_NEW)` per matching vendor. Wire `usePushNotifications` to surface those notifications via the browser Push API. Add `Watchlist.jsx` so vendors manage subscriptions.

**Spec reference:** §5.3 (V39), §6 Flow C, §9 Phase 4.

**Tech Stack:** Spring Boot, JPA, Flyway, Spring application events (`@TransactionalEventListener(AFTER_COMMIT)`), React/Vite, browser Notification API.

---

## File Structure

### New backend files

```
backend/src/main/resources/db/migration/V39__create_vendor_watchlists.sql
backend/src/main/java/com/mermaid/app/domain/VendorWatchlist.java
backend/src/main/java/com/mermaid/app/repository/VendorWatchlistRepository.java
backend/src/main/java/com/mermaid/app/mapper/VendorWatchlistMapper.java
backend/src/main/java/com/mermaid/app/service/WatchlistService.java
backend/src/main/java/com/mermaid/app/service/CatchAlertFanoutService.java
backend/src/main/java/com/mermaid/app/event/CatchAlertCreatedEvent.java
backend/src/main/java/com/mermaid/app/controller/VendorWatchlistController.java
```

### Modified backend files

- `api.yaml` — `/vendor/watchlist/**` paths.
- `backend/src/main/java/com/mermaid/app/service/CatchAlertService.java` — publish `CatchAlertCreatedEvent` after persist.
- `backend/src/main/java/com/mermaid/app/controller/VendorProcurementController.java` (Phase 3) — populate `watchlistMatched` flag on feed items using `WatchlistService.matches(vendorId, alert)`.

### New frontend files

```
frontend/src/vendor/Watchlist.jsx
frontend/src/vendor/api/watchlist.js
frontend/src/vendor/hooks/usePushNotifications.js
```

### Modified frontend files

- `frontend/src/vendor/VendorLayout.jsx` — mount push permission prompt + service worker registration.
- `frontend/src/vendor/components/NotificationsBell.jsx` (or shared from buyer) — surface `CATCH_ALERT_NEW` with deep-link to `/vendor/procurement?highlightAlertId=X`.
- `frontend/src/vendor/ProcurementFeed.jsx` — accept `?highlightAlertId=` query param, scroll/highlight matching card.
- `frontend/public/sw.js` (new or existing) — service worker for push display.

### Tests

```
backend/src/test/java/com/mermaid/app/service/WatchlistServiceTest.java
backend/src/test/java/com/mermaid/app/service/CatchAlertFanoutServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorWatchlistControllerTest.java
backend/src/test/java/com/mermaid/app/integration/CatchAlertFanoutIT.java

frontend/src/vendor/__tests__/Watchlist.test.jsx
frontend/src/vendor/hooks/__tests__/usePushNotifications.test.js
```

---

## Task 1: Worktree + baseline

- [ ] Branch `vendor-phase-4-fanout-push-watchlist`. Phase 3 merged. Tests baseline green.

## Task 2: V39 — `vendor_watchlists`

```sql
CREATE TABLE vendor_watchlists (
    id                  BIGSERIAL    PRIMARY KEY,
    vendor_id           BIGINT       NOT NULL REFERENCES users(id),
    species_id          BIGINT       REFERENCES fish_species(id),
    market_location_id  BIGINT       REFERENCES market_locations(id),
    radius_km           NUMERIC(6,2),
    is_deleted          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_watchlist_at_least_one
        CHECK (species_id IS NOT NULL OR market_location_id IS NOT NULL)
);

CREATE INDEX idx_watchlist_vendor_active
    ON vendor_watchlists (vendor_id) WHERE is_deleted = false;
CREATE INDEX idx_watchlist_species
    ON vendor_watchlists (species_id) WHERE is_deleted = false AND species_id IS NOT NULL;
CREATE INDEX idx_watchlist_location
    ON vendor_watchlists (market_location_id) WHERE is_deleted = false AND market_location_id IS NOT NULL;
```

## Task 3: Domain + repo

- [ ] `VendorWatchlist` entity with `is_deleted`.
- [ ] `VendorWatchlistRepository`:
  - `findByVendorIdAndIsDeletedFalse(Long)`
  - For fan-out match: query like
    ```java
    @Query(value = "SELECT * FROM vendor_watchlists w WHERE w.is_deleted = false AND (" +
                   "  w.species_id = :species OR " +
                   "  (w.market_location_id IS NOT NULL AND :alertLat IS NOT NULL AND :alertLng IS NOT NULL " +
                   "    AND ml_distance_km(w.market_location_id, :alertLat, :alertLng) <= COALESCE(w.radius_km, 999))" +
                   ")", nativeQuery = true)
    ```
    Or simpler: load all active watchlists, match in Java (acceptable scale for MVP). **Recommend Java-side matching for Phase 4** to avoid PG function complexity.

## Task 4: `WatchlistService`

```java
public interface WatchlistService {
    List<VendorWatchlist> listForVendor(Long vendorId);
    VendorWatchlist add(Long vendorId, Long speciesId, Long marketLocationId, BigDecimal radiusKm);
    void remove(Long vendorId, Long watchlistId);
    boolean matches(Long vendorId, CatchAlert alert);
    List<Long> vendorsMatching(CatchAlert alert);  // used by fanout
}
```

- [ ] `add` — assert `speciesId != null OR marketLocationId != null`; deduplicate against existing active rows for the same vendor.
- [ ] `matches` — load vendor's active watchlists; species rule `w.speciesId == alert.speciesId`; location rule: distance(market_location → alert.lat,lng) ≤ radius_km (default to 5km if null radius).
- [ ] `vendorsMatching(alert)` — load all active watchlists once (filtered to `species_id == alert.speciesId OR market_location_id IS NOT NULL`); Java-side filter; return distinct vendor ids.

## Task 5: `CatchAlertCreatedEvent` + publish

```java
public record CatchAlertCreatedEvent(Long catchAlertId) {}
```

- [ ] In `CatchAlertService.create(...)` after `save`: `eventPublisher.publishEvent(new CatchAlertCreatedEvent(saved.getId()));`. Use `ApplicationEventPublisher` injected via constructor.

## Task 6: `CatchAlertFanoutService`

```java
@Component
@RequiredArgsConstructor
public class CatchAlertFanoutService {
    private final CatchAlertRepository alertRepo;
    private final WatchlistService watchlistService;
    private final NotificationService notifications;
    private final FishSpeciesRepository speciesRepo;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onCatchAlertCreated(CatchAlertCreatedEvent event) {
        CatchAlert alert = alertRepo.findById(event.catchAlertId()).orElse(null);
        if (alert == null || !"ACTIVE".equals(alert.getStatus())) return;
        List<Long> vendorIds = watchlistService.vendorsMatching(alert);
        String speciesName = speciesRepo.findById(alert.getSpeciesId())
            .map(FishSpecies::getName).orElse("Unknown");
        for (Long vendorId : vendorIds) {
            if (alreadyNotified(alert.getId(), vendorId)) continue;  // idempotency
            notifications.create(vendorId, "CATCH_ALERT_NEW",
                speciesName + " landing — " + alert.getQuantityEstimate(),
                Map.of("catchAlertId", alert.getId(),
                       "speciesId", alert.getSpeciesId(),
                       "landingSite", alert.getLandingSite()));
        }
    }

    private boolean alreadyNotified(Long alertId, Long vendorId) {
        return notifications.existsByUserAndPayloadKey(vendorId, "CATCH_ALERT_NEW", "catchAlertId", alertId);
    }
}
```

- [ ] Add `existsByUserAndPayloadKey` to `NotificationService`/repo (native query against `payload_json::jsonb`).
- [ ] Enable `@EnableAsync` on the main config if not already present. Single-thread executor is fine for MVP scale.

## Task 7: `api.yaml` — `/vendor/watchlist/**`

- `GET /vendor/watchlist`
- `POST /vendor/watchlist` (body: speciesId?, marketLocationId?, radiusKm?)
- `DELETE /vendor/watchlist/{id}`
- Schemas: `VendorWatchlistEntry`, `VendorWatchlistRequest`.
- Regenerate.

## Task 8: `VendorWatchlistController`

- [ ] `@PreAuthorize("hasRole('VENDOR')")`. Implement generated interface; resolve vendorId from principal.

## Task 9: `Watchlist.jsx`

- [ ] **Step 1: Layout.** List of subscriptions (species name OR location name + radius); "Add subscription" button → modal: species select (optional), market location select (optional), radius input (only when location selected). Validation: at least one of species/location required.
- [ ] **Step 2:** Delete (soft) per row.

## Task 10: `usePushNotifications` hook

```js
export function usePushNotifications({ onNotification } = {}) {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [supported, setSupported] = useState(typeof Notification !== 'undefined' && 'serviceWorker' in navigator)

  const request = useCallback(async () => {
    if (!supported) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && 'serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/sw.js') } catch (_) {}
    }
    return result
  }, [supported])

  const fire = useCallback((title, options) => {
    if (!supported || permission !== 'granted') return
    try { new Notification(title, options) } catch (_) {}
  }, [supported, permission])

  return { permission, supported, request, fire }
}
```

- [ ] Wire from `VendorLayout`: on first poll-result containing a *new* `CATCH_ALERT_NEW` or `ORDER_STATUS_CHANGED` notification (compare against last-seen cursor in localStorage), call `fire(title, { body, data: { url } })`. On click → focus tab + navigate.

Note: spec uses **browser Notification API** (no server push subscription). Service worker is just for click-handling; no VAPID, no FCM. Keep `sw.js` minimal:

```js
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/vendor'
  event.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes(url)) return c.focus() }
    return clients.openWindow(url)
  }))
})
```

## Task 11: ProcurementFeed deep-link

- [ ] Read `?highlightAlertId=` query param; on match, scroll the card into view + apply `data-highlight=true` styling.

## Task 12: Wire watchlist matched flag

- [ ] In `VendorProcurementController` feed endpoint: for each alert, compute `watchlistMatched = watchlistService.matches(vendorId, alert)`. (For perf at scale: load watchlist once per request; here loop is fine.)
- [ ] Frontend feed badge already supported from Phase 3.

## Task 13: Wire vendor route

- [ ] `<Route path="watchlist" element={<Watchlist />} />`.

## Task 14: Tests

- [ ] **Step 1:** `WatchlistServiceTest` — at-least-one-of constraint; species match; location radius match; outside radius rejected; deduplication on add.
- [ ] **Step 2:** `CatchAlertFanoutServiceTest` — fan-out matches species; fan-out matches location radius; idempotent on duplicate event invocation; alert in non-ACTIVE state → no notifications.
- [ ] **Step 3:** `CatchAlertFanoutIT` — `@SpringBootTest`. Seed 3 vendors: V1 watches species; V2 watches location within radius; V3 watches different species. Fisherman creates an alert. Wait for `@Async` listener to drain (use a `CountDownLatch` exposed via `TestConfiguration`, or `Awaitility` polling notification table). Assert exactly two notifications (V1, V2). Re-fire event → still two (idempotent). Cancel alert → no compensating row.
- [ ] **Step 4:** `VendorWatchlistControllerTest` — happy path + 401 + 403.
- [ ] **Step 5:** `Watchlist.test.jsx` — modal validation: submit disabled with neither species nor location.
- [ ] **Step 6:** `usePushNotifications.test.js` — mock `Notification`; permission states `granted/denied/default/unsupported`; `fire` only triggers on granted.

## Task 15: Manual QA

- [ ] Vendor adds species watchlist for "Tuna".
- [ ] Vendor grants browser notification permission.
- [ ] Fisherman fires a Tuna CatchAlert.
- [ ] Within ~15s (next poll) vendor sees notifications bell badge increment AND a browser push appears with deep-link to `/vendor/procurement?highlightAlertId=X`.
- [ ] Click push → vendor dashboard focuses, feed scrolls to alert.
- [ ] Vendor adds *location* watchlist for a different market with 5km radius.
- [ ] Fisherman fires alert at that landing site → vendor receives notification.
- [ ] Cancel watchlist → next alert does not notify.

## Task 16: Verify + commit

- [ ] All tests green. `superpowers:verification-before-completion`.
- [ ] Commit:
  ```
  feat(vendor): phase 4 — catchalert fan-out + push + watchlist

  - V39: vendor_watchlists (species OR market_location + radius)
  - WatchlistService + WatchlistController
  - CatchAlertFanoutService (@TransactionalEventListener AFTER_COMMIT, idempotent)
  - usePushNotifications + minimal service worker for click routing
  - ProcurementFeed deep-link via ?highlightAlertId

  Spec: §9 Phase 4
  ```

## Exit criteria

- [ ] Watchlist-matched alert produces a `CATCH_ALERT_NEW` notification within one polling interval.
- [ ] Browser push fires when permission granted.
- [ ] Alert cancel produces no compensating notification (verified by integration test).
- [ ] Existing procurement orders unaffected by alert cancel.
- [ ] `CatchAlertFanoutIT` green.
