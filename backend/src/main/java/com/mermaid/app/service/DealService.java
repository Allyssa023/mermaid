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
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.DealProposalRepository;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.ProcurementCartItemRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Orchestrates the deal negotiation lifecycle: start, propose, reject single
 * proposal, cancel, fisherman-only reject and engage.
 *
 * <p>The {@code acceptProposal} flow (which creates an Order and sweeps competing
 * deals) is intentionally implemented in a separate change.</p>
 */
@Service
public class DealService {

    /** Grace period appended to the alert's own expiry when seeding a new deal. */
    static final Duration ALERT_GRACE = Duration.ofMinutes(30);

    static final String MSG_PREFIX_SYSTEM = "[SYSTEM] ";
    static final String MSG_PREFIX_PROPOSAL = "[PROPOSAL] ";
    static final String SUPERSEDED_REASON_NEW_PROPOSAL = "NEW_PROPOSAL";
    static final String SUPERSEDED_REASON_DEAL_CLOSED = "DEAL_CLOSED";

    private final DealRepository dealRepo;
    private final DealProposalRepository proposalRepo;
    private final ProcurementCartItemRepository cartRepo;
    private final MessageRepository messageRepo;
    private final UserRepository userRepo;
    private final DealEventPublisher eventPublisher;

    public DealService(DealRepository dealRepo,
                       DealProposalRepository proposalRepo,
                       ProcurementCartItemRepository cartRepo,
                       MessageRepository messageRepo,
                       UserRepository userRepo,
                       DealEventPublisher eventPublisher) {
        this.dealRepo = dealRepo;
        this.proposalRepo = proposalRepo;
        this.cartRepo = cartRepo;
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
        this.eventPublisher = eventPublisher;
    }

    // ------------------------------------------------------------------
    // Start
    // ------------------------------------------------------------------

    @Transactional
    public Deal startFromCartItem(Long vendorId, Long cartItemId) {
        ProcurementCartItem cart = cartRepo.findByIdAndVendorId(cartItemId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + cartItemId));

        // If the cart item is already linked to a non-terminal deal, refuse.
        if (cart.getDeal() != null && cart.getDeal().getStatus() == DealStatus.NEGOTIATING) {
            throw new DealConflictException("Cart item " + cartItemId
                    + " is already linked to deal " + cart.getDeal().getId());
        }

        CatchAlert alert = cart.getCatchAlert();
        if (alert == null) {
            throw new ResourceNotFoundException("Cart item " + cartItemId + " has no catch alert");
        }
        if (!"ACTIVE".equals(alert.getStatus())
                || alert.getExpiresAt() == null
                || alert.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ListingClosedException("Catch alert " + alert.getId() + " is no longer available");
        }
        if (alert.getAskingPricePerKg() == null) {
            throw new IllegalArgumentException("Catch alert " + alert.getId() + " has no asking price");
        }

        // No overlapping active negotiation for this (vendor, alert).
        dealRepo.findByVendorIdAndCatchAlertIdAndStatus(vendorId, alert.getId(), DealStatus.NEGOTIATING)
                .ifPresent(existing -> {
                    throw new DealConflictException("Already negotiating on alert " + alert.getId()
                            + " (deal " + existing.getId() + ")");
                });

        OffsetDateTime now = OffsetDateTime.now();
        Deal deal = new Deal();
        deal.setCatchAlert(alert);
        deal.setVendorId(vendorId);
        deal.setFishermanId(alert.getFishermanId());
        deal.setStatus(DealStatus.NEGOTIATING);
        deal.setExpiresAt(alert.getExpiresAt().plus(ALERT_GRACE));
        deal.setCreatedAt(now);
        Deal saved = dealRepo.save(deal);

        DealProposal opening = new DealProposal();
        opening.setDeal(saved);
        opening.setProposedById(vendorId);
        opening.setQtyKg(cart.getQtyKg());
        opening.setPricePerKg(alert.getAskingPricePerKg());
        opening.setStatus(ProposalStatus.PENDING);
        proposalRepo.save(opening);

        cart.setDeal(saved);
        cartRepo.save(cart);

        insertSystemMessage(saved, vendorId, saved.getFishermanId(),
                "Vendor wants " + cart.getQtyKg() + "kg @ ₱" + alert.getAskingPricePerKg() + "/kg.");

        Long alertId = alert.getId();
        Long dealId = saved.getId();
        Long fishermanId = saved.getFishermanId();
        BigDecimal qty = cart.getQtyKg();
        BigDecimal price = alert.getAskingPricePerKg();
        eventPublisher.runAfterCommit(() -> {
            eventPublisher.publishDealEvent(saved, "DEAL_STARTED", Map.of(
                    "alertId", alertId,
                    "vendorId", vendorId,
                    "fishermanId", fishermanId,
                    "openingProposal", Map.of("qtyKg", qty, "pricePerKg", price)
            ));
            eventPublisher.publishProposalNotification(fishermanId, dealId, "DEAL_NEW_PROPOSAL",
                    "New deal: " + qty + "kg @ ₱" + price + "/kg");
            eventPublisher.publishCompetitorCountChange(alertId);
        });

        return saved;
    }

    // ------------------------------------------------------------------
    // Submit proposal
    // ------------------------------------------------------------------

    @Transactional
    public DealProposal submitProposal(Long callerId, Long dealId, BigDecimal qtyKg, BigDecimal pricePerKg) {
        if (qtyKg == null || qtyKg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("qtyKg must be positive");
        }
        if (pricePerKg == null || pricePerKg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("pricePerKg must be positive");
        }
        Deal deal = dealRepo.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
        requireParticipant(deal, callerId);
        if (deal.getStatus() != DealStatus.NEGOTIATING) {
            throw new DealConflictException("Deal " + dealId + " is " + deal.getStatus());
        }

        Long supersededId = null;
        Optional<DealProposal> prior = proposalRepo.findFirstByDealIdAndStatus(dealId, ProposalStatus.PENDING);
        if (prior.isPresent()) {
            DealProposal p = prior.get();
            p.setStatus(ProposalStatus.SUPERSEDED);
            p.setSupersededReason(SUPERSEDED_REASON_NEW_PROPOSAL);
            proposalRepo.save(p);
            // Force the SUPERSEDED UPDATE to hit the DB before the new PENDING INSERT so that
            // the partial unique index uq_deal_proposals_pending does not see two PENDING rows
            // mid-flush. Without this Hibernate may reorder writes and trip a spurious 23505.
            proposalRepo.flush();
            supersededId = p.getId();
        }

        DealProposal proposal = new DealProposal();
        proposal.setDeal(deal);
        proposal.setProposedById(callerId);
        proposal.setQtyKg(qtyKg);
        proposal.setPricePerKg(pricePerKg);
        proposal.setStatus(ProposalStatus.PENDING);
        DealProposal saved = proposalRepo.save(proposal);

        Long otherParty = deal.getVendorId().equals(callerId)
                ? deal.getFishermanId()
                : deal.getVendorId();

        insertProposalMessage(deal, callerId, otherParty, qtyKg, pricePerKg);

        Long sid = supersededId;
        eventPublisher.runAfterCommit(() -> {
            Map<String, Object> payload = sid == null
                    ? Map.of("proposalId", saved.getId(), "proposedById", callerId,
                             "qtyKg", qtyKg, "pricePerKg", pricePerKg)
                    : Map.of("proposalId", saved.getId(), "proposedById", callerId,
                             "qtyKg", qtyKg, "pricePerKg", pricePerKg,
                             "supersededProposalId", sid);
            eventPublisher.publishDealEvent(deal, "PROPOSAL_CREATED", payload);
            eventPublisher.publishProposalNotification(otherParty, dealId, "DEAL_NEW_PROPOSAL",
                    "Counter-offer: " + qtyKg + "kg @ ₱" + pricePerKg + "/kg");
        });

        return saved;
    }

    // ------------------------------------------------------------------
    // Reject single proposal (counterparty only)
    // ------------------------------------------------------------------

    @Transactional
    public DealProposal rejectProposal(Long callerId, Long dealId, Long proposalId, String reason) {
        Deal deal = dealRepo.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
        requireParticipant(deal, callerId);
        if (deal.getStatus() != DealStatus.NEGOTIATING) {
            throw new DealConflictException("Deal " + dealId + " is " + deal.getStatus());
        }

        DealProposal proposal = proposalRepo.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal " + proposalId));
        if (proposal.getDeal() == null || !dealId.equals(proposal.getDeal().getId())) {
            throw new ResourceNotFoundException("Proposal " + proposalId + " not on deal " + dealId);
        }
        if (proposal.getStatus() != ProposalStatus.PENDING) {
            throw new DealConflictException("Proposal already " + proposal.getStatus());
        }
        if (callerId.equals(proposal.getProposedById())) {
            throw new AccessDeniedException("Cannot reject your own proposal");
        }

        OffsetDateTime now = OffsetDateTime.now();
        proposal.setStatus(ProposalStatus.REJECTED);
        proposal.setRespondedById(callerId);
        proposal.setRespondedAt(now);
        DealProposal saved = proposalRepo.save(proposal);

        Long otherParty = deal.getVendorId().equals(callerId)
                ? deal.getFishermanId()
                : deal.getVendorId();
        String safeReason = reason == null || reason.isBlank() ? "no reason given" : reason;
        insertSystemMessage(deal, callerId, otherParty,
                "Proposal rejected: " + safeReason);

        eventPublisher.runAfterCommit(() ->
                eventPublisher.publishDealEvent(deal, "PROPOSAL_RESPONDED", Map.of(
                        "proposalId", saved.getId(),
                        "status", ProposalStatus.REJECTED.name(),
                        "respondedById", callerId,
                        "reason", safeReason
                )));
        return saved;
    }

    // ------------------------------------------------------------------
    // Cancel deal (either participant)
    // ------------------------------------------------------------------

    @Transactional
    public Deal cancelDeal(Long callerId, Long dealId, String reason) {
        return closeDeal(callerId, dealId, reason, DealStatus.CANCELLED, /*fishermanOnly*/ false);
    }

    // ------------------------------------------------------------------
    // Reject deal (fisherman only — row-level reject)
    // ------------------------------------------------------------------

    @Transactional
    public Deal rejectDeal(Long fishermanId, Long dealId, String reason) {
        return closeDeal(fishermanId, dealId, reason, DealStatus.REJECTED, /*fishermanOnly*/ true);
    }

    private Deal closeDeal(Long callerId, Long dealId, String reason,
                           DealStatus terminal, boolean fishermanOnly) {
        Deal deal = dealRepo.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
        if (fishermanOnly) {
            if (!deal.getFishermanId().equals(callerId)) {
                throw new AccessDeniedException("Only the fisherman can reject this deal");
            }
        } else {
            requireParticipant(deal, callerId);
        }
        if (deal.getStatus() != DealStatus.NEGOTIATING) {
            throw new DealConflictException("Deal " + dealId + " is " + deal.getStatus());
        }

        OffsetDateTime now = OffsetDateTime.now();
        deal.setStatus(terminal);
        deal.setClosedAt(now);
        Deal saved = dealRepo.save(deal);

        proposalRepo.findFirstByDealIdAndStatus(dealId, ProposalStatus.PENDING).ifPresent(p -> {
            p.setStatus(ProposalStatus.SUPERSEDED);
            p.setSupersededReason(SUPERSEDED_REASON_DEAL_CLOSED);
            proposalRepo.save(p);
        });

        Long otherParty = deal.getVendorId().equals(callerId)
                ? deal.getFishermanId()
                : deal.getVendorId();
        String safeReason = reason == null || reason.isBlank() ? "no reason given" : reason;
        String verb = terminal == DealStatus.REJECTED ? "rejected" : "cancelled";
        insertSystemMessage(deal, callerId, otherParty,
                "Deal " + verb + ": " + safeReason);

        Long alertId = deal.getCatchAlert() != null ? deal.getCatchAlert().getId() : null;
        eventPublisher.runAfterCommit(() -> {
            eventPublisher.publishDealEvent(saved, "DEAL_CLOSED", Map.of(
                    "status", terminal.name(),
                    "reason", safeReason
            ));
            if (alertId != null) {
                eventPublisher.publishCompetitorCountChange(alertId);
            }
        });
        return saved;
    }

    // ------------------------------------------------------------------
    // Engage (fisherman only, idempotent)
    // ------------------------------------------------------------------

    @Transactional
    public Deal engageDeal(Long fishermanId, Long dealId) {
        Deal deal = dealRepo.findByIdForUpdate(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
        if (!deal.getFishermanId().equals(fishermanId)) {
            throw new AccessDeniedException("Only the fisherman can engage this deal");
        }
        if (deal.getStatus() != DealStatus.NEGOTIATING) {
            throw new DealConflictException("Deal " + dealId + " is " + deal.getStatus());
        }
        if (deal.getFishermanEngagedAt() != null) {
            return deal; // idempotent
        }
        deal.setFishermanEngagedAt(OffsetDateTime.now());
        Deal saved = dealRepo.save(deal);
        eventPublisher.runAfterCommit(() ->
                eventPublisher.publishDealEvent(saved, "DEAL_ENGAGED", Map.of(
                        "engagedAt", saved.getFishermanEngagedAt()
                )));
        return saved;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void requireParticipant(Deal deal, Long userId) {
        if (!deal.getVendorId().equals(userId) && !deal.getFishermanId().equals(userId)) {
            throw new AccessDeniedException("Not a participant of deal " + deal.getId());
        }
    }

    private void insertSystemMessage(Deal deal, Long senderId, Long recipientId, String body) {
        insertMessage(deal, senderId, recipientId, MSG_PREFIX_SYSTEM + body);
    }

    private void insertProposalMessage(Deal deal, Long senderId, Long recipientId,
                                       BigDecimal qtyKg, BigDecimal pricePerKg) {
        String body = MSG_PREFIX_PROPOSAL
                + "qty=" + qtyKg
                + ",price=" + pricePerKg;
        insertMessage(deal, senderId, recipientId, body);
    }

    private void insertMessage(Deal deal, Long senderId, Long recipientId, String content) {
        User sender = userRepo.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User " + senderId));
        User recipient = userRepo.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("User " + recipientId));
        Message m = new Message();
        m.setSender(sender);
        m.setRecipient(recipient);
        m.setContent(content);
        m.setDeal(deal);
        m.setSentAt(OffsetDateTime.now());
        messageRepo.save(m);
    }
}
