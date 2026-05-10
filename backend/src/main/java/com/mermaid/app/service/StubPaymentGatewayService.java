package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
@ConditionalOnMissingBean(PaymentGatewayService.class)
public class StubPaymentGatewayService implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(StubPaymentGatewayService.class);

    @Override
    public PaymentRequestResult createPaymentRequest(long amountCentavos, String method,
            String description, String idempotencyKey, String returnUrl) {
        String id = "pr_stub_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("STUB: Payment request {} for ₱{} via {} — {}",
            id, String.format("%.2f", amountCentavos / 100.0), method, description);
        if ("CARD".equalsIgnoreCase(method)) {
            return new PaymentRequestResult(id, null,
                "ck_stub_" + UUID.randomUUID().toString().substring(0, 12), "pk_stub_test");
        }
        return new PaymentRequestResult(id,
            "https://stub-redirect.test/" + UUID.randomUUID().toString().substring(0, 8),
            null, null);
    }

    @Override
    public DisbursementResult disburse(String recipientPhone, String channelCode,
            long amountCentavos, String description, String idempotencyKey) {
        String id = "po_stub_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("STUB: Disbursed ₱{} to {} via {} — {}",
            String.format("%.2f", amountCentavos / 100.0), recipientPhone, channelCode, id);
        return new DisbursementResult(id, "SUCCEEDED");
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String callbackToken) {
        log.info("STUB: Webhook token check skipped (stub mode)");
        return true;
    }

    @Override
    public String getGatewayName() { return "STUB"; }
}
