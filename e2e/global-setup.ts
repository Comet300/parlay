import { test as setup, expect } from '@playwright/test'

/**
 * Authenticates a test user and saves the session to reuse across tests.
 * Requires E2E_USER_EMAIL and E2E_USER_PASSWORD env vars, and a running app.
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD
  if (!email || !password) {
    throw new Error('Set E2E_USER_EMAIL and E2E_USER_PASSWORD env vars')
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()

  // Wait for redirect to dashboard (authed area)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
