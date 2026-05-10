# Xendit Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Xendit as the payment gateway for MERMAID — collection (GCash/Maya/Card inline) for buyer→vendor retail orders, and disbursement (GCash/Maya payout) for vendor→fisherman procurement orders.

**Architecture:** The existing `PaymentGatewayService` abstraction is extended with `createPaymentRequest` and `disburse` methods. A new `XenditPaymentGatewayService` is activated when `xendit.secret-key` is non-blank (via `@ConditionalOnExpression`); `StubPaymentGatewayService` activates as fallback via `@ConditionalOnMissingBean`. Xendit REST API is called directly via Spring `RestClient` — no SDK added to avoid version conflicts with Spring Boot 3. All controllers implement generated api.yaml interfaces (api-first rule).

**Tech Stack:** Java 17, Spring Boot 3, Spring RestClient, PostgreSQL + Flyway, React/Vite frontend, Xendit REST API v3.

---

## File Map

### Backend — New files
- `backend/src/main/java/com/mermaid/app/service/XenditPaymentGatewayService.java`
- `backend/src/main/resources/db/migration/V47__xendit_ewallet_fields.sql`
- `backend/src/test/java/com/mermaid/app/service/XenditPaymentGatewayServiceTest.java`
- `backend/src/test/java/com/mermaid/app/controller/PaymentWebhookControllerTest.java`
- `backend/src/test/java/com/mermaid/app/controller/OrderPayoutControllerTest.java`

### Backend — Modified files
- `backend/src/main/java/com/mermaid/app/service/PaymentGatewayService.java` — add `createPaymentRequest`, `disburse` records
- `backend/src/main/java/com/mermaid/app/service/StubPaymentGatewayService.java` — implement new methods; `@ConditionalOnMissingBean`
- `backend/src/main/java/com/mermaid/app/controller/PaymentWebhookController.java` — Xendit route, parses webhook payload, implements `WebhooksApi`
- `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java` — use `createPaymentRequest`, set `redirectUrl` + `Order.paymentMethod`
- `backend/src/main/java/com/mermaid/app/controller/FishermanProfileController.java` — expose/update gcashNumber, mayaNumber (implements `FishermanProfileApi`)
- `backend/src/main/java/com/mermaid/app/domain/Payment.java` — add `payoutId` field
- `backend/src/main/java/com/mermaid/app/domain/User.java` — add `gcashNumber`, `mayaNumber` fields
- `backend/src/main/java/com/mermaid/app/domain/Order.java` — confirm `paymentMethod` field exists (added in V43)
- `backend/src/main/java/com/mermaid/app/repository/PaymentRepository.java` — add `findByPaymentIntentId`, `findByPayoutId`
- `backend/src/main/resources/application.properties` — add xendit properties, remove paymongo
- `backend/src/main/resources/openapi/api.yaml` — full update (PaymentIntentResponse, createPaymentIntent method param, webhook rename, payout endpoint, profile ewallet fields)
- `backend/src/test/java/com/mermaid/app/service/StubPaymentGatewayServiceTest.java` — update for new interface
- `backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java` — update for method param

### Backend — To be created by codegen (do not write by hand)
- `backend/target/generated-sources/.../api/WebhooksApi.java`
- `backend/target/generated-sources/.../api/OrdersApi.java` (updated with payout op)
- `backend/target/generated-sources/.../model/OrderPayoutRequest.java`
- `backend/target/generated-sources/.../model/OrderPayoutResponse.java`

### Frontend — New files
- `frontend/src/buyer/PaymentReturn.jsx`

### Frontend — Modified files
- `frontend/src/buyer/Checkout.jsx`
- `frontend/src/App.jsx` — add `/payment/return` route
- `frontend/src/fisherman/Profile.jsx`
- `frontend/index.html` — Xendit.js script tag
- Vendor order detail component (find with `grep -rl "handoff\|payout" frontend/src/vendor/`)

---

## Task 1: Database Migration V47

**Files:**
- Create: `backend/src/main/resources/db/migration/V47__xendit_ewallet_fields.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Xendit payout tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_id VARCHAR(100);

-- E-wallet numbers on users for fisherman disbursements
ALTER TABLE users ADD COLUMN IF NOT EXISTS gcash_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS maya_number VARCHAR(20);

-- Widen payment method constraint to include Xendit channel codes
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE payments ADD CONSTRAINT chk_payment_method
    CHECK (method IN (
        'CASH','GCASH','MAYA','COD','CREDIT','BANK_TRANSFER','STUB',
        'PAYMAYA','PH_GCASH','PH_PAYMAYA','CARD'
    ));

-- Widen order payment_method to include online methods
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_payment_method;
ALTER TABLE orders ADD CONSTRAINT chk_order_payment_method
    CHECK (payment_method IN ('CASH','CREDIT','GCASH','PAYMAYA','CARD') OR payment_method IS NULL);
```

- [ ] **Step 2: Verify migration applies cleanly**

Run: `cd backend && ./mvnw spring-boot:run 2>&1 | grep -E "migration|V47|Error" | head -10`
Expected: `Successfully applied 1 migration` for V47. No errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V47__xendit_ewallet_fields.sql
git commit -m "feat(payments): V47 — payout_id, ewallet numbers, widen payment method constraints"
```

---

## Task 2: Extend PaymentGatewayService Interface

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/PaymentGatewayService.java`

- [ ] **Step 1: Replace file contents**

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

Note: `createIntent` is removed. Both `StubPaymentGatewayService` and `BuyerOrderController` will have compile errors until updated in subsequent tasks.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/PaymentGatewayService.java
git commit -m "feat(payments): extend PaymentGatewayService interface — createPaymentRequest + disburse"
```

---

## Task 3: Update StubPaymentGatewayService

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/StubPaymentGatewayService.java`
- Modify: `backend/src/test/java/com/mermaid/app/service/StubPaymentGatewayServiceTest.java`

- [ ] **Step 1: Write updated tests first**

Replace `StubPaymentGatewayServiceTest.java`:

```java
package com.mermaid.app.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StubPaymentGatewayServiceTest {

    private final StubPaymentGatewayService service = new StubPaymentGatewayService();

    @Test
    void createPaymentRequest_gcash_returnsRedirectUrl() {
        var result = service.createPaymentRequest(15000, "GCASH", "Order #1", "idem-1",
            "http://localhost:5173/payment/return");
        assertNotNull(result.paymentRequestId());
        assertTrue(result.paymentRequestId().startsWith("pr_stub_"));
        assertNotNull(result.redirectUrl());
        assertTrue(result.redirectUrl().startsWith("https://stub-redirect.test/"));
        assertNull(result.clientKey());
    }

    @Test
    void createPaymentRequest_card_returnsClientKey() {
        var result = service.createPaymentRequest(15000, "CARD", "Order #1", "idem-2",
            "http://localhost:5173/payment/return");
        assertNotNull(result.clientKey());
        assertTrue(result.clientKey().startsWith("ck_stub_"));
        assertNull(result.redirectUrl());
    }

    @Test
    void createPaymentRequest_uniquePerCall() {
        var r1 = service.createPaymentRequest(1000, "GCASH", "T1", "k1", "http://x");
        var r2 = service.createPaymentRequest(2000, "GCASH", "T2", "k2", "http://x");
        assertNotEquals(r1.paymentRequestId(), r2.paymentRequestId());
    }

    @Test
    void disburse_returnsStubPayoutId() {
        var result = service.disburse("09171234567", "PH_GCASH", 10000, "Pay fisherman", "idem-3");
        assertNotNull(result.payoutId());
        assertTrue(result.payoutId().startsWith("po_stub_"));
        assertEquals("SUCCEEDED", result.status());
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

- [ ] **Step 2: Run tests — expect compile failure**

Run: `cd backend && ./mvnw test -Dtest=StubPaymentGatewayServiceTest -q 2>&1 | tail -10`
Expected: Compile errors (interface not yet implemented in stub).

- [ ] **Step 3: Implement the updated stub**

Replace `StubPaymentGatewayService.java`:

```java
package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Stub payment gateway for development/testing.
 * Active when no real PaymentGatewayService bean is present (i.e., xendit.secret-key not configured).
 */
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
    public String getGatewayName() {
        return "STUB";
    }
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `cd backend && ./mvnw test -Dtest=StubPaymentGatewayServiceTest -q 2>&1 | tail -10`
Expected: `Tests run: 6, Failures: 0, Errors: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/StubPaymentGatewayService.java
git add backend/src/test/java/com/mermaid/app/service/StubPaymentGatewayServiceTest.java
git commit -m "feat(payments): StubPaymentGatewayService implements new interface, ConditionalOnMissingBean"
```

---

## Task 4: XenditPaymentGatewayService

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/XenditPaymentGatewayService.java`
- Create: `backend/src/test/java/com/mermaid/app/service/XenditPaymentGatewayServiceTest.java`

Uses Spring `RestClient` — no external SDK dependency needed.

- [ ] **Step 1: Write tests**

Create `XenditPaymentGatewayServiceTest.java`:

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

    @Test
    void getGatewayName_returnsXendit() {
        assertEquals("XENDIT", service.getGatewayName());
    }

    @Test
    void verifyWebhookSignature_matchingToken_returnsTrue() {
        assertTrue(service.verifyWebhookSignature("{}", "wh_token"));
    }

    @Test
    void verifyWebhookSignature_wrongToken_returnsFalse() {
        assertFalse(service.verifyWebhookSignature("{}", "wrong"));
    }

    @Test
    void verifyWebhookSignature_nullToken_returnsFalse() {
        assertFalse(service.verifyWebhookSignature("{}", null));
    }
}
```

- [ ] **Step 2: Run tests — expect compile failure**

Run: `cd backend && ./mvnw test -Dtest=XenditPaymentGatewayServiceTest -q 2>&1 | tail -5`
Expected: Compilation error — class does not exist.

- [ ] **Step 3: Implement XenditPaymentGatewayService**

Create `XenditPaymentGatewayService.java`:

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

        Object channelProperties = isCard
            ? Map.of()
            : Map.of("success_return_url", returnUrl,
                     "failure_return_url", returnUrl,
                     "cancel_return_url",  returnUrl);

        Map<String, Object> body = Map.of(
            "reference_id",   idempotencyKey,
            "amount",         amountCentavos / 100.0,
            "currency",       "PHP",
            "description",    description,
            "payment_method", Map.of(
                "type",        isCard ? "CARD" : "EWALLET",
                "reusability", "ONE_TIME_USE",
                isCard ? "card" : "ewallet",
                isCard ? Map.of() : Map.of("channel_code", channelCode,
                                           "channel_properties", channelProperties)
            )
        );

        try {
            JsonNode resp = restClient.post()
                .uri("/v3/payment_requests")
                .header("idempotency-key", idempotencyKey)
                .body(body)
                .retrieve()
                .body(JsonNode.class);

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
            "reference_id",     idempotencyKey,
            "channel_code",     channelCode,
            "channel_properties", Map.of(
                "account_holder_name", "Fisherman",
                "account_number",      recipientPhone
            ),
            "amount",    amountCentavos / 100.0,
            "currency",  "PHP",
            "description", description
        );

        try {
            JsonNode resp = restClient.post()
                .uri("/v3/payouts")
                .header("idempotency-key", idempotencyKey)
                .body(body)
                .retrieve()
                .body(JsonNode.class);

            return new DisbursementResult(
                resp.path("id").asText(),
                resp.path("status").asText("PENDING")
            );
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
    public String getGatewayName() {
        return "XENDIT";
    }
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `cd backend && ./mvnw test -Dtest=XenditPaymentGatewayServiceTest -q 2>&1 | tail -10`
Expected: `Tests run: 4, Failures: 0, Errors: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/XenditPaymentGatewayService.java
git add backend/src/test/java/com/mermaid/app/service/XenditPaymentGatewayServiceTest.java
git commit -m "feat(payments): XenditPaymentGatewayService — collection + disbursement via RestClient"
```

---

## Task 5: Configuration Update

**Files:**
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Replace PayMongo config block with Xendit**

Find and replace:
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

- [ ] **Step 2: Verify backend starts in stub mode (no keys)**

Run: `cd backend && ./mvnw spring-boot:run 2>&1 | grep -E "Started|Stub|Error" | head -5`
Expected: App starts, `StubPaymentGatewayService` is the active gateway.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/application.properties
git commit -m "feat(payments): swap paymongo config for xendit properties"
```

---

## Task 6: Update api.yaml

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

Run `./mvnw generate-sources` after all changes to regenerate interfaces.

- [ ] **Step 0: Add `Payouts` to the `tags` list at the top of api.yaml**

Find the `tags:` block near the top of api.yaml and add:
```yaml
  - name: Payouts
    description: Payment disbursement to fishermen
```

- [ ] **Step 1: Update `PaymentIntentResponse` schema (~line 5777)**

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

- [ ] **Step 2: Add `method` query param to `createPaymentIntent` (~line 3832)**

Add alongside the existing `orderId` path param:
```yaml
        - in: query
          name: method
          required: false
          schema:
            type: string
            enum: [GCASH, PAYMAYA, CARD]
            default: CARD
```

- [ ] **Step 3: Rename webhook endpoint from `/webhooks/paymongo` to `/webhooks/xendit` (~line 3864)**

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

- [ ] **Step 4: Add payout endpoint**

Use tag `Payouts` (not `Orders`) so codegen produces a separate `PayoutsApi` interface and avoids conflict with the existing `OrderController` that already implements `OrdersApi`.

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

- [ ] **Step 5: Add payout schemas (in `components/schemas`)**

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

- [ ] **Step 6: Add ewallet fields to fisherman profile schemas**

Find `FishermanProfile` schema and add:
```yaml
        gcashNumber:
          type: string
          nullable: true
        mayaNumber:
          type: string
          nullable: true
```

Find `FishermanProfileUpdateRequest` schema and add the same two nullable fields.

- [ ] **Step 7: Regenerate sources**

Run: `cd backend && ./mvnw generate-sources -q`
Expected: No errors. Check `target/generated-sources/openapi/src/main/java/com/mermaid/app/api/` for new/updated interface files.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(payments): api.yaml — Xendit webhook, payout endpoint, PaymentIntentResponse redirectUrl"
```

---

## Task 7: Update Payment Domain + Repository

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/domain/Payment.java`
- Modify: `backend/src/main/java/com/mermaid/app/domain/User.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/PaymentRepository.java`

- [ ] **Step 1: Add `payoutId` to Payment entity**

In `Payment.java`, after the `idempotencyKey` field, add:
```java
    @Column(name = "payout_id", length = 100)
    private String payoutId;
```
Add getter/setter:
```java
    public String getPayoutId() { return payoutId; }
    public void setPayoutId(String payoutId) { this.payoutId = payoutId; }
```

Update the section comment from `// ── PayMongo integration fields` to `// ── Xendit integration fields`.

- [ ] **Step 2: Add gcashNumber/mayaNumber to User entity**

In `User.java` (field list, after existing profile fields), add:
```java
    @Column(name = "gcash_number", length = 20)
    private String gcashNumber;

    @Column(name = "maya_number", length = 20)
    private String mayaNumber;
```
Add getters/setters:
```java
    public String getGcashNumber() { return gcashNumber; }
    public void setGcashNumber(String gcashNumber) { this.gcashNumber = gcashNumber; }
    public String getMayaNumber() { return mayaNumber; }
    public void setMayaNumber(String mayaNumber) { this.mayaNumber = mayaNumber; }
```

- [ ] **Step 3: Add query methods to PaymentRepository**

In `PaymentRepository.java`, add:
```java
    Optional<Payment> findByPaymentIntentId(String paymentIntentId);
    Optional<Payment> findByPayoutId(String payoutId);
```

- [ ] **Step 4: Compile check**

Run: `cd backend && ./mvnw compile -q 2>&1 | tail -10`
Expected: Clean compile (StubPaymentGatewayService now implements the new interface).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/Payment.java
git add backend/src/main/java/com/mermaid/app/domain/User.java
git add backend/src/main/java/com/mermaid/app/repository/PaymentRepository.java
git commit -m "feat(payments): add payoutId to Payment, ewallet fields to User, repo query methods"
```

---

## Task 8: Update BuyerOrderController

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java`
- Modify: `backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java`

- [ ] **Step 1: Write new tests for method param**

In `BuyerOrderControllerTest.java`, add (keep existing tests):

```java
    @Test
    void createPaymentIntent_gcash_returns201WithRedirectUrl() throws Exception {
        var order = minimalOrder(10L, 42L, 99L);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(10L)).thenReturn(Optional.empty());
        when(paymentGatewayService.createPaymentRequest(
                anyLong(), eq("GCASH"), anyString(), anyString(), anyString()))
            .thenReturn(new com.mermaid.app.service.PaymentGatewayService.PaymentRequestResult(
                "pr_gcash_123", "https://gcash.redirect/pay", null, null));
        when(paymentGatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/buyer/orders/10/payment-intent?method=GCASH")
                .with(asBuyer(42L)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.redirectUrl").value("https://gcash.redirect/pay"))
            .andExpect(jsonPath("$.gateway").value("XENDIT"));
    }

    @Test
    void createPaymentIntent_card_returns201WithClientKey() throws Exception {
        var order = minimalOrder(11L, 42L, 99L);
        when(orderRepository.findById(11L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(11L)).thenReturn(Optional.empty());
        when(paymentGatewayService.createPaymentRequest(
                anyLong(), eq("CARD"), anyString(), anyString(), anyString()))
            .thenReturn(new com.mermaid.app.service.PaymentGatewayService.PaymentRequestResult(
                "pr_card_456", null, "ck_xendit_test", "pk_xendit_test"));
        when(paymentGatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/buyer/orders/11/payment-intent?method=CARD")
                .with(asBuyer(42L)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.clientKey").value("ck_xendit_test"));
    }
```

Add a `minimalOrder` helper if one doesn't exist:
```java
    private static com.mermaid.app.domain.Order minimalOrder(Long id, Long buyerId, Long sellerId) {
        var o = new com.mermaid.app.domain.Order();
        o.setId(id);
        o.setBuyerId(buyerId);
        o.setSellerId(sellerId);
        o.setAgreedPricePerKg(java.math.BigDecimal.valueOf(150));
        o.setOrderedQtyKg(java.math.BigDecimal.TEN);
        o.setStatus("PENDING");
        o.setKind(com.mermaid.app.domain.OrderKind.RETAIL);
        return o;
    }
```

- [ ] **Step 2: Run new tests — expect failures**

Run: `cd backend && ./mvnw test -Dtest=BuyerOrderControllerTest -q 2>&1 | tail -15`
Expected: Failures on new tests (old interface still referenced).

- [ ] **Step 3: Update createPaymentIntent in BuyerOrderController**

The generated `BuyerOrdersApi` interface will have signature `createPaymentIntent(Long orderId, String method)` after codegen. Update the `@Override` method:

```java
    @Override
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(Long orderId, String method) {
        Long buyerId = SecurityUtils.currentUserId();
        com.mermaid.app.domain.Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        if (paymentRepo.findByOrderId(orderId).isPresent()) {
            return ResponseEntity.status(409).build();
        }

        BigDecimal qty = order.getOrderedQtyKg() != null ? order.getOrderedQtyKg() : BigDecimal.ONE;
        long amountCentavos = order.getAgreedPricePerKg().multiply(qty)
            .multiply(BigDecimal.valueOf(100)).longValue();

        String paymentMethod = (method != null && !method.isBlank()) ? method.toUpperCase() : "CARD";
        String idempotencyKey = UUID.randomUUID().toString();
        String returnUrl = "http://localhost:5173/payment/return?orderId=" + orderId;

        PaymentGatewayService.PaymentRequestResult result =
            gatewayService.createPaymentRequest(amountCentavos, paymentMethod,
                "Order #" + orderId, idempotencyKey, returnUrl);

        // Update order.paymentMethod (V43 column, widened in V47)
        order.setPaymentMethod(paymentMethod);
        orderRepo.save(order);

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPayerId(buyerId);
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(order.getAgreedPricePerKg().multiply(qty));
        payment.setMethod(paymentMethod);
        payment.setPaymentIntentId(result.paymentRequestId());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setGateway(gatewayService.getGatewayName());
        paymentRepo.save(payment);

        // Build response — check generated PaymentIntentResponse setters in
        // target/generated-sources/openapi/src/main/java/com/mermaid/app/model/PaymentIntentResponse.java
        PaymentIntentResponse response = new PaymentIntentResponse();
        response.setClientKey(result.clientKey());
        response.setPublicKey(result.publicKey());
        response.setRedirectUrl(result.redirectUrl());
        response.setGateway(PaymentIntentResponse.GatewayEnum.fromValue(gatewayService.getGatewayName()));
        return ResponseEntity.status(201).body(response);
    }
```

Note: `order.setPaymentMethod()` assumes `Order` has this setter. Check `backend/src/main/java/com/mermaid/app/domain/Order.java` — if missing, add field + getter/setter (the column exists from V43).

- [ ] **Step 4: Run all BuyerOrderController tests — expect all pass**

Run: `cd backend && ./mvnw test -Dtest=BuyerOrderControllerTest -q 2>&1 | tail -10`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java
git add backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java
git commit -m "feat(payments): BuyerOrderController — method param, redirectUrl, update order.paymentMethod"
```

---

## Task 9: Rewrite PaymentWebhookController

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/PaymentWebhookController.java`
- Create: `backend/src/test/java/com/mermaid/app/controller/PaymentWebhookControllerTest.java`

The controller must implement the generated `WebhooksApi` interface (from `operationId: handleXenditWebhook`).

- [ ] **Step 1: Verify generated interface name**

Run: `find backend/target/generated-sources -name "WebhooksApi.java" 2>/dev/null`
Expected: Path to the generated file. Open it to confirm the exact method signature.

- [ ] **Step 2: Write webhook controller tests**

Create `PaymentWebhookControllerTest.java`:

```java
package com.mermaid.app.controller;

import com.mermaid.app.domain.Payment;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.service.PaymentGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentWebhookController.class)
class PaymentWebhookControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PaymentGatewayService gatewayService;
    @MockitoBean PaymentRepository paymentRepository;
    @MockitoBean JwtDecoder jwtDecoder;

    private static final String PAYLOAD = """
        {"event":"payment.succeeded","data":{"id":"pr_test_123","reference_id":"idem-1"}}""";

    @Test
    void validToken_updatesPaymentAndReturns200() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), eq("wh_token"))).thenReturn(true);
        Payment p = new Payment();
        p.setStatus("PENDING");
        p.setAmount(BigDecimal.TEN);
        when(paymentRepository.findByPaymentIntentId("pr_test_123")).thenReturn(Optional.of(p));

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "wh_token")
                .content(PAYLOAD))
            .andExpect(status().isOk());

        verify(paymentRepository).save(argThat(saved -> "CONFIRMED".equals(saved.getStatus())));
    }

    @Test
    void invalidToken_returns401() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), eq("bad"))).thenReturn(false);

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "bad")
                .content(PAYLOAD))
            .andExpect(status().isUnauthorized());

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void unknownPaymentIntent_returns200WithoutSave() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), anyString())).thenReturn(true);
        when(paymentRepository.findByPaymentIntentId(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "wh_token")
                .content(PAYLOAD))
            .andExpect(status().isOk());

        verify(paymentRepository, never()).save(any());
    }
}
```

- [ ] **Step 3: Run tests — expect failure**

Run: `cd backend && ./mvnw test -Dtest=PaymentWebhookControllerTest -q 2>&1 | tail -10`
Expected: Failures (old route `/webhooks/paymongo` in controller).

- [ ] **Step 4: Rewrite PaymentWebhookController**

```java
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
        String payload = body instanceof String s ? s : "";
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
```

Note: Check the actual generated `WebhooksApi` method signature in `target/generated-sources/` — the `body` and `xCallbackToken` parameter names/types may differ. Adjust the `@Override` signature to match exactly.

- [ ] **Step 5: Run webhook tests — expect all pass**

Run: `cd backend && ./mvnw test -Dtest=PaymentWebhookControllerTest -q 2>&1 | tail -10`
Expected: `Tests run: 3, Failures: 0, Errors: 0`

- [ ] **Step 6: Verify old route is gone**

Run: `grep -r "paymongo" backend/src/main/java/ 2>/dev/null`
Expected: No matches.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/PaymentWebhookController.java
git add backend/src/test/java/com/mermaid/app/controller/PaymentWebhookControllerTest.java
git commit -m "feat(payments): Xendit webhook — confirm payment/payout on succeeded events"
```

---

## Task 10: OrderPayoutController (Vendor → Fisherman Disbursement)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/OrderPayoutController.java`
- Create: `backend/src/test/java/com/mermaid/app/controller/OrderPayoutControllerTest.java`

The controller implements the generated interface from `operationId: initiateOrderPayout`.

- [ ] **Step 1: Verify generated interface**

Run: `find backend/target/generated-sources -name "OrdersApi.java" 2>/dev/null`
Open the file and locate the `initiateOrderPayout` method signature.

- [ ] **Step 2: Write tests**

Create `OrderPayoutControllerTest.java`:

```java
package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.domain.User;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.service.PaymentGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderPayoutController.class)
class OrderPayoutControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean PaymentGatewayService gatewayService;
    @MockitoBean OrderRepository orderRepository;
    @MockitoBean PaymentRepository paymentRepository;
    @MockitoBean UserRepository userRepository;
    @MockitoBean JwtDecoder jwtDecoder;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    @Test
    void initiatePayout_gcash_returns201() throws Exception {
        Order order = procurementOrder(1L, 10L, 20L);
        User fisherman = userWithGcash(20L, "09171234567");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(1L)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(fisherman));
        when(gatewayService.disburse(eq("09171234567"), eq("PH_GCASH"), anyLong(), anyString(), anyString()))
            .thenReturn(new PaymentGatewayService.DisbursementResult("po_123", "SUCCEEDED"));
        when(gatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/orders/1/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.payoutId").value("po_123"))
            .andExpect(jsonPath("$.status").value("SUCCEEDED"));
    }

    @Test
    void initiatePayout_noGcashNumber_returns422() throws Exception {
        Order order = procurementOrder(2L, 10L, 20L);
        User fisherman = new User(); fisherman.setId(20L); // no gcash

        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(2L)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(fisherman));

        mockMvc.perform(post("/orders/2/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isUnprocessableEntity());
    }

    private Order procurementOrder(Long id, Long buyerId, Long sellerId) {
        Order o = new Order();
        o.setId(id); o.setBuyerId(buyerId); o.setSellerId(sellerId);
        o.setAgreedPricePerKg(BigDecimal.valueOf(100));
        o.setOrderedQtyKg(BigDecimal.TEN);
        o.setKind(OrderKind.PROCUREMENT);
        o.setStatus("CONFIRMED");
        return o;
    }

    private User userWithGcash(Long id, String phone) {
        User u = new User(); u.setId(id); u.setGcashNumber(phone);
        return u;
    }
}
```

- [ ] **Step 3: Run tests — expect failure**

Run: `cd backend && ./mvnw test -Dtest=OrderPayoutControllerTest -q 2>&1 | tail -10`
Expected: Compilation error.

- [ ] **Step 4: Implement OrderPayoutController**

Because the payout endpoint uses tag `Payouts` in api.yaml, codegen produces `PayoutsApi` (not `OrdersApi`). This avoids conflict with `OrderController` which already implements `OrdersApi`.

```java
package com.mermaid.app.controller;

import com.mermaid.app.api.PayoutsApi;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.OrderPayoutRequest;
import com.mermaid.app.model.OrderPayoutResponse;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.PaymentRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.PaymentGatewayService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@PreAuthorize("hasAnyRole('VENDOR','FISHERMAN')")
public class OrderPayoutController implements PayoutsApi {

    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final PaymentGatewayService gatewayService;

    public OrderPayoutController(OrderRepository orderRepo, PaymentRepository paymentRepo,
                                  UserRepository userRepo, PaymentGatewayService gatewayService) {
        this.orderRepo      = orderRepo;
        this.paymentRepo    = paymentRepo;
        this.userRepo       = userRepo;
        this.gatewayService = gatewayService;
    }

    @Override
    public ResponseEntity<OrderPayoutResponse> initiateOrderPayout(Long orderId,
                                                                    OrderPayoutRequest request) {
        Long initiatorId = SecurityUtils.currentUserId();
        com.mermaid.app.domain.Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getBuyerId().equals(initiatorId) && !order.getSellerId().equals(initiatorId)) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        if (paymentRepo.findByOrderId(orderId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payout already initiated");
        }
        if (order.getKind() != OrderKind.PROCUREMENT) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Payouts only available for procurement orders");
        }

        User fisherman = userRepo.findById(order.getSellerId())
            .orElseThrow(() -> new ResourceNotFoundException("Fisherman not found"));

        String phone = "PH_GCASH".equals(request.getChannelCode())
            ? fisherman.getGcashNumber()
            : fisherman.getMayaNumber();

        if (phone == null || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Fisherman has no e-wallet number on file for " + request.getChannelCode());
        }

        BigDecimal qty = order.getOrderedQtyKg() != null ? order.getOrderedQtyKg() : BigDecimal.ONE;
        long amountCentavos = order.getAgreedPricePerKg().multiply(qty)
            .multiply(BigDecimal.valueOf(100)).longValue();

        String idempotencyKey = UUID.randomUUID().toString();
        PaymentGatewayService.DisbursementResult result = gatewayService.disburse(
            phone, request.getChannelCode(), amountCentavos,
            "Order #" + orderId + " fisherman payment", idempotencyKey);

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPayerId(initiatorId);
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(order.getAgreedPricePerKg().multiply(qty));
        payment.setMethod(request.getChannelCode());
        payment.setPayoutId(result.payoutId());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setGateway(gatewayService.getGatewayName());
        payment.setStatus("SUCCEEDED".equals(result.status()) ? "CONFIRMED" : "PENDING");
        paymentRepo.save(payment);

        OrderPayoutResponse response = new OrderPayoutResponse();
        response.setPayoutId(result.payoutId());
        response.setStatus(result.status());
        return ResponseEntity.status(201).body(response);
    }
}
```


- [ ] **Step 5: Run payout tests — expect all pass**

Run: `cd backend && ./mvnw test -Dtest=OrderPayoutControllerTest -q 2>&1 | tail -10`
Expected: `Tests run: 2, Failures: 0, Errors: 0`

- [ ] **Step 6: Run full backend test suite**

Run: `cd backend && ./mvnw test -q 2>&1 | tail -15`
Expected: All green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/OrderPayoutController.java
git add backend/src/test/java/com/mermaid/app/controller/OrderPayoutControllerTest.java
git commit -m "feat(payments): OrderPayoutController — vendor initiates GCash/Maya payout to fisherman"
```

---

## Task 11: Fisherman Profile — E-wallet Fields

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/FishermanProfileController.java`
- (User domain already updated in Task 7; api.yaml already updated in Task 6)

- [ ] **Step 1: Find the profile get/update methods**

Read `backend/src/main/java/com/mermaid/app/controller/FishermanProfileController.java` in full.

- [ ] **Step 2: Update profile fetch to include ewallet fields**

In the method that returns a `FishermanProfile` response, add:
```java
profile.setGcashNumber(user.getGcashNumber());
profile.setMayaNumber(user.getMayaNumber());
```

- [ ] **Step 3: Update profile update to save ewallet fields**

In the method that handles `FishermanProfileUpdateRequest`, add:
```java
if (request.getGcashNumber() != null) user.setGcashNumber(request.getGcashNumber());
if (request.getMayaNumber()  != null) user.setMayaNumber(request.getMayaNumber());
```

- [ ] **Step 4: Run existing profile tests**

Run: `cd backend && ./mvnw test -Dtest=FishermanProfile* -q 2>&1 | tail -10`
Expected: Pass (or no tests — that's acceptable for this task).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/FishermanProfileController.java
git commit -m "feat(profile): expose gcashNumber + mayaNumber on fisherman profile read/update"
```

---

## Task 12: Frontend — Checkout.jsx Payment Integration

**Files:**
- Modify: `frontend/src/buyer/Checkout.jsx`
- Modify: `frontend/index.html`

- [ ] **Step 1: Add Xendit.js to index.html**

In `frontend/index.html`, inside `<head>`, add:
```html
<script src="https://js.xendit.co/v1/xendit.min.js"></script>
```

- [ ] **Step 2: Add payment state to Checkout.jsx**

```jsx
const [onlineMethod, setOnlineMethod] = useState('GCASH'); // GCASH | PAYMAYA | CARD
const [paying, setPaying] = useState(false);
const [payError, setPayError] = useState(null);
```

- [ ] **Step 3: Replace the disabled "Online" button with an active payment selector**

```jsx
<div className="payment-online">
  <div className="payment-tabs">
    {[['GCASH','GCash'], ['PAYMAYA','Maya'], ['CARD','Card']].map(([val, label]) => (
      <button key={val}
        className={`tab ${onlineMethod === val ? 'active' : ''}`}
        onClick={() => { setOnlineMethod(val); setPayError(null); }}>
        {label}
      </button>
    ))}
  </div>

  {onlineMethod === 'CARD' && (
    <div id="xendit-card-form" style={{ margin: '1rem 0' }}>
      <p className="hint">Card details will be collected securely by Xendit.</p>
    </div>
  )}

  {(onlineMethod === 'GCASH' || onlineMethod === 'PAYMAYA') && (
    <p className="redirect-hint">
      You will be redirected to {onlineMethod === 'GCASH' ? 'GCash' : 'Maya'} to complete payment.
    </p>
  )}

  <button className="pay-btn primary" onClick={handleOnlinePay} disabled={paying}>
    {paying ? 'Processing…' : `Pay via ${onlineMethod === 'PAYMAYA' ? 'Maya' : onlineMethod}`}
  </button>
  {payError && <p className="pay-error">{payError}</p>}
</div>
```

- [ ] **Step 4: Implement handleOnlinePay**

```jsx
const handleOnlinePay = async () => {
  setPaying(true);
  setPayError(null);
  try {
    const res = await api.post(
      `/buyer/orders/${orderId}/payment-intent?method=${onlineMethod}`
    );
    const { redirectUrl } = res.data;

    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }
    // CARD: Xendit handles 3DS and redirects internally — watch for clientKey handling
    // Check Xendit JS docs for current v3 Payment Requests inline card flow
    setPayError('Card payment form not yet integrated. Use GCash or Maya.');
  } catch (err) {
    setPayError(err.response?.data?.message || 'Payment failed. Please try again.');
  } finally {
    setPaying(false);
  }
};
```

- [ ] **Step 5: Manual smoke test in browser**

Start backend (stub mode) + frontend. Navigate to checkout for an existing order. Click "Pay via GCash" — should receive a stub redirect URL and navigate. Confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/buyer/Checkout.jsx frontend/index.html
git commit -m "feat(checkout): activate GCash/Maya online payment — Xendit redirect flow"
```

---

## Task 13: Frontend — PaymentReturn Page

**Files:**
- Create: `frontend/src/buyer/PaymentReturn.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create PaymentReturn.jsx**

```jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId  = params.get('orderId');
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (!orderId) { setStatus('pending'); return; }
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/buyer/orders/${orderId}`);
        // Check payment status — adjust field path to match actual API response shape
        if (res.data.paymentStatus === 'CONFIRMED' || res.data.status === 'COMPLETED') {
          clearInterval(poll);
          setStatus('confirmed');
        }
      } catch { /* keep polling */ }
      if (attempts >= 10) { clearInterval(poll); setStatus('pending'); }
    }, 3000);
    return () => clearInterval(poll);
  }, [orderId]);

  if (status === 'checking') return (
    <div className="payment-return">
      <div className="spinner" />
      <p>Confirming your payment…</p>
    </div>
  );

  if (status === 'confirmed') return (
    <div className="payment-return success">
      <h2>Payment Confirmed!</h2>
      <p>Order #{orderId} paid successfully.</p>
      <button onClick={() => navigate(`/buyer/orders/${orderId}`)}>View Order</button>
    </div>
  );

  return (
    <div className="payment-return pending">
      <h2>Payment Processing</h2>
      <p>Your payment is being processed. Check your orders for updates.</p>
      <button onClick={() => navigate('/buyer/orders')}>My Orders</button>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.jsx**

```jsx
import PaymentReturn from './buyer/PaymentReturn';
// ...
<Route path="/payment/return" element={<PaymentReturn />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/buyer/PaymentReturn.jsx frontend/src/App.jsx
git commit -m "feat(checkout): PaymentReturn page — polls for payment confirmation after redirect"
```

---

## Task 14: Frontend — Fisherman Profile E-wallet Fields

**Files:**
- Modify: `frontend/src/fisherman/Profile.jsx`

- [ ] **Step 1: Add gcashNumber/mayaNumber to profile state**

```jsx
const [gcashNumber, setGcashNumber] = useState(profile?.gcashNumber || '');
const [mayaNumber,  setMayaNumber]  = useState(profile?.mayaNumber  || '');
```

- [ ] **Step 2: Add form fields**

```jsx
<div className="form-group">
  <label>GCash Number</label>
  <input type="tel" value={gcashNumber}
    onChange={e => setGcashNumber(e.target.value)}
    placeholder="09XXXXXXXXX" maxLength={20} />
</div>
<div className="form-group">
  <label>Maya Number</label>
  <input type="tel" value={mayaNumber}
    onChange={e => setMayaNumber(e.target.value)}
    placeholder="09XXXXXXXXX" maxLength={20} />
</div>
```

- [ ] **Step 3: Include in save request**

Add `gcashNumber` and `mayaNumber` to the PATCH body when saving profile.

- [ ] **Step 4: Add warning banner if no ewallet number**

On the fisherman orders/earnings page (or in Profile.jsx itself):
```jsx
{!gcashNumber && !mayaNumber && (
  <div className="warning-banner">
    Add your GCash or Maya number so vendors can pay you electronically.
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Profile.jsx
git commit -m "feat(profile): GCash/Maya number fields on fisherman profile"
```

---

## Task 15: Frontend — Vendor Order Payout UI

**Files:**
- Modify: vendor order detail component

- [ ] **Step 1: Find the correct file**

Run: `grep -rl "handoff\|PROCUREMENT\|payout" frontend/src/vendor/ 2>/dev/null | head -5`
Open the result — likely `frontend/src/vendor/OrderDetail.jsx` or similar.

- [ ] **Step 2: Add payout state**

```jsx
const [payoutChannel, setPayoutChannel] = useState('PH_GCASH');
const [payingOut, setPayingOut]         = useState(false);
const [payoutError, setPayoutError]     = useState(null);
const [payoutDone, setPayoutDone]       = useState(false);
```

- [ ] **Step 3: Add payout section (shown after handoff confirmed, PROCUREMENT orders only)**

```jsx
{order.kind === 'PROCUREMENT' && order.handoffConfirmedByBuyer && !payoutDone && (
  <div className="payout-section">
    <h3>Pay Fisherman</h3>
    <p>Amount: ₱{(order.agreedPricePerKg * order.orderedQtyKg).toFixed(2)}</p>
    <select value={payoutChannel} onChange={e => setPayoutChannel(e.target.value)}>
      <option value="PH_GCASH">GCash</option>
      <option value="PH_PAYMAYA">Maya</option>
    </select>
    <button onClick={handlePayout} disabled={payingOut}>
      {payingOut ? 'Sending…' : 'Send Payment'}
    </button>
    {payoutError && <p className="error">{payoutError}</p>}
  </div>
)}
{payoutDone && <p className="success">Payment sent to fisherman.</p>}
```

- [ ] **Step 4: Implement handlePayout**

```jsx
const handlePayout = async () => {
  setPayingOut(true);
  setPayoutError(null);
  try {
    await api.post(`/orders/${order.id}/payout`, { channelCode: payoutChannel });
    setPayoutDone(true);
  } catch (err) {
    setPayoutError(err.response?.data?.message || 'Payout failed. Try again.');
  } finally {
    setPayingOut(false);
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/
git commit -m "feat(vendor): payout section — GCash/Maya payment to fisherman after handoff"
```

---

## Task 16: Final Integration Smoke Test

- [ ] **Step 1: Run full backend test suite**

Run: `cd backend && ./mvnw test 2>&1 | tail -20`
Expected: All tests pass. Fix any failures before marking done.

- [ ] **Step 2: Start all services**

```
Terminal 1: cd backend && ./mvnw spring-boot:run
Terminal 2: cd frontend && npm run dev
```

- [ ] **Step 3: Buyer → Vendor smoke test**

1. Log in as a buyer. Find or create a RETAIL order.
2. Go to checkout → select GCash → click Pay.
3. In stub mode: you receive a stub redirect URL (browser navigates to `https://stub-redirect.test/...`).
4. Navigate manually to `http://localhost:5173/payment/return?orderId=X` — confirm polling page loads.
5. Log in as vendor — confirm order shows payment as pending / confirmed.

- [ ] **Step 4: Vendor → Fisherman smoke test**

1. Log in as a fisherman → Profile → add GCash number `09171234567`.
2. Create/find a PROCUREMENT order in CONFIRMED state with handoff confirmed.
3. Log in as vendor → order detail → "Pay Fisherman via GCash" → confirm success message.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(payments): Xendit integration complete — collection (buyer) + disbursement (fisherman)"
```

---

## Environment Variables for Production

```bash
# Backend
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_PUBLIC_KEY=xnd_public_production_...
XENDIT_WEBHOOK_TOKEN=<from Xendit dashboard>
XENDIT_CALLBACK_URL=https://your-domain.com/api/webhooks/xendit

# Frontend
VITE_XENDIT_PUBLIC_KEY=xnd_public_production_...
```

Configure the Xendit webhook URL in the Xendit dashboard → Developers → Webhooks.
Subscribe to events: `payment.succeeded`, `payout.succeeded`.
