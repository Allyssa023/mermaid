# Agent 3 — Payout Controller, Profile, and Smoke Test

**Your role:** Implement `OrderPayoutController` (vendor→fisherman disbursement), update `FishermanProfileController` to expose ewallet fields, then run a full smoke test to verify the integration end-to-end.

**Prerequisite:** Agents 1 and 2 must complete first. Their work produces:
- Generated `PayoutsApi` interface (from api.yaml `operationId: initiateOrderPayout`, tag `Payouts`)
- Generated `FishermanProfileApi` (updated with `gcashNumber`, `mayaNumber`)
- `PaymentGatewayService.disburse()` method
- `User.gcashNumber`, `User.mayaNumber` fields
- `PaymentRepository.findByPayoutId()`

**Full plan:** `docs/superpowers/plans/2026-05-10-xendit-payment-integration.md`

---

## Codebase Context

- **Stack:** Spring Boot 3, Java 17, api-first
- **IMPORTANT:** `OrderPayoutController` implements `PayoutsApi` (not `OrdersApi` — that is taken by the existing `OrderController`)
- **Test pattern:** `@WebMvcTest(Foo.class)` + `@MockitoBean` for every dependency + `@MockitoBean JwtDecoder jwtDecoder`
- **Working dir:** `C:\Users\Zaimond\Documents\mermaid`
- **OTP note:** If running live curl tests, login requires OTP. Use: `psql -U postgres -d mermaid_db -c "UPDATE users SET otp_code = '123456', otp_expiry = NOW() + INTERVAL '10 minutes' WHERE email = 'EMAIL';"`

---

## Task 10 — OrderPayoutController

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/OrderPayoutController.java`
- Create: `backend/src/test/java/com/mermaid/app/controller/OrderPayoutControllerTest.java`

### Step 1: Verify PayoutsApi exists

Run: `find backend/target/generated-sources -name "PayoutsApi.java" 2>/dev/null`
Open it. Note the exact method signature for `initiateOrderPayout`.

If the file does NOT exist, Agent 1's api.yaml change may not have included tag `Payouts`. Check:
```bash
grep -A5 "initiateOrderPayout" backend/src/main/resources/openapi/api.yaml
```
If tag is `Orders` instead of `Payouts`, re-run `./mvnw generate-sources` after confirming the tag.

### Step 2: Write tests

Create `OrderPayoutControllerTest.java`:

```java
package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
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
        when(gatewayService.disburse(eq("09171234567"), eq("PH_GCASH"),
                anyLong(), anyString(), anyString()))
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
        User fisherman = new User();
        fisherman.setId(20L);
        // no gcash/maya number set

        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(2L)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(fisherman));

        mockMvc.perform(post("/orders/2/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void initiatePayout_alreadyPaid_returns409() throws Exception {
        Order order = procurementOrder(3L, 10L, 20L);
        when(orderRepository.findById(3L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderId(3L))
            .thenReturn(Optional.of(new com.mermaid.app.domain.Payment()));

        mockMvc.perform(post("/orders/3/payout")
                .with(asVendor(10L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("channelCode", "PH_GCASH"))))
            .andExpect(status().isConflict());
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
        User u = new User();
        u.setId(id);
        u.setGcashNumber(phone);
        return u;
    }
}
```

### Step 3: Run tests — expect failure

Run: `cd backend && ./mvnw test -Dtest=OrderPayoutControllerTest -q 2>&1 | tail -10`
Expected: Compilation error (class not yet created).

### Step 4: Implement OrderPayoutController

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

        // Check generated OrderPayoutResponse setters in target/generated-sources/
        OrderPayoutResponse response = new OrderPayoutResponse();
        response.setPayoutId(result.payoutId());
        response.setStatus(result.status());
        return ResponseEntity.status(201).body(response);
    }
}
```

### Step 5: Run payout tests

Run: `cd backend && ./mvnw test -Dtest=OrderPayoutControllerTest -q 2>&1 | tail -10`
Expected: 3 tests pass.

### Commit Task 10

```bash
git add backend/src/main/java/com/mermaid/app/controller/OrderPayoutController.java
git add backend/src/test/java/com/mermaid/app/controller/OrderPayoutControllerTest.java
git commit -m "feat(payments): OrderPayoutController — vendor GCash/Maya payout to fisherman"
```

---

## Task 11 — FishermanProfileController Ewallet Fields

**File to modify:** `backend/src/main/java/com/mermaid/app/controller/FishermanProfileController.java`

### Step 1: Read the current file

Read the entire file. Identify:
1. The method that returns a `FishermanProfile` response object
2. The method that handles profile update via `FishermanProfileUpdateRequest`

### Step 2: Add gcashNumber/mayaNumber to profile fetch

In the method that builds and returns the `FishermanProfile` model, add:
```java
profile.setGcashNumber(user.getGcashNumber());
profile.setMayaNumber(user.getMayaNumber());
```
(The `user` variable is the `User` entity loaded from `UserRepository`.)

### Step 3: Add gcashNumber/mayaNumber to profile update

In the method that processes the update request, add:
```java
if (request.getGcashNumber() != null) user.setGcashNumber(request.getGcashNumber());
if (request.getMayaNumber()  != null) user.setMayaNumber(request.getMayaNumber());
```

### Step 4: Compile check

Run: `cd backend && ./mvnw compile -q 2>&1 | tail -5`
Expected: Clean.

### Step 5: Run full backend test suite

Run: `cd backend && ./mvnw test -q 2>&1 | tail -15`
Expected: All pass. Fix any failures before continuing to smoke test.

### Commit Task 11

```bash
git add backend/src/main/java/com/mermaid/app/controller/FishermanProfileController.java
git commit -m "feat(profile): expose gcashNumber + mayaNumber on fisherman profile"
```

---

## Task 16 — Integration Smoke Test

Run the backend and verify the two payment flows work end-to-end using the stub gateway.

### Step 1: Start backend

Run: `cd backend && ./mvnw spring-boot:run`
Wait for `Started MermaidApplication` in logs.

### Step 2: Register and log in as a test fisherman

```bash
# Register
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testfisher@test.com","password":"password123","fullName":"Test Fisher","role":"FISHERMAN"}' | jq .

# Set OTP (run in a separate terminal)
psql -U postgres -d mermaid_db -c "UPDATE users SET otp_code = '123456', otp_expiry = NOW() + INTERVAL '10 minutes' WHERE email = 'testfisher@test.com';"

# Login
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testfisher@test.com","password":"password123"}' | jq .

# Then verify OTP
curl -s -X POST http://localhost:8080/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"testfisher@test.com","otp":"123456"}' | jq .
# Save the token: FISHER_TOKEN=<token from response>
```

### Step 3: Add GCash number to fisherman profile

```bash
curl -s -X PATCH http://localhost:8080/api/fisherman/profile \
  -H "Authorization: Bearer $FISHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gcashNumber":"09171234567"}' | jq .
```
Expected: Profile returned with `gcashNumber: "09171234567"`.

### Step 4: Register and log in as a buyer, place a retail order

Follow similar register/login flow with role `BUYER`. Place an order against an existing storefront listing if one exists, or check if there's test data.

### Step 5: Test buyer payment intent (GCash)

```bash
curl -s -X POST "http://localhost:8080/api/buyer/orders/$ORDER_ID/payment-intent?method=GCASH" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq .
```
Expected: Response with `redirectUrl` (stub generates `https://stub-redirect.test/...`), `gateway: STUB`.

### Step 6: Simulate Xendit webhook confirmation

```bash
curl -s -X POST http://localhost:8080/api/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: any-token" \
  -d "{\"event\":\"payment.succeeded\",\"data\":{\"id\":\"$PAYMENT_INTENT_ID\"}}" | jq .
```
Expected: `200 OK`. Payment record updated to `CONFIRMED`.

### Step 7: Test vendor→fisherman payout

Register/login as a vendor. Find or create a PROCUREMENT order in CONFIRMED state. Then:

```bash
curl -s -X POST "http://localhost:8080/api/orders/$ORDER_ID/payout" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channelCode":"PH_GCASH"}' | jq .
```
Expected: 201 with `payoutId` starting with `po_stub_`, `status: SUCCEEDED`.

### Step 8: Final test suite run

Run: `cd backend && ./mvnw test -q 2>&1 | tail -20`
Expected: All green.

### Final Commit

```bash
git add .
git commit -m "feat(payments): Xendit integration backend complete — collection + disbursement"
```

---

## Done Criteria

- [ ] OrderPayoutController tests pass (3 tests)
- [ ] FishermanProfileController returns gcashNumber/mayaNumber
- [ ] Full test suite passes with no regressions
- [ ] Smoke test confirms GCash redirect URL and payout response in stub mode
