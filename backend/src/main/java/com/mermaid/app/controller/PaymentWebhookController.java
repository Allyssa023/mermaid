package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.api.WebhooksApi;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.service.PaymentGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Optional;

@RestController
public class PaymentWebhookController implements WebhooksApi {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final PaymentGatewayService gatewayService;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;

    public PaymentWebhookController(PaymentGatewayService gatewayService,
                                     PaymentRepository paymentRepository,
                                     ObjectMapper objectMapper) {
        this.gatewayService    = gatewayService;
        this.paymentRepository = paymentRepository;
        this.objectMapper      = objectMapper;
    }

    @Override
    public ResponseEntity<Void> handleXenditWebhook(Object body, String xCallbackToken) {
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

        if (!gatewayService.verifyWebhookSignature(payload, xCallbackToken)) {
            log.warn("Invalid Xendit webhook token");
            return ResponseEntity.status(401).build();
        }

        try {
            JsonNode root  = objectMapper.readTree(payload);
            String event   = root.path("event").asText();
            JsonNode data  = root.path("data");

            if ("payment.succeeded".equals(event)) {
                String id = data.path("id").asText(null);
                if (id == null) id = data.path("reference_id").asText(null);
                confirmPayment(id);
            } else if ("payout.succeeded".equals(event)) {
                confirmPayout(data.path("id").asText(null));
            } else {
                log.info("Ignored Xendit event: {}", event);
            }
        } catch (Exception e) {
            log.error("Failed to process Xendit webhook: {}", e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    private void confirmPayment(String paymentRequestId) {
        if (paymentRequestId == null) return;
        Optional<Payment> opt = paymentRepository.findByPaymentIntentId(paymentRequestId);
        if (opt.isEmpty()) { log.warn("No payment for intent: {}", paymentRequestId); return; }
        Payment p = opt.get();
        p.setStatus("CONFIRMED");
        p.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(p);
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
