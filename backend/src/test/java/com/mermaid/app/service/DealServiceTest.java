package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealProposal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.ProcurementCartItem;
import com.mermaid.app.domain.ProposalStatus;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.DealConflictException;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.repository.DealProposalRepository;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.ProcurementCartItemRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DealServiceTest {

    static final Long VENDOR_ID = 10L;
    static final Long FISHERMAN_ID = 20L;
    static final Long OUTSIDER_ID = 99L;
    static final Long ALERT_ID = 500L;

    @Mock DealRepository dealRepo;
    @Mock DealProposalRepository proposalRepo;
    @Mock ProcurementCartItemRepository cartRepo;
    @Mock MessageRepository messageRepo;
    @Mock UserRepository userRepo;
    @Mock DealEventPublisher eventPublisher;

    DealService service;

    @BeforeEach
    void setUp() {
        service = new DealService(dealRepo, proposalRepo, cartRepo, messageRepo, userRepo, eventPublisher);
        // Inline runAfterCommit so tests can verify publishes immediately.
        lenient().doAnswer(inv -> {
            Runnable r = inv.getArgument(0);
            r.run();
            return null;
        }).when(eventPublisher).runAfterCommit(any(Runnable.class));
    }

    // ----- helpers -----

    private CatchAlert activeAlert(BigDecimal askingPrice) {
        CatchAlert a = new CatchAlert();
        a.setId(ALERT_ID);
        a.setFishermanId(FISHERMAN_ID);
        a.setStatus("ACTIVE");
        a.setExpiresAt(OffsetDateTime.now().plusHours(6));
        a.setQuantityKg(new BigDecimal("50"));
        a.setClaimedKg(BigDecimal.ZERO);
        a.setAskingPricePerKg(askingPrice);
        return a;
    }

    private ProcurementCartItem cartItem(CatchAlert alert, BigDecimal qty) {
        ProcurementCartItem c = new ProcurementCartItem();
        c.setId(1L);
        c.setVendorId(VENDOR_ID);
        c.setCatchAlert(alert);
        c.setQtyKg(qty);
        return c;
    }

    private Deal negotiatingDeal() {
        Deal d = new Deal();
        d.setId(77L);
        d.setVendorId(VENDOR_ID);
        d.setFishermanId(FISHERMAN_ID);
        d.setStatus(DealStatus.NEGOTIATING);
        d.setExpiresAt(OffsetDateTime.now().plusHours(7));
        CatchAlert a = activeAlert(new BigDecimal("250"));
        d.setCatchAlert(a);
        return d;
    }

    private DealProposal pending(Deal deal, Long proposedBy, BigDecimal qty, BigDecimal price) {
        DealProposal p = new DealProposal();
        p.setId(1001L);
        p.setDeal(deal);
        p.setProposedById(proposedBy);
        p.setQtyKg(qty);
        p.setPricePerKg(price);
        p.setStatus(ProposalStatus.PENDING);
        return p;
    }

    private void stubUsers() {
        User v = new User(); v.setId(VENDOR_ID);
        User f = new User(); f.setId(FISHERMAN_ID);
        when(userRepo.findById(VENDOR_ID)).thenReturn(Optional.of(v));
        when(userRepo.findById(FISHERMAN_ID)).thenReturn(Optional.of(f));
    }

    // =========================================================
    // startFromCartItem
    // =========================================================

    @Test
    void startFromCartItem_createsDealAndOpeningProposal() {
        CatchAlert alert = activeAlert(new BigDecimal("250"));
        ProcurementCartItem cart = cartItem(alert, new BigDecimal("20"));
        when(cartRepo.findByIdAndVendorId(cart.getId(), VENDOR_ID)).thenReturn(Optional.of(cart));
        when(dealRepo.findByVendorIdAndCatchAlertIdAndStatus(VENDOR_ID, ALERT_ID, DealStatus.NEGOTIATING))
                .thenReturn(Optional.empty());
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> {
            Deal d = inv.getArgument(0); d.setId(77L); return d;
        });
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartRepo.save(any(ProcurementCartItem.class))).thenAnswer(inv -> inv.getArgument(0));
        stubUsers();

        Deal result = service.startFromCartItem(VENDOR_ID, cart.getId());

        assertThat(result.getStatus()).isEqualTo(DealStatus.NEGOTIATING);
        assertThat(result.getVendorId()).isEqualTo(VENDOR_ID);
        assertThat(result.getFishermanId()).isEqualTo(FISHERMAN_ID);
        assertThat(result.getExpiresAt()).isAfter(alert.getExpiresAt());

        ArgumentCaptor<DealProposal> pCap = ArgumentCaptor.forClass(DealProposal.class);
        verify(proposalRepo).save(pCap.capture());
        DealProposal opening = pCap.getValue();
        assertThat(opening.getQtyKg()).isEqualByComparingTo("20");
        assertThat(opening.getPricePerKg()).isEqualByComparingTo("250");
        assertThat(opening.getProposedById()).isEqualTo(VENDOR_ID);
        assertThat(opening.getStatus()).isEqualTo(ProposalStatus.PENDING);

        assertThat(cart.getDeal()).isSameAs(result);
        verify(messageRepo).save(any(Message.class));
        verify(eventPublisher).runAfterCommit(any(Runnable.class));
        verify(eventPublisher).publishDealEvent(any(Deal.class), eq("DEAL_STARTED"), any());
        verify(eventPublisher).publishCompetitorCountChange(ALERT_ID);
    }

    @Test
    void startFromCartItem_rejectsIfExistingNegotiatingDeal() {
        CatchAlert alert = activeAlert(new BigDecimal("250"));
        ProcurementCartItem cart = cartItem(alert, new BigDecimal("20"));
        when(cartRepo.findByIdAndVendorId(cart.getId(), VENDOR_ID)).thenReturn(Optional.of(cart));
        Deal existing = new Deal(); existing.setId(123L); existing.setStatus(DealStatus.NEGOTIATING);
        when(dealRepo.findByVendorIdAndCatchAlertIdAndStatus(VENDOR_ID, ALERT_ID, DealStatus.NEGOTIATING))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.startFromCartItem(VENDOR_ID, cart.getId()))
                .isInstanceOf(DealConflictException.class);
        verify(dealRepo, never()).save(any(Deal.class));
    }

    @Test
    void startFromCartItem_rejectsIfAlertExpired() {
        CatchAlert alert = activeAlert(new BigDecimal("250"));
        alert.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        ProcurementCartItem cart = cartItem(alert, new BigDecimal("20"));
        when(cartRepo.findByIdAndVendorId(cart.getId(), VENDOR_ID)).thenReturn(Optional.of(cart));

        assertThatThrownBy(() -> service.startFromCartItem(VENDOR_ID, cart.getId()))
                .isInstanceOf(ListingClosedException.class);
    }

    @Test
    void startFromCartItem_rejectsIfAlertHasNoAskingPrice() {
        CatchAlert alert = activeAlert(null);
        ProcurementCartItem cart = cartItem(alert, new BigDecimal("20"));
        when(cartRepo.findByIdAndVendorId(cart.getId(), VENDOR_ID)).thenReturn(Optional.of(cart));

        assertThatThrownBy(() -> service.startFromCartItem(VENDOR_ID, cart.getId()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // =========================================================
    // submitProposal
    // =========================================================

    @Test
    void submitProposal_supersedesPriorPending() {
        Deal deal = negotiatingDeal();
        DealProposal prior = pending(deal, VENDOR_ID, new BigDecimal("20"), new BigDecimal("250"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findFirstByDealIdAndStatus(deal.getId(), ProposalStatus.PENDING))
                .thenReturn(Optional.of(prior));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> {
            DealProposal p = inv.getArgument(0);
            if (p.getId() == null) p.setId(2002L);
            return p;
        });
        stubUsers();

        DealProposal newP = service.submitProposal(FISHERMAN_ID, deal.getId(),
                new BigDecimal("18"), new BigDecimal("240"));

        assertThat(prior.getStatus()).isEqualTo(ProposalStatus.SUPERSEDED);
        assertThat(prior.getSupersededReason()).isEqualTo(DealService.SUPERSEDED_REASON_NEW_PROPOSAL);
        assertThat(newP.getStatus()).isEqualTo(ProposalStatus.PENDING);
        assertThat(newP.getProposedById()).isEqualTo(FISHERMAN_ID);
        assertThat(newP.getQtyKg()).isEqualByComparingTo("18");
        assertThat(newP.getPricePerKg()).isEqualByComparingTo("240");

        verify(eventPublisher).publishDealEvent(eq(deal), eq("PROPOSAL_CREATED"), any());
        verify(eventPublisher).publishProposalNotification(eq(VENDOR_ID), eq(deal.getId()),
                eq("DEAL_NEW_PROPOSAL"), any());

        // Critical: flush must happen between the SUPERSEDED update and the new PENDING insert
        // so the partial unique index uq_deal_proposals_pending does not see two PENDING rows.
        InOrder ord = inOrder(proposalRepo);
        ord.verify(proposalRepo).save(argThat(p -> p.getStatus() == ProposalStatus.SUPERSEDED));
        ord.verify(proposalRepo).flush();
        ord.verify(proposalRepo).save(argThat(p -> p.getStatus() == ProposalStatus.PENDING));
    }

    @Test
    void submitProposal_403ForNonParticipant() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.submitProposal(OUTSIDER_ID, deal.getId(),
                new BigDecimal("10"), new BigDecimal("200")))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void submitProposal_409IfDealTerminal() {
        Deal deal = negotiatingDeal();
        deal.setStatus(DealStatus.AGREED);
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.submitProposal(VENDOR_ID, deal.getId(),
                new BigDecimal("10"), new BigDecimal("200")))
                .isInstanceOf(DealConflictException.class);
    }

    // =========================================================
    // rejectProposal
    // =========================================================

    @Test
    void rejectProposal_403IfProposer() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("20"), new BigDecimal("250"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));

        // Vendor created it, so vendor cannot reject it.
        assertThatThrownBy(() -> service.rejectProposal(VENDOR_ID, deal.getId(), p.getId(), "nope"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void rejectProposal_keepsDealNegotiating() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("20"), new BigDecimal("250"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        stubUsers();

        DealProposal result = service.rejectProposal(FISHERMAN_ID, deal.getId(), p.getId(), "too low");

        assertThat(result.getStatus()).isEqualTo(ProposalStatus.REJECTED);
        assertThat(result.getRespondedById()).isEqualTo(FISHERMAN_ID);
        assertThat(result.getRespondedAt()).isNotNull();
        assertThat(deal.getStatus()).isEqualTo(DealStatus.NEGOTIATING);
        verify(eventPublisher).publishDealEvent(eq(deal), eq("PROPOSAL_RESPONDED"), any());
    }

    @Test
    void rejectProposal_409IfNotPending() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("20"), new BigDecimal("250"));
        p.setStatus(ProposalStatus.SUPERSEDED);
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.rejectProposal(FISHERMAN_ID, deal.getId(), p.getId(), "nope"))
                .isInstanceOf(DealConflictException.class);
    }

    // =========================================================
    // cancelDeal
    // =========================================================

    @Test
    void cancelDeal_setsCancelledAndSupersedesPending() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("20"), new BigDecimal("250"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(proposalRepo.findFirstByDealIdAndStatus(deal.getId(), ProposalStatus.PENDING))
                .thenReturn(Optional.of(p));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        stubUsers();

        Deal result = service.cancelDeal(VENDOR_ID, deal.getId(), "changed mind");

        assertThat(result.getStatus()).isEqualTo(DealStatus.CANCELLED);
        assertThat(result.getClosedAt()).isNotNull();
        assertThat(p.getStatus()).isEqualTo(ProposalStatus.SUPERSEDED);
        assertThat(p.getSupersededReason()).isEqualTo(DealService.SUPERSEDED_REASON_DEAL_CLOSED);
        verify(eventPublisher).publishDealEvent(eq(deal), eq("DEAL_CLOSED"), any());
        verify(eventPublisher).publishCompetitorCountChange(ALERT_ID);
    }

    @Test
    void cancelDeal_409IfTerminal() {
        Deal deal = negotiatingDeal();
        deal.setStatus(DealStatus.AGREED);
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.cancelDeal(VENDOR_ID, deal.getId(), "x"))
                .isInstanceOf(DealConflictException.class);
    }

    @Test
    void cancelDeal_403IfNonParticipant() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.cancelDeal(OUTSIDER_ID, deal.getId(), "x"))
                .isInstanceOf(AccessDeniedException.class);
    }

    // =========================================================
    // rejectDeal (fisherman-only)
    // =========================================================

    @Test
    void rejectDeal_fishermanOnly() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.rejectDeal(VENDOR_ID, deal.getId(), "no"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void rejectDeal_setsRejected() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(proposalRepo.findFirstByDealIdAndStatus(deal.getId(), ProposalStatus.PENDING))
                .thenReturn(Optional.empty());
        stubUsers();

        Deal result = service.rejectDeal(FISHERMAN_ID, deal.getId(), "wrong species");

        assertThat(result.getStatus()).isEqualTo(DealStatus.REJECTED);
        assertThat(result.getClosedAt()).isNotNull();
        verify(eventPublisher).publishDealEvent(eq(deal), eq("DEAL_CLOSED"), any());
    }

    // =========================================================
    // engageDeal
    // =========================================================

    @Test
    void engageDeal_setsTimestamp_idempotent() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));

        Deal first = service.engageDeal(FISHERMAN_ID, deal.getId());
        OffsetDateTime t = first.getFishermanEngagedAt();
        assertThat(t).isNotNull();

        Deal second = service.engageDeal(FISHERMAN_ID, deal.getId());
        assertThat(second.getFishermanEngagedAt()).isEqualTo(t);

        verify(eventPublisher, atLeastOnce()).publishDealEvent(eq(deal), eq("DEAL_ENGAGED"), any());
    }

    @Test
    void engageDeal_403IfVendor() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.engageDeal(VENDOR_ID, deal.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
