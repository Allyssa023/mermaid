package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerCartApi;
import com.mermaid.app.model.AddCartItemRequest;
import com.mermaid.app.model.BuyerCartView;
import com.mermaid.app.model.UpdateCartItemRequest;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.CartService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerCartController implements BuyerCartApi {

    private final CartService cartService;

    public BuyerCartController(CartService cartService) {
        this.cartService = cartService;
    }

    @Override
    public ResponseEntity<BuyerCartView> getBuyerCart() {
        return ResponseEntity.ok(cartService.getCart(SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<BuyerCartView> addBuyerCartItem(AddCartItemRequest request) {
        return ResponseEntity.ok(cartService.addItem(SecurityUtils.currentUserId(), request));
    }

    @Override
    public ResponseEntity<BuyerCartView> updateBuyerCartItem(Long itemId, UpdateCartItemRequest request) {
        return ResponseEntity.ok(cartService.updateItem(SecurityUtils.currentUserId(), itemId, request));
    }

    @Override
    public ResponseEntity<BuyerCartView> removeBuyerCartItem(Long itemId) {
        return ResponseEntity.ok(cartService.removeItem(SecurityUtils.currentUserId(), itemId));
    }

    @Override
    public ResponseEntity<BuyerCartView> clearBuyerCart() {
        return ResponseEntity.ok(cartService.clearCart(SecurityUtils.currentUserId()));
    }
}
