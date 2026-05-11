# Fisherman ⇄ Vendor Order Lifecycle

This document defines the two parallel order workflows that exist in the
MERMAID backend today and clarifies which one should be used for the
fisherman-to-vendor flow going forward.

## Two parallel pipelines (current state)

There are **two** distinct order pipelines built on the same `orders` table,
disambiguated by `order_kind`:

| Pipeline | `order_kind` | Used in fisherman UI | Endpoint prefix |
|----------|--------------|----------------------|-----------------|
| Catch-alert offers | `RETAIL` | `Orders.jsx` (`/orders/...`) | `/orders` |
| Procurement (vendor pulls demand) | `PROCUREMENT` | `Procurement.jsx` (`/fisherman/procurement-orders/...`) | `/fisherman/procurement-orders` |

These have **different state machines** and **different action sets**, which is
the root cause of the "order workflow is unclear" feedback.

## Canonical fisherman→vendor lifecycle (catch alert → cash)

This is the path that begins with the fisherman alerting vendors about a fresh
catch and ends with payment. It runs through the `/orders` controller (kind =
`RETAIL`).

```
 ┌────────────┐
 │ Catch log  │  Fisherman logs a catch on an active trip (Trips.jsx)
 └─────┬──────┘  POST /trips/{tripId}/catches
       │
       ▼
 ┌────────────┐
 │ Catch alert│  Fisherman taps "Alert Vendors" (Trips.jsx active card,
 │ (ACTIVE)   │   or CatchAlerts.jsx banner). One alert per catch log.
 └─────┬──────┘  POST /catch-alerts   →  CatchAlertCreatedEvent
       │                                  ↳ Fan-out notifies watching vendors
       ▼
 ┌────────────┐
 │ Vendor     │  Vendor browses /marketplace/catch-alerts, clicks
 │ offer      │   "Make Offer" → creates an Order (status=PENDING)
 │ (PENDING)  │  POST /orders   { catchAlertId, agreedPricePerKg, qty… }
 └─────┬──────┘
       │
   ┌───┴─────────────────────────┐
   ▼                             ▼
 Accept                       Decline
 PUT /orders/{id}/confirm     PUT /orders/{id}/cancel
   │                             │
   ▼                             ▼
 CONFIRMED                    CANCELLED  (terminal)
   │
   ▼
 ┌────────────┐
 │ Handoff    │  Either side records weight/price at meet-up.
 │ recorded   │  POST /orders/{id}/handoff
 └─────┬──────┘
       │
       ▼ Both parties confirm:
 ┌──────────────────────────┐
 │ Seller confirms weight   │  PUT /orders/{id}/handoff/confirm-seller
 │ Buyer  confirms weight   │  PUT /orders/{id}/handoff/confirm-buyer
 └─────┬────────────────────┘
       │  When both flags true → handoff.status=CONFIRMED,
       │  order.status=COMPLETED, alert.status=SOLD
       ▼
 ┌────────────┐
 │ Payment    │  Vendor records payment (CASH/GCASH/...)
 │ (PENDING)  │  POST /orders/{id}/payment
 └─────┬──────┘
       │
       ▼
 ┌────────────┐
 │ Payment    │  Fisherman confirms receipt.
 │ CONFIRMED  │  PUT /orders/{id}/payment/confirm
 └─────┬──────┘  Linked CatchLog is auto-marked settled.
       │
       ▼
   Order fully settled.
```

## Where the UI maps

| UI page | Backend |
|---------|---------|
| `frontend/src/fisherman/Trips.jsx` (Active trip card) | `POST /trips`, `POST /trips/{id}/catches`, `POST /catch-alerts` |
| `frontend/src/fisherman/CatchAlerts.jsx` | `GET /catch-alerts`, `POST /catch-alerts`, `DELETE /catch-alerts/{id}` |
| `frontend/src/fisherman/CatchAlerts.jsx` → "N offers" modal (NEW) | `GET /orders/mine` filtered by `catchAlertId`, accept = `PUT /orders/{id}/confirm`, decline = `PUT /orders/{id}/cancel` |
| `frontend/src/fisherman/Orders.jsx` | full handoff + payment flow on `/orders/{id}/...` |
| `frontend/src/fisherman/Procurement.jsx` | **separate** procurement pipeline (`/fisherman/procurement-orders/...`) |

## The "1 offer" bug (fixed)

`CatchAlertMapper` populates `matchedListingIds` with **any open vendor demand
listing for the same species** — these are *not* offers. The old UI labelled
them "1 offer" which was misleading and caused the perception that offers were
being auto-generated.

Fixed in `CatchAlerts.jsx`: the fisherman view now derives the offer count from
real `Order` rows (`/orders/mine` filtered by `catchAlertId`), and the
"N offers" button opens a modal listing actual vendor offers with
Accept/Decline actions.

## Open questions / recommended follow-ups

1. **Consolidate the two pipelines.** Procurement (`/fisherman/procurement-orders`)
   and catch-alert offers (`/orders`) overlap in intent. Decide which is
   canonical and deprecate the other to remove duplication.
2. **Make `CatchAlert.matchedListingIds` opt-in.** Currently every alert
   carries a list of unrelated demand listings. This field should be removed
   from the fisherman response or renamed to `relatedDemandListingIds`.
3. **Backend null-safety audit.** `CatchLogService.create` had a `BigDecimal
   .valueOf(null)` NPE when clients sent `estimatedPricePerKg: null`. The
   `unwrap(JsonNullable)` helper now used in `CatchLogService` and
   `TripService` should be promoted to a shared utility and applied
   consistently across every JsonNullable consumer.
4. **Polling stability.** `useFishermanPolling` now skips state updates when
   incoming data is structurally identical, which fixes the Procurement card
   flicker. Long-term: prefer SSE / WebSocket push for procurement updates.
