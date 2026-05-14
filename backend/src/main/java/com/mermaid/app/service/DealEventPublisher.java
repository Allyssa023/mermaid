package com.mermaid.app.service;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Publishes Deal-related WebSocket events to participants (vendor + fisherman).
 *
 * <p>Two destinations are used:
 * <ul>
 *   <li>{@code /user/{userId}/queue/deals} — silent UI updates (state changes,
 *       competitor counts, etc.)</li>
 *   <li>{@code /user/{userId}/queue/notifications} — user-visible toast events,
 *       coalesced over {@link #COALESCE_WINDOW} to avoid spamming the recipient
 *       when several proposals/counters happen in quick succession.</li>
 * </ul>
 */
@Component
public class DealEventPublisher {

    static final Duration COALESCE_WINDOW = Duration.ofSeconds(30);

    private final SimpMessagingTemplate ws;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final ConcurrentHashMap<String, Instant> notifyDedupe = new ConcurrentHashMap<>();

    public DealEventPublisher(SimpMessagingTemplate ws,
                              DealRepository dealRepo,
                              UserRepository userRepo) {
        this.ws = ws;
        this.dealRepo = dealRepo;
        this.userRepo = userRepo;
    }

    /**
     * Push a deal event to both the vendor and the fisherman on the deal.
     */
    public void publishDealEvent(Deal deal, String kind, Object payload) {
        Map<String, Object> envelope = Map.of(
                "kind", kind,
                "dealId", deal.getId(),
                "payload", payload
        );
        for (Long uid : List.of(deal.getVendorId(), deal.getFishermanId())) {
            ws.convertAndSendToUser(uid.toString(), "/queue/deals", envelope);
        }
    }

    /**
     * Coalesced notification — if a push for (recipient, dealId, kind) was sent within
     * {@link #COALESCE_WINDOW}, the toast is suppressed. The {@code /deals} event is
     * always published separately (UI updates silently).
     */
    public void publishProposalNotification(Long recipientId, Long dealId, String kind, String text) {
        String key = recipientId + ":" + dealId + ":" + kind;
        Instant now = Instant.now();
        Instant last = notifyDedupe.get(key);
        if (last == null || Duration.between(last, now).compareTo(COALESCE_WINDOW) > 0) {
            ws.convertAndSendToUser(recipientId.toString(), "/queue/notifications", Map.of(
                    "kind", kind,
                    "dealId", dealId,
                    "text", text
            ));
            notifyDedupe.put(key, now);
            evictExpired(now);
        }
    }

    /**
     * For every NEGOTIATING deal on this alert, push the new competitor count to its vendor.
     */
    public void publishCompetitorCountChange(Long alertId) {
        List<Deal> open = dealRepo.findByCatchAlertIdAndStatus(alertId, DealStatus.NEGOTIATING);
        for (Deal d : open) {
            int count = dealRepo.countOpenDealsOnAlertExcludingVendor(alertId, d.getVendorId());
            ws.convertAndSendToUser(d.getVendorId().toString(), "/queue/deals", Map.of(
                    "kind", "COMPETITOR_COUNT_CHANGED",
                    "dealId", d.getId(),
                    "payload", Map.of("alertId", alertId, "count", count)
            ));
        }
    }

    /**
     * Run a task only after the current transaction commits. Falls back to immediate
     * execution if no transaction is active.
     */
    public void runAfterCommit(Runnable r) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { r.run(); }
            });
        } else {
            r.run();
        }
    }

    /** Package-private for tests — inject a stale entry to exercise the "window elapsed" path. */
    void setLastNotifyForTest(Long recipientId, Long dealId, String kind, Instant when) {
        notifyDedupe.put(recipientId + ":" + dealId + ":" + kind, when);
    }

    private void evictExpired(Instant now) {
        // Cheap O(n) eviction; map stays small. Entries older than 60s are gone.
        notifyDedupe.entrySet().removeIf(e -> Duration.between(e.getValue(), now).getSeconds() > 60);
    }
}
