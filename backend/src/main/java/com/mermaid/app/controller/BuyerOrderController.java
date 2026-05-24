package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerOrdersApi;
import com.mermaid.app.domain.HandoffConfirmation;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.HandoffConfirmationRepository;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerActivityService;
import com.mermaid.app.service.BuyerOrderService;
import com.mermaid.app.service.CartService;
import com.mermaid.app.service.OrderTimelineService;
import com.mermaid.app.service.PaymentGatewayService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@PreAuthorize("hasAnyRole('BUYER','VENDOR')")
public class BuyerOrderController implements BuyerOrdersApi {

    private final BuyerOrderService buyerOrderService;
    private final OrderTimelineService timelineService;
    private final PaymentGatewayService gatewayService;
    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final HandoffConfirmationRepository handoffRepo;
    private final BuyerActivityService activityService;
    private final CartService cartService;
    private final String frontendUrl;

    public BuyerOrderController(BuyerOrderService buyerOrderService,
                                 OrderTimelineService timelineService,
                                 PaymentGatewayService gatewayService,
                                 OrderRepository orderRepo,
                                 PaymentRepository paymentRepo,
                                 HandoffConfirmationRepository handoffRepo,
                                 BuyerActivityService activityService,
                                 CartService cartService,
                                 @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.buyerOrderService = buyerOrderService;
        this.timelineService   = timelineService;
        this.gatewayService    = gatewayService;
        this.orderRepo         = orderRepo;
        this.paymentRepo       = paymentRepo;
        this.handoffRepo       = handoffRepo;
        this.activityService   = activityService;
        this.cartService       = cartService;
        this.frontendUrl       = frontendUrl;
    }

    @Override
    public ResponseEntity<Order> placeBuyerOrder(BuyerPlaceOrderRequest buyerPlaceOrderRequest) {
        Long buyerId = SecurityUtils.currentUserId();
        Order placed = buyerOrderService.placeOrder(buyerPlaceOrderRequest, buyerId);
        return ResponseEntity.status(201).body(placed);
    }

    @Override
    public ResponseEntity<List<Order>> getBuyerOrders(String status) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(buyerOrderService.getMyOrders(buyerId, status));
    }

    @Override
    public ResponseEntity<Order> getBuyerOrderById(Long orderId) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(buyerOrderService.getOrderById(orderId, buyerId));
    }

    @Override
    public ResponseEntity<List<OrderStatusEvent>> getBuyerOrderTimeline(Long orderId) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(timelineService.getTimelineForBuyer(orderId, buyerId));
    }

    @Override
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(Long orderId, String method) {
        Long buyerId = SecurityUtils.currentUserId();
        com.mermaid.app.domain.Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }

        // Check for existing payment — allow re-payment for CREDIT (settlement) or PENDING (buyer retry)
        Payment existingPayment = paymentRepo.findByOrderId(orderId).orElse(null);
        boolean isCreditSettlement = existingPayment != null && "CREDIT".equals(existingPayment.getMethod());
        boolean isPendingRetry = existingPayment != null && "PENDING".equals(existingPayment.getStatus());
        if (existingPayment != null && !isCreditSettlement && !isPendingRetry) {
            return ResponseEntity.status(409).build();
        }

        HandoffConfirmation handoff = handoffRepo.findByOrderId(orderId).orElse(null);
        BigDecimal amount;
        if (handoff != null && "CONFIRMED".equals(handoff.getStatus()) && handoff.getTotalAmount() != null) {
            // Handoff-confirmed deal order — use the locked amount
            amount = handoff.getTotalAmount();
        } else if (order.getCatchAlertId() != null && (handoff == null || !"CONFIRMED".equals(handoff.getStatus()))) {
            // Deal-based order (linked to a catch alert) with no confirmed handoff —
            // block payment until both parties confirm the physical handoff.
            // Marketplace buyer→vendor orders (catchAlertId == null) skip this check
            // because they don't use a handoff step.
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Cannot pay before handoff is confirmed");
        } else {
            // Marketplace buyer order (no handoff) — calculate from order snapshot
            BigDecimal qty = order.getOrderedQtyKg() != null ? order.getOrderedQtyKg() : BigDecimal.ONE;
            BigDecimal delivery = order.getDeliveryFee() != null ? order.getDeliveryFee() : BigDecimal.ZERO;
            amount = order.getAgreedPricePerKg().multiply(qty).add(delivery);
        }
        long amountCentavos = amount.multiply(BigDecimal.valueOf(100)).longValue();

        String paymentMethod = (method != null && !method.isBlank()) ? method.toUpperCase() : "CARD";
        String idempotencyKey = UUID.randomUUID().toString();
        String returnUrl = frontendUrl + "/payment/return?orderId=" + orderId;
        PaymentGatewayService.PaymentRequestResult result =
            gatewayService.createPaymentRequest(amountCentavos, paymentMethod,
                "Order #" + orderId, idempotencyKey, returnUrl);

        if (isCreditSettlement) {
            // Reuse existing CREDIT payment — update with Xendit intent for settlement
            existingPayment.setPaymentIntentId(result.paymentRequestId());
            existingPayment.setIdempotencyKey(idempotencyKey);
            existingPayment.setGateway(gatewayService.getGatewayName());
            existingPayment.setSettledMethod(paymentMethod);
            paymentRepo.save(existingPayment);
        } else if (isPendingRetry) {
            // Buyer retrying a previously uncompleted payment — refresh the intent
            existingPayment.setMethod(paymentMethod);
            existingPayment.setPaymentIntentId(result.paymentRequestId());
            existingPayment.setIdempotencyKey(idempotencyKey);
            existingPayment.setGateway(gatewayService.getGatewayName());
            existingPayment.setAmount(amount);
            paymentRepo.save(existingPayment);
            order.setPaymentMethod(paymentMethod);
            orderRepo.save(order);
        } else {
            // Persist payment method on the order
            order.setPaymentMethod(paymentMethod);
            orderRepo.save(order);

            Payment payment = new Payment();
            payment.setOrderId(orderId);
            if (handoff != null) {
                payment.setHandoffId(handoff.getId());
            }
            payment.setPayerId(buyerId);
            payment.setPayeeId(order.getSellerId());
            payment.setAmount(amount);
            payment.setMethod(paymentMethod);
            payment.setPaymentIntentId(result.paymentRequestId());
            payment.setIdempotencyKey(idempotencyKey);
            payment.setGateway(gatewayService.getGatewayName());
            paymentRepo.save(payment);
        }

        PaymentIntentResponse response = new PaymentIntentResponse(
            PaymentIntentResponse.GatewayEnum.fromValue(gatewayService.getGatewayName())
        );
        response.clientKey(result.clientKey());
        response.publicKey(result.publicKey());
        response.redirectUrl(result.redirectUrl());
        return ResponseEntity.status(201).body(response);
    }

    @Override
    public ResponseEntity<List<ActivityFeedItem>> getBuyerActivity(Integer limit) {
        Long buyerId = SecurityUtils.currentUserId();
        int cap = (limit != null) ? limit : 20;
        return ResponseEntity.ok(activityService.getActivity(buyerId, cap));
    }

    @Override
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<Order> buyerConfirmReceipt(Long orderId) {
        return ResponseEntity.ok(buyerOrderService.confirmReceipt(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<Order> buyerDisputeOrder(Long orderId, BuyerDisputeRequest request) {
        return ResponseEntity.ok(buyerOrderService.disputeOrder(orderId, SecurityUtils.currentUserId(), request.getReason()));
    }

    @Override
    public ResponseEntity<ReorderResponse> reorderBuyerOrder(Long orderId) {
        Long buyerId = SecurityUtils.currentUserId();
        com.mermaid.app.domain.Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        CartService.ReorderResult result = cartService.reorder(buyerId, order);
        ReorderResponse response = new ReorderResponse(result.cart(), result.warnings());
        return ResponseEntity.ok(response);
    }
}
