package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerCheckoutApi;
import com.mermaid.app.model.BuyerCheckoutRequest;
import com.mermaid.app.model.BuyerCheckoutResult;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.CheckoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerCheckoutController implements BuyerCheckoutApi {

    private final CheckoutService service;

    public BuyerCheckoutController(CheckoutService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<BuyerCheckoutResult> placeBuyerCheckout(BuyerCheckoutRequest request) {
        return ResponseEntity.status(201)
                .body(service.checkout(SecurityUtils.currentUserId(), request));
    }
}
