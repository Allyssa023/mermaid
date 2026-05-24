package com.mermaid.app.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashMap;
import java.util.Map;

/**
 * Lightweight STOMP broadcaster for "entity changed" events that drive
 * client-side React Query invalidations. The frontend subscribes to
 * {@code /user/queue/live} for per-user events and to {@code /topic/*}
 * for broadcast events (e.g. catch alert feed).
 *
 * <p>Payload envelope is always {@code {kind, payload}} where {@code kind}
 * identifies the entity class and {@code payload} carries the minimal data
 * the client needs to invalidate the correct query keys.
 */
@Component
public class LiveEventPublisher {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LiveEventPublisher.class);

    private final SimpMessagingTemplate ws;

    public LiveEventPublisher(SimpMessagingTemplate ws) {
        this.ws = ws;
    }

    /** Push a live event to a single user's private queue. */
    public void pushToUser(Long userId, String kind, Map<String, Object> payload) {
        if (userId == null) {
            log.info("pushToUser skipped: userId is null (kind={})", kind);
            return;
        }
        Map<String, Object> envelope = new HashMap<>();
        envelope.put("kind", kind);
        envelope.put("payload", payload == null ? Map.of() : payload);
        log.info("pushToUser → user={} dest=/queue/live kind={} payload={}", userId, kind, payload);
        ws.convertAndSendToUser(userId.toString(), "/queue/live", envelope);
    }

    /** Broadcast a live event on a public topic (no user scoping). */
    public void broadcast(String topic, String kind, Map<String, Object> payload) {
        Map<String, Object> envelope = new HashMap<>();
        envelope.put("kind", kind);
        envelope.put("payload", payload == null ? Map.of() : payload);
        log.info("broadcast → /topic/{} kind={} payload={}", topic, kind, payload);
        // Cast to Object to disambiguate from convertAndSend(payload, headers).
        ws.convertAndSend("/topic/" + topic, (Object) envelope);
    }

    /** Run after the current transaction commits (no-op safe). */
    public void runAfterCommit(Runnable r) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { r.run(); }
            });
        } else {
            r.run();
        }
    }
}
