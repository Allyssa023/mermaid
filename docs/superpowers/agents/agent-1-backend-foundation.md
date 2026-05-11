# Agent 1 — Backend Foundation

**Your role:** Implement the backend infrastructure layer for Xendit payment integration. You are the first agent to run. Agents 2 and 3 depend on your work completing successfully before they can start.

**Full plan:** `docs/superpowers/plans/2026-05-10-xendit-payment-integration.md`
**Spec:** `docs/superpowers/specs/2026-05-10-xendit-payment-integration-design.md`

---

## Codebase Context

- **Stack:** Spring Boot 3, Java 17, PostgreSQL, Flyway migrations
- **API-first:** `backend/src/main/resources/openapi/api.yaml` is the source of truth. Run `./mvnw generate-sources` after any api.yaml change to regenerate interfaces/DTOs into `target/generated-sources/`. Controllers implement generated interfaces — never write method signatures by hand.
- **Test pattern:** `@WebMvcTest(Foo.class)` + `@MockitoBean` + `jwt()` from `SecurityMockMvcRequestPostProcessors`. Always include `@MockitoBean JwtDecoder jwtDecoder`.
- **Transactional:** Service writes are `@Transactional`, reads are `@Transactional(readOnly = true)`.
- **Working dir:** `C:\Users\Zaimond\Documents\mermaid`
- **Commands:** Run from `backend/` subdirectory: `./mvnw test`, `./mvnw compile`, `./mvnw generate-sources`

---

## Your Tasks (Plan Tasks 1–7)

### Task 1 — Flyway Migration V47
**File to create:** `backend/src/main/resources/db/migration/V47__xendit_ewallet_fields.sql`

```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gcash_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS maya_number VARCHAR(20);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE payments ADD CONSTRAINT chk_payment_method
    CHECK (method IN (
        'CASH','GCASH','MAYA','COD','CREDIT','BANK_TRANSFER','STUB',
        'PAYMAYA','PH_GCASH','PH_PAYMAYA','CARD'
    ));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_payment_method;
ALTER TABLE orders ADD CONSTRAINT chk_order_payment_method
    CHECK (payment_method IN ('CASH','CREDIT','GCASH','PAYMAYA','CARD') OR payment_method IS NULL);
```

Verify: `cd backend && ./mvnw spring-boot:run 2>&1 | grep -E "V47|migration|Error" | head -10`

---

### Task 2 — Replace PaymentGatewayService Interface
**File to modify:** `backend/src/main/java/com/mermaid/app/service/PaymentGatewayService.java`

Read the current file first. Then replace its entire contents:

```java
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
```

Note: This removes `createIntent`. Expect compile errors in `StubPaymentGatewayService` and `BuyerOrderController` — fix them in subsequent tasks.

---

### Task 3 — Update StubPaymentGatewayService
**File to modify:** `backend/src/main/java/com/mermaid/app/service/StubPaymentGatewayService.java`
**Test to update:** `backend/src/test/java/com/mermaid/app/service/StubPaymentGatewayServiceTest.java`

Write test first, then implement.

**Updated test:**
```java
package com.mermaid.app.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StubPaymentGatewayServiceTest {

    private final StubPaymentGatewayService service = new StubPaymentGatewayService();

    @Test
    void createPaymentRequest_gcash_returnsRedirectUrl() {
        var r = service.createPaymentRequest(15000, "GCASH", "Order #1", "idem-1", "http://localhost:5173/payment/return");
        assertNotNull(r.paymentRequestId());
        assertTrue(r.paymentRequestId().startsWith("pr_stub_"));
        assertNotNull(r.redirectUrl());
        assertTrue(r.redirectUrl().startsWith("https://stub-redirect.test/"));
        assertNull(r.clientKey());
    }

    @Test
    void createPaymentRequest_card_returnsClientKey() {
        var r = service.createPaymentRequest(15000, "CARD", "Order #1", "idem-2", "http://localhost:5173/payment/return");
        assertNotNull(r.clientKey());
        assertTrue(r.clientKey().startsWith("ck_stub_"));
        assertNull(r.redirectUrl());
    }

    @Test
    void createPaymentRequest_uniquePerCall() {
        var r1 = service.createPaymentRequest(1000, "GCASH", "T1", "k1", "http://x");
        var r2 = service.createPaymentRequest(2000, "GCASH", "T2", "k2", "http://x");
        assertNotEquals(r1.paymentRequestId(), r2.paymentRequestId());
    }

    @Test
    void disburse_returnsStubPayoutId() {
        var r = service.disburse("09171234567", "PH_GCASH", 10000, "Pay fisherman", "idem-3");
        assertNotNull(r.payoutId());
        assertTrue(r.payoutId().startsWith("po_stub_"));
        assertEquals("SUCCEEDED", r.status());
    }

    @Test
    void verifyWebhookSignature_alwaysTrue() {
        assertTrue(service.verifyWebhookSignature("payload", "token"));
        assertTrue(service.verifyWebhookSignature(null, null));
    }

    @Test
    void getGatewayName_returnsStub() {
        assertEquals("STUB", service.getGatewayName());
    }
}
```

**Implementation:**
```java
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
```

Run: `cd backend && ./mvnw test -Dtest=StubPaymentGatewayServiceTest -q`
Expected: 6 tests pass.

---

### Task 4 — Create XenditPaymentGatewayService
**File to create:** `backend/src/main/java/com/mermaid/app/service/XenditPaymentGatewayService.java`
**Test to create:** `backend/src/test/java/com/mermaid/app/service/XenditPaymentGatewayServiceTest.java`

**Test:**
```java
package com.mermaid.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class XenditPaymentGatewayServiceTest {

    @Mock RestClient.Builder restClientBuilder;
    @Mock RestClient restClient;

    XenditPaymentGatewayService service;

    @BeforeEach
    void setUp() {
        when(restClientBuilder.baseUrl(anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.defaultHeader(anyString(), anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.build()).thenReturn(restClient);
        service = new XenditPaymentGatewayService(
            restClientBuilder, "xnd_development_secret", "xnd_public_test", "wh_token");
    }

    @Test void getGatewayName_returnsXendit() { assertEquals("XENDIT", service.getGatewayName()); }

    @Test void verifyWebhookSignature_matchingToken_returnsTrue() {
        assertTrue(service.verifyWebhookSignature("{}", "wh_token"));
    }

    @Test void verifyWebhookSignature_wrongToken_returnsFalse() {
        assertFalse(service.verifyWebhookSignature("{}", "wrong"));
    }

    @Test void verifyWebhookSignature_nullToken_returnsFalse() {
        assertFalse(service.verifyWebhookSignature("{}", null));
    }
}
```

**Implementation:**
```java
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
```

Run: `cd backend && ./mvnw test -Dtest=XenditPaymentGatewayServiceTest -q`
Expected: 4 tests pass.

---

### Task 5 — Update application.properties
**File to modify:** `backend/src/main/resources/application.properties`

Find and replace the PayMongo block:
```properties
# ── PayMongo (Phase 3.1) ──────────────────────────────────────────────────────
paymongo.public-key=${PAYMONGO_PUBLIC_KEY:}
paymongo.secret-key=${PAYMONGO_SECRET_KEY:}
paymongo.webhook-secret=${PAYMONGO_WEBHOOK_SECRET:}
```

With:
```properties
# ── Xendit payment gateway ─────────────────────────────────────────────────────
xendit.secret-key=${XENDIT_SECRET_KEY:}
xendit.public-key=${XENDIT_PUBLIC_KEY:}
xendit.webhook-token=${XENDIT_WEBHOOK_TOKEN:}
xendit.callback-url=${XENDIT_CALLBACK_URL:http://localhost:8080/api/webhooks/xendit}
```

---

### Task 6 — Update api.yaml
**File to modify:** `backend/src/main/resources/openapi/api.yaml`

Make all these changes, then run `./mvnw generate-sources`:

**6a. Add `Payouts` to the tags list** (near top of file, in the `tags:` block):
```yaml
  - name: Payouts
    description: Payment disbursement to fishermen
```

**6b. Update `PaymentIntentResponse` schema** (search for `PaymentIntentResponse:`):
```yaml
    PaymentIntentResponse:
      type: object
      required: [gateway]
      properties:
        clientKey:
          type: string
          nullable: true
        publicKey:
          type: string
          nullable: true
        redirectUrl:
          type: string
          nullable: true
        gateway:
          type: string
          enum: [XENDIT, STUB]
```

**6c. Add `method` query param to createPaymentIntent** (search for `operationId: createPaymentIntent`). Add to the parameters list:
```yaml
        - in: query
          name: method
          required: false
          schema:
            type: string
            enum: [GCASH, PAYMAYA, CARD]
            default: CARD
```

**6d. Rename webhook endpoint** (search for `/webhooks/paymongo`). Replace the entire path block:
```yaml
  /webhooks/xendit:
    post:
      tags: [Webhooks]
      summary: Xendit webhook handler
      operationId: handleXenditWebhook
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      parameters:
        - in: header
          name: x-callback-token
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Processed
        '401':
          description: Invalid token
```

**6e. Add payout endpoint** (add after the webhook block):
```yaml
  /orders/{orderId}/payout:
    post:
      tags: [Payouts]
      summary: Initiate GCash/Maya payout to fisherman after handoff
      operationId: initiateOrderPayout
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderPayoutRequest'
      responses:
        '201':
          description: Payout initiated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderPayoutResponse'
        '404':
          description: Order not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Payout already initiated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '422':
          description: Fisherman has no e-wallet number on file
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

**6f. Add payout schemas** (in `components/schemas`):
```yaml
    OrderPayoutRequest:
      type: object
      required: [channelCode]
      properties:
        channelCode:
          type: string
          enum: [PH_GCASH, PH_PAYMAYA]

    OrderPayoutResponse:
      type: object
      required: [payoutId, status]
      properties:
        payoutId:
          type: string
        status:
          type: string
```

**6g. Add ewallet fields to fisherman profile schemas** (find `FishermanProfile:` and `FishermanProfileUpdateRequest:`):
```yaml
        gcashNumber:
          type: string
          nullable: true
        mayaNumber:
          type: string
          nullable: true
```

**After all yaml changes:**
Run: `cd backend && ./mvnw generate-sources -q`
Expected: No errors. Verify `target/generated-sources/openapi/src/main/java/com/mermaid/app/api/` contains `WebhooksApi.java`, `PayoutsApi.java`, and updated `FishermanProfileApi.java`.

---

### Task 7 — Update Domain Entities + Repository
**Files to modify:**
- `backend/src/main/java/com/mermaid/app/domain/Payment.java`
- `backend/src/main/java/com/mermaid/app/domain/User.java`
- `backend/src/main/java/com/mermaid/app/repository/PaymentRepository.java`

**Payment.java** — Add `payoutId` field after `idempotencyKey`. Update the comment block. Add getter/setter:
```java
    // ── Xendit integration fields ──────────────────────────────────────────────
    @Column(name = "payment_intent_id", length = 100)
    private String paymentIntentId;
    // ... (keep existing fields) ...
    @Column(name = "payout_id", length = 100)
    private String payoutId;

    // getter/setter:
    public String getPayoutId() { return payoutId; }
    public void setPayoutId(String payoutId) { this.payoutId = payoutId; }
```

**User.java** — Find the existing profile fields (vesselName, landingSite, etc.). Add:
```java
    @Column(name = "gcash_number", length = 20)
    private String gcashNumber;

    @Column(name = "maya_number", length = 20)
    private String mayaNumber;

    public String getGcashNumber() { return gcashNumber; }
    public void setGcashNumber(String gcashNumber) { this.gcashNumber = gcashNumber; }
    public String getMayaNumber() { return mayaNumber; }
    public void setMayaNumber(String mayaNumber) { this.mayaNumber = mayaNumber; }
```

**PaymentRepository.java** — Add:
```java
    Optional<Payment> findByPaymentIntentId(String paymentIntentId);
    Optional<Payment> findByPayoutId(String payoutId);
```

---

## Verification

Run: `cd backend && ./mvnw test -q 2>&1 | tail -15`
Expected: All existing tests pass. If BuyerOrderController tests fail because `createIntent` is missing, that's expected — Agent 2 will fix them.

Run: `cd backend && ./mvnw compile -q 2>&1 | grep ERROR | head -10`
The only compile errors expected are in `BuyerOrderController` (uses old `createIntent`). Agent 2 owns that fix.

---

## Commits

Commit after each task. Use format: `feat(payments): <short description>`

Final verification command:
```bash
cd backend && ./mvnw test -Dtest=StubPaymentGatewayServiceTest,XenditPaymentGatewayServiceTest -q 2>&1 | tail -10
```
Expected: 10 tests pass across both test classes.
