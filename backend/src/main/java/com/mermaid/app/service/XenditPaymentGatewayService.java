package com.mermaid.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Base64;
import java.util.Map;

@Service
@ConditionalOnExpression("!'${xendit.secret-key:}'.isBlank()")
public class XenditPaymentGatewayService implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(XenditPaymentGatewayService.class);

    private final RestClient restClient;
    private final String publicKey;
    private final String webhookToken;

    public XenditPaymentGatewayService(
            RestClient.Builder builder,
            @Value("${xendit.secret-key}") String secretKey,
            @Value("${xendit.public-key:}") String publicKey,
            @Value("${xendit.webhook-token:}") String webhookToken) {
        this.publicKey    = publicKey;
        this.webhookToken = webhookToken;
        String encoded = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());
        this.restClient = builder
            .baseUrl("https://api.xendit.co")
            .defaultHeader("Authorization", "Basic " + encoded)
            .defaultHeader("Content-Type", "application/json")
            // Required by Xendit /v3/payment_requests and /v3/payouts.
            .defaultHeader("api-version", "2024-11-11")
            .build();
    }

    @Override
    public PaymentRequestResult createPaymentRequest(long amountCentavos, String method,
            String description, String idempotencyKey, String returnUrl) {
        boolean isCard = "CARD".equalsIgnoreCase(method);
        String channelCode = switch (method.toUpperCase()) {
            case "GCASH"           -> "GCASH";
            case "PAYMAYA", "MAYA" -> "PAYMAYA";
            default                -> "CREDIT_DEBIT";
        };
        Object channelProps = isCard ? Map.of()
            : Map.of("success_return_url", returnUrl,
                     "failure_return_url", returnUrl,
                     "cancel_return_url",  returnUrl);
        Map<String, Object> body = Map.of(
            "reference_id", idempotencyKey,
            "amount",       amountCentavos / 100.0,
            "currency",     "PHP",
            "description",  description,
            "payment_method", Map.of(
                "type",        isCard ? "CARD" : "EWALLET",
                "reusability", "ONE_TIME_USE",
                isCard ? "card" : "ewallet",
                isCard ? Map.of() : Map.of("channel_code", channelCode, "channel_properties", channelProps)
            )
        );
        try {
            JsonNode resp = restClient.post().uri("/v3/payment_requests")
                .header("idempotency-key", idempotencyKey)
                .body(body).retrieve().body(JsonNode.class);
            String id = resp.path("id").asText();
            if (isCard) {
                String ck = resp.path("payment_method").path("card").path("token_id").asText(null);
                return new PaymentRequestResult(id, null, ck, publicKey);
            }
            String redirect = resp.path("actions").path(0).path("url").asText(null);
            if (redirect == null || redirect.isBlank()) {
                redirect = resp.path("payment_method").path("ewallet")
                    .path("channel_properties").path("checkout_url").asText(null);
            }
            return new PaymentRequestResult(id, redirect, null, null);
        } catch (Exception e) {
            log.error("Xendit createPaymentRequest failed: {}", e.getMessage());
            throw new RuntimeException("Payment service unavailable", e);
        }
    }

    @Override
    public DisbursementResult disburse(String recipientPhone, String channelCode,
            long amountCentavos, String description, String idempotencyKey) {
        Map<String, Object> body = Map.of(
            "reference_id",        idempotencyKey,
            "channel_code",        channelCode,
            "channel_properties",  Map.of("account_holder_name", "Fisherman",
                                          "account_number", recipientPhone),
            "amount",     amountCentavos / 100.0,
            "currency",   "PHP",
            "description", description
        );
        try {
            JsonNode resp = restClient.post().uri("/v3/payouts")
                .header("idempotency-key", idempotencyKey)
                .body(body).retrieve().body(JsonNode.class);
            return new DisbursementResult(resp.path("id").asText(),
                resp.path("status").asText("PENDING"));
        } catch (Exception e) {
            log.error("Xendit disburse failed: {}", e.getMessage());
            throw new RuntimeException("Disbursement service unavailable", e);
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String callbackToken) {
        return webhookToken != null && !webhookToken.isBlank() && webhookToken.equals(callbackToken);
    }

    @Override
    public String getGatewayName() { return "XENDIT"; }
}
