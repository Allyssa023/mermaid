package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerOrdersApi;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerActivityService;
import com.mermaid.app.service.BuyerOrderService;
import com.mermaid.app.service.CartService;
import com.mermaid.app.service.OrderTimelineService;
import com.mermaid.app.service.PaymentGatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerOrderController implements BuyerOrdersApi {

    private final BuyerOrderService buyerOrderService;
    private final OrderTimelineService timelineService;
    private final PaymentGatewayService gatewayService;
    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final BuyerActivityService activityService;
    private final CartService cartService;

    public BuyerOrderController(BuyerOrderService buyerOrderService,
                                 OrderTimelineService timelineService,
                                 PaymentGatewayService gatewayService,
                                 OrderRepository orderRepo,
                                 PaymentRepository paymentRepo,
                                 BuyerActivityService activityService,
                                 CartService cartService) {
        this.buyerOrderService = buyerOrderService;
        this.timelineService   = timelineService;
        this.gatewayService    = gatewayService;
        this.orderRepo         = orderRepo;
        this.paymentRepo       = paymentRepo;
        this.activityService   = activityService;
        this.cartService       = cartService;
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

        if (paymentRepo.findByOrderId(orderId).isPresent()) {
            return ResponseEntity.status(409).build();
        }

        BigDecimal qty = order.getOrderedQtyKg() != null ? order.getOrderedQtyKg() : BigDecimal.ONE;
        long amountCentavos = order.getAgreedPricePerKg().multiply(qty)
            .multiply(BigDecimal.valueOf(100)).longValue();

        String paymentMethod = (method != null && !method.isBlank()) ? method.toUpperCase() : "CARD";
        String idempotencyKey = UUID.randomUUID().toString();
        String returnUrl = "http://localhost:5173/payment/return?orderId=" + orderId;
        PaymentGatewayService.PaymentRequestResult result =
            gatewayService.createPaymentRequest(amountCentavos, paymentMethod,
                "Order #" + orderId, idempotencyKey, returnUrl);

        // Persist payment method on the order
        order.setPaymentMethod(paymentMethod);
        orderRepo.save(order);

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPayerId(buyerId);
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(order.getAgreedPricePerKg().multiply(qty));
        payment.setMethod(paymentMethod);
        payment.setPaymentIntentId(result.paymentRequestId());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setGateway(gatewayService.getGatewayName());
        paymentRepo.save(payment);

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
