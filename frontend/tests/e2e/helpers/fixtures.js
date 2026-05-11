// Custom Playwright fixtures.
// Provides `fisherman` and `vendor` test users (with API contexts) that auto-login.
import { test as base } from '@playwright/test'
import { registerAndLogin, attachAuthToPage } from './api.js'

export const test = base.extend({
  fisherman: async ({}, use) => {
    const user = await registerAndLogin({
      role: 'FISHERMAN', fullName: 'E2E Fisherman', prefix: 'fish',
    })
    await use(user)
    await user.context.dispose()
  },

  vendor: async ({}, use) => {
    const user = await registerAndLogin({
      role: 'VENDOR', fullName: 'E2E Vendor', prefix: 'vend',
    })
    await use(user)
    await user.context.dispose()
  },

  /**
   * A page already logged in as the fisherman.
   * Uses cookie copy from the fisherman API context to avoid going through UI login.
   */
  fishermanPage: async ({ browser, fisherman }, use) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await attachAuthToPage(page, fisherman.context)
    await use(page)
    await ctx.close()
  },

  vendorPage: async ({ browser, vendor }, use) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await attachAuthToPage(page, vendor.context)
    await use(page)
    await ctx.close()
  },
})

export const expect = test.expect
