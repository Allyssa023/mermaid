# MERMAID Fixes — Design Spec
**Date:** 2026-05-18  
**Branch:** need-tuloy  
**Scope:** 4 independent fixes shipped in one branch

---

## 1. Xendit env security

### Problem
`xendit.secret-key`, `xendit.public-key`, and `xendit.webhook-token` are hardcoded in `backend/src/main/resources/application.properties` (a committed file). The repo-root `.env` already contains the correct values under `XENDIT_SECRET_KEY`, `XENDIT_PUBLIC_KEY`, `XENDIT_WEBHOOK_TOKEN`, and `spring-dotenv` is already configured to load it via `dotenv.directory=./../`.

### Fix
Replace 3 hardcoded lines in `application.properties` with env-var placeholders:
```
xendit.secret-key=${XENDIT_SECRET_KEY:}
xendit.public-key=${XENDIT_PUBLIC_KEY:}
xendit.webhook-token=${XENDIT_WEBHOOK_TOKEN:}
```
No changes to `.env`. If any key is blank the existing `@ConditionalOnExpression` on `XenditPaymentGatewayService` silently falls back to the no-op stub.

### Files changed
- `backend/src/main/resources/application.properties` — 3 lines

---

## 2. Open-Meteo forecast stale fallback

### Problem
`ZoneForecastView` in the marine service fetches live from Open-Meteo when the forecast cache expires. If the container's Docker bridge loses internet routing (errno 101 — common on Windows Docker Desktop after sleep/wake), it returns HTTP 503 with no fallback. `AllConditionsView` already handles this correctly via DB snapshots; forecasts do not.

### Root cause
Docker bridge network loses its gateway route — not a code bug. Fix: `docker-compose down && docker network prune -f && docker-compose up -d`. The code fix below makes the service resilient when this recurs.

### Fix
In `marine-service/conditions/views.py`, `ZoneForecastView.get()` (confirmed path — file read during design):
- The shared `_cache` (TTLCache) in `views.py` stores forecasts under key `forecast:{zone_id}` with a 1-hour TTL
- If the live fetch raises `httpx.HTTPStatusError | httpx.RequestError`, attempt `_cache.get(cache_key)` again — TTLCache may still hold the entry if it was populated before expiry within the same process lifetime, OR store a secondary "stale" copy under `forecast-stale:{zone_id}` with no TTL on every successful fetch
- If a stale entry is found, return HTTP 200 with the serialized data (no extra fields — avoid touching api.yaml or Java DTOs) and log a WARNING so it appears in Docker logs
- If no stale entry exists anywhere, return 503 as before

**Chosen approach — stale shadow key:** On every successful forecast fetch, write the result to both `forecast:{zone_id}` (TTL = 1 hour) and `forecast-stale:{zone_id}` (TTL = 0 / no expiry). On failure, fall back to `forecast-stale:{zone_id}`. This avoids any schema changes.

### Files changed
- `marine-service/conditions/views.py` — `ZoneForecastView.get()` (~10 lines)

---

## 3. OTP and email verification

### Problem
`app.skip-email-verification` defaults to `true` in `application.properties`, bypassing both the email verification link on register and the OTP code on login. The entire frontend flow is already implemented in `frontend/src/pages/LoginPage.jsx`:
- `OtpStep` component handles 6-digit code + `POST /auth/otp/verify`
- `LoginForm` checks `data.otpRequired` and routes to `OtpStep`
- Email verification handled via `?verify=token` URL param on load
- "Check your inbox" screen shown after register
- Resend button exists but is currently a no-op (intentionally left fake for now — no backend resend endpoint)

Mailtrap credentials (`MAILTRAP_API_TOKEN`, `MAILTRAP_INBOX_ID`) are already in `.env` and already read correctly by `application.properties`.

### Fix
One line in `application.properties`:
```
app.skip-email-verification=${SKIP_EMAIL_VERIFICATION:false}
```
Change default from `true` to `false`. No frontend changes needed.

### Files changed
- `backend/src/main/resources/application.properties` — 1 line

---

## 4. Chat — group deals by counterparty + proposals inline

### Problem
Both `vendor/Messages.jsx` and `fisherman/Messages.jsx` show one row per deal in the left pane. A vendor with 5 deals against the same fisherman sees 5 separate rows. The user wants them grouped: one row per person, deals as a sub-list under that person.

Additionally, deal proposals appear as formatted inline summary cards in `DealChatPane.jsx` (already implemented via `[PROPOSAL]` regex parsing), but the overall proposal/chat split layout makes them feel separate. The pinned `ProposalCard` at the top is the actionable item; the thread messages that are proposals render as read-only inline cards.

### Fix

#### `vendor/Messages.jsx`
- Replace the flat `filteredDeals.map(...)` list with a grouped structure:
  - Compute `Map<fishermanId, { name, deals[] }>` from `allDeals`
  - Render one collapsible person-row per fisherman
  - Person row shows: avatar initials, name, deal count badge, latest activity time, unread dot
  - Expanded: deal sub-rows showing species, status chip, last proposal summary
  - Clicking a deal sub-row sets `activeDealId` and opens `DealChatPane` (unchanged)
- Remove the separate DM contacts section from the deal pane (DM mode can stay accessible via a separate tab if needed, but not mixed into the deal list)

#### `fisherman/Messages.jsx`
- Same grouping by vendor: one row per vendor, deals as sub-list
- Fisherman side already only shows deals (no DM mode), so simpler

#### `DealChatPane.jsx`
- No structural changes needed — inline proposal rendering already works
- Verify that `[PROPOSAL]` messages render as the styled summary card (not raw text) and that the pinned `ProposalCard` remains the only actionable element

### Data shape
`listMyDeals()` returns deals. From the existing vendor `Messages.jsx` code, each deal has:
- `d.counterpartyId ?? d.fishermanId` — the fisherman's user ID (vendor side)
- `d.counterpartyName || d.fishermanName` — the fisherman's display name
On the fisherman side, `d.counterpartyId ?? d.vendorId` / `d.counterpartyName || d.vendorName`. Group by whichever field is non-null.

### Grouping UX details
- Default state: all groups collapsed except the one containing the currently active deal (which auto-expands)
- If no active deal: expand the first group by default
- If a fisherman has only one deal: still render the collapsible wrapper for consistency
- When a deal URL param (`?deal=N`) is present on load, expand the parent group and select the deal
- Active deal highlight: the deal sub-row gets the `on` class; the parent person-row also gets a subtle `on` style to indicate it contains the active conversation
- Empty state copy (no deals at all): "No active deals yet."

### Files changed
- `frontend/src/vendor/Messages.jsx` — replace flat list with grouped-by-fisherman
- `frontend/src/fisherman/Messages.jsx` — replace flat list with grouped-by-vendor

---

## Out of scope
- Placeholder buttons — kept as-is
- Admin disputes page — deferred; full flow needs more design work
- Automated tests — user does manual E2E testing only

## Testing
Manual E2E by user after implementation. Key paths to verify:
1. Xendit: payment flow works end-to-end in Docker
2. OTP: register → check inbox → click link → verify → login → OTP code → dashboard
3. Marine forecast: take down Docker network, verify conditions still serve, restart, verify forecast recovers
4. Chat: vendor with multiple deals against same fisherman sees one grouped row; opening a deal shows unified thread
