package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerOrdersApi;
import com.mermaid.app.model.BuyerPlaceOrderRequest;
import com.mermaid.app.model.Order;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerOrderController implements BuyerOrdersApi {

    private final BuyerOrderService buyerOrderService;

    public BuyerOrderController(BuyerOrderService buyerOrderService) {
        this.buyerOrderService = buyerOrderService;
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
}
