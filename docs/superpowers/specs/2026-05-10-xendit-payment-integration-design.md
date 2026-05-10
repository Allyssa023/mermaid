# Xendit Payment Integration Design

**Date:** 2026-05-10
**Status:** Approved for implementation

## Overview

Integrate Xendit as the payment gateway for the MERMAID platform, covering two distinct money flows:

1. **Collection (Buyer → Vendor):** Buyers pay for retail orders via GCash, Maya, or card (inline form). Xendit Payment Request API.
2. **Disbursement (Vendor → Fisherman):** After handoff confirmation, vendors pay fishermen directly to their GCash or Maya account. Xendit Payouts API.

This replaces the existing `StubPaymentGatewayService` and all PayMongo references. The `PaymentGatewayService` abstraction layer is retained and extended.

---

## Business Context

- **Buyer → Vendor:** Standard e-commerce collection. Buyer is the customer; vendor receives through the platform's Xendit account. Manual vendor confirmation gates order completion.
- **Vendor → Fisherman (PROCUREMENT orders only):** Platform disburses to the fisherman's personal GCash/Maya account using Xendit Payouts. Fisherman must have a GCash or Maya phone number on file in their profile.
- **Transaction fees (no setup/monthly cost):**
  - GCash: ~2.23%
  - Maya: ~1.79%
  - Card (domestic): ~2.9% + ₱15
  - Disbursement payout: small per-transaction fee (Xendit standard rate)

---

## Architecture

### Gateway Abstraction (Backend)

**Existing interface `PaymentGatewayService` — extended with:**
```
createPaymentRequest(amountCentavos, currency, method, description, idempotencyKey, returnUrl)
  → PaymentRequestResult(paymentRequestId, redirectUrl, clientKey, gatewayName)

verifyWebhookSignature(payload, token) → boolean

getGatewayName() → String

disburse(recipientPhone, channelCode, amountCentavos, description, idempotencyKey)
  → DisbursementResult(payoutId, status)
```

**New class: `XenditPaymentGatewayService`**
- Activated via Spring `@ConditionalOnProperty(name = "xendit.secret-key", matchIfMissing = false)` when key is non-empty
- Uses `xendit-java` Maven SDK
- `StubPaymentGatewayService` remains as fallback (no keys configured)

**New class: `StubPaymentGatewayService` (update)**
- `disburse()` stub returns fake payout ID for dev testing

### Configuration

New properties in `application.properties`:
```properties
xendit.secret-key=${XENDIT_SECRET_KEY:}
xendit.public-key=${XENDIT_PUBLIC_KEY:}
xendit.webhook-token=${XENDIT_WEBHOOK_TOKEN:}
xendit.callback-url=${XENDIT_CALLBACK_URL:http://localhost:8080/api/webhooks/xendit}
```

Remove PayMongo properties (or keep as unused — prefer removal to reduce noise).

---

## Backend Changes

### 1. Maven dependency
Add `xendit-java` SDK to `backend/pom.xml`.

### 2. XenditPaymentGatewayService
- Implements `PaymentGatewayService`
- `createPaymentRequest()`:
  - `method=GCASH` → channel_code: `GCASH`, type: `EWALLET` → returns `redirectUrl`
  - `method=PAYMAYA` → channel_code: `PAYMAYA`, type: `EWALLET` → returns `redirectUrl`
  - `method=CARD` → channel_code: `CREDIT_DEBIT`, type: `CARD` → returns `clientKey`
- `verifyWebhookSignature()` → validates `x-callback-token` header against `xendit.webhook-token`
- `disburse()` → calls Xendit Payouts API with `channel_code: PH_GCASH` or `PH_PAYMAYA`

### 3. BuyerOrderController — update `createPaymentIntent`
- Accept `?method=GCASH|PAYMAYA|CARD` query parameter (default: CARD)
- Pass method to `gatewayService.createPaymentRequest()`
- Store `method` on `Payment.method` and `Order.paymentMethod`
- Return updated `PaymentIntentResponse` with optional `redirectUrl` field

### 4. New endpoint: `POST /orders/{orderId}/payout`
- Role: `FISHERMAN` seller or `VENDOR` buyer (vendor initiates)
- Validates order is PROCUREMENT kind and handoff is confirmed by both parties
- Calls `gatewayService.disburse()` with fisherman's saved phone + channel
- Creates a `Payment` record with `gateway=XENDIT`, `status=PENDING`
- Returns payout status

### 5. PaymentWebhookController — implement payload parsing
- Route: `POST /webhooks/xendit` (replace `/webhooks/paymongo`)
- Verify `x-callback-token` header
- Parse event type:
  - `payment.succeeded` → find Payment by `paymentIntentId`, set `status=CONFIRMED`, `paidAt=now()`
  - `payout.succeeded` → find Payment by `payoutId` (stored in `proofReference`), set `status=CONFIRMED`
- Update SecurityConfig to permit `/webhooks/xendit`

### 6. Fisherman profile — add ewallet fields
- New Flyway migration: add `gcash_number VARCHAR(20)` and `maya_number VARCHAR(20)` to `users` table (or a separate `fisherman_profiles` table if one exists)
- Expose via `PATCH /fisherman/profile` endpoint (update existing or add new)

### 7. api.yaml updates
- Update `PaymentIntentResponse` to include optional `redirectUrl`
- Add `method` query param to `createPaymentIntent` endpoint
- Add `POST /orders/{orderId}/payout` endpoint
- Add `gcashNumber`, `mayaNumber` fields to fisherman profile schema

### 8. Flyway migrations
- `V47__xendit_payout_fields.sql` — add `payout_id VARCHAR(100)` to payments table; add `gcash_number`, `maya_number` to users table
- Remove STUB from payment method constraint (or keep for dev — leave as-is)

---

## Frontend Changes

### Buyer side — Checkout.jsx
- Activate the "Online" payment section (currently disabled)
- Add payment method selector: GCash | Maya | Card
- **GCash/Maya flow:**
  1. POST `/buyer/orders/{id}/payment-intent?method=GCASH` (or PAYMAYA)
  2. Receive `redirectUrl`
  3. `window.location.href = redirectUrl`
  4. After payment, Xendit redirects to `/payment/return?orderId={id}&status=success`
- **Card flow:**
  1. POST `/buyer/orders/{id}/payment-intent?method=CARD`
  2. Receive `clientKey` + Xendit public key
  3. Load Xendit.js, render inline card form
  4. On submit: Xendit.js tokenizes → confirms payment → redirect to `/payment/return`

### New page — PaymentReturn.jsx (`/payment/return`)
- Show spinner: "Confirming your payment…"
- Poll `GET /buyer/orders/{orderId}` every 3 seconds, up to 10 attempts
- If payment confirmed → show success card + link to order detail
- If timeout → show "Payment is being processed. Check your orders page." (not an error — webhook may still arrive)

### Fisherman side — Profile page
- Add GCash number and Maya number fields
- Required prompt shown on orders page if payout is pending and no number is on file

### Vendor side — Order detail (PROCUREMENT orders)
- After both parties confirm handoff, show "Pay Fisherman" section
- Select GCash or Maya
- Show amount and fisherman name
- Confirm button → POST `/orders/{orderId}/payout`
- Success state: "Payment sent to [fisherman name]'s GCash/Maya"

---

## Webhook Flow

```
Xendit → POST /api/webhooks/xendit
           Header: x-callback-token: {xendit.webhook-token}
           Body: { event: "payment.succeeded", data: { id, reference_id, ... } }
               ↓
         Verify token
               ↓
         Find Payment by paymentIntentId = reference_id
               ↓
         Set Payment.status = CONFIRMED, paidAt = now()
               ↓
         Publish PaymentConfirmedEvent (optional — for notifications)
```

For dev/testing: Xendit provides a webhook simulator in their dashboard. Stub gateway auto-confirms immediately.

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Xendit API unreachable | 503 with message "Payment service unavailable" |
| Payment already exists for order | 409 (existing guard) |
| Fisherman has no GCash/Maya number | 422 "Fisherman has no e-wallet number on file" |
| Invalid webhook token | 401 (existing guard) |
| Payout fails at Xendit | 502, log error, Payment stays PENDING |

---

## Testing Strategy

- **Unit tests:** `XenditPaymentGatewayService` with mocked Xendit SDK responses
- **Controller tests:** `BuyerOrderController` with `?method=GCASH|PAYMAYA|CARD`, verify Payment entity fields
- **Webhook test:** POST to `/webhooks/xendit` with valid/invalid token, verify payment status update
- **Stub fallback:** all existing tests continue to use `StubPaymentGatewayService` (no keys in test env)

---

## Out of Scope

- PayMongo (replaced entirely by Xendit)
- GrabPay (can be added later with same pattern)
- Card 3DS challenge handling beyond basic redirect (Xendit handles automatically)
- Recurring payments / subscriptions
- Refunds (future feature)
