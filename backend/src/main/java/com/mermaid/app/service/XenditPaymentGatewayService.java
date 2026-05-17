package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Base64;
import java.util.List;
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
        // Xendit v3/payment_requests expects channel_code at the TOP LEVEL of the
        // request body (NOT nested inside a payment_method object).
        String channelCode = switch (method.toUpperCase()) {
            case "GCASH",   "PH_GCASH"             -> "GCASH";
            case "PAYMAYA", "MAYA", "PH_PAYMAYA"   -> "PAYMAYA";
            default                                -> "CREDIT_DEBIT";
        };

        java.util.HashMap<String, Object> body = new java.util.HashMap<>();
        body.put("reference_id",    idempotencyKey);
        body.put("request_amount",  amountCentavos / 100.0);
        body.put("currency",        "PHP");
        body.put("country",         "PH");
        body.put("description",     description);
        body.put("type",            "PAY");
        body.put("capture_method",  "AUTOMATIC");
        body.put("channel_code",    channelCode);

        if (!isCard) {
            body.put("channel_properties", Map.of(
                "success_return_url", returnUrl,
                "failure_return_url", returnUrl
            ));
        }

        try {
            log.info("Xendit payment_requests body: {}", body);
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restClient.post().uri("/v3/payment_requests")
                .header("idempotency-key", idempotencyKey)
                .body(body).retrieve().body(Map.class);
            log.info("Xendit payment_requests response: {}", resp);
            // Xendit v3 returns "payment_request_id", not "id"
            String id = str(resp, "payment_request_id");
            if (id == null) id = str(resp, "id");
            if (isCard) {
                String ck = str(nested(nested(resp, "payment_method"), "card"), "token_id");
                return new PaymentRequestResult(id, null, ck, publicKey);
            }
            // Xendit returns the hosted checkout URL in one of several places
            // depending on api-version: actions[0].url (new), or nested under
            // channel_properties.
            String redirect = actionUrl(resp);
            if (redirect == null || redirect.isBlank()) {
                redirect = str(nested(resp, "channel_properties"), "checkout_url");
            }
            if (redirect == null || redirect.isBlank()) {
                redirect = str(nested(nested(resp, "payment_method"), "channel_properties"), "checkout_url");
            }
            if (redirect == null || redirect.isBlank()) {
                redirect = str(nested(nested(nested(resp, "payment_method"), "ewallet"), "channel_properties"), "checkout_url");
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
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restClient.post().uri("/v3/payouts")
                .header("idempotency-key", idempotencyKey)
                .body(body).retrieve().body(Map.class);
            String id = str(resp, "id");
            String status = str(resp, "status");
            return new DisbursementResult(id, status != null ? status : "PENDING");
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

    // ---- Map navigation helpers (avoids Jackson version issues) ----

    /** Safely get a nested map by key, returning an empty map if absent. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> nested(Map<String, Object> map, String key) {
        if (map == null) return Map.of();
        Object v = map.get(key);
        return v instanceof Map ? (Map<String, Object>) v : Map.of();
    }

    /** Safely get a string value by key. */
    private static String str(Map<String, Object> map, String key) {
        if (map == null) return null;
        Object v = map.get(key);
        return v != null ? v.toString() : null;
    }

    /** Extract the first action URL from the actions array, if present. */
    @SuppressWarnings("unchecked")
    private static String actionUrl(Map<String, Object> resp) {
        if (resp == null) return null;
        Object actions = resp.get("actions");
        if (actions instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first instanceof Map) {
                // Xendit v3 uses "value" for the redirect URL, not "url"
                Object url = ((Map<String, Object>) first).get("value");
                if (url == null) url = ((Map<String, Object>) first).get("url");
                return url != null ? url.toString() : null;
            }
        }
        return null;
    }
}
