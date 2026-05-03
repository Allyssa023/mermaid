package com.mermaid.app.service;

/**
 * Abstraction over a payment gateway (PayMongo, Stripe, etc.).
 * Implementations handle creating payment intents and verifying webhook signatures.
 */
public interface PaymentGatewayService {

    /**
     * Create a payment intent for the given amount.
     *
     * @param amountCentavos  amount in centavos (₱150.00 = 15000)
     * @param description     human-readable description
     * @param idempotencyKey  unique key to prevent duplicate intents
     * @return result containing client key and gateway info
     */
    PaymentIntentResult createIntent(long amountCentavos, String description, String idempotencyKey);

    /**
     * Verify a webhook signature.
     *
     * @param payload   the raw request body
     * @param signature the signature header value
     * @return true if signature is valid
     */
    boolean verifyWebhookSignature(String payload, String signature);

    /**
     * Get the gateway identifier (e.g., "PAYMONGO" or "STUB").
     */
    String getGatewayName();

    record PaymentIntentResult(String clientKey, String publicKey, String paymentIntentId) {}
}
