# Fisherman E2E Tests (Playwright)

Automates the high-value parts of `docs/FISHERMAN_QA_CHECKLIST.md`. Each test
registers its own throwaway users via `/api/auth/register` so suites are
hermetic — no manual seed data needed beyond the standard Flyway migrations.

## Prerequisites

1. **PostgreSQL** running on `localhost:5432`, `mermaid_db` exists.
2. **Backend** running with email verification disabled:
   ```
   cd backend
   SKIP_EMAIL_VERIFICATION=true ./mvnw spring-boot:run
   ```
   *(or set `SKIP_EMAIL_VERIFICATION=true` in your `.env` file)*
3. **Marine service** running (Django, some endpoints depend on it indirectly):
   ```
   cd marine-service
   python manage.py runserver 8081
   ```
4. **Frontend dev server** is auto-started by Playwright. If it's already
   running on `:5173`, Playwright will reuse it.

## Running

```bash
# All E2E specs, headless
npm run test:e2e

# Watch / debug mode
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Open the HTML report after a run
npm run test:e2e:report

# Single file
npx playwright test tests/e2e/01-trips.spec.js

# Single test by name
npx playwright test -g "Vendor offer flows end-to-end"
```

## Suite layout

| File | What it covers |
|------|-----------------|
| `01-trips.spec.js` | Start Trip (optional fields, checklist validation), Add Catch strict-select, Alert Vendors button. |
| `02-catch-alerts.spec.js` | Open offers = 0 with no real offer (auto-offer regression), Vendor Offers modal Accept/Decline. |
| `03-orders-happy-path.spec.js` | Full lifecycle: trip → catch → alert → vendor offer → accept → handoff → payment → confirm. |
| `04-procurement.spec.js` | Procurement page poll-stability (no flicker over 40s), Add Catch NPE regression on blank price. |
| `helpers/api.js` | Backend API helpers (register, login, trips, alerts, orders, payment). |
| `helpers/fixtures.js` | Playwright fixtures: `fisherman`, `vendor`, `fishermanPage`, `vendorPage`. |

## Conventions

- **Hermetic users**: every test registers fresh `fish-<ts>@e2e.test` and
  `vend-<ts>@e2e.test` accounts. No login-as-admin or fixture re-use across
  tests. Tests can run in any order.
- **Setup via API, assertions via UI**: where the test cares about behavior
  through the UI, we set up state with API helpers first to keep specs fast
  and focused. Some flows still walk the UI end-to-end (e.g. happy-path,
  Add Catch validation) to exercise the React layer.
- **Serial execution** (`fullyParallel: false`): backend is real, so parallel
  workers would race. Run with `workers: 1`.
- **Cookies, not localStorage**: the app uses cookie auth. The fixtures copy
  cookies from the API request context onto the browser context so pages are
  already logged-in without going through the UI login screen.

## Adding new tests

1. Drop a new `.spec.js` file in `tests/e2e/`.
2. Import `{ test, expect }` from `./helpers/fixtures.js` to get the
   `fisherman` / `vendor` / `fishermanPage` / `vendorPage` fixtures.
3. Use the helpers in `./helpers/api.js` for any backend setup.
4. Prefer `page.getByRole(...)` / `getByLabel(...)` selectors over CSS — they
   survive style changes.

## Troubleshooting

- **`register failed (409)`** — duplicate email. Shouldn't happen because
  `uniqueEmail` uses timestamp+counter, but if it does, restart the test run.
- **`Timed out waiting for ...`** — usually backend isn't running or backend
  startup is slow. Check `./mvnw spring-boot:run` logs.
- **First run is slow** — Playwright auto-starts Vite. After the first launch
  it reuses the dev server (`reuseExistingServer: true`).
- **Chromium missing** — run `npx playwright install chromium`.
