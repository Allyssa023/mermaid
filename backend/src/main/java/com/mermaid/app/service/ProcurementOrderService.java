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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProcurementOrderService {

    private static final Logger log = LoggerFactory.getLogger(ProcurementOrderService.class);

    private final ProcurementCartItemRepository cartRepo;
    private final CatchAlertRepository alertRepo;
    private final OrderRepository orderRepo;
    private final OrderStatusEventRepository eventRepo;
    private final FishSpeciesRepository speciesRepo;
    private final InventoryService inventoryService;
    private final ApplicationEventPublisher eventPublisher;

    public ProcurementOrderService(ProcurementCartItemRepository cartRepo,
                                   CatchAlertRepository alertRepo,
                                   OrderRepository orderRepo,
                                   OrderStatusEventRepository eventRepo,
                                   FishSpeciesRepository speciesRepo,
                                   InventoryService inventoryService,
                                   ApplicationEventPublisher eventPublisher) {
        this.cartRepo = cartRepo;
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

    @Transactional
    public List<Order> checkout(Long vendorId) {
        List<ProcurementCartItem> items = cartRepo.findAllByVendorIdOrderByCreatedAtAsc(vendorId);
        if (items.isEmpty()) throw new IllegalArgumentException("Procurement cart is empty");

        List<Long> alertIds = items.stream()
                .map(i -> i.getCatchAlert().getId())
                .distinct().sorted().collect(Collectors.toList());

        List<CatchAlert> locked = alertRepo.findByIdInForUpdate(alertIds);
        var lockedMap = locked.stream().collect(Collectors.toMap(CatchAlert::getId, a -> a));

        List<Order> created = new ArrayList<>();
        for (ProcurementCartItem item : items) {
            CatchAlert alert = lockedMap.get(item.getCatchAlert().getId());
            if (alert == null || !"ACTIVE".equals(alert.getStatus())
                    || alert.getExpiresAt().isBefore(OffsetDateTime.now())) {
                throw new ListingClosedException("Alert " + item.getCatchAlert().getId() + " is no longer available");
            }
            BigDecimal newClaimed = alert.getClaimedKg().add(item.getQtyKg());
            if (alert.getQuantityKg() != null && newClaimed.compareTo(alert.getQuantityKg()) > 0) {
                throw new ListingClosedException("Alert " + alert.getId() + " would be overcommitted");
            }
            alert.setClaimedKg(newClaimed);
            alertRepo.save(alert);

            Order order = new Order();
            order.setKind(OrderKind.PROCUREMENT);
            order.setBuyerId(vendorId);
            order.setSellerId(alert.getFishermanId());
            order.setSpecies(alert.getSpecies());
            order.setCatchAlertId(alert.getId());
            order.setOrderedQtyKg(item.getQtyKg());
            order.setAgreedPricePerKg(item.getOfferedPricePerKg() != null
                    ? item.getOfferedPricePerKg() : alert.getAskingPricePerKg());
            order.setStatus("PENDING");
            Order saved = orderRepo.save(order);
            recordEvent(saved.getId(), "PENDING", vendorId, "Procurement order placed",
                    vendorId, alert.getFishermanId());
            created.add(saved);
        }
        cartRepo.deleteAllByVendorId(vendorId);
        return created;
    }

    @Transactional
    public Order placePreorder(Long vendorId, Long fishermanId, Long speciesId,
                               BigDecimal qtyKg, BigDecimal pricePerKg, String notes) {
        FishSpecies species = speciesRepo.findById(speciesId)
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + speciesId));
        Order order = new Order();
        order.setKind(OrderKind.PROCUREMENT);
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
