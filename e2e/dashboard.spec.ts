import { test, expect } from '@playwright/test'

/** Navigate to dashboard and wait for hydration */
async function gotoDashboard(page: import('@playwright/test').Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

/** Ensure at least one form card exists on the dashboard */
async function ensureFormExists(page: import('@playwright/test').Page) {
  await gotoDashboard(page)
  const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
  if ((await cards.count()) === 0) {
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await gotoDashboard(page)
  }
}

/** Create a fresh form and return to dashboard */
async function createFormViaDashboard(page: import('@playwright/test').Page) {
  await gotoDashboard(page)
  await page.getByRole('button', { name: 'New Form' }).click()
  await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
  await gotoDashboard(page)
}

test.describe('Dashboard', () => {
  test.describe('New Form creation', () => {
    test('creates a form and redirects to builder', async ({ page }) => {
      await gotoDashboard(page)
      await page.getByRole('button', { name: 'New Form' }).click()
      await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })
    })
  })

  test.describe('Empty state', () => {
    test('shows CTA when user has no forms', async ({ page }) => {
      await gotoDashboard(page)
      const cta = page.getByRole('button', { name: 'Create your first form' })
      if (await cta.isVisible()) {
        await cta.click()
        await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })
      }
    })
  })

  test.describe('Form card', () => {
    test('displays form title, facet chips, and thumbnail', async ({ page }) => {
      await ensureFormExists(page)

      const firstCard = page.locator('[class*="overflow-hidden flex flex-col"]').first()
      await expect(firstCard.locator('img')).toBeVisible()
      await expect(firstCard.getByText('Draft')).toBeVisible()
    })

    test('title links to builder with default facet', async ({ page }) => {
      await ensureFormExists(page)

      const firstCard = page.locator('[class*="overflow-hidden flex flex-col"]').first()
      await firstCard.locator('a').first().click()
      await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/)
    })
  })

  test.describe('Search', () => {
    test('filters forms by title with debounce', async ({ page }) => {
      await ensureFormExists(page)

      const searchInput = page.getByPlaceholder('Search forms...')
      await searchInput.fill('nonexistent-form-xyz')
      await page.waitForTimeout(1000)

      const noMatchText = page.getByText('No forms match your filters.')
      const noFormsText = page.getByText('No forms yet')
      await expect(noMatchText.or(noFormsText)).toBeVisible({ timeout: 5_000 })
    })
  })

  test.describe('Status filter buttons', () => {
    test('shows filter buttons with active indicator', async ({ page }) => {
      await gotoDashboard(page)

      await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Active' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Draft' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Archived' })).toBeVisible()

      const allBtn = page.getByRole('button', { name: 'All', exact: true })
      await expect(allBtn).toHaveClass(/text-primary/)
    })
  })

  test.describe('Sort dropdown', () => {
    test('has all four sort options', async ({ page }) => {
      await gotoDashboard(page)

      // Target the sort select in the toolbar (not facet-default selects in cards)
      const toolbar = page.locator('.flex.flex-col.sm\\:flex-row.gap-3')
      const select = toolbar.locator('select')
      const options = select.locator('option')

      await expect(options).toHaveCount(4)
      await expect(options.nth(0)).toHaveText('Newest first')
      await expect(options.nth(1)).toHaveText('Oldest first')
      await expect(options.nth(2)).toHaveText('Last updated')
      await expect(options.nth(3)).toHaveText('Alphabetical (A-Z)')
    })

    test('alphabetical sort orders forms by title', async ({ page }) => {
      // Create two forms with known titles
      await gotoDashboard(page)
      await page.getByRole('button', { name: 'New Form' }).click()
      await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
      await page.waitForLoadState('networkidle')
      await page.locator('input.font-semibold').fill('Zeta Sort Test')
      await page.locator('input.font-semibold').blur()
      await page.waitForTimeout(500)

      await gotoDashboard(page)
      await page.getByRole('button', { name: 'New Form' }).click()
      await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
      await page.waitForLoadState('networkidle')
      await page.locator('input.font-semibold').fill('Alpha Sort Test')
      await page.locator('input.font-semibold').blur()
      await page.waitForTimeout(500)

      await gotoDashboard(page)

      // Filter to only test forms so pagination doesn't hide one
      const searchInput = page.getByPlaceholder('Search forms...')
      await searchInput.fill('Sort Test')
      await page.waitForTimeout(1000)

      // Select Alphabetical (A-Z)
      const toolbar = page.locator('.flex.flex-col.sm\\:flex-row.gap-3')
      await toolbar.locator('select').selectOption('title')
      await page.waitForTimeout(1000)

      // Get all card titles in order (title is the a.font-semibold link)
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      const titles: string[] = []
      for (let i = 0; i < await cards.count(); i++) {
        const title = await cards.nth(i).locator('a.font-semibold').textContent()
        if (title) titles.push(title.trim())
      }

      // Find positions — Alpha must come before Zeta
      const alphaIdx = titles.findIndex((t) => t.includes('Alpha Sort Test'))
      const zetaIdx = titles.findIndex((t) => t.includes('Zeta Sort Test'))
      expect(alphaIdx).toBeGreaterThanOrEqual(0)
      expect(zetaIdx).toBeGreaterThanOrEqual(0)
      expect(alphaIdx).toBeLessThan(zetaIdx)

      // Cleanup — search is already filtered to "Sort Test"
      for (const name of ['Alpha Sort Test', 'Zeta Sort Test']) {
        const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: name })
        if (await card.isVisible().catch(() => false)) {
          await card.getByLabel('Form actions').click()
          await page.getByText('Delete form').click()
          await page.getByRole('button', { name: 'Delete' }).click()
          await page.waitForTimeout(500)
        }
      }
    })
  })

  test.describe('Form-level action menu', () => {
    test('Delete form shows confirmation dialog', async ({ page }) => {
      await ensureFormExists(page)

      await page.getByLabel('Form actions').first().click()
      await page.getByText('Delete form').click()

      await expect(page.getByText(/all its facets and response data/)).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
    })
  })

  test.describe('Pagination', () => {
    test('navigates between pages when forms exceed page size', async ({ page }) => {
      await gotoDashboard(page)

      // Create forms until pagination appears (page size = 12)
      const created: string[] = []
      while (!(await page.getByText(/Page \d+ of \d+/).isVisible().catch(() => false))) {
        const name = `Pagination-${Date.now()}-${created.length}`
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
        await page.waitForLoadState('networkidle')
        await page.locator('input.font-semibold').fill(name)
        await page.locator('input.font-semibold').blur()
        await page.waitForTimeout(300)
        created.push(name)
        await gotoDashboard(page)
      }

      // Pagination is visible — verify we're on page 1
      await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()

      // Locate pagination controls
      const paginationBar = page.getByText(/Page \d+ of \d+/).locator('..')
      const prevBtn = paginationBar.locator('button').first()
      const nextBtn = paginationBar.locator('button').last()

      // Prev should be disabled on page 1
      await expect(prevBtn).toBeDisabled()

      // Navigate to page 2
      await nextBtn.click()
      await page.waitForTimeout(1000)
      await expect(page.getByText(/Page 2 of \d+/)).toBeVisible()

      // Next may be disabled on last page, prev should be enabled
      await expect(prevBtn).toBeEnabled()

      // Navigate back to page 1
      await prevBtn.click()
      await page.waitForTimeout(1000)
      await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()

      // Cleanup created forms
      for (const name of created) {
        const searchInput = page.getByPlaceholder('Search forms...')
        await searchInput.fill(name)
        await page.waitForTimeout(500)
        const card = page.locator('[class*="overflow-hidden flex flex-col"]').filter({ hasText: name })
        if (await card.isVisible().catch(() => false)) {
          await card.getByLabel('Form actions').click()
          await page.getByText('Delete form').click()
          await page.getByRole('button', { name: 'Delete' }).click()
          await page.waitForTimeout(300)
        }
        await searchInput.clear()
        await page.waitForTimeout(300)
      }
    })
  })
})
