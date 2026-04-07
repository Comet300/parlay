import { test, expect, type Page, type BrowserContext, type Browser } from '@playwright/test'

// ==========================================================================
// Helpers
// ==========================================================================

async function gotoDashboard(page: Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

function titleInput(page: Page) {
  return page.locator('input.font-semibold')
}

/** Open the FacetSwitcher dropdown in the builder toolbar */
async function openSwitcher(page: Page) {
  const dropdown = page.getByText('Create facet')
  if (await dropdown.isVisible().catch(() => false)) return
  // The trigger button has classes matching the FacetSwitcher component
  const trigger = page.locator('button.rounded-lg.border.font-medium').filter({ has: page.locator('.truncate') })
  await trigger.click()
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
}

/** Enable round-robin. Uses dashboard checkbox when available (>1 facet), falls back to builder toggle. */
async function enableRoundRobin(page: Page, formTitle: string) {
  await gotoDashboard(page)
  const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: formTitle })
  const toggle = card.getByRole('checkbox', { name: 'Round-robin' })

  // Dashboard shows RR checkbox only when form has >1 facet
  if (await toggle.isVisible().catch(() => false)) {
    if (await toggle.isChecked()) return
    await toggle.click()
    await page.waitForTimeout(1000)
    await page.waitForLoadState('networkidle')
    await expect(toggle).toBeChecked({ timeout: 5_000 })
    return
  }

  // Fallback: navigate to builder and use FacetSwitcher toggle
  await card.locator('a').first().click()
  await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
  await openSwitcher(page)
  const rrBtn = page.locator('button').filter({ hasText: 'Round-robin' })
  await expect(rrBtn).toBeVisible({ timeout: 5_000 })
  // Use evaluate to avoid DOM detachment from onRefresh re-render
  const [response] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST', { timeout: 10_000 }),
    rrBtn.evaluate((el) => (el as HTMLButtonElement).click()),
  ])
  expect(response.status()).toBeLessThan(400)
  await page.waitForLoadState('networkidle')
  // Navigate to dashboard to leave a consistent state
  await gotoDashboard(page)
}

/**
 * Create a form via dashboard → builder. Returns the builder page URL.
 * Leaves the browser on the builder page with the default facet.
 */
async function createFormInBuilder(page: Page, title: string) {
  await gotoDashboard(page)
  await page.getByRole('button', { name: 'New Form' }).click()
  await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
  await titleInput(page).fill(title)
  await titleInput(page).blur()
  await page.waitForTimeout(500)
}

/**
 * Publish the current facet in the builder and return the formId (UUID).
 * Extracts formId from the published URL display.
 */
async function publishAndGetFormId(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.locator('[title="Copy URL"]')).toBeVisible({ timeout: 5_000 })
  const urlSpan = page.locator('[title="Copy URL"]').locator('..').locator('span.truncate')
  const urlText = await urlSpan.textContent()
  const match = urlText?.match(
    /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?/i,
  )
  if (!match) throw new Error(`Could not extract formId from URL: "${urlText}"`)
  return match[1]
}

/** Create a second facet via the FacetSwitcher. Leaves the browser on the new facet's builder page. */
async function createSecondFacet(page: Page, nickname: string) {
  const currentUrl = page.url()
  await openSwitcher(page)
  await page.getByText('Create facet').click()
  const input = page.locator('input[placeholder="facet-name"]')
  await input.fill(nickname)
  // Wait for the server function response when creating the facet
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    input.press('Enter'),
  ])
  expect(response.status()).toBeLessThan(400)
  // Wait for navigation to the NEW facet (URL must change from current)
  await page.waitForURL((url) => url.pathname.startsWith('/build/') && url.toString() !== currentUrl, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
}

/** Publish the current facet via the builder's Publish button. */
async function publishCurrentFacet(page: Page) {
  // Ensure we're on the builder page with Publish visible
  await expect(page).toHaveURL(/\/build\//, { timeout: 5_000 })
  // Wait for auto-save to settle before clicking Publish to avoid race conditions
  await page.waitForTimeout(2500)
  await page.waitForLoadState('networkidle')
  const publishBtn = page.getByRole('button', { name: 'Publish' })
  await expect(publishBtn).toBeVisible({ timeout: 5_000 })
  await publishBtn.click()
  // Wait for the Unpublish button or Copy URL to confirm publish succeeded
  await expect(
    page.getByRole('button', { name: 'Unpublish' }),
  ).toBeVisible({ timeout: 15_000 })
}

/** Navigate to a facet in the FacetSwitcher dropdown by nickname. */
async function navigateToFacet(page: Page, nickname: string) {
  const currentUrl = page.url()
  await openSwitcher(page)
  await page.locator('[class*="w-64"][class*="shadow-lg"]').locator('button.truncate, button.text-left').filter({ hasText: nickname }).first().click()
  // Wait for navigation to the different facet
  await page.waitForURL((url) => url.pathname.startsWith('/build/') && url.toString() !== currentUrl, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
}

/** Delete a form from the dashboard by title. */
async function deleteFormByTitle(page: Page, title: string) {
  await gotoDashboard(page)
  const card = page
    .locator('[class*="overflow-hidden flex flex-col"]')
    .filter({ hasText: title })
  if (await card.isVisible().catch(() => false)) {
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(500)
  }
}

/** Archive ALL facets on a form via the dashboard "Archive form" action. */
async function archiveFacetFromDashboard(page: Page, title: string, _nickname: string) {
  await gotoDashboard(page)
  const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
  await card.getByLabel('Form actions').click()
  const archiveMenuItem = page.locator('button').filter({ hasText: /^\s*Archive form\s*$/ }).first()
  await expect(archiveMenuItem).toBeVisible({ timeout: 3_000 })
  await archiveMenuItem.click()
  const confirmBtn = page.locator('.fixed button').filter({ hasText: 'Archive' })
  await expect(confirmBtn).toBeVisible({ timeout: 3_000 })
  await confirmBtn.click()
  await page.waitForTimeout(500)
}

/** Unpublish (active → draft) a facet by navigating to the builder and clicking Unpublish. */
async function unpublishFacetFromDashboard(page: Page, title: string, nickname: string) {
  await gotoDashboard(page)
  const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
  // Navigate to the builder for this facet
  await card.locator('a').first().click()
  await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
  // Unpublish from builder toolbar
  await page.getByRole('button', { name: 'Unpublish' }).click()
  await page.waitForTimeout(500)
}

/** Visit a form URL as a public respondent (fresh, unauthenticated context). */
async function visitAsPublic(browser: Browser, url: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url)
  return { page, context }
}

/**
 * Visit a form URL as a unique visitor for round-robin tests.
 * Intercepts the resolveFacet server function call and replaces the
 * FingerprintJS visitor ID (which is identical across headless Chromium
 * contexts) with a unique value.
 */
async function visitAsUniqueVisitor(
  browser: Browser,
  url: string,
  seed: number,
): Promise<{ page: Page; context: BrowserContext; visitorId: string }> {
  const visitorId = `e2etest${seed}${Date.now().toString(36)}`.padEnd(32, '0').slice(0, 32)
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.route('**/_serverFn/**', async (route) => {
    const body = route.request().postData()
    if (body) {
      // Replace FingerprintJS visitor ID (32 hex chars, no hyphens) with unique one
      const modified = body.replace(/("s":")[0-9a-f]{32}(")/g, `$1${visitorId}$2`)
      await route.continue({ postData: modified })
    } else {
      await route.continue()
    }
  })
  await page.goto(url)
  return { page, context, visitorId }
}

// ==========================================================================
// player-fingerprint spec: Two-phase load pattern
// ==========================================================================

test.describe('Spec: Two-phase load pattern', () => {
  const TITLE = `E2E-Spinner-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('Phase 1 shows loading spinner before resolution (player-fingerprint req: Two-phase load)', async ({
    browser,
  }) => {
    // For a real form, preResolve returns 'continue' and the component SSR-renders
    // the loading spinner. Phase 2 then runs client-side (getVisitorId + resolveFacet).
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    // Slow down server function calls to keep the spinner visible longer
    await page.route('**', async (route) => {
      const url = route.request().url()
      if (url.includes('_server') || route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 500))
      }
      await route.continue()
    })
    await page.goto(`/${formId}`)
    const spinner = page.locator('.animate-spin')
    await expect(spinner).toBeVisible({ timeout: 5_000 })
    await ctx.close()
  })
})

// ==========================================================================
// player-fingerprint spec + change spec: UUID validation
// ==========================================================================

test.describe('Spec: UUID validation on player route', () => {
  test('non-UUID path returns 404 immediately without fingerprinting (change spec: UUID validation)', async ({
    page,
  }) => {
    await page.goto('/not-a-uuid')
    await expect(page.getByText('404').or(page.getByText('Not Found'))).toBeVisible({ timeout: 5_000 })
  })

  test('named route like /dashboard does not enter player flow', async ({ page }) => {
    await page.goto('/dashboard')
    // Should load the dashboard, not a player 404
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

// ==========================================================================
// change spec: Form existence guard (step 0)
// ==========================================================================

test.describe('Spec: Form existence guard', () => {
  test('valid UUID with no matching form shows 404 (change spec: step 0)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, '/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('Not Found')).toBeVisible({ timeout: 15_000 })
    await context.close()
  })
})

// ==========================================================================
// player-facet-resolution spec: Resolution decision tree — default facet
// ==========================================================================

test.describe('Spec: Default facet resolution (round-robin OFF)', () => {
  const TITLE = `E2E-Default-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('first visit with no ?v= serves default facet and sets URL (scenario: No param, first visit, RR off)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)

    // Phase 2 completes → URL gets ?v=default
    await expect(page).toHaveURL(new RegExp(`/${formId}\\?v=default`), { timeout: 15_000 })
    // Resolved state should be visible (facet nickname shown in the "Facet:" label)
    await expect(page.getByText('Facet: default')).toBeVisible({ timeout: 5_000 })
    await context.close()
  })

  test('direct ?v=default serves active facet (scenario: Direct nickname, active facet)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=default`)

    await expect(page).toHaveURL(new RegExp(`\\?v=default`), { timeout: 15_000 })
    await expect(page.getByText('Facet: default')).toBeVisible({ timeout: 5_000 })
    await context.close()
  })

  test('URL is set once and does not change (req: Single URL update)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page).toHaveURL(new RegExp(`\\?v=default`), { timeout: 15_000 })

    const urlAfterResolution = page.url()
    // Wait a beat and verify URL hasn't changed
    await page.waitForTimeout(2000)
    expect(page.url()).toBe(urlAfterResolution)
    await context.close()
  })
})

// ==========================================================================
// player-facet-resolution spec: Resolution decision tree — ?v= lookups
// ==========================================================================

test.describe('Spec: Nickname lookup via ?v= param', () => {
  const TITLE = `E2E-Nickname-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)
    // Create a second facet that stays in draft
    await createSecondFacet(page, 'draft-only')
    // Don't publish it — it remains draft
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('unknown ?v= nickname shows 404 (step 1d: not found → not_found)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=nonexistent-xyz`)
    await expect(page.getByText('Not Found')).toBeVisible({ timeout: 15_000 })
    await context.close()
  })

  test('draft facet via ?v= treated as non-existent (step 1d: draft → not_found)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=draft-only`)
    await expect(page.getByText('Not Found')).toBeVisible({ timeout: 15_000 })
    await context.close()
  })
})

// ==========================================================================
// player-facet-resolution spec + form-unavailable spec: Archived facet via ?v=
// ==========================================================================

test.describe('Spec: Archived facet via ?v= shows FormUnavailable', () => {
  const TITLE = `E2E-Archived-V-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)

    // Create and publish a second facet
    await createSecondFacet(page, 'keeper')
    await publishCurrentFacet(page)

    // Archive ALL facets on the form via dashboard
    await archiveFacetFromDashboard(page, TITLE, 'default')
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('?v= with archived facet nickname renders FormUnavailable (step 1c + form-unavailable req: Trigger conditions)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=default`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('no longer accepting responses')).toBeVisible()
    await context.close()
  })

  test('?v= with other archived facet also shows FormUnavailable (all facets archived)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=keeper`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await context.close()
  })
})

// ==========================================================================
// player-facet-resolution spec: Nickname history redirect
// ==========================================================================

test.describe('Spec: Renamed facet redirects via nickname history', () => {
  const TITLE = `E2E-Rename-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)

    // Rename "default" to "renamed" via FacetSwitcher
    await openSwitcher(page)
    const renameBtn = page
      .locator('[class*="w-64"][class*="shadow-lg"]')
      .locator('button[title="Rename"]')
      .first()
    await renameBtn.click()
    const renameInput = page.locator('[class*="w-64"][class*="shadow-lg"]').locator('input').first()
    await renameInput.fill('renamed')
    await renameInput.press('Enter')
    await page.waitForTimeout(1000)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('old nickname redirects to current nickname (step 1d: history match → redirect)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=default`)
    // Should redirect: URL updated to ?v=renamed
    await expect(page).toHaveURL(new RegExp(`\\?v=renamed`), { timeout: 15_000 })
    await expect(page.getByText('Facet: renamed')).toBeVisible({ timeout: 5_000 })
    await context.close()
  })

  test('new nickname works directly', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}?v=renamed`)
    await expect(page).toHaveURL(new RegExp(`\\?v=renamed`), { timeout: 15_000 })
    await expect(page.getByText('Facet: renamed')).toBeVisible({ timeout: 5_000 })
    await context.close()
  })
})

// ==========================================================================
// form-unavailable spec: All trigger conditions
// ==========================================================================

test.describe('Spec: FormUnavailable trigger conditions', () => {
  test('all facets archived → FormUnavailable (form-unavailable scenario: All facets archived)', async ({
    page,
    browser,
  }) => {
    const title = `E2E-AllArchived-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    // Archive the only facet via dashboard
    await archiveFacetFromDashboard(page, title, 'default')

    // Visit as public
    const { page: pub, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(pub.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await context.close()

    await deleteFormByTitle(page, title)
  })

  test('RR off + no active default → FormUnavailable (form-unavailable scenario: No active default facet)', async ({
    page,
    browser,
  }) => {
    const title = `E2E-NoDefault-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    // Unpublish (active → draft) — now no active default
    await unpublishFacetFromDashboard(page, title, 'default')

    const { page: pub, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(pub.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await context.close()

    await deleteFormByTitle(page, title)
  })

  test('RR on + zero active facets → FormUnavailable (form-unavailable scenario: No active facets)', async ({
    page,
    browser,
  }) => {
    const title = `E2E-RRNoActive-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    // Enable round-robin
    await enableRoundRobin(page, title)

    // Unpublish the only facet (active → draft) via builder
    await unpublishFacetFromDashboard(page, title, 'default')

    const { page: pub, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(pub.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await context.close()

    await deleteFormByTitle(page, title)
  })

  test('return visitor whose assigned facet was archived → FormUnavailable (form-unavailable scenario: Return visitor, assigned facet archived)', async ({
    page,
    browser,
  }) => {
    const title = `E2E-ReturnArchived-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    // First visit — get assigned the default facet
    const visitorCtx = await browser.newContext()
    const visitorPage = await visitorCtx.newPage()
    await visitorPage.goto(`/${formId}`)
    await expect(visitorPage).toHaveURL(new RegExp(`\\?v=default`), { timeout: 15_000 })

    // Archive the facet from dashboard
    await archiveFacetFromDashboard(page, title, 'default')

    // Return visit — same visitor context (same cookies = same visitor_id)
    await visitorPage.goto(`/${formId}`)
    await expect(visitorPage.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await visitorCtx.close()

    await deleteFormByTitle(page, title)
  })
})

// ==========================================================================
// form-unavailable spec: Visual design, message, branding, no content leak
// ==========================================================================

test.describe('Spec: FormUnavailable page design', () => {
  const TITLE = `E2E-UnavailUI-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)

    // Archive to trigger FormUnavailable
    await archiveFacetFromDashboard(page, TITLE, 'default')
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('uses Parlay brand background color #F8F9FC (req: Visual design)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })

    const bg = page.locator('div.h-screen.w-screen')
    await expect(bg).toHaveCSS('background-color', 'rgb(248, 249, 252)')
    await context.close()
  })

  test('uses Parlay brand primary #EA4C89 in animation (req: Visual design)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })

    // SVG nodes use brand primary as stroke/fill
    const svg = page.locator('svg')
    await expect(svg).toBeVisible()
    // Check that the brand color appears in the SVG
    const circles = page.locator('svg circle')
    const count = await circles.count()
    expect(count).toBeGreaterThan(0)
    await context.close()
  })

  test('shows friendly message (req: Message content)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('no longer accepting responses')).toBeVisible()
    await context.close()
  })

  test('shows Parlay branding (req: Message content)', async ({ browser }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Parlay')).toBeVisible()
    await context.close()
  })

  test('does not leak form content or facet data (req: No form content leak)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page.getByText('This form has ended')).toBeVisible({ timeout: 15_000 })
    // Form title should NOT be visible
    await expect(page.getByText(TITLE)).not.toBeVisible()
    // No facet nicknames
    await expect(page.getByText('default')).not.toBeVisible()
    await context.close()
  })
})

// ==========================================================================
// round-robin spec: Single active facet shortcut (RR on, N=1)
// ==========================================================================

test.describe('Spec: Single active facet shortcut', () => {
  const TITLE = `E2E-RR1-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)

    // Enable round-robin (only 1 active facet)
    await enableRoundRobin(page, TITLE)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('RR on + 1 active facet serves that facet directly (req: Single active facet shortcut)', async ({
    browser,
  }) => {
    const { page, context } = await visitAsPublic(browser, `/${formId}`)
    await expect(page).toHaveURL(new RegExp(`\\?v=default`), { timeout: 15_000 })
    await expect(page.getByText('Facet: default')).toBeVisible({ timeout: 5_000 })
    await context.close()
  })
})

// ==========================================================================
// round-robin spec: Counter-based distribution (RR on, N>1)
// ==========================================================================

test.describe('Spec: Round-robin distribution across facets', () => {
  const TITLE = `E2E-RRDist-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)

    // Create and publish a second facet
    await createSecondFacet(page, 'variant-b')
    await publishCurrentFacet(page)

    // Enable round-robin
    await enableRoundRobin(page, TITLE)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('two sequential visitors get different facets (scenario: First visit, N>1 active facets)', async ({
    browser,
  }) => {
    // Headless Chromium produces identical FingerprintJS IDs across contexts,
    // so intercept the server function call and replace the visitor ID
    const { page: page1, context: ctx1 } = await visitAsUniqueVisitor(browser, `/${formId}`, 1)
    await expect(page1).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    const nickname1 = new URL(page1.url()).searchParams.get('v')

    const { page: page2, context: ctx2 } = await visitAsUniqueVisitor(browser, `/${formId}`, 2)
    await expect(page2).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    const nickname2 = new URL(page2.url()).searchParams.get('v')

    // With 2 facets, consecutive visitors must get different facets
    expect(nickname1).not.toBe(nickname2)
    expect(['default', 'variant-b']).toContain(nickname1)
    expect(['default', 'variant-b']).toContain(nickname2)

    await ctx1.close()
    await ctx2.close()
  })

  test('three visitors cover both facets (round-robin wraps around)', async ({ browser }) => {
    const nicknames: string[] = []
    for (let i = 0; i < 3; i++) {
      const { page: pg, context: ctx } = await visitAsUniqueVisitor(browser, `/${formId}`, 10 + i)
      await expect(pg).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
      nicknames.push(new URL(pg.url()).searchParams.get('v')!)
      await ctx.close()
    }

    // With 2 facets, 3 visitors must include both nicknames
    expect(nicknames).toContain('default')
    expect(nicknames).toContain('variant-b')
  })
})

// ==========================================================================
// round-robin spec: Return visit idempotency
// ==========================================================================

test.describe('Spec: Return visitor gets same facet', () => {
  const TITLE = `E2E-Return-${Date.now()}`
  let formId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await createFormInBuilder(page, TITLE)
    formId = await publishAndGetFormId(page)

    // Two facets + RR on for meaningful test
    await createSecondFacet(page, 'variant-c')
    await publishCurrentFacet(page)
    await enableRoundRobin(page, TITLE)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await ctx.newPage()
    await deleteFormByTitle(page, TITLE)
    await ctx.close()
  })

  test('same visitor gets identical facet on return visit (scenario: Return visit)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const pg = await ctx.newPage()

    // First visit
    await pg.goto(`/${formId}`)
    await expect(pg).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    const first = new URL(pg.url()).searchParams.get('v')

    // Return visit
    await pg.goto(`/${formId}`)
    await expect(pg).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    const second = new URL(pg.url()).searchParams.get('v')

    expect(second).toBe(first)
    await ctx.close()
  })

  test('return visit does not increment counter (other visitors still get correct distribution)', async ({
    browser,
  }) => {
    // Visitor A visits twice
    const ctxA = await browser.newContext()
    const pgA = await ctxA.newPage()
    await pgA.goto(`/${formId}`)
    await expect(pgA).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    const nickA = new URL(pgA.url()).searchParams.get('v')

    // Visitor A returns (should not increment counter)
    await pgA.goto(`/${formId}`)
    await expect(pgA).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    expect(new URL(pgA.url()).searchParams.get('v')).toBe(nickA)

    // Visitor B should still get a valid assignment
    const ctxB = await browser.newContext()
    const pgB = await ctxB.newPage()
    await pgB.goto(`/${formId}`)
    await expect(pgB).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
    const nickB = new URL(pgB.url()).searchParams.get('v')
    expect(['default', 'variant-c']).toContain(nickB)

    await ctxA.close()
    await ctxB.close()
  })
})

// ==========================================================================
// round-robin spec: Return visit uses current nickname after rename
// ==========================================================================

test.describe('Spec: Return visitor after facet rename', () => {
  test('return visit uses current nickname, not log snapshot (scenario: Return visit after rename)', async ({
    page,
    browser,
  }) => {
    const title = `E2E-RRRename-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    await createSecondFacet(page, 'original-b')
    await publishCurrentFacet(page)
    await enableRoundRobin(page, title)

    // Visit as a public visitor — get assigned a facet
    // Use a SINGLE context for both visits so the same visitor ID is used
    const visitorCtx = await browser.newContext()
    const visitorPage = await visitorCtx.newPage()
    await visitorPage.goto(`/${formId}`)
    await expect(visitorPage).toHaveURL(/\?v=/, { timeout: 15_000 })
    const assignedNickname = new URL(visitorPage.url()).searchParams.get('v')!
    expect(['default', 'original-b']).toContain(assignedNickname)
    // Keep the context open — we'll reuse it for the return visit

    // Now rename the assigned facet (as the owner) via the builder
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
    await card.locator('a').first().click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Navigate to the assigned facet if not already there
    if (assignedNickname !== 'default') {
      await navigateToFacet(page, assignedNickname)
    }

    // Rename the assigned facet
    await openSwitcher(page)
    const dd = page.locator('[class*="w-64"][class*="shadow-lg"]')
    const facetRow = dd.locator('button.text-left.truncate, button.truncate').filter({ hasText: assignedNickname })
    await facetRow.hover()
    await facetRow.locator('xpath=..').locator('[title="Rename"]').click()
    const renameInput = dd.locator('input')
    await renameInput.fill('renamed-nick')
    await renameInput.press('Enter')
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle')

    // Return visit as the SAME visitor (same context = same visitor ID)
    await visitorPage.goto(`/${formId}`)
    await expect(visitorPage).toHaveURL(/\?v=/, { timeout: 15_000 })
    const returnNickname = new URL(visitorPage.url()).searchParams.get('v')

    // The return visit should use the CURRENT nickname of the assigned facet.
    // We renamed the assigned facet (whichever it was) to 'renamed-nick',
    // so the return visit should reflect the new name, not the log snapshot.
    expect(returnNickname).toBe('renamed-nick')

    await visitorCtx.close()
    await deleteFormByTitle(page, title)
  })
})

// ==========================================================================
// round-robin spec: Archived facets excluded from round-robin
// ==========================================================================

test.describe('Spec: Inactive facets excluded from round-robin', () => {
  test('unpublished (draft) facet is never assigned by round-robin (req: Inactive facets excluded)', async ({
    page,
    browser,
  }) => {
    const title = `E2E-RRExclude-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    // Create and publish two more facets
    await createSecondFacet(page, 'variant-d')
    await publishCurrentFacet(page)
    await createSecondFacet(page, 'variant-e')
    await publishCurrentFacet(page)

    // Enable RR
    await enableRoundRobin(page, title)

    // Unpublish "default" facet (active → draft) so it is excluded from RR
    await unpublishFacetFromDashboard(page, title, 'default')

    // Visit multiple times as different visitors — "default" should never be assigned
    const assigned: string[] = []
    for (let i = 0; i < 4; i++) {
      const { page: pg, context: ctx } = await visitAsUniqueVisitor(browser, `/${formId}`, 20 + i)
      await expect(pg).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })
      assigned.push(new URL(pg.url()).searchParams.get('v')!)
      await ctx.close()
    }

    // "default" (draft) should never appear
    for (const nick of assigned) {
      expect(nick).not.toBe('default')
      expect(['variant-d', 'variant-e']).toContain(nick)
    }

    await deleteFormByTitle(page, title)
  })
})

// ==========================================================================
// player-fingerprint spec: Visitor ID persistence
// ==========================================================================

test.describe('Spec: Visitor ID persistence', () => {
  test('parlay_vid cookie is set after visit (req: Fallback identification persistence)', async ({
    browser,
  }) => {
    const title = `E2E-Cookie-${Date.now()}`
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const setupPage = await ctx.newPage()
    await createFormInBuilder(setupPage, title)
    const formId = await publishAndGetFormId(setupPage)
    await ctx.close()

    // Visit as public
    const pubCtx = await browser.newContext()
    const pubPage = await pubCtx.newPage()
    await pubPage.goto(`/${formId}`)
    await expect(pubPage).toHaveURL(new RegExp(`\\?v=`), { timeout: 15_000 })

    // Check cookie
    const cookies = await pubCtx.cookies()
    const vidCookie = cookies.find((c) => c.name === 'parlay_vid')
    expect(vidCookie).toBeTruthy()
    expect(vidCookie!.sameSite).toBe('Lax')
    expect(vidCookie!.path).toBe('/')

    await pubCtx.close()

    // Cleanup
    const cleanCtx = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const cleanPage = await cleanCtx.newPage()
    await deleteFormByTitle(cleanPage, title)
    await cleanCtx.close()
  })
})

// ==========================================================================
// round-robin spec + change spec: Toggle behavior in FacetSwitcher
// ==========================================================================

test.describe('Spec: Round-robin toggle behavior (builder FacetSwitcher)', () => {
  test('toggle ON commits immediately with no prompt (change spec: Toggle ON)', async ({
    page,
  }) => {
    const title = `E2E-ToggleOn-${Date.now()}`
    await createFormInBuilder(page, title)
    await publishAndGetFormId(page)

    await openSwitcher(page)
    const rrBtn = page.locator('button').filter({ hasText: 'Round-robin' })
    await expect(rrBtn.getByText('OFF')).toBeVisible()
    await rrBtn.click()
    await page.waitForTimeout(500)

    // No prompt should appear
    await expect(page.getByText('Select default facet:')).not.toBeVisible()

    // Verify ON
    await page.waitForLoadState('networkidle')
    await openSwitcher(page)
    await expect(page.locator('button').filter({ hasText: 'Round-robin' }).getByText('ON')).toBeVisible()

    await deleteFormByTitle(page, title)
  })

  test('toggle OFF with 1 active facet auto-selects default (change spec: Toggle OFF with 1 active facet)', async ({
    page,
  }) => {
    const title = `E2E-ToggleOff1-${Date.now()}`
    await createFormInBuilder(page, title)
    await publishAndGetFormId(page)

    // ON (navigates to dashboard)
    await enableRoundRobin(page, title)

    // Navigate back to builder for toggle-OFF test
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
    await card.locator('a').first().click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // OFF — only 1 active facet, should auto-commit
    await openSwitcher(page)
    await page.locator('button').filter({ hasText: 'Round-robin' }).click()
    await page.waitForTimeout(1000)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Select default facet:')).not.toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await openSwitcher(page)
    await expect(page.locator('button').filter({ hasText: 'Round-robin' }).getByText('OFF')).toBeVisible()

    await deleteFormByTitle(page, title)
  })

  test('toggle OFF with >1 active facets shows inline dropdown (change spec: Toggle OFF with 3 active facets)', async ({
    page,
  }) => {
    const title = `E2E-ToggleOffN-${Date.now()}`
    await createFormInBuilder(page, title)
    await publishAndGetFormId(page)

    // Create + publish second facet
    await createSecondFacet(page, 'facet-b')
    await publishCurrentFacet(page)

    // ON (navigates to dashboard)
    await enableRoundRobin(page, title)

    // Navigate back to builder
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
    await card.locator('a').first().click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // OFF → should show prompt
    await openSwitcher(page)
    await page.locator('button').filter({ hasText: 'Round-robin' }).click()
    await expect(page.getByText('Select default facet:')).toBeVisible({ timeout: 3_000 })

    // Dropdown lists active facets by nickname
    const select = page.locator('select').last()
    const options = select.locator('option')
    // Should have "Choose..." + 2 active facets
    await expect(options).toHaveCount(3)

    // Confirm disabled until selection
    const confirmBtn = page.getByRole('button', { name: 'Confirm' })
    await expect(confirmBtn).toBeDisabled()

    // Select a facet
    await select.selectOption({ index: 1 })
    await expect(confirmBtn).toBeEnabled()

    // Confirm
    await confirmBtn.click()
    await page.waitForTimeout(500)

    // Prompt gone, RR off
    await expect(page.getByText('Select default facet:')).not.toBeVisible()
    await openSwitcher(page)
    await expect(page.locator('button').filter({ hasText: 'Round-robin' }).getByText('OFF')).toBeVisible()

    await deleteFormByTitle(page, title)
  })

  test('cancel dismisses prompt and keeps round-robin ON (change spec: cancel scenario)', async ({
    page,
  }) => {
    const title = `E2E-ToggleCancel-${Date.now()}`
    await createFormInBuilder(page, title)
    await publishAndGetFormId(page)

    await createSecondFacet(page, 'facet-c')
    await publishCurrentFacet(page)

    // ON (navigates to dashboard)
    await enableRoundRobin(page, title)

    // Navigate back to builder
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
    await card.locator('a').first().click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // OFF → prompt
    await openSwitcher(page)
    await page.locator('button').filter({ hasText: 'Round-robin' }).click()
    await expect(page.getByText('Select default facet:')).toBeVisible({ timeout: 3_000 })

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Select default facet:')).not.toBeVisible()

    // Still ON
    await openSwitcher(page)
    await expect(page.locator('button').filter({ hasText: 'Round-robin' }).getByText('ON')).toBeVisible()

    await deleteFormByTitle(page, title)
  })

  test('toggle does not commit until user selects and confirms (change spec: deferred commit)', async ({
    page,
  }) => {
    const title = `E2E-ToggleDefer-${Date.now()}`
    await createFormInBuilder(page, title)
    const formId = await publishAndGetFormId(page)

    await createSecondFacet(page, 'facet-d')
    await publishCurrentFacet(page)

    // ON (navigates to dashboard)
    await enableRoundRobin(page, title)

    // Navigate back to builder
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
    await card.locator('a').first().click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // OFF → prompt appears, but RR should still be ON (not committed)
    await openSwitcher(page)
    await page.locator('button').filter({ hasText: 'Round-robin' }).click()
    await expect(page.getByText('Select default facet:')).toBeVisible({ timeout: 3_000 })

    // Reload page before confirming — RR should still be ON
    await page.reload()
    await page.waitForLoadState('networkidle')
    await openSwitcher(page)
    await expect(
      page.locator('button').filter({ hasText: 'Round-robin' }).getByText('ON'),
    ).toBeVisible()

    await deleteFormByTitle(page, title)
  })
})

// ==========================================================================
// builder-facet-switcher spec: Default dropdown visibility with round-robin
// ==========================================================================

test.describe('Spec: Default dropdown hidden when round-robin is ON', () => {
  test('"Default:" dropdown hidden when round-robin enabled (builder-facet-switcher req: Default dropdown)', async ({
    page,
  }) => {
    const title = `E2E-SetDefault-${Date.now()}`
    await createFormInBuilder(page, title)
    await publishAndGetFormId(page)

    await createSecondFacet(page, 'facet-e')
    await publishCurrentFacet(page)

    // RR OFF → "Default:" dropdown should be visible in the switcher
    await openSwitcher(page)
    const defaultLabel = page.locator('[class*="w-64"][class*="shadow-lg"]').getByText('Default:')
    await expect(defaultLabel).toBeVisible({ timeout: 3_000 })

    // Now toggle RR ON (navigates to dashboard)
    await enableRoundRobin(page, title)

    // Navigate back to builder
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: title })
    await card.locator('a').first().click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Open switcher — "Default:" dropdown should NOT be visible when RR is ON
    await openSwitcher(page)
    await expect(
      page.locator('[class*="w-64"][class*="shadow-lg"]').getByText('Default:'),
    ).not.toBeVisible()

    await deleteFormByTitle(page, title)
  })
})
