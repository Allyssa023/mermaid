package com.mermaid.app.controller;

import com.mermaid.app.service.PaymentGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Handles PayMongo webhook callbacks.
 * The payment intent creation is handled by BuyerOrderController.
 */
@RestController
public class PaymentWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final PaymentGatewayService gatewayService;

    public PaymentWebhookController(PaymentGatewayService gatewayService) {
        this.gatewayService = gatewayService;
    }

    @PostMapping("/webhooks/paymongo")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "paymongo-signature", required = false) String signature) {
        if (!gatewayService.verifyWebhookSignature(payload, signature)) {
            log.warn("Invalid webhook signature");
            return ResponseEntity.status(401).build();
        }
        log.info("Received PayMongo webhook: {}", payload.substring(0, Math.min(200, payload.length())));
        // TODO: Parse webhook payload and update payment/order status
        return ResponseEntity.ok().build();
    }
}
