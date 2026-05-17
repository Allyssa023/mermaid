package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.OrderMapper;
import com.mermaid.app.model.HandoffCreateRequest;
import com.mermaid.app.model.OrderCreateRequest;
import com.mermaid.app.model.PaymentCreateRequest;
import com.mermaid.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import com.mermaid.app.event.OrderStatusChangeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepo;
    private final CatchAlertRepository alertRepo;
    private final FishSpeciesRepository speciesRepo;
    private final HandoffConfirmationRepository handoffRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final CatchLogRepository catchLogRepo;
    private final OrderMapper mapper;
    private final OrderStatusEventRepository eventRepo;
    private final ApplicationEventPublisher eventPublisher;
    private final InventoryService inventoryService;

    public OrderService(OrderRepository orderRepo,
                        CatchAlertRepository alertRepo,
                        FishSpeciesRepository speciesRepo,
                        HandoffConfirmationRepository handoffRepo,
                        PaymentRepository paymentRepo,
                        UserRepository userRepo,
                        CatchLogRepository catchLogRepo,
                        OrderMapper mapper,
                        OrderStatusEventRepository eventRepo,
                        ApplicationEventPublisher eventPublisher,
                        InventoryService inventoryService) {
        this.orderRepo = orderRepo;
        this.alertRepo = alertRepo;
        this.speciesRepo = speciesRepo;
        this.handoffRepo = handoffRepo;
        this.paymentRepo = paymentRepo;
        this.userRepo = userRepo;
        this.catchLogRepo = catchLogRepo;
        this.mapper = mapper;
        this.eventRepo = eventRepo;
        this.eventPublisher = eventPublisher;
        this.inventoryService = inventoryService;
    }

    private String resolveName(Long userId) {
        return userRepo.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private com.mermaid.app.model.Order toModel(Order order) {
        HandoffConfirmation handoff = handoffRepo.findByOrderId(order.getId()).orElse(null);
        Payment payment = paymentRepo.findByOrderId(order.getId()).orElse(null);
        return mapper.toModel(order,
            resolveName(order.getBuyerId()),
            resolveName(order.getSellerId()),
            handoff, payment);
    }

    @Transactional
    public com.mermaid.app.model.Order create(OrderCreateRequest req, Long vendorId) {
        FishSpecies species = speciesRepo.findById(req.getSpeciesId())
            .orElseThrow(() -> new ResourceNotFoundException("FishSpecies not found: " + req.getSpeciesId()));

        Long sellerId;
        Long catchAlertId = null;
        Long demandListingId = null;
        OrderKind orderKind = OrderKind.RETAIL;

        if (req.getCatchAlertId() != null && req.getCatchAlertId().isPresent() && req.getCatchAlertId().get() != null) {
            final Long alertId = req.getCatchAlertId().get();
            catchAlertId = alertId;
            CatchAlert alert = alertRepo.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("CatchAlert not found: " + alertId));
            sellerId = alert.getFishermanId();
            orderKind = OrderKind.PROCUREMENT;
        } else {
            throw new IllegalArgumentException("catchAlertId is required to create an order.");
        }

        if (req.getDemandListingId() != null && req.getDemandListingId().isPresent()) {
            demandListingId = req.getDemandListingId().get();
        }

        Order order = new Order();
        order.setBuyerId(vendorId);
        order.setSellerId(sellerId);
        order.setCatchAlertId(catchAlertId);
        order.setKind(orderKind);
        order.setDemandListingId(demandListingId);
        order.setSpecies(species);
        order.setAgreedPricePerKg(BigDecimal.valueOf(req.getAgreedPricePerKg()));

        if (req.getOrderedQtyEstimate() != null && req.getOrderedQtyEstimate().isPresent()) {
            order.setOrderedQtyEstimate(req.getOrderedQtyEstimate().get());
        }
        if (req.getOrderedQtyKg() != null && req.getOrderedQtyKg().isPresent() && req.getOrderedQtyKg().get() != null) {
            order.setOrderedQtyKg(BigDecimal.valueOf(req.getOrderedQtyKg().get()));
        }
        if (req.getDispatchMode() != null && req.getDispatchMode().isPresent()) {
            order.setDispatchMode(req.getDispatchMode().get().getValue());
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            order.setNotes(req.getNotes().get());
        }

        Order saved = orderRepo.save(order);
        recordStatusEvent(saved.getId(), "PENDING", vendorId, "Order created");
        return toModel(saved);
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Order> listMine(Long userId, String status) {
        List<Order> orders = status != null
            ? orderRepo.findAllByParticipantAndStatus(userId, status)
            : orderRepo.findAllByParticipant(userId);
        return orders.stream().map(this::toModel).toList();
    }

    @Transactional
    public com.mermaid.app.model.Order confirm(Long orderId, Long fishermanId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getSellerId().equals(fishermanId)) {
            throw new IllegalArgumentException("Only the seller can confirm an order.");
        }
        if (!"PENDING".equals(order.getStatus())) {
            throw new IllegalArgumentException("Order is not in PENDING state.");
        }
        order.setStatus("CONFIRMED");
        Order saved = orderRepo.save(order);
        recordStatusEvent(orderId, "CONFIRMED", fishermanId, "Order confirmed by seller");
        return toModel(saved);
    }

    @Transactional
    public com.mermaid.app.model.Order cancel(Long orderId, Long userId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if ("COMPLETED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Cannot cancel a completed order.");
        }
        // Buyers can only self-cancel while the order is still PENDING.
        if (userId.equals(order.getBuyerId())
                && !userId.equals(order.getSellerId())
                && !"PENDING".equals(order.getStatus())) {
            throw new IllegalArgumentException(
                "Order can no longer be cancelled — please contact the vendor.");
        }
        order.setStatus("CANCELLED");
        Order saved = orderRepo.save(order);
        recordStatusEvent(orderId, "CANCELLED", userId, "Order cancelled");
        return toModel(saved);
    }

    @Transactional
    public com.mermaid.app.model.HandoffConfirmation createHandoff(Long orderId, HandoffCreateRequest req, Long userId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!"CONFIRMED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Order must be CONFIRMED before recording handoff.");
        }
        if (handoffRepo.findByOrderId(orderId).isPresent()) {
            throw new IllegalArgumentException("Handoff already exists for order: " + orderId);
        }

        HandoffConfirmation handoff = new HandoffConfirmation();
        handoff.setOrderId(orderId);
        BigDecimal qty = BigDecimal.valueOf(req.getActualQtyKg());
        BigDecimal price = BigDecimal.valueOf(req.getFinalPricePerKg());
        handoff.setActualQtyKg(qty);
        handoff.setFinalPricePerKg(price);
        handoff.setTotalAmount(qty.multiply(price));

        // Initiating the handoff counts as the initiator's confirmation
        if (userId.equals(order.getSellerId())) {
            handoff.setConfirmedBySeller(true);
        } else if (userId.equals(order.getBuyerId())) {
            handoff.setConfirmedByBuyer(true);
        }

        HandoffConfirmation saved = handoffRepo.save(handoff);
        checkBothConfirmed(saved, order);
        return toHandoffModel(handoffRepo.save(saved));
    }

    @Transactional
    public com.mermaid.app.model.HandoffConfirmation confirmHandoffSeller(Long orderId, Long fishermanId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getSellerId().equals(fishermanId)) {
            throw new IllegalArgumentException("Only the seller can confirm on the seller side.");
        }
        HandoffConfirmation handoff = handoffRepo.findByOrderId(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Handoff not found for order: " + orderId));

        handoff.setConfirmedBySeller(true);
        checkBothConfirmed(handoff, order);
        return toHandoffModel(handoffRepo.save(handoff));
    }

    @Transactional
    public com.mermaid.app.model.HandoffConfirmation confirmHandoffBuyer(Long orderId, Long vendorId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getBuyerId().equals(vendorId)) {
            throw new IllegalArgumentException("Only the buyer can confirm on the buyer side.");
        }
        HandoffConfirmation handoff = handoffRepo.findByOrderId(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Handoff not found for order: " + orderId));

        handoff.setConfirmedByBuyer(true);
        checkBothConfirmed(handoff, order);
        return toHandoffModel(handoffRepo.save(handoff));
    }

    private void checkBothConfirmed(HandoffConfirmation handoff, Order order) {
        if (Boolean.TRUE.equals(handoff.getConfirmedByBuyer()) &&
            Boolean.TRUE.equals(handoff.getConfirmedBySeller())) {
            handoff.setStatus("CONFIRMED");
            handoff.setConfirmedAt(OffsetDateTime.now());
            // NOTE: Order status no longer flips to COMPLETED here. The order stays
            // CONFIRMED until the Xendit payment webhook confirms collection. See
            // OrderService#completeOrderOnPaymentConfirmed.
            recordStatusEvent(order.getId(), "HANDOFF_CONFIRMED", null, "Both parties confirmed handoff");

            // Mark the catch alert as SOLD so it no longer appears in browse
            if (order.getCatchAlertId() != null) {
                alertRepo.findById(order.getCatchAlertId()).ifPresent(alert -> {
                    if ("ACTIVE".equals(alert.getStatus())) {
                        alert.setStatus("SOLD");
                        alertRepo.save(alert);
                    }
                });
            }
        }
    }

    /**
     * Called by the payment webhook flow when a Payment transitions to CONFIRMED.
     * If the corresponding order is still CONFIRMED, complete it.
     */
    @Transactional
    public void completeOrderOnPaymentConfirmed(Long orderId) {
        if (orderId == null) return;
        orderRepo.findById(orderId).ifPresent(order -> {
            if ("CONFIRMED".equals(order.getStatus())) {
                order.setStatus("COMPLETED");
                order.setCompletedAt(OffsetDateTime.now());
                // Copy payment method from Payment entity to Order for earnings queries
                paymentRepo.findByOrderId(orderId).ifPresent(p ->
                    order.setPaymentMethod(p.getMethod()));
                orderRepo.save(order);
                recordStatusEvent(order.getId(), "COMPLETED", null, "Payment confirmed — order complete");

                // Auto-populate vendor inventory for procurement orders
                if (OrderKind.PROCUREMENT.equals(order.getKind())) {
                    try {
                        inventoryService.addLotFromProcurement(orderId);
                    } catch (Exception e) {
                        log.warn("Failed to create inventory lot for order {}: {}", orderId, e.getMessage());
                    }
                }
            }
        });
    }

    @Transactional
    public com.mermaid.app.model.PaymentRecord recordPayment(Long orderId, PaymentCreateRequest req, Long vendorId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getBuyerId().equals(vendorId)) {
            throw new IllegalArgumentException("Only the buyer can record payment.");
        }
        if (paymentRepo.findByOrderId(orderId).isPresent()) {
            throw new IllegalArgumentException("Payment already recorded for order: " + orderId);
        }

        HandoffConfirmation handoff = handoffRepo.findByOrderId(orderId).orElse(null);
        if (handoff != null && !"CONFIRMED".equals(handoff.getStatus())) {
            throw new IllegalArgumentException("Handoff must be confirmed before recording payment.");
        }

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setHandoffId(handoff != null ? handoff.getId() : null);
        payment.setPayerId(vendorId);
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(BigDecimal.valueOf(req.getAmount()));
        payment.setMethod(req.getMethod().getValue());
        if (req.getProofReference() != null && req.getProofReference().isPresent()) {
            payment.setProofReference(req.getProofReference().get());
        }

        return toPaymentModel(paymentRepo.save(payment));
    }

    @Transactional
    public com.mermaid.app.model.PaymentRecord confirmPayment(Long orderId, Long fishermanId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getSellerId().equals(fishermanId)) {
            throw new IllegalArgumentException("Only the seller can confirm payment receipt.");
        }
        Payment payment = paymentRepo.findByOrderId(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found for order: " + orderId));

        payment.setStatus("CONFIRMED");
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepo.save(payment);

        // Auto-settle the linked catch log if this order came from one
        if (order.getCatchAlertId() != null) {
            alertRepo.findById(order.getCatchAlertId()).ifPresent(alert -> {
                if (alert.getCatchLogId() != null) {
                    catchLogRepo.findById(alert.getCatchLogId()).ifPresent(catchLog -> {
                        HandoffConfirmation handoff = handoffRepo.findByOrderId(orderId).orElse(null);
                        if (handoff != null && !Boolean.TRUE.equals(catchLog.getIsSettled())) {
                            catchLog.setIsSettled(true);
                            catchLog.setSettledKg(handoff.getActualQtyKg());
                            catchLog.setSettledPricePerKg(handoff.getFinalPricePerKg());
                            catchLog.setSettledAt(OffsetDateTime.now());
                            catchLog.setSettledWithVendorId(order.getBuyerId());
                            catchLog.setBuyerName(resolveName(order.getBuyerId()));
                            catchLogRepo.save(catchLog);
                        }
                    });
                }
            });
        }

        completeOrderOnPaymentConfirmed(orderId);

        return toPaymentModel(payment);
    }

    @Transactional
    public com.mermaid.app.model.PaymentRecord settleCredit(Long orderId, com.mermaid.app.model.CreditSettleRequest req, Long vendorId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getBuyerId().equals(vendorId)) {
            throw new IllegalArgumentException("Only the buyer can settle credit.");
        }
        Payment payment = paymentRepo.findByOrderId(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found for order: " + orderId));
        if (!"CREDIT".equals(payment.getMethod())) {
            throw new IllegalArgumentException("Payment is not a credit — cannot settle.");
        }
        if ("SETTLED".equals(payment.getStatus())) {
            throw new IllegalArgumentException("Credit is already settled.");
        }

        payment.setStatus("SETTLED");
        payment.setSettledMethod(req.getMethod().getValue());
        payment.setPaidAt(OffsetDateTime.now());
        if (req.getReference() != null && req.getReference().isPresent()) {
            payment.setProofReference(req.getReference().get());
        }
        paymentRepo.save(payment);

        // Update order payment method to reflect settlement
        order.setPaymentMethod(req.getMethod().getValue());
        orderRepo.save(order);

        recordStatusEvent(orderId, "CREDIT_SETTLED", vendorId,
            "Credit settled via " + req.getMethod().getValue());

        return toPaymentModel(payment);
    }

    private com.mermaid.app.model.HandoffConfirmation toHandoffModel(HandoffConfirmation h) {
        com.mermaid.app.model.HandoffConfirmation m = new com.mermaid.app.model.HandoffConfirmation(
            h.getId(), h.getOrderId(),
            h.getActualQtyKg().doubleValue(),
            h.getFinalPricePerKg().doubleValue(),
            h.getTotalAmount().doubleValue(),
            h.getConfirmedByBuyer(), h.getConfirmedBySeller(),
            com.mermaid.app.model.HandoffConfirmation.StatusEnum.fromValue(h.getStatus()), h.getCreatedAt()
        );
        m.setDisputeReason(org.openapitools.jackson.nullable.JsonNullable.of(h.getDisputeReason()));
        m.setConfirmedAt(org.openapitools.jackson.nullable.JsonNullable.of(h.getConfirmedAt()));
        return m;
    }

    private com.mermaid.app.model.PaymentRecord toPaymentModel(Payment p) {
        com.mermaid.app.model.PaymentRecord m = new com.mermaid.app.model.PaymentRecord(
            p.getId(), p.getOrderId(),
            p.getAmount().doubleValue(),
            p.getMethod(), com.mermaid.app.model.PaymentRecord.StatusEnum.fromValue(p.getStatus()), p.getCreatedAt()
        );
        m.setHandoffId(org.openapitools.jackson.nullable.JsonNullable.of(p.getHandoffId()));
        m.setProofReference(org.openapitools.jackson.nullable.JsonNullable.of(p.getProofReference()));
        m.setPaidAt(org.openapitools.jackson.nullable.JsonNullable.of(p.getPaidAt()));
        m.setSettledMethod(org.openapitools.jackson.nullable.JsonNullable.of(p.getSettledMethod()));
        return m;
    }

    private void recordStatusEvent(Long orderId, String status, Long actorId, String note) {
        try {
            com.mermaid.app.domain.OrderStatusEvent event = new com.mermaid.app.domain.OrderStatusEvent();
            event.setOrderId(orderId);
            event.setStatus(status);
            event.setActorId(actorId);
            event.setNote(note);
            eventRepo.save(event);

            // Publish event for notification system
            orderRepo.findById(orderId).ifPresent(order ->
                eventPublisher.publishEvent(new OrderStatusChangeEvent(
                    this, orderId, order.getBuyerId(), order.getSellerId(), status, note
                ))
            );
        } catch (Exception e) {
            log.warn("Failed to record status event for order {}: {}", orderId, e.getMessage());
        }
    }
}
