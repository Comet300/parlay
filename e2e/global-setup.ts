import { test as setup, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}

/**
 * Authenticates a test user and saves the session to reuse across tests.
 * Reads E2E_USER_EMAIL and E2E_USER_PASSWORD from .env or env vars.
 */
setup('authenticate', async ({ page, context }) => {
  loadEnv()
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  if (!email || !password) {
    throw new Error('Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env or as env vars')
  }

  // Authenticate via API and capture the set-cookie header
  const resp = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
    data: { email, password },
  })

  if (!resp.ok()) {
    throw new Error(`Sign-in API failed: ${resp.status()} ${await resp.text()}`)
  }

  // BetterAuth sets session cookies via set-cookie headers on the response.
  // page.request automatically stores cookies in the browser context.

  // Verify we can access the dashboard
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
