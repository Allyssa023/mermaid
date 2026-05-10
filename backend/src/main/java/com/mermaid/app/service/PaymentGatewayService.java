package com.mermaid.app.service;

public interface PaymentGatewayService {

    PaymentRequestResult createPaymentRequest(
            long amountCentavos,
            String method,
            String description,
            String idempotencyKey,
            String returnUrl);

    DisbursementResult disburse(
            String recipientPhone,
            String channelCode,
            long amountCentavos,
            String description,
            String idempotencyKey);

    boolean verifyWebhookSignature(String payload, String callbackToken);

    String getGatewayName();

    record PaymentRequestResult(
            String paymentRequestId,
            String redirectUrl,
            String clientKey,
            String publicKey) {}

    record DisbursementResult(String payoutId, String status) {}
}
