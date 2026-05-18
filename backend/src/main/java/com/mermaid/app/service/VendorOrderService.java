package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.event.OrderStatusChangeEvent;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class VendorOrderService {

    private static final Logger log = LoggerFactory.getLogger(VendorOrderService.class);

    private static final Map<String, Set<String>> ALLOWED = Map.of(
        "PENDING",          Set.of("CONFIRMED", "CANCELLED"),
        "CONFIRMED",        Set.of("PREPARING", "CANCELLED"),
        "PREPARING",        Set.of("READY", "OUT_FOR_DELIVERY", "CANCELLED"),
        "READY",            Set.of("AWAITING_RECEIPT", "COMPLETED"),
        "OUT_FOR_DELIVERY", Set.of("CANCELLED"),
        "AWAITING_RECEIPT", Set.of("COMPLETED", "DISPUTED"),
        "COMPLETED",        Set.of(),
        "CANCELLED",        Set.of(),
        "DISPUTED",         Set.of("COMPLETED", "CANCELLED")
    );

    private static final Map<String, List<String>> BUCKET_STATUSES = Map.of(
        "NEW",       List.of("PENDING"),
        "CONFIRMED", List.of("CONFIRMED"),
        "PREPARING", List.of("PREPARING"),
        "READY",     List.of("READY", "OUT_FOR_DELIVERY"),
        "AWAITING",  List.of("AWAITING_RECEIPT"),
        "COMPLETED", List.of("COMPLETED"),
        "CANCELLED", List.of("CANCELLED")
    );

    private final OrderRepository orderRepo;
    private final OrderStatusEventRepository eventRepo;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepo;
    private final PaymentRepository paymentRepo;

    public VendorOrderService(OrderRepository orderRepo,
                              OrderStatusEventRepository eventRepo,
                              InventoryService inventoryService,
                              NotificationService notificationService,
                              ApplicationEventPublisher eventPublisher,
                              UserRepository userRepo,
                              PaymentRepository paymentRepo) {
        this.orderRepo = orderRepo;
        this.eventRepo = eventRepo;
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
        this.userRepo = userRepo;
        this.paymentRepo = paymentRepo;
    }

    @Transactional(readOnly = true)
    public List<Order> listInbox(Long vendorId, String bucket, String status, String kindFilter, Long buyerId) {
        List<String> statuses;
        if (status != null && !status.isBlank()) {
            statuses = List.of(status.toUpperCase());
        } else if (bucket != null) {
            statuses = BUCKET_STATUSES.getOrDefault(bucket.toUpperCase(), List.of("PENDING"));
        } else {
            statuses = List.of("PENDING","CONFIRMED","PREPARING","READY","OUT_FOR_DELIVERY","AWAITING_RECEIPT","COMPLETED","DISPUTED","CANCELLED");
        }
        List<Order> orders = orderRepo.findBySellerIdAndStatusIn(vendorId, statuses);
        if (kindFilter != null) {
            OrderKind kind = OrderKind.valueOf(kindFilter.toUpperCase());
            orders = orders.stream().filter(o -> kind.equals(o.getKind())).toList();
        }
        if (buyerId != null) {
            orders = orders.stream().filter(o -> buyerId.equals(o.getBuyerId())).toList();
        }
        return orders;
    }

    // Back-compat: callers using the older 3-arg signature.
    @Transactional(readOnly = true)
    public List<Order> listInbox(Long vendorId, String bucket, String kindFilter) {
        return listInbox(vendorId, bucket, null, kindFilter, null);
    }

    @Transactional(readOnly = true)
    public String exportCsv(Long vendorId, String status, LocalDate from, LocalDate to) {
        List<Order> orders = listInbox(vendorId, null, status, null, null);
        OffsetDateTime fromTs = from != null ? from.atStartOfDay().atOffset(ZoneOffset.UTC) : null;
        OffsetDateTime toTs   = to   != null ? to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC) : null;

        StringBuilder sb = new StringBuilder();
        sb.append("OrderID,BuyerID,Species,QtyKg,PricePerKg,Total,Status,Kind,CreatedAt\n");
        for (Order o : orders) {
            OffsetDateTime created = o.getCreatedAt();
            if (fromTs != null && created != null && created.isBefore(fromTs)) continue;
            if (toTs   != null && created != null && created.isAfter(toTs))   continue;
            BigDecimal qty   = o.getOrderedQtyKg();
            BigDecimal price = o.getAgreedPricePerKg();
            BigDecimal total = (qty != null && price != null) ? qty.multiply(price) : null;
            sb.append(o.getId()).append(',')
              .append(o.getBuyerId() != null ? o.getBuyerId() : "").append(',')
              .append(csv(o.getSpecies() != null ? o.getSpecies().getCommonName() : null)).append(',')
              .append(qty != null ? qty.toPlainString() : "").append(',')
              .append(price != null ? price.toPlainString() : "").append(',')
              .append(total != null ? total.toPlainString() : "").append(',')
              .append(csv(o.getStatus())).append(',')
              .append(o.getKind() != null ? o.getKind().name() : "").append(',')
              .append(created != null ? created.toString() : "")
              .append('\n');
        }
        return sb.toString();
    }

    private static String csv(String value) {
        if (value == null) return "";
        if (value.indexOf(',') < 0 && value.indexOf('"') < 0 && value.indexOf('\n') < 0) return value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    @Transactional
    public Order accept(Long vendorId, Long orderId) {
        return transition(vendorId, orderId, "CONFIRMED", "Order confirmed by vendor");
    }

    @Transactional
    public Order markPreparing(Long vendorId, Long orderId) {
        return transition(vendorId, orderId, "PREPARING", "Vendor started preparing order");
    }

    @Transactional
    public Order markReady(Long vendorId, Long orderId) {
        return transition(vendorId, orderId, "READY", "Order ready for pickup/delivery");
    }

    @Transactional
    public Order dispatch(Long vendorId, Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!"DELIVERY".equals(order.getDispatchMode())) {
            throw new IllegalArgumentException("Cannot dispatch a PICKUP order");
        }
        return transition(vendorId, orderId, "OUT_FOR_DELIVERY", "Rider dispatched");
    }

    @Transactional
    public Order markDelivered(Long vendorId, Long orderId, Double codAmount) {
        Order order = transition(vendorId, orderId, "COMPLETED", "Vendor confirmed delivery — order complete");
        if (!paymentRepo.existsByOrderId(orderId)) {
            if (codAmount == null) {
                throw new IllegalArgumentException("codAmount is required for COD delivery orders");
            }
            Payment payment = new Payment();
            payment.setOrderId(orderId);
            payment.setPayerId(order.getBuyerId());
            payment.setPayeeId(order.getSellerId());
            payment.setAmount(java.math.BigDecimal.valueOf(codAmount));
            payment.setMethod("COD");
            payment.setStatus("CONFIRMED");
            payment.setPaidAt(OffsetDateTime.now());
            paymentRepo.save(payment);
        }
        if (OrderKind.RETAIL.equals(order.getKind()) && order.getStorefrontListingId() != null) {
            inventoryService.deductForOrder(orderId);
        }
        return order;
    }

    @Transactional
    public Order completePickup(Long vendorId, Long orderId, Double codAmount) {
        if (!paymentRepo.existsByOrderId(orderId) && codAmount == null) {
            Order pre = orderRepo.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
            java.math.BigDecimal qty   = pre.getOrderedQtyKg();
            java.math.BigDecimal price = pre.getAgreedPricePerKg();
            if (qty != null && price != null) {
                codAmount = qty.multiply(price).doubleValue();
            }
        }
        Order order = transition(vendorId, orderId, "COMPLETED", "Vendor confirmed pickup — order complete");
        if (!paymentRepo.existsByOrderId(orderId)) {
            if (codAmount == null) {
                throw new IllegalArgumentException("codAmount is required for COD pickup orders");
            }
            Payment payment = new Payment();
            payment.setOrderId(orderId);
            payment.setPayerId(order.getBuyerId());
            payment.setPayeeId(order.getSellerId());
            payment.setAmount(java.math.BigDecimal.valueOf(codAmount));
            payment.setMethod("COD");
            payment.setStatus("CONFIRMED");
            payment.setPaidAt(OffsetDateTime.now());
            paymentRepo.save(payment);
        }
        if (OrderKind.RETAIL.equals(order.getKind()) && order.getStorefrontListingId() != null) {
            inventoryService.deductForOrder(orderId);
        }
        return order;
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
