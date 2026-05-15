package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.event.OrderStatusChangeEvent;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class ProcurementOrderService {

    private static final Logger log = LoggerFactory.getLogger(ProcurementOrderService.class);

    private final CatchAlertRepository alertRepo;
    private final OrderRepository orderRepo;
    private final OrderStatusEventRepository eventRepo;
    private final FishSpeciesRepository speciesRepo;
    private final InventoryService inventoryService;
    private final ApplicationEventPublisher eventPublisher;

    public ProcurementOrderService(CatchAlertRepository alertRepo,
                                   OrderRepository orderRepo,
                                   OrderStatusEventRepository eventRepo,
                                   FishSpeciesRepository speciesRepo,
                                   InventoryService inventoryService,
                                   ApplicationEventPublisher eventPublisher) {
        this.alertRepo = alertRepo;
        this.orderRepo = orderRepo;
        this.eventRepo = eventRepo;
        this.speciesRepo = speciesRepo;
        this.inventoryService = inventoryService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<Order> listForVendor(Long vendorId, String bucket) {
        List<String> statuses = bucket != null ? switch (bucket.toUpperCase()) {
            case "PENDING"   -> List.of("PENDING");
            case "ACCEPTED"  -> List.of("ACCEPTED");
            case "READY"     -> List.of("READY");
            case "COMPLETED" -> List.of("COMPLETED");
            case "CANCELLED" -> List.of("CANCELLED");
            case "DISPUTED"  -> List.of("DISPUTED");
            default          -> List.of("PENDING", "ACCEPTED", "READY");
        } : List.of("PENDING", "ACCEPTED", "READY");
        return orderRepo.findByBuyerIdAndKindAndStatusIn(vendorId, OrderKind.PROCUREMENT, statuses);
    }

    /**
     * Create a RETAIL order from an agreed Deal/Proposal. Locks the catch alert row,
     * increments claimed_kg, marks the alert SOLD if fully claimed, persists the order
     * linked back to the deal, and records the initial PENDING status event.
     *
     * @throws ListingClosedException if the alert is no longer ACTIVE/within expiry, or
     *         if accepting this proposal would overcommit the alert.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Order createFromAgreement(Deal deal, DealProposal proposal) {
        Long alertId = deal.getCatchAlert().getId();
        List<CatchAlert> locked = alertRepo.findByIdInForUpdate(List.of(alertId));
        if (locked.isEmpty()) {
            throw new ResourceNotFoundException("Alert " + alertId);
        }
        CatchAlert alert = locked.get(0);
        if (!"ACTIVE".equals(alert.getStatus()) || alert.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ListingClosedException("Alert " + alert.getId() + " no longer available");
        }
        BigDecimal newClaimed = alert.getClaimedKg().add(proposal.getQtyKg());
        if (alert.getQuantityKg() != null && newClaimed.compareTo(alert.getQuantityKg()) > 0) {
            BigDecimal remaining = alert.getQuantityKg().subtract(alert.getClaimedKg());
            throw new ListingClosedException("Only " + remaining + "kg remaining");
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
        order.setDeal(deal);
        order.setOrderedQtyKg(proposal.getQtyKg());
        order.setAgreedPricePerKg(proposal.getPricePerKg());
        order.setStatus("PENDING");
        Order saved = orderRepo.save(order);
        recordEvent(saved.getId(), "PENDING", deal.getVendorId(),
                "Order placed via deal " + deal.getId(),
                deal.getVendorId(), deal.getFishermanId());
        return saved;
    }

    @Transactional
    public Order placePreorder(Long vendorId, Long fishermanId, Long speciesId,
                               BigDecimal qtyKg, BigDecimal pricePerKg, String notes) {
        FishSpecies species = speciesRepo.findById(speciesId)
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + speciesId));
        Order order = new Order();
        order.setKind(OrderKind.RETAIL);
        order.setBuyerId(vendorId);
        order.setSellerId(fishermanId);
        order.setSpecies(species);
        order.setOrderedQtyKg(qtyKg);
        order.setAgreedPricePerKg(pricePerKg);
        order.setNotes(notes);
        order.setStatus("PENDING");
        Order saved = orderRepo.save(order);
        recordEvent(saved.getId(), "PENDING", vendorId, "Preorder placed",
                vendorId, fishermanId);
        return saved;
    }

    @Transactional
    public Order vendorCancel(Long vendorId, Long orderId, String reason) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!vendorId.equals(order.getBuyerId()) || !OrderKind.PROCUREMENT.equals(order.getKind())) {
            throw new AccessDeniedException("Order does not belong to this vendor");
        }
        String from = order.getStatus();
        if (!"PENDING".equals(from) && !"ACCEPTED".equals(from)) {
            throw new IllegalArgumentException("Cannot cancel procurement order in status " + from);
        }
        order.setStatus("CANCELLED");
        orderRepo.save(order);
        releaseClaim(orderId, order);
        String note = reason != null ? "Cancelled by vendor: " + reason : "Cancelled by vendor";
        recordEvent(orderId, "CANCELLED", vendorId, note, vendorId, order.getSellerId());
        return order;
    }

    @Transactional
    public void releaseClaim(Long orderId) {
        Order o = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        releaseClaim(orderId, o);
    }

    private void releaseClaim(Long orderId, Order order) {
        if (!OrderKind.PROCUREMENT.equals(order.getKind()) || order.getCatchAlertId() == null) return;
        List<CatchAlert> locked = alertRepo.findByIdInForUpdate(List.of(order.getCatchAlertId()));
        if (locked.isEmpty()) return;
        CatchAlert alert = locked.get(0);
        BigDecimal restored = alert.getClaimedKg().subtract(order.getOrderedQtyKg())
                .max(BigDecimal.ZERO);
        alert.setClaimedKg(restored);
        alertRepo.save(alert);
    }

    @Transactional
    public Order fishermanComplete(Long fishermanId, Long orderId) {
        Order order = fishermanTransition(fishermanId, orderId, "COMPLETED", "Order completed by fisherman");
        inventoryService.addLotFromProcurement(orderId);
        return order;
    }

    @Transactional
    public Order fishermanAccept(Long fishermanId, Long orderId) {
        return fishermanTransition(fishermanId, orderId, "ACCEPTED", "Order accepted by fisherman");
    }

    @Transactional
    public Order fishermanMarkReady(Long fishermanId, Long orderId) {
        return fishermanTransition(fishermanId, orderId, "READY", "Order ready");
    }

    @Transactional
    public Order fishermanCancel(Long fishermanId, Long orderId, String reason) {
        Order order = fishermanTransition(fishermanId, orderId, "CANCELLED",
                reason != null ? "Cancelled by fisherman: " + reason : "Cancelled by fisherman");
        releaseClaim(orderId, order);
        return order;
    }

    @Transactional(readOnly = true)
    public List<Order> listForFisherman(Long fishermanId, String bucket) {
        List<String> statuses = bucket != null ? switch (bucket.toUpperCase()) {
            case "PENDING"   -> List.of("PENDING");
            case "ACCEPTED"  -> List.of("ACCEPTED");
            case "READY"     -> List.of("READY");
            case "COMPLETED" -> List.of("COMPLETED");
            case "CANCELLED" -> List.of("CANCELLED");
            case "DISPUTED"  -> List.of("DISPUTED");
            default          -> List.of("PENDING", "ACCEPTED", "READY");
        } : List.of("PENDING", "ACCEPTED", "READY");
        return orderRepo.findBySellerIdAndKindAndStatusIn(fishermanId, OrderKind.PROCUREMENT, statuses);
    }

    private Order fishermanTransition(Long fishermanId, Long orderId, String toStatus, String note) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!fishermanId.equals(order.getSellerId()) || !OrderKind.PROCUREMENT.equals(order.getKind())) {
            throw new AccessDeniedException("Order does not belong to this fisherman");
        }
        String from = order.getStatus();
        boolean valid = switch (toStatus) {
            case "ACCEPTED"  -> "PENDING".equals(from);
            case "READY"     -> "ACCEPTED".equals(from);
            case "COMPLETED" -> "READY".equals(from);
            case "CANCELLED" -> "PENDING".equals(from) || "ACCEPTED".equals(from);
            default          -> false;
        };
        if (!valid) {
            throw new IllegalArgumentException("Cannot transition order " + orderId
                    + " from " + from + " to " + toStatus);
        }
        order.setStatus(toStatus);
        Order saved = orderRepo.save(order);
        recordEvent(orderId, toStatus, fishermanId, note, saved.getBuyerId(), fishermanId);
        return saved;
    }

    @Transactional
    public Order settle(Long vendorId, Long orderId, String paymentMethod, String settleNotes) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!vendorId.equals(order.getBuyerId()) || !OrderKind.PROCUREMENT.equals(order.getKind())) {
            throw new AccessDeniedException("Order does not belong to this vendor");
        }
        if (!"COMPLETED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Can only settle a COMPLETED order; current status: " + order.getStatus());
        }
        if (order.getSettledAt() != null) return order;
        order.setPaymentMethod(paymentMethod);
        order.setSettledAt(OffsetDateTime.now());
        order.setSettleNotes(settleNotes);
        return orderRepo.save(order);
    }

    private void recordEvent(Long orderId, String status, Long actorId, String note,
                             Long buyerId, Long sellerId) {
        try {
            OrderStatusEvent ev = new OrderStatusEvent();
            ev.setOrderId(orderId);
            ev.setStatus(status);
            ev.setActorId(actorId);
            ev.setNote(note);
            eventRepo.save(ev);
            eventPublisher.publishEvent(new OrderStatusChangeEvent(
                    this, orderId, buyerId, sellerId, status, note));
        } catch (Exception e) {
            log.warn("Failed to record event for order {}: {}", orderId, e.getMessage());
        }
    }
}
