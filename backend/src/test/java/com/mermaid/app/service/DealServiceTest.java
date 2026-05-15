package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealProposal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.Order;
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
import java.util.List;
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
    @Mock ProcurementOrderService procurementOrderService;

    DealService service;

    @BeforeEach
    void setUp() {
        service = new DealService(dealRepo, proposalRepo, cartRepo, messageRepo, userRepo,
                eventPublisher, procurementOrderService);
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

    // =========================================================
    // acceptProposal
    // =========================================================

    private Order stubOrder(Long id, Deal deal, DealProposal proposal) {
        Order o = new Order();
        o.setId(id);
        o.setBuyerId(deal.getVendorId());
        o.setSellerId(deal.getFishermanId());
        o.setOrderedQtyKg(proposal.getQtyKg());
        o.setAgreedPricePerKg(proposal.getPricePerKg());
        o.setStatus("PENDING");
        o.setDeal(deal);
        return o;
    }

    @Test
    void acceptProposal_happyPath_createsOrderAndAgreesDeal() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("15"), new BigDecimal("240"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));
        when(procurementOrderService.createFromAgreement(deal, p))
                .thenReturn(stubOrder(77L, deal, p));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dealRepo.findByCatchAlertIdAndStatus(ALERT_ID, DealStatus.NEGOTIATING))
                .thenReturn(List.of(deal));
        ProcurementCartItem cart = new ProcurementCartItem();
        cart.setId(500L);
        when(cartRepo.findByDealId(deal.getId())).thenReturn(Optional.of(cart));
        stubUsers();

        DealService.AcceptResult result = service.acceptProposal(FISHERMAN_ID, deal.getId(), p.getId());

        assertThat(result.order().getId()).isEqualTo(77L);
        assertThat(deal.getStatus()).isEqualTo(DealStatus.AGREED);
        assertThat(deal.getAgreedQtyKg()).isEqualByComparingTo("15");
        assertThat(deal.getAgreedPricePerKg()).isEqualByComparingTo("240");
        assertThat(deal.getAgreedAt()).isNotNull();
        assertThat(deal.getClosedAt()).isNotNull();
        assertThat(deal.getOrderId()).isEqualTo(77L);

        assertThat(p.getStatus()).isEqualTo(ProposalStatus.ACCEPTED);
        assertThat(p.getRespondedById()).isEqualTo(FISHERMAN_ID);
        assertThat(p.getRespondedAt()).isNotNull();

        verify(cartRepo).delete(cart);
        verify(eventPublisher).publishDealEvent(eq(deal), eq("DEAL_AGREED"), any());
        verify(eventPublisher).publishCompetitorCountChange(ALERT_ID);
        verify(eventPublisher).publishProposalNotification(eq(VENDOR_ID), eq(deal.getId()),
                eq("DEAL_AGREED"), any());
    }

    @Test
    void acceptProposal_rejectsSelfAccept() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("15"), new BigDecimal("240"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));

        // Vendor proposed it, so vendor accepting their own = conflict.
        assertThatThrownBy(() -> service.acceptProposal(VENDOR_ID, deal.getId(), p.getId()))
                .isInstanceOf(DealConflictException.class)
                .hasMessageContaining("own proposal");
    }

    @Test
    void acceptProposal_rejectsTerminalDeal() {
        Deal deal = negotiatingDeal();
        deal.setStatus(DealStatus.AGREED);
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.acceptProposal(FISHERMAN_ID, deal.getId(), 1001L))
                .isInstanceOf(DealConflictException.class);
    }

    @Test
    void acceptProposal_rejectsTerminalProposal() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("15"), new BigDecimal("240"));
        p.setStatus(ProposalStatus.SUPERSEDED);
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.acceptProposal(FISHERMAN_ID, deal.getId(), p.getId()))
                .isInstanceOf(DealConflictException.class);
    }

    @Test
    void acceptProposal_rejectsNonParticipant() {
        Deal deal = negotiatingDeal();
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));

        assertThatThrownBy(() -> service.acceptProposal(OUTSIDER_ID, deal.getId(), 1001L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void acceptProposal_overcommit_marksSuperseded_andRethrows() {
        Deal deal = negotiatingDeal();
        DealProposal p = pending(deal, VENDOR_ID, new BigDecimal("60"), new BigDecimal("240"));
        when(dealRepo.findByIdForUpdate(deal.getId())).thenReturn(Optional.of(deal));
        when(proposalRepo.findById(p.getId())).thenReturn(Optional.of(p));
        when(procurementOrderService.createFromAgreement(deal, p))
                .thenThrow(new ListingClosedException("Only 10kg remaining"));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        stubUsers();

        assertThatThrownBy(() -> service.acceptProposal(FISHERMAN_ID, deal.getId(), p.getId()))
                .isInstanceOf(ListingClosedException.class);

        assertThat(p.getStatus()).isEqualTo(ProposalStatus.SUPERSEDED);
        assertThat(p.getSupersededReason()).isEqualTo(DealService.SUPERSEDED_REASON_OVERCOMMIT);
        assertThat(deal.getStatus()).isEqualTo(DealStatus.NEGOTIATING);
        verify(eventPublisher).publishDealEvent(eq(deal), eq("PROPOSAL_SUPERSEDED"), any());
    }

    @Test
    void acceptProposal_sweep_supersedesOvercommittedPeerProposals() {
        // Primary deal: vendor proposes 40kg of 50, leaving 10kg remaining.
        Deal primary = negotiatingDeal();
        primary.getCatchAlert().setQuantityKg(new BigDecimal("50"));
        // Simulate: after order creation, alert.claimedKg = 40 (so remaining = 10).
        primary.getCatchAlert().setClaimedKg(new BigDecimal("40"));
        DealProposal primaryProp = pending(primary, VENDOR_ID, new BigDecimal("40"), new BigDecimal("240"));

        Deal peerA = new Deal();
        peerA.setId(78L);
        peerA.setVendorId(11L);
        peerA.setFishermanId(FISHERMAN_ID);
        peerA.setStatus(DealStatus.NEGOTIATING);
        peerA.setCatchAlert(primary.getCatchAlert());
        DealProposal peerAProp = pending(peerA, 11L, new BigDecimal("25"), new BigDecimal("230"));
        peerAProp.setId(2001L);

        Deal peerB = new Deal();
        peerB.setId(79L);
        peerB.setVendorId(12L);
        peerB.setFishermanId(FISHERMAN_ID);
        peerB.setStatus(DealStatus.NEGOTIATING);
        peerB.setCatchAlert(primary.getCatchAlert());
        DealProposal peerBProp = pending(peerB, 12L, new BigDecimal("5"), new BigDecimal("230"));
        peerBProp.setId(2002L);

        when(dealRepo.findByIdForUpdate(primary.getId())).thenReturn(Optional.of(primary));
        when(proposalRepo.findById(primaryProp.getId())).thenReturn(Optional.of(primaryProp));
        when(procurementOrderService.createFromAgreement(primary, primaryProp))
                .thenReturn(stubOrder(77L, primary, primaryProp));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dealRepo.findByCatchAlertIdAndStatus(ALERT_ID, DealStatus.NEGOTIATING))
                .thenReturn(List.of(primary, peerA, peerB));
        when(proposalRepo.findFirstByDealIdAndStatus(peerA.getId(), ProposalStatus.PENDING))
                .thenReturn(Optional.of(peerAProp));
        when(proposalRepo.findFirstByDealIdAndStatus(peerB.getId(), ProposalStatus.PENDING))
                .thenReturn(Optional.of(peerBProp));
        when(cartRepo.findByDealId(primary.getId())).thenReturn(Optional.empty());
        stubUsers();
        User v11 = new User(); v11.setId(11L);
        User v12 = new User(); v12.setId(12L);
        lenient().when(userRepo.findById(11L)).thenReturn(Optional.of(v11));
        lenient().when(userRepo.findById(12L)).thenReturn(Optional.of(v12));

        service.acceptProposal(FISHERMAN_ID, primary.getId(), primaryProp.getId());

        // peerA's 25kg > remaining 10 → SUPERSEDED OVERCOMMIT
        assertThat(peerAProp.getStatus()).isEqualTo(ProposalStatus.SUPERSEDED);
        assertThat(peerAProp.getSupersededReason()).isEqualTo(DealService.SUPERSEDED_REASON_OVERCOMMIT);
        // peerB's 5kg ≤ remaining 10 → stays PENDING
        assertThat(peerBProp.getStatus()).isEqualTo(ProposalStatus.PENDING);
        // peerA deal stays NEGOTIATING (only the proposal got superseded, vendor can counter)
        assertThat(peerA.getStatus()).isEqualTo(DealStatus.NEGOTIATING);
        verify(eventPublisher).publishDealEvent(eq(peerA), eq("PROPOSAL_SUPERSEDED"), any());
    }

    @Test
    void acceptProposal_sweep_cancelsAllPeersWhenSoldOut() {
        // Alert sold out: claimedKg == quantityKg after order creation.
        Deal primary = negotiatingDeal();
        primary.getCatchAlert().setQuantityKg(new BigDecimal("50"));
        primary.getCatchAlert().setClaimedKg(new BigDecimal("50"));
        DealProposal primaryProp = pending(primary, VENDOR_ID, new BigDecimal("50"), new BigDecimal("240"));

        Deal peerA = new Deal();
        peerA.setId(78L);
        peerA.setVendorId(11L);
        peerA.setFishermanId(FISHERMAN_ID);
        peerA.setStatus(DealStatus.NEGOTIATING);
        peerA.setCatchAlert(primary.getCatchAlert());
        DealProposal peerAProp = pending(peerA, 11L, new BigDecimal("10"), new BigDecimal("230"));
        peerAProp.setId(2001L);

        when(dealRepo.findByIdForUpdate(primary.getId())).thenReturn(Optional.of(primary));
        when(proposalRepo.findById(primaryProp.getId())).thenReturn(Optional.of(primaryProp));
        when(procurementOrderService.createFromAgreement(primary, primaryProp))
                .thenReturn(stubOrder(77L, primary, primaryProp));
        when(dealRepo.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(proposalRepo.save(any(DealProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dealRepo.findByCatchAlertIdAndStatus(ALERT_ID, DealStatus.NEGOTIATING))
                .thenReturn(List.of(primary, peerA));
        when(proposalRepo.findFirstByDealIdAndStatus(peerA.getId(), ProposalStatus.PENDING))
                .thenReturn(Optional.of(peerAProp));
        when(cartRepo.findByDealId(primary.getId())).thenReturn(Optional.empty());
        stubUsers();
        User v11 = new User(); v11.setId(11L);
        lenient().when(userRepo.findById(11L)).thenReturn(Optional.of(v11));

        service.acceptProposal(FISHERMAN_ID, primary.getId(), primaryProp.getId());

        assertThat(peerA.getStatus()).isEqualTo(DealStatus.CANCELLED);
        assertThat(peerA.getClosedAt()).isNotNull();
        assertThat(peerAProp.getStatus()).isEqualTo(ProposalStatus.SUPERSEDED);
        assertThat(peerAProp.getSupersededReason()).isEqualTo(DealService.SUPERSEDED_REASON_OVERCOMMIT);
        verify(eventPublisher).publishDealEvent(eq(peerA), eq("DEAL_CLOSED"),
                argThat(m -> ((java.util.Map<?,?>) m).get("reason").equals(DealService.CLOSED_REASON_ALERT_SOLD_OUT)));
    }
}
