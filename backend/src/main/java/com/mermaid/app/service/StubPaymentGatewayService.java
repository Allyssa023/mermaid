package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Stub payment gateway for development/testing.
 * Activated when {@code paymongo.secret-key} is not set (default).
 * Returns fake client keys and auto-confirms payments.
 */
@Service
@ConditionalOnProperty(name = "paymongo.secret-key", havingValue = "", matchIfMissing = true)
public class StubPaymentGatewayService implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(StubPaymentGatewayService.class);

    @Override
    public PaymentIntentResult createIntent(long amountCentavos, String description, String idempotencyKey) {
        String fakeIntentId = "pi_stub_" + UUID.randomUUID().toString().substring(0, 8);
        String fakeClientKey = "ck_stub_" + UUID.randomUUID().toString().substring(0, 12);
        log.info("STUB: Created fake payment intent {} for ₱{} — {}", fakeIntentId,
            String.format("%.2f", amountCentavos / 100.0), description);
        return new PaymentIntentResult(fakeClientKey, "pk_stub_test", fakeIntentId);
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        log.info("STUB: Webhook signature verification skipped (stub mode)");
        return true; // Always valid in stub mode
    }

    @Override
    public String getGatewayName() {
        return "STUB";
    }
}
