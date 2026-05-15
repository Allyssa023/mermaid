package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealProposal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.ProposalStatus;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.repository.DealProposalRepository;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.ProcurementCartItemRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Simulates two parallel acceptProposal calls on the same catch alert. The
 * real concurrency safety relies on Postgres' {@code SELECT ... FOR UPDATE}
 * lock taken by {@code CatchAlertRepository.findByIdInForUpdate} inside
 * {@code ProcurementOrderService.createFromAgreement}. We can't exercise the
 * DB lock in a unit test, so we mock the lock outcome: whichever thread
 * reaches {@code createFromAgreement} first wins; the second sees the
 * post-lock view of the alert as fully claimed and gets a
 * {@link ListingClosedException}. The test then verifies the service handles
 * the contention contract correctly — exactly one AGREED; the loser's proposal
 * becomes SUPERSEDED OVERCOMMIT, and once the winner's sweep observes the
 * alert sold out, the loser's deal is cancelled with reason ALERT_SOLD_OUT.
 */
@ExtendWith(MockitoExtension.class)
class DealServiceConcurrencyTest {

    static final Long VENDOR_A = 11L;
    static final Long VENDOR_B = 12L;
    static final Long FISHERMAN = 20L;
    static final Long ALERT_ID = 500L;

    @Mock DealRepository dealRepo;
    @Mock DealProposalRepository proposalRepo;
    @Mock ProcurementCartItemRepository cartRepo;
    @Mock MessageRepository messageRepo;
    @Mock UserRepository userRepo;
    @Mock DealEventPublisher eventPublisher;
    @Mock ProcurementOrderService procurementOrderService;

    DealService service;

    @BeforeEach
    void setUp() {
        service = new DealService(dealRepo, proposalRepo, cartRepo, messageRepo, userRepo,
                eventPublisher, procurementOrderService);
        lenient().doAnswer(inv -> {
            Runnable r = inv.getArgument(0);
            r.run();
            return null;
        }).when(eventPublisher).runAfterCommit(any(Runnable.class));
    }

    @Test
    void twoAcceptsRacingOnSameAlert_onlyOneWins() throws Exception {
        // Shared alert: 50kg, both vendors want all of it.
        CatchAlert alert = new CatchAlert();
        alert.setId(ALERT_ID);
        alert.setFishermanId(FISHERMAN);
        alert.setStatus("ACTIVE");
        alert.setExpiresAt(OffsetDateTime.now().plusHours(6));
        alert.setQuantityKg(new BigDecimal("50"));
        alert.setClaimedKg(BigDecimal.ZERO);

        Deal dealA = deal(78L, VENDOR_A, alert);
        DealProposal propA = pending(1001L, dealA, VENDOR_A, new BigDecimal("50"));

        Deal dealB = deal(79L, VENDOR_B, alert);
        DealProposal propB = pending(1002L, dealB, VENDOR_B, new BigDecimal("50"));

        when(dealRepo.findByIdForUpdate(dealA.getId())).thenReturn(Optional.of(dealA));
        when(dealRepo.findByIdForUpdate(dealB.getId())).thenReturn(Optional.of(dealB));
        when(proposalRepo.findById(propA.getId())).thenReturn(Optional.of(propA));
        when(proposalRepo.findById(propB.getId())).thenReturn(Optional.of(propB));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(dealRepo.findByCatchAlertIdAndStatus(ALERT_ID, DealStatus.NEGOTIATING))
                .thenReturn(List.of(dealA, dealB));
        // The winner's sweep looks up the loser's PENDING proposal so it can mark
        // it SUPERSEDED OVERCOMMIT. Returning the actual peer proposal here means
        // the sweep path is exercised end-to-end rather than no-oped.
        lenient().when(proposalRepo.findFirstByDealIdAndStatus(eq(dealA.getId()), eq(ProposalStatus.PENDING)))
                .thenReturn(Optional.of(propA));
        lenient().when(proposalRepo.findFirstByDealIdAndStatus(eq(dealB.getId()), eq(ProposalStatus.PENDING)))
                .thenReturn(Optional.of(propB));
        lenient().when(cartRepo.deleteByDealId(any())).thenReturn(0);
        User fisher = new User(); fisher.setId(FISHERMAN);
        User va = new User(); va.setId(VENDOR_A);
        User vb = new User(); vb.setId(VENDOR_B);
        lenient().when(userRepo.findById(FISHERMAN)).thenReturn(Optional.of(fisher));
        lenient().when(userRepo.findById(VENDOR_A)).thenReturn(Optional.of(va));
        lenient().when(userRepo.findById(VENDOR_B)).thenReturn(Optional.of(vb));

        // Simulate the DB row lock: first caller into createFromAgreement wins;
        // second sees the alert fully claimed and gets ListingClosedException.
        CountDownLatch bothStarted = new CountDownLatch(2);
        AtomicInteger callOrder = new AtomicInteger(0);
        when(procurementOrderService.createFromAgreement(any(Deal.class), any(DealProposal.class)))
                .thenAnswer(inv -> {
                    bothStarted.countDown();
                    bothStarted.await(2, TimeUnit.SECONDS); // align both threads at the lock
                    Deal d = inv.getArgument(0);
                    DealProposal p = inv.getArgument(1);
                    int order = callOrder.incrementAndGet();
                    if (order == 1) {
                        alert.setClaimedKg(alert.getClaimedKg().add(p.getQtyKg()));
                        if (alert.getClaimedKg().compareTo(alert.getQuantityKg()) == 0) {
                            alert.setStatus("SOLD");
                        }
                        return stubOrder(700L + d.getId(), d, p);
                    }
                    throw new ListingClosedException("Only 0kg remaining");
                });

        ExecutorService pool = Executors.newFixedThreadPool(2);
        AtomicReference<Throwable> errA = new AtomicReference<>();
        AtomicReference<Throwable> errB = new AtomicReference<>();
        AtomicReference<DealService.AcceptResult> resA = new AtomicReference<>();
        AtomicReference<DealService.AcceptResult> resB = new AtomicReference<>();
        try {
            pool.submit(() -> {
                try { resA.set(service.acceptProposal(FISHERMAN, dealA.getId(), propA.getId())); }
                catch (Throwable t) { errA.set(t); }
            });
            pool.submit(() -> {
                try { resB.set(service.acceptProposal(FISHERMAN, dealB.getId(), propB.getId())); }
                catch (Throwable t) { errB.set(t); }
            });
            pool.shutdown();
            assertThat(pool.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        } finally {
            if (!pool.isTerminated()) pool.shutdownNow();
        }

        // Exactly one win, one loss.
        boolean aWon = errA.get() == null;
        boolean bWon = errB.get() == null;
        assertThat(aWon ^ bWon).as("exactly one accept should win").isTrue();

        Deal winner = aWon ? dealA : dealB;
        Deal loser = aWon ? dealB : dealA;
        DealProposal winnerProp = aWon ? propA : propB;
        DealProposal loserProp = aWon ? propB : propA;
        Throwable loserError = aWon ? errB.get() : errA.get();

        assertThat(winner.getStatus()).isEqualTo(DealStatus.AGREED);
        assertThat(winnerProp.getStatus()).isEqualTo(ProposalStatus.ACCEPTED);

        assertThat(loserError).isInstanceOf(ListingClosedException.class);
        // Winner's sweep saw the alert SOLD and cancelled the loser's deal.
        assertThat(loser.getStatus()).isEqualTo(DealStatus.CANCELLED);
        assertThat(loserProp.getStatus()).isEqualTo(ProposalStatus.SUPERSEDED);
        assertThat(loserProp.getSupersededReason())
                .isEqualTo(DealService.SUPERSEDED_REASON_OVERCOMMIT);

        // Wire contract: the loser's DEAL_CLOSED event must carry the
        // ALERT_SOLD_OUT reason so the vendor UI can show the right message.
        org.mockito.ArgumentCaptor<java.util.Map<String, Object>> payloads =
                org.mockito.ArgumentCaptor.forClass(java.util.Map.class);
        org.mockito.Mockito.verify(eventPublisher, org.mockito.Mockito.atLeastOnce())
                .publishDealEvent(eq(loser), eq("DEAL_CLOSED"), payloads.capture());
        assertThat(payloads.getAllValues())
                .anySatisfy(p -> {
                    assertThat(p.get("status")).isEqualTo(DealStatus.CANCELLED.name());
                    assertThat(p.get("reason")).isEqualTo(DealService.CLOSED_REASON_ALERT_SOLD_OUT);
                });
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private static Deal deal(Long id, Long vendorId, CatchAlert alert) {
        Deal d = new Deal();
        d.setId(id);
        d.setVendorId(vendorId);
        d.setFishermanId(FISHERMAN);
        d.setStatus(DealStatus.NEGOTIATING);
        d.setCatchAlert(alert);
        d.setExpiresAt(OffsetDateTime.now().plusHours(6));
        return d;
    }

    private static DealProposal pending(Long id, Deal d, Long proposerId, BigDecimal qty) {
        DealProposal p = new DealProposal();
        p.setId(id);
        p.setDeal(d);
        p.setProposedById(proposerId);
        p.setQtyKg(qty);
        p.setPricePerKg(new BigDecimal("240"));
        p.setStatus(ProposalStatus.PENDING);
        return p;
    }

    private static Order stubOrder(Long id, Deal d, DealProposal p) {
        Order o = new Order();
        o.setId(id);
        o.setKind(OrderKind.RETAIL);
        o.setBuyerId(d.getVendorId());
        o.setSellerId(d.getFishermanId());
        o.setOrderedQtyKg(p.getQtyKg());
        o.setAgreedPricePerKg(p.getPricePerKg());
        o.setStatus("PENDING");
        o.setDeal(d);
        return o;
    }
}
