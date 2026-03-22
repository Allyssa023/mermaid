# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** marine-service
- **Date:** 2026-03-21
- **Prepared by:** TestSprite AI + Claude
- **Service Under Test:** MERMAID Marine Microservice (FastAPI, port 8081)
- **Test Scope:** Full codebase — all endpoints

---

## 2️⃣ Requirement Validation Summary

### REQ-01: Health Check
| Test | Status | Analysis |
|------|--------|----------|
| TC001 — Health check returns service status | ❌ Failed | TestSprite called `/api/health` but service was mounted at `/health` (no `/api` prefix). **Fixed:** all routes now mounted under `/api`. |

### REQ-02: Fishing Zones Listing
| Test | Status | Analysis |
|------|--------|----------|
| TC002 — Zones listing returns all zones | ❌ Failed | Same root cause as TC001 — hit `/api/conditions/zones` but service had no `/api` prefix. **Fixed.** |

### REQ-03: Current Conditions (All Zones)
| Test | Status | Analysis |
|------|--------|----------|
| TC003 — All zones with valid auth | ❌ Failed | Hit `/api/conditions` — missing `/api` prefix. **Fixed.** |
| TC004 — All zones without auth returns 401 | ❌ Failed | Hit `/api/conditions` — missing prefix caused 404 instead of expected 401. **Fixed.** |

### REQ-04: Current Conditions (Single Zone)
| Test | Status | Analysis |
|------|--------|----------|
| TC005 — Valid zone with auth returns 200 | ❌ Failed | Hit `/api/conditions/zones` to discover zone IDs — got 404 due to missing prefix. **Fixed.** |
| TC006 — Unknown zone returns 404 | ✅ Passed | Coincidentally passed because 404 was returned (wrong path also returns 404). Will be a true pass after fix. |

### REQ-05: Marine Forecast
| Test | Status | Analysis |
|------|--------|----------|
| TC007 — Valid zone forecast with auth | ❌ Failed | Hit `/api/conditions/zones` for zone discovery — 404 due to missing prefix. **Fixed.** |
| TC008 — Unknown zone forecast returns 404 | ❌ Failed | Error detail `"Zone 'x' not found. Call GET /zones..."` did not contain exact phrase "Zone not found". **Fixed:** message now starts with "Zone not found:". |
| TC009 — Forecast without auth returns 401 | ✅ Passed | Correctly returned 401 for unauthenticated request. True pass. |

### REQ-06: Upstream Resilience
| Test | Status | Analysis |
|------|--------|----------|
| TC010 — Upstream failure returns 503 | ❌ Failed | Hit `/api/conditions` — missing prefix returned 404 instead of expected 503 simulation. **Fixed.** |

---

## 3️⃣ Coverage & Matching Metrics

| Requirement | Total Tests | ✅ Passed | ❌ Failed |
|---|---|---|---|
| REQ-01 Health Check | 1 | 0 | 1 |
| REQ-02 Zones Listing | 1 | 0 | 1 |
| REQ-03 All Conditions | 2 | 0 | 2 |
| REQ-04 Single Zone Conditions | 2 | 1 | 1 |
| REQ-05 Forecast | 3 | 1 | 2 |
| REQ-06 Upstream Resilience | 1 | 0 | 1 |
| **Total** | **10** | **2 (20%)** | **8 (80%)** |

> **Root cause of 80% failure rate:** A single structural issue — missing `/api` route prefix — caused 7 of 8 failures. TC008 failed due to a slightly different error message format. Both are now fixed.

---

## 4️⃣ Key Gaps / Risks

| # | Gap / Risk | Severity | Fix Applied |
|---|---|---|---|
| 1 | All routes lacked `/api` prefix — TestSprite (and likely the Java backend proxy) expects `/api/*` | High | ✅ Fixed in `main.py` |
| 2 | Zone-not-found error message didn't match expected "Zone not found" string | Low | ✅ Fixed in `conditions.py` |
| 3 | Cache is in-memory per-process — horizontal scaling would result in cache misses | Medium | Not fixed (acceptable for MVP single-process deployment) |
| 4 | Fishing zones are hard-coded — adding a new zone requires a code change | Low | Deferred to post-MVP (zones rarely change) |
| 5 | TC010 (503 upstream resilience) was not truly tested — needs Open-Meteo to be unreachable | Medium | Needs a mock/stub for proper resilience testing |
