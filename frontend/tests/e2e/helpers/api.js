// API helpers for E2E tests.
// All requests use Playwright's APIRequestContext so cookies persist per browser context.
// Backend is expected at http://localhost:8080/api.

import { request as pwRequest } from '@playwright/test'

// Backend uses /api context path. We keep the base host-only and prefix /api
// on every path explicitly — Playwright's URL join would otherwise strip the
// /api prefix when a leading-slash path is provided.
const API = 'http://localhost:8080'
const P = (path) => `/api${path}`

let counter = 0
export function uniqueEmail(prefix) {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}@e2e.test`
}

/**
 * Create a brand-new user via /auth/register, then login to set the auth
 * cookie on a fresh APIRequestContext. Returns { context, email, password, user }.
 */
export async function registerAndLogin({ role, fullName, prefix = 'e2e' }) {
  const email = uniqueEmail(prefix)
  const password = 'Test1234!'
  // Use a *new* request context so cookies are isolated per user.
  const ctx = await pwRequest.newContext({ baseURL: API })
  const reg = await ctx.post(P('/auth/register'), {
    data: { email, password, fullName, role },
  })
  if (!reg.ok()) {
    throw new Error(`register failed (${reg.status()}): ${await reg.text()}`)
  }
  const login = await ctx.post(P('/auth/login'), {
    data: { email, password, rememberMe: true },
  })
  if (!login.ok()) {
    throw new Error(`login failed (${login.status()}): ${await login.text()}`)
  }
  const body = await login.json()
  return { context: ctx, email, password, user: body.user }
}

/**
 * Copy auth cookies from an API request context to a browser page context so
 * the page is logged-in without going through the UI login flow.
 */
export async function attachAuthToPage(page, apiContext) {
  const state = await apiContext.storageState()
  const cookies = state.cookies.map(c => ({
    ...c,
    domain: 'localhost',
    url: undefined,
  }))
  await page.context().addCookies(cookies)
}

// ── Fish species ─────────────────────────────────────────────────────────────

export async function listSpecies(ctx) {
  const r = await ctx.get(P('/lookups/fish-species'))
  if (!r.ok()) throw new Error(`species fetch failed: ${r.status()}`)
  return r.json()
}

// ── Trips ────────────────────────────────────────────────────────────────────

export async function startTrip(ctx, body = {}) {
  const r = await ctx.post(P('/trips'), { data: body })
  if (!r.ok()) throw new Error(`startTrip failed: ${r.status()} ${await r.text()}`)
  return r.json()
}

export async function saveChecklist(ctx, tripId, all = true) {
  const r = await ctx.put(P(`/trips/${tripId}/checklist`), {
    data: {
      fuelChecked: all, engineChecked: all, radioChecked: all,
      lifeVestChecked: all, weatherReviewed: all, emergencyKitChecked: all,
    },
  })
  if (!r.ok()) throw new Error(`saveChecklist failed: ${r.status()}`)
  return r.json()
}

export async function endTrip(ctx, tripId) {
  const r = await ctx.post(P(`/trips/${tripId}/end`), { data: {} })
  if (!r.ok()) throw new Error(`endTrip failed: ${r.status()}`)
  return r.json()
}

export async function addCatch(ctx, tripId, body) {
  const r = await ctx.post(P(`/trips/${tripId}/catches`), { data: body })
  if (!r.ok()) throw new Error(`addCatch failed: ${r.status()} ${await r.text()}`)
  return r.json()
}

// ── Catch alerts ─────────────────────────────────────────────────────────────

export async function createCatchAlert(ctx, body) {
  const r = await ctx.post(P('/catch-alerts'), { data: body })
  if (!r.ok()) throw new Error(`createCatchAlert failed: ${r.status()} ${await r.text()}`)
  return r.json()
}

export async function listMyAlerts(ctx) {
  const r = await ctx.get(P('/catch-alerts'))
  return r.ok() ? r.json() : []
}

export async function browseAlerts(ctx, speciesId) {
  const qs = speciesId ? `?speciesId=${speciesId}` : ''
  const r = await ctx.get(P(`/marketplace/catch-alerts${qs}`))
  return r.ok() ? r.json() : []
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(ctx, body) {
  const r = await ctx.post(P('/orders'), { data: body })
  if (!r.ok()) throw new Error(`createOrder failed: ${r.status()} ${await r.text()}`)
  return r.json()
}

export async function confirmOrder(ctx, orderId) {
  const r = await ctx.put(P(`/orders/${orderId}/confirm`))
  if (!r.ok()) throw new Error(`confirmOrder failed: ${r.status()}`)
  return r.json()
}

export async function listMyOrders(ctx) {
  const r = await ctx.get(P('/orders/mine'))
  return r.ok() ? r.json() : []
}

export async function createHandoff(ctx, orderId, qtyKg, pricePerKg) {
  const r = await ctx.post(P(`/orders/${orderId}/handoff`), {
    data: { actualQtyKg: qtyKg, finalPricePerKg: pricePerKg },
  })
  if (!r.ok()) throw new Error(`createHandoff failed: ${r.status()} ${await r.text()}`)
  return r.json()
}

export async function confirmHandoffSeller(ctx, orderId) {
  const r = await ctx.put(P(`/orders/${orderId}/handoff/confirm-seller`))
  if (!r.ok()) throw new Error(`confirmHandoffSeller failed: ${r.status()}`)
  return r.json()
}

export async function confirmHandoffBuyer(ctx, orderId) {
  const r = await ctx.put(P(`/orders/${orderId}/handoff/confirm-buyer`))
  if (!r.ok()) throw new Error(`confirmHandoffBuyer failed: ${r.status()}`)
  return r.json()
}

export async function recordPayment(ctx, orderId, amount) {
  const r = await ctx.post(P(`/orders/${orderId}/payment`), {
    data: { amount, method: 'CASH' },
  })
  if (!r.ok()) throw new Error(`recordPayment failed: ${r.status()}`)
  return r.json()
}

export async function confirmPayment(ctx, orderId) {
  const r = await ctx.put(P(`/orders/${orderId}/payment/confirm`))
  if (!r.ok()) throw new Error(`confirmPayment failed: ${r.status()}`)
  return r.json()
}
