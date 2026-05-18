# MERMAID Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 independent fixes — Xendit env security, marine forecast stale fallback, OTP/email re-enable, and deal chat grouped by counterparty.

**Architecture:** All fixes are surgical — 3 touch single-file config, 1 touches a Python view, and 1 refactors two frontend list components. No new files, no schema migrations, no API contract changes.

**Tech Stack:** Spring Boot (Java), Django/DRF (Python), React/Vite (JSX), Caffeine cache, TTLCache

**Spec:** `docs/superpowers/specs/2026-05-18-mermaid-fixes-design.md`

---

## File Map

| File | Change |
|------|--------|
| `backend/src/main/resources/application.properties` | Lines 52 + 79-81: flip OTP flag default, move 3 Xendit keys to env vars |
| `marine-service/conditions/views.py` | `ZoneForecastView.get()`: write stale shadow key on success, fall back on failure |
| `frontend/src/vendor/Messages.jsx` | Replace flat deal list with grouped-by-fisherman collapsible rows |
| `frontend/src/fisherman/Messages.jsx` | Replace flat deal list with grouped-by-vendor collapsible rows |

---

## Task 1: Xendit env + OTP flag (backend config, 4 lines total)

**Files:**
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Replace hardcoded Xendit keys with env-var placeholders**

Open `backend/src/main/resources/application.properties`. Find lines ~79-81:
```properties
xendit.secret-key=xnd_development_G1S7Pzv9lI6smZ7Q4Yid698nYAThY81NeL20YYzvEEKVS4TiRnL9jeP8jnk
xendit.public-key=xnd_public_development_wjhzKyLqH1FfAfzgHjiKls11aXAAf_gyFijlLz5b74UurE20muFJdA_L9INKIIEv
xendit.webhook-token=aSE2SwlsdT78jjq1w9fRRVTvq1ov4awGxZafMSBtZgcGGgS7
```
Replace with:
```properties
xendit.secret-key=${XENDIT_SECRET_KEY:}
xendit.public-key=${XENDIT_PUBLIC_KEY:}
xendit.webhook-token=${XENDIT_WEBHOOK_TOKEN:}
```

- [ ] **Step 2: Flip OTP skip-flag default to false**

Find line ~52:
```properties
app.skip-email-verification=${SKIP_EMAIL_VERIFICATION:true}
```
Change to:
```properties
app.skip-email-verification=${SKIP_EMAIL_VERIFICATION:false}
```

- [ ] **Step 3: Verify the .env already has the required keys**

Check that `C:\Users\Zaimond\Documents\mermaid\.env` (repo root, one level above `backend/`) contains:
```
XENDIT_SECRET_KEY=xnd_development_...
XENDIT_PUBLIC_KEY=xnd_public_development_...
XENDIT_WEBHOOK_TOKEN=aSE2Sw...
MAILTRAP_API_TOKEN=...
MAILTRAP_INBOX_ID=...
```
All should already be present. `dotenv.directory=./../` in `application.properties` loads this file.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/application.properties
git commit -m "fix(config): move Xendit keys to env vars, re-enable email verification"
```

---

## Task 2: Marine forecast stale fallback

**Files:**
- Modify: `marine-service/conditions/views.py` — `ZoneForecastView.get()` (lines 121–143)

- [ ] **Step 1: Confirm TTLCache TTL semantics (do this before writing any code)**

Read `marine-service/cache/ttl_cache.py`. The `set` method stores `(value, time.monotonic() + ttl)`. TTL=0 means `expires_at = now` — the entry expires **immediately** on the next `get()`. Use `86400 * 30` (30 days) for the stale shadow key.

- [ ] **Step 2: Replace ZoneForecastView with stale-fallback version**

Open `marine-service/conditions/views.py`. Replace the existing `ZoneForecastView` class (lines 121–143) with:

```python
class ZoneForecastView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    _STALE_TTL = 86400 * 30  # 30 days — survives network outages

    def get(self, request, zone_id):
        zone = _get_zone_or_404(zone_id)
        cache_key = f"forecast:{zone_id}"
        stale_key = f"forecast-stale:{zone_id}"

        cached = _cache.get(cache_key)
        if cached:
            return Response(ZoneForecastSerializer(cached).data)

        client = _get_http_client()
        try:
            forecast = open_meteo.fetch_forecast(zone, client)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Open-Meteo forecast error for %s: %s", zone_id, exc)
            stale = _cache.get(stale_key)
            if stale:
                logger.warning(
                    "Serving stale forecast for zone %s (Open-Meteo unreachable)", zone_id
                )
                return Response(ZoneForecastSerializer(stale).data)
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Write live cache (1-hour TTL) and stale shadow (30-day TTL)
        _cache.set(cache_key, forecast, settings.FORECAST_CACHE_TTL)
        _cache.set(stale_key, forecast, self._STALE_TTL)
        return Response(ZoneForecastSerializer(forecast).data)
```

- [ ] **Step 3: Commit**

```bash
git add marine-service/conditions/views.py
git commit -m "fix(marine): serve stale forecast when Open-Meteo is unreachable"
```

---

## Task 3: Chat — group deals by counterparty (vendor side)

**Files:**
- Modify: `frontend/src/vendor/Messages.jsx`

The current code renders a flat `filteredDeals.map(...)` list (lines ~289–341). Replace with a grouped structure.

- [ ] **Step 1: Add `expandedGroups` state and group-computation logic**

After the existing `const activeDeal = ...` line (~line 229), add:

```jsx
// ── group deals by counterparty ───────────────────────────────────────────────
const [expandedGroups, setExpandedGroups] = useState(() => new Set())

const dealGroups = useMemo(() => {
  const map = new Map()
  for (const d of filteredDeals) {
    const pid = d.counterpartyId ?? d.fishermanId
    const name = d.counterpartyName || d.fishermanName || `User #${pid}`
    if (!map.has(pid)) map.set(pid, { pid, name, deals: [] })
    map.get(pid).deals.push(d)
  }
  return Array.from(map.values())
}, [filteredDeals])

// Auto-expand: group containing active deal, or first group when nothing is selected
useEffect(() => {
  if (dealGroups.length === 0) return
  if (activeDealId == null) {
    // No active deal — expand first group by default (only on first load)
    setExpandedGroups((prev) => prev.size === 0 ? new Set([dealGroups[0].pid]) : prev)
    return
  }
  for (const g of dealGroups) {
    if (g.deals.some((d) => d.id === activeDealId)) {
      setExpandedGroups((prev) => new Set([...prev, g.pid]))
      break
    }
  }
}, [activeDealId, dealGroups])
// Note: existing ?deal=N URL param logic (line ~110) calls setActiveDealId, which
// triggers this effect when dealGroups is populated — no extra URL handling needed.

const toggleGroup = (pid) => {
  setExpandedGroups((prev) => {
    const next = new Set(prev)
    if (next.has(pid)) next.delete(pid)
    else next.add(pid)
    return next
  })
}
```

- [ ] **Step 2: Replace the flat deal list render with grouped render**

Find the block starting with `{/* Deal rows */}` (~line 288) through the closing `})}` of the flat map (~line 341). Replace the entire block with:

```jsx
{/* Grouped deal rows */}
{dealGroups.length === 0 && !dealsQ.isLoading && (
  <div style={{ padding: '16px', fontSize: 12, color: 'var(--muted)' }}>
    No active deals yet.
  </div>
)}

{dealGroups.map(({ pid, name, deals }) => {
  const isOpen = expandedGroups.has(pid)
  const groupUnread = deals.some((d) => dealUnread[d.id])
  const latestAt = fmtDate(
    deals.reduce((best, d) => {
      const t = d.latestProposal?.createdAt || d.updatedAt || d.createdAt
      return !best || (t && t > best) ? t : best
    }, null)
  )
  const groupActive = mode === 'deal' && deals.some((d) => d.id === activeDealId)

  return (
    <div key={`group-${pid}`}>
      {/* Person row */}
      <div
        className={`msg-item msg-item--group${groupActive ? ' on' : ''}`}
        onClick={() => toggleGroup(pid)}
        style={{ cursor: 'pointer' }}
      >
        <div className="msg-item__avatar">{initials(name)}</div>
        <div className="msg-item__body">
          <div className="msg-item__row">
            <span className="msg-item__name">{name}</span>
            <span className="msg-item__time">{latestAt}</span>
          </div>
          <div className="msg-item__last" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {deals.length} deal{deals.length !== 1 ? 's' : ''}
            </span>
            {groupUnread && (
              <span className="msg-item__unread">NEW</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
          </div>
        </div>
      </div>

      {/* Deal sub-rows */}
      {isOpen && deals.map((d) => {
        const on = mode === 'deal' && activeDealId === d.id
        const unread = dealUnread[d.id]
        const species = d.speciesName || d.species?.commonName || d.species?.localName || ''
        const lastMsg = d.latestProposal
          ? `₱${d.latestProposal.pricePerKg}/kg · ${d.latestProposal.qtyKg}kg`
          : 'No proposals yet'
        const dealCode = `#${String(d.id).padStart(4, '0')}`

        return (
          <div
            key={`deal-${d.id}`}
            className={`msg-item msg-item--sub${on ? ' on' : ''}`}
            onClick={() => handleSelectDeal(d)}
            data-testid={`deal-row-${d.id}`}
            style={{ paddingLeft: 40 }}
          >
            <div className="msg-item__body">
              <div className="msg-item__row">
                <span className="msg-item__code" style={{ fontSize: 11 }}>
                  {dealCode}{species ? ` · ${species}` : ''}
                </span>
                <span className="msg-item__time">{fmtDate(d.latestProposal?.createdAt || d.updatedAt || d.createdAt)}</span>
              </div>
              <div className="msg-item__last">{lastMsg}</div>
              <div className="msg-item__meta">
                {d.status === 'NEGOTIATING' && (
                  <span className="chip chip--neg" style={{ fontSize: 9 }}>NEG</span>
                )}
                {d.status === 'AGREED' && (
                  <span className="chip chip--ready" style={{ fontSize: 9 }}>AGREED</span>
                )}
                {(d.status === 'CANCELLED' || d.status === 'EXPIRED') && (
                  <span className="chip chip--cancel" style={{ fontSize: 9 }}>
                    {d.status === 'EXPIRED' ? 'EXPIRED' : 'CANCEL'}
                  </span>
                )}
                {unread && (
                  <span className="msg-item__unread" data-testid={`deal-unread-${d.id}`}>NEW</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
})}
```

- [ ] **Step 3: Remove the DM contacts section from the left pane**

Find the block starting with `{/* DM contact rows — shown at the bottom after deals */}` (~line 343) through its closing `)}` (~line 381). Delete it entirely. Also update the empty-state div below it (currently checks `filteredDeals.length === 0 && contacts.length === 0`) to:

```jsx
{!dealsQ.isLoading && dealGroups.length === 0 && (
  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
    No active deals yet.
  </div>
)}
```

The DM mode state, handlers, and right-pane render can remain intact — removing only the left-pane list entries for DM contacts.

- [ ] **Step 4: Add `useMemo` and `useEffect` to imports**

The file currently imports `useState, useEffect, useRef, useCallback, useMemo` — confirm all are present. No new imports needed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/Messages.jsx
git commit -m "feat(vendor): group deal conversations by fisherman in Messages"
```

---

## Task 4: Chat — group deals by counterparty (fisherman side)

**Files:**
- Modify: `frontend/src/fisherman/Messages.jsx`

The fisherman side is simpler — no DM mode, just deals. The current list renders each deal as a row with the vendor's name.

- [ ] **Step 1: Read the current fisherman Messages.jsx deal list render**

Read `frontend/src/fisherman/Messages.jsx` lines 60–120 to find the exact deal row rendering block before implementing.

- [ ] **Step 2: Add grouping state and logic**

After `const activeDeal = deals.find(...)` line, add the same grouping pattern as vendor side but using vendor fields:

```jsx
const [expandedGroups, setExpandedGroups] = useState(() => new Set())

const dealGroups = useMemo(() => {
  const map = new Map()
  for (const d of filtered) {
    const pid = d.counterpartyId ?? d.vendorId
    const name = d.counterpartyName || d.vendorName || `User #${pid}`
    if (!map.has(pid)) map.set(pid, { pid, name, deals: [] })
    map.get(pid).deals.push(d)
  }
  return Array.from(map.values())
}, [filtered])

useEffect(() => {
  if (dealGroups.length === 0) return
  if (!activeDealId) {
    setExpandedGroups((prev) => prev.size === 0 ? new Set([dealGroups[0].pid]) : prev)
    return
  }
  for (const g of dealGroups) {
    if (g.deals.some((d) => d.id === activeDealId)) {
      setExpandedGroups((prev) => new Set([...prev, g.pid]))
      break
    }
  }
}, [activeDealId, dealGroups])

const toggleGroup = (pid) =>
  setExpandedGroups((prev) => {
    const next = new Set(prev)
    if (next.has(pid)) next.delete(pid)
    else next.add(pid)
    return next
  })
```

**Note:** The fisherman side uses `filtered` (search-filtered deals array) rather than `filteredDeals`. Check the exact variable name in the file.

- [ ] **Step 3: Replace flat deal list with grouped render**

Find the deal list map in the JSX (the `{filtered.map(...)}` or similar block). Replace with the same grouped pattern as Task 3, but:
- Group label: vendor name
- Sub-rows: same deal row content as currently rendered

Use the existing fisherman deal row JSX as the sub-row template — don't invent new markup, just nest it under the group header.

- [ ] **Step 4: Verify `useMemo` and `useEffect` are imported**

The fisherman Messages.jsx currently only imports `useState` and `useQuery`. Add `useMemo` and `useEffect` to the import:
```jsx
import { useState, useEffect, useMemo } from 'react'
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Messages.jsx
git commit -m "feat(fisherman): group deal conversations by vendor in Messages"
```

---

## Task 5: Manual E2E verification

- [ ] **Xendit:** Start the backend (`./mvnw spring-boot:run` from `backend/`). Confirm it boots without errors and no Xendit keys appear in logs. Test a payment flow if Xendit is configured.

- [ ] **OTP/Email:** Register a new account. Confirm you receive a Mailtrap email with a verification link. Click the link — should show "Email verified" screen. Log in — should trigger OTP email. Enter the 6-digit code. Should land on the dashboard.

- [ ] **Marine forecast:** Run `docker-compose down && docker network prune -f && docker-compose up -d`. Once running, hit the fisherman home page — conditions should load from DB snapshot. Then restore network and confirm forecasts return.

- [ ] **Chat grouping (vendor):** Log in as a vendor who has multiple deals with the same fisherman. Go to Messages. Confirm the left pane shows one row per fisherman with a deal count. Click to expand — deal sub-rows appear. Click a deal — chat pane opens. Check that the active deal row and its parent are both highlighted.

- [ ] **Chat grouping (fisherman):** Log in as a fisherman. Go to Messages. Same verification — deals grouped by vendor.
