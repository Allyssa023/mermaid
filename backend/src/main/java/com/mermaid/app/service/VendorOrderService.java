package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.event.OrderStatusChangeEvent;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class VendorOrderService {

    private static final Logger log = LoggerFactory.getLogger(VendorOrderService.class);

    private static final Map<String, Set<String>> ALLOWED = Map.of(
        "PENDING",   Set.of("ACCEPTED", "CANCELLED", "CONFIRMED"),
        "CONFIRMED", Set.of("ACCEPTED", "CANCELLED"),
        "ACCEPTED",  Set.of("READY", "CANCELLED"),
        "READY",     Set.of("COMPLETED"),
        "COMPLETED", Set.of(),
        "CANCELLED", Set.of(),
        "DISPUTED",  Set.of()
    );

    private static final Map<String, List<String>> BUCKET_STATUSES = Map.of(
        "NEW",       List.of("PENDING", "CONFIRMED"),
        "PREPARING", List.of("ACCEPTED"),
        "READY",     List.of("READY"),
        "COMPLETED", List.of("COMPLETED"),
        "CANCELLED", List.of("CANCELLED")
    );

    private final OrderRepository orderRepo;
    private final OrderStatusEventRepository eventRepo;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepo;

    public VendorOrderService(OrderRepository orderRepo,
                              OrderStatusEventRepository eventRepo,
                              InventoryService inventoryService,
                              NotificationService notificationService,
                              ApplicationEventPublisher eventPublisher,
                              UserRepository userRepo) {
        this.orderRepo = orderRepo;
        this.eventRepo = eventRepo;
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<Order> listInbox(Long vendorId, String bucket, String kindFilter) {
        List<String> statuses = bucket != null
                ? BUCKET_STATUSES.getOrDefault(bucket.toUpperCase(), List.of("PENDING", "CONFIRMED"))
                : List.of("PENDING", "CONFIRMED", "ACCEPTED", "READY");
        List<Order> orders = orderRepo.findBySellerIdAndStatusIn(vendorId, statuses);
        if (kindFilter != null) {
            OrderKind kind = OrderKind.valueOf(kindFilter.toUpperCase());
            orders = orders.stream().filter(o -> kind.equals(o.getKind())).toList();
        }
        return orders;
    }

    @Transactional
    public Order accept(Long vendorId, Long orderId) {
        return transition(vendorId, orderId, "ACCEPTED", "Order accepted by vendor");
    }

    @Transactional
    public Order markReady(Long vendorId, Long orderId) {
        return transition(vendorId, orderId, "READY", "Order ready for pickup/delivery");
    }

    @Transactional
    public Order complete(Long vendorId, Long orderId) {
        Order order = transition(vendorId, orderId, "COMPLETED", "Order completed");
        if (OrderKind.RETAIL.equals(order.getKind()) && order.getStorefrontListingId() != null) {
            inventoryService.deductForOrder(orderId);
        }
        return order;
    }

    @Transactional
    public Order cancel(Long vendorId, Long orderId, String reason) {
        String note = reason != null ? "Cancelled by vendor: " + reason : "Cancelled by vendor";
        return transition(vendorId, orderId, "CANCELLED", note);
    }

    private Order transition(Long vendorId, Long orderId, String toStatus, String note) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!vendorId.equals(order.getSellerId())) {
            throw new AccessDeniedException("Order does not belong to vendor");
        }
        String from = order.getStatus();
        Set<String> allowed = ALLOWED.getOrDefault(from, Set.of());
        if (!allowed.contains(toStatus)) {
            throw new IllegalArgumentException(
                    "Cannot transition order " + orderId + " from " + from + " to " + toStatus);
        }
        order.setStatus(toStatus);
        if ("COMPLETED".equals(toStatus)) {
            order.setCompletedAt(OffsetDateTime.now());
        }
        Order saved = orderRepo.save(order);
        recordStatusEvent(orderId, toStatus, vendorId, note, saved.getBuyerId(), saved.getSellerId());
        return saved;
    }

    private void recordStatusEvent(Long orderId, String status, Long actorId, String note,
                                   Long buyerId, Long sellerId) {
        try {
            OrderStatusEvent event = new OrderStatusEvent();
            event.setOrderId(orderId);
            event.setStatus(status);
            event.setActorId(actorId);
            event.setNote(note);
            eventRepo.save(event);

            eventPublisher.publishEvent(new OrderStatusChangeEvent(
                this, orderId, buyerId, sellerId, status, note));
        } catch (Exception e) {
            log.warn("Failed to record status event for order {}: {}", orderId, e.getMessage());
        }
    }
}
