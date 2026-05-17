package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.api.WebhooksApi;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.service.OrderService;
import com.mermaid.app.service.PaymentGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
public class PaymentWebhookController implements WebhooksApi {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final PaymentGatewayService gatewayService;
    private final PaymentRepository paymentRepository;
    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    public PaymentWebhookController(PaymentGatewayService gatewayService,
                                     PaymentRepository paymentRepository,
                                     OrderService orderService,
                                     ObjectMapper objectMapper) {
        this.gatewayService    = gatewayService;
        this.paymentRepository = paymentRepository;
        this.orderService      = orderService;
        this.objectMapper      = objectMapper;
    }

    @Override
    public ResponseEntity<Void> handleXenditWebhook(Object body, String xCallbackToken) {
        log.info("Xendit webhook received. Token present: {}, Body type: {}",
            xCallbackToken != null, body != null ? body.getClass().getSimpleName() : "null");

        // body may arrive as a String or as a deserialized Map depending on Spring MVC config
        String payload;
        if (body instanceof String s) {
            payload = s;
        } else if (body != null) {
            try {
                payload = objectMapper.writeValueAsString(body);
            } catch (Exception e) {
                payload = body.toString();
            }
        } else {
            payload = "";
        }

        log.info("Xendit webhook payload: {}", payload);

        if (!gatewayService.verifyWebhookSignature(payload, xCallbackToken)) {
            log.warn("Invalid Xendit webhook token. Received: '{}', expected token configured: {}",
                xCallbackToken, gatewayService.getGatewayName());
            return ResponseEntity.status(401).build();
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> root = objectMapper.readValue(payload, Map.class);
            String event = root.get("event") != null ? root.get("event").toString() : "";
            log.info("Xendit webhook event: '{}', keys: {}", event, root.keySet());

            @SuppressWarnings("unchecked")
            Map<String, Object> data = root.get("data") instanceof Map
                ? (Map<String, Object>) root.get("data") : Map.of();

            if ("payment.succeeded".equals(event) || "payment.capture".equals(event)) {
                // v3 uses payment_request_id; also check id and reference_id as fallbacks
                String prId = data.get("payment_request_id") != null ? data.get("payment_request_id").toString() : null;
                String id = data.get("id") != null ? data.get("id").toString() : null;
                String refId = data.get("reference_id") != null ? data.get("reference_id").toString() : null;
                String status = data.get("status") != null ? data.get("status").toString() : "";
                log.info("Payment event '{}' — payment_request_id: {}, id: {}, reference_id: {}, status: {}",
                    event, prId, id, refId, status);
                // Only confirm if the capture/payment actually succeeded
                if ("SUCCEEDED".equals(status) || "payment.succeeded".equals(event)) {
                    String lookupId = prId != null ? prId : (refId != null ? refId : id);
                    confirmPayment(lookupId);
                }
            } else if ("payout.succeeded".equals(event)) {
                String id = data.get("id") != null ? data.get("id").toString() : null;
                confirmPayout(id);
            } else {
                log.info("Ignored Xendit event: {}", event);
            }
        } catch (Exception e) {
            log.error("Failed to process Xendit webhook: {}", e.getMessage(), e);
        }
        return ResponseEntity.ok().build();
    }

    private void confirmPayment(String paymentRequestId) {
        if (paymentRequestId == null) return;
        Optional<Payment> opt = paymentRepository.findByPaymentIntentId(paymentRequestId);
        if (opt.isEmpty()) { log.warn("No payment for intent: {}", paymentRequestId); return; }
        Payment p = opt.get();

        if ("CREDIT".equals(p.getMethod())) {
            // Credit settlement via Xendit — mark as SETTLED
            p.setStatus("SETTLED");
            p.setPaidAt(OffsetDateTime.now());
            paymentRepository.save(p);
            log.info("Credit payment {} settled via Xendit for order {}", paymentRequestId, p.getOrderId());
        } else {
            // Normal payment — mark as CONFIRMED, fisherman will confirm to complete
            p.setStatus("CONFIRMED");
            p.setPaidAt(OffsetDateTime.now());
            paymentRepository.save(p);
            log.info("Payment {} confirmed via webhook for order {}", paymentRequestId, p.getOrderId());
        }

        // NOTE: We intentionally do NOT auto-complete the order here.
        // The fisherman must click "Confirm Payment Received" on their side,
        // which settles the catch log and then completes the order.
    }

    private void confirmPayout(String payoutId) {
        if (payoutId == null) return;
        paymentRepository.findByPayoutId(payoutId).ifPresent(p -> {
            p.setStatus("CONFIRMED");
            p.setPaidAt(OffsetDateTime.now());
            paymentRepository.save(p);
        });
    }
}
