# Agent 2 — Backend Controllers (Collection)

**Your role:** Implement the buyer-side payment controllers — updating `BuyerOrderController` to support GCash/Maya/Card method selection, and rewriting `PaymentWebhookController` to handle Xendit events.

**Prerequisite:** Agent 1 must complete first. Its work produces:
- Updated `PaymentGatewayService` interface (with `createPaymentRequest` and `disburse`)
- Updated `StubPaymentGatewayService`
- New `XenditPaymentGatewayService`
- Updated `api.yaml` + regenerated sources in `target/generated-sources/`
- Updated `Payment`, `User` entities and `PaymentRepository`

**Full plan:** `docs/superpowers/plans/2026-05-10-xendit-payment-integration.md`

---

## Codebase Context

- **Stack:** Spring Boot 3, Java 17, api-first codegen
- **Generated sources:** After Agent 1 ran `./mvnw generate-sources`, check `target/generated-sources/openapi/src/main/java/com/mermaid/app/api/` for `WebhooksApi.java`, `BuyerOrdersApi.java`. Open these files and read the exact method signatures before implementing.
- **Test pattern:** `@WebMvcTest(FooController.class)` + `@MockitoBean` for every dependency + `@MockitoBean JwtDecoder jwtDecoder` required always. Use `jwt().jwt(b -> b.subject("1")).authorities(new SimpleGrantedAuthority("ROLE_BUYER"))` for auth.
- **Working dir:** `C:\Users\Zaimond\Documents\mermaid`

---

## Task 8 — Update BuyerOrderController

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java`
- Modify: `backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java`

### Step 1: Read the current controller and test

Read both files to understand current state before editing.

### Step 2: Check the generated BuyerOrdersApi signature

Run: `find backend/target/generated-sources -name "BuyerOrdersApi.java" 2>/dev/null`
Open that file and find the `createPaymentIntent` method. It should now have signature:
```java
ResponseEntity<PaymentIntentResponse> createPaymentIntent(Long orderId, String method);
```
If it still has the old signature (no `method` param), Agent 1's codegen step may not have completed. Verify and re-run `./mvnw generate-sources` if needed.

### Step 3: Add tests for method param (add to existing test class — do not delete existing tests)

First, check what helpers exist in the test class. There may be a `sampleOrder()` or similar helper. Add these tests:

```java
    @Test
    void createPaymentIntent_gcash_returns201WithRedirectUrl() throws Exception {
        var order = minimalOrder(10L, 42L, 99L);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(10L)).thenReturn(Optional.empty());
        when(paymentGatewayService.createPaymentRequest(
                anyLong(), eq("GCASH"), anyString(), anyString(), anyString()))
            .thenReturn(new com.mermaid.app.service.PaymentGatewayService.PaymentRequestResult(
                "pr_gcash_1", "https://gcash.redirect/pay", null, null));
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
                "pr_card_1", null, "ck_xendit", "pk_xendit"));
        when(paymentGatewayService.getGatewayName()).thenReturn("XENDIT");

        mockMvc.perform(post("/buyer/orders/11/payment-intent?method=CARD")
                .with(asBuyer(42L)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.clientKey").value("ck_xendit"));
    }
```

Add a `minimalOrder` helper if it doesn't exist:
```java
    private static com.mermaid.app.domain.Order minimalOrder(Long id, Long buyerId, Long sellerId) {
        var o = new com.mermaid.app.domain.Order();
        o.setId(id); o.setBuyerId(buyerId); o.setSellerId(sellerId);
        o.setAgreedPricePerKg(java.math.BigDecimal.valueOf(150));
        o.setOrderedQtyKg(java.math.BigDecimal.TEN);
        o.setStatus("PENDING");
        o.setKind(com.mermaid.app.domain.OrderKind.RETAIL);
        return o;
    }
```

Also add these imports to the test class if missing:
```java
import java.util.Optional;
import static org.mockito.ArgumentMatchers.*;
```

### Step 4: Run tests — expect failures on new tests

Run: `cd backend && ./mvnw test -Dtest=BuyerOrderControllerTest -q 2>&1 | tail -20`

### Step 5: Update the createPaymentIntent method in BuyerOrderController

Read the current controller. Replace only the `createPaymentIntent` method. The generated interface now provides `String method` as a second parameter.

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

        // Persist payment method on the order (V43 column, widened in V47)
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

        // Build response — check generated PaymentIntentResponse in target/generated-sources/
        // for exact setter names (may be setClientKey, setPublicKey, setRedirectUrl, setGateway)
        PaymentIntentResponse response = new PaymentIntentResponse();
        response.setClientKey(result.clientKey());
        response.setPublicKey(result.publicKey());
        response.setRedirectUrl(result.redirectUrl());
        response.setGateway(PaymentIntentResponse.GatewayEnum.fromValue(gatewayService.getGatewayName()));
        return ResponseEntity.status(201).body(response);
    }
```

**Important:** Check if `Order` has `setPaymentMethod()`. If missing, open `backend/src/main/java/com/mermaid/app/domain/Order.java` and add:
```java
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
```

### Step 6: Run all BuyerOrderController tests

Run: `cd backend && ./mvnw test -Dtest=BuyerOrderControllerTest -q 2>&1 | tail -10`
Expected: All pass.

### Commit Task 8

```bash
git add backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java
git add backend/src/main/java/com/mermaid/app/domain/Order.java
git add backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java
git commit -m "feat(payments): BuyerOrderController — method param, redirectUrl, order.paymentMethod"
```

---

## Task 9 — Rewrite PaymentWebhookController

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/PaymentWebhookController.java`
- Create: `backend/src/test/java/com/mermaid/app/controller/PaymentWebhookControllerTest.java`

### Step 1: Check generated WebhooksApi

Run: `find backend/target/generated-sources -name "WebhooksApi.java" 2>/dev/null`
Open it. Find the `handleXenditWebhook` method. Note the exact parameter types and names — the `body` may be typed as `Object` or `String`, and the header param may be named `xCallbackToken`.

### Step 2: Write tests

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

    private static final String PAYLOAD =
        "{\"event\":\"payment.succeeded\",\"data\":{\"id\":\"pr_test_123\",\"reference_id\":\"idem-1\"}}";

    @Test
    void validToken_updatesPaymentStatus_returns200() throws Exception {
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
    void invalidToken_returns401_noSave() throws Exception {
        when(gatewayService.verifyWebhookSignature(anyString(), eq("bad"))).thenReturn(false);

        mockMvc.perform(post("/webhooks/xendit")
                .contentType("application/json")
                .header("x-callback-token", "bad")
                .content(PAYLOAD))
            .andExpect(status().isUnauthorized());

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void unknownPaymentIntent_returns200_noSave() throws Exception {
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

### Step 3: Run tests — expect failure

Run: `cd backend && ./mvnw test -Dtest=PaymentWebhookControllerTest -q 2>&1 | tail -10`
Expected: Failures (old route `/webhooks/paymongo`).

### Step 4: Rewrite PaymentWebhookController

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
        // body arrives as a String when content-type is application/json and Object is declared
        String payload = body instanceof String s ? s : (body != null ? body.toString() : "");

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

**Note on generated interface:** The exact method signature from `WebhooksApi` may differ slightly. Open the generated file and match exactly. If `body` is typed as `String` in the generated interface, use `String payload` directly.

### Step 5: Run webhook tests

Run: `cd backend && ./mvnw test -Dtest=PaymentWebhookControllerTest -q 2>&1 | tail -10`
Expected: 3 tests pass.

### Step 6: Confirm old paymongo route is gone

Run: `grep -r "paymongo" backend/src/main/java/ 2>/dev/null`
Expected: No matches.

### Step 7: Run full backend test suite

Run: `cd backend && ./mvnw test -q 2>&1 | tail -15`
Expected: All pass. Fix any failures before finishing.

### Commit Task 9

```bash
git add backend/src/main/java/com/mermaid/app/controller/PaymentWebhookController.java
git add backend/src/test/java/com/mermaid/app/controller/PaymentWebhookControllerTest.java
git commit -m "feat(payments): Xendit webhook handler — confirm payment/payout on succeeded events"
```

---

## Final Check

When you are done, verify both new test classes pass:

```bash
cd backend && ./mvnw test -Dtest=BuyerOrderControllerTest,PaymentWebhookControllerTest -q 2>&1 | tail -10
```

Expected: All pass. Agent 3 depends on your work completing cleanly.
