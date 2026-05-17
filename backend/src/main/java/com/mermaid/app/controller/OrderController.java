package com.mermaid.app.controller;

import com.mermaid.app.api.OrdersApi;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.OrderService;
import com.mermaid.app.service.OrderTimelineService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class OrderController implements OrdersApi {

    private final OrderService service;
    private final OrderTimelineService timelineService;

    public OrderController(OrderService service, OrderTimelineService timelineService) {
        this.service = service;
        this.timelineService = timelineService;
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Order> createOrder(OrderCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(request, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN') or hasRole('VENDOR')")
    public ResponseEntity<List<Order>> listMyOrders(String status) {
        return ResponseEntity.ok(service.listMine(SecurityUtils.currentUserId(), status));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<Order> confirmOrder(Long orderId) {
        return ResponseEntity.ok(service.confirm(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN') or hasRole('VENDOR') or hasRole('BUYER')")
    public ResponseEntity<Order> cancelOrder(Long orderId) {
        return ResponseEntity.ok(service.cancel(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN') or hasRole('VENDOR')")
    public ResponseEntity<HandoffConfirmation> createHandoff(Long orderId, HandoffCreateRequest request) {
        return ResponseEntity.status(201).body(service.createHandoff(orderId, request, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<HandoffConfirmation> confirmHandoffSeller(Long orderId) {
        return ResponseEntity.ok(service.confirmHandoffSeller(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<HandoffConfirmation> confirmHandoffBuyer(Long orderId) {
        return ResponseEntity.ok(service.confirmHandoffBuyer(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<PaymentRecord> recordPayment(Long orderId, PaymentCreateRequest request) {
        return ResponseEntity.status(201).body(service.recordPayment(orderId, request, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN')")
    public ResponseEntity<PaymentRecord> confirmPayment(Long orderId) {
        return ResponseEntity.ok(service.confirmPayment(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('FISHERMAN') or hasRole('VENDOR') or hasRole('BUYER')")
    public ResponseEntity<List<OrderStatusEvent>> getOrderTimeline(Long orderId) {
        return ResponseEntity.ok(
            timelineService.getTimelineForParticipant(orderId, SecurityUtils.currentUserId()));
    }

    @Override
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<PaymentRecord> settleCredit(Long orderId, CreditSettleRequest creditSettleRequest) {
        throw new UnsupportedOperationException("Not yet implemented");
    }
}
