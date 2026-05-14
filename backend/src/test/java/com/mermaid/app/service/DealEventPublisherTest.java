package com.mermaid.app.service;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DealEventPublisherTest {

    @Mock SimpMessagingTemplate ws;
    @Mock DealRepository dealRepo;
    @Mock UserRepository userRepo;

    DealEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new DealEventPublisher(ws, dealRepo, userRepo);
    }

    private static Deal deal(Long id, Long vendorId, Long fishermanId) {
        Deal d = new Deal();
        d.setId(id);
        d.setVendorId(vendorId);
        d.setFishermanId(fishermanId);
        d.setStatus(DealStatus.NEGOTIATING);
        return d;
    }

    @Test
    void publishDealEvent_sendsToBothParticipants() {
        Deal d = deal(100L, 1L, 2L);
        Map<String, Object> payload = Map.of("foo", "bar");

        publisher.publishDealEvent(d, "DEAL_AGREED", payload);

        Map<String, Object> expected = Map.of(
                "kind", "DEAL_AGREED",
                "dealId", 100L,
                "payload", payload
        );
        verify(ws, times(1)).convertAndSendToUser(eq("1"), eq("/queue/deals"), eq(expected));
        verify(ws, times(1)).convertAndSendToUser(eq("2"), eq("/queue/deals"), eq(expected));
        verifyNoMoreInteractions(ws);
    }

    @Test
    void publishProposalNotification_suppressesWithinCoalesceWindow() {
        publisher.publishProposalNotification(1L, 10L, "DEAL_NEW_PROPOSAL", "text");
        publisher.publishProposalNotification(1L, 10L, "DEAL_NEW_PROPOSAL", "text");

        // First call goes through, second is suppressed.
        verify(ws, times(1)).convertAndSendToUser(
                eq("1"), eq("/queue/notifications"), any(Object.class));
        verifyNoMoreInteractions(ws);
    }

    @Test
    void publishProposalNotification_allowsAfterWindow() {
        // Send once to seed the dedupe map.
        publisher.publishProposalNotification(1L, 10L, "DEAL_NEW_PROPOSAL", "text");

        // Backdate the dedupe entry past the coalesce window (30s + buffer).
        publisher.setLastNotifyForTest(1L, 10L, "DEAL_NEW_PROPOSAL",
                Instant.now().minusSeconds(120));

        publisher.publishProposalNotification(1L, 10L, "DEAL_NEW_PROPOSAL", "text");

        // Two notifications should have been sent — one initial, one after the window elapsed.
        verify(ws, times(2)).convertAndSendToUser(
                eq("1"), eq("/queue/notifications"), any(Object.class));
        verifyNoMoreInteractions(ws);
    }

    @Test
    void publishProposalNotification_differentKindsNotCoalesced() {
        publisher.publishProposalNotification(1L, 10L, "DEAL_NEW_PROPOSAL", "a");
        publisher.publishProposalNotification(1L, 10L, "DEAL_COUNTERED", "b");

        verify(ws, times(2)).convertAndSendToUser(
                eq("1"), eq("/queue/notifications"), any(Object.class));
        verifyNoMoreInteractions(ws);
    }

    @Test
    void publishCompetitorCountChange_pushesPerOpenDeal() {
        Long alertId = 42L;
        Deal d1 = deal(1L, 10L, 99L);
        Deal d2 = deal(2L, 11L, 99L);
        Deal d3 = deal(3L, 12L, 99L);

        when(dealRepo.findByCatchAlertIdAndStatus(alertId, DealStatus.NEGOTIATING))
                .thenReturn(List.of(d1, d2, d3));
        when(dealRepo.countOpenDealsOnAlertExcludingVendor(alertId, 10L)).thenReturn(2);
        when(dealRepo.countOpenDealsOnAlertExcludingVendor(alertId, 11L)).thenReturn(2);
        when(dealRepo.countOpenDealsOnAlertExcludingVendor(alertId, 12L)).thenReturn(2);

        publisher.publishCompetitorCountChange(alertId);

        verify(ws).convertAndSendToUser(eq("10"), eq("/queue/deals"), eq(Map.of(
                "kind", "COMPETITOR_COUNT_CHANGED",
                "dealId", 1L,
                "payload", Map.of("alertId", alertId, "count", 2)
        )));
        verify(ws).convertAndSendToUser(eq("11"), eq("/queue/deals"), eq(Map.of(
                "kind", "COMPETITOR_COUNT_CHANGED",
                "dealId", 2L,
                "payload", Map.of("alertId", alertId, "count", 2)
        )));
        verify(ws).convertAndSendToUser(eq("12"), eq("/queue/deals"), eq(Map.of(
                "kind", "COMPETITOR_COUNT_CHANGED",
                "dealId", 3L,
                "payload", Map.of("alertId", alertId, "count", 2)
        )));
        verifyNoMoreInteractions(ws);
    }

    @Test
    void runAfterCommit_runsImmediatelyWithoutTransaction() {
        AtomicBoolean ran = new AtomicBoolean(false);

        publisher.runAfterCommit(() -> ran.set(true));

        assertThat(ran).isTrue();
    }
}
