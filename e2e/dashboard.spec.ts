import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.describe('New Form creation', () => {
    test('creates a form and redirects to builder', async ({ page }) => {
      await page.goto('/dashboard')

      // Click "New Form"
      await page.getByRole('button', { name: 'New Form' }).click()

      // Should redirect to /build/{facetId}
      await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 10_000 })
    })
  })

  test.describe('Empty state', () => {
    test('shows CTA when user has no forms', async ({ page }) => {
      // This test assumes a clean user — skip if forms exist
      await page.goto('/dashboard')
      const cta = page.getByRole('button', { name: 'Create your first form' })
      // If CTA visible, verify it works
      if (await cta.isVisible()) {
        await cta.click()
        await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 10_000 })
      }
    })
  })

  test.describe('Form card', () => {
    test('displays form title, facet chips, and thumbnail', async ({ page }) => {
      await page.goto('/dashboard')

      // Create a form if none exist
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      if ((await cards.count()) === 0) {
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//)
        await page.goto('/dashboard')
      }

      // Verify card structure
      const firstCard = cards.first()
      await expect(firstCard.locator('img')).toBeVisible()
      await expect(firstCard.getByText('Untitled Form')).toBeVisible()

      // Default facet chip should exist
      await expect(firstCard.getByText('default')).toBeVisible()
    })

    test('shows Draft watermark when all facets are draft', async ({ page }) => {
      await page.goto('/dashboard')
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      if ((await cards.count()) === 0) {
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//)
        await page.goto('/dashboard')
      }

      // All-draft forms should show watermark
      await expect(page.getByText('Draft').first()).toBeVisible()
    })

    test('title links to builder with default facet', async ({ page }) => {
      await page.goto('/dashboard')
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      if ((await cards.count()) === 0) {
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//)
        await page.goto('/dashboard')
      }

      const titleLink = page.getByText('Untitled Form').first()
      await titleLink.click()
      await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/)
    })
  })

  test.describe('Search', () => {
    test('filters forms by title with debounce', async ({ page }) => {
      await page.goto('/dashboard')

      const searchInput = page.getByPlaceholder('Search forms...')
      await searchInput.fill('nonexistent-form-xyz')

      // Wait for debounce (300ms) + network
      await page.waitForTimeout(500)

      // Should show no results message
      await expect(
        page.getByText('No forms match your filters.'),
      ).toBeVisible()
    })
  })

  test.describe('Status filter buttons', () => {
    test('shows filter buttons with active indicator', async ({ page }) => {
      await page.goto('/dashboard')

      for (const label of ['All', 'Has Active', 'All Draft', 'Has Archived']) {
        await expect(page.getByRole('button', { name: label })).toBeVisible()
      }

      // "All" should be active by default
      const allBtn = page.getByRole('button', { name: 'All' })
      await expect(allBtn).toHaveClass(/text-primary/)
    })
  })

  test.describe('Sort dropdown', () => {
    test('has all four sort options', async ({ page }) => {
      await page.goto('/dashboard')

      const select = page.locator('select')
      const options = select.locator('option')

      await expect(options).toHaveCount(4)
      await expect(options.nth(0)).toHaveText('Last updated')
      await expect(options.nth(1)).toHaveText('Newest first')
      await expect(options.nth(2)).toHaveText('Oldest first')
      await expect(options.nth(3)).toHaveText('Alphabetical (A-Z)')
    })
  })

  test.describe('Facet chip action menu', () => {
    test('shows correct actions for draft facet', async ({ page }) => {
      await page.goto('/dashboard')
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      if ((await cards.count()) === 0) {
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//)
        await page.goto('/dashboard')
      }

      // Open facet chip action menu
      await page
        .getByLabel(/Actions for/)
        .first()
        .click()

      // Common actions
      await expect(page.getByText('Edit')).toBeVisible()
      await expect(page.getByText('View Live')).toBeVisible()
      await expect(page.getByText('Export CSV')).toBeVisible()
      await expect(page.getByText('Delete facet')).toBeVisible()

      // Draft-specific: Publish visible, Unpublish/Archive/Re-activate not
      await expect(page.getByText('Publish')).toBeVisible()
      await expect(page.getByText('Unpublish')).not.toBeVisible()
      await expect(page.getByText('Archive')).not.toBeVisible()
      await expect(page.getByText('Re-activate')).not.toBeVisible()
    })

    test('Export CSV is disabled', async ({ page }) => {
      await page.goto('/dashboard')
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      if ((await cards.count()) === 0) {
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//)
        await page.goto('/dashboard')
      }

      await page.getByLabel(/Actions for/).first().click()

      const csvBtn = page.getByRole('button', { name: 'Export CSV' })
      await expect(csvBtn).toBeDisabled()
    })

    test('View Live is disabled for archived facets', async ({ page }) => {
      // Create a form, publish then archive the facet
      await page.goto('/dashboard')
      await page.getByRole('button', { name: 'New Form' }).click()
      await expect(page).toHaveURL(/\/build\//)
      await page.goto('/dashboard')

      // Publish (draft → active)
      await page.getByLabel(/Actions for/).first().click()
      await page.getByText('Publish').click()
      await page.waitForTimeout(500)

      // Archive (active → archived)
      await page.getByLabel(/Actions for/).first().click()
      await page.getByText('Archive').click()
      await page.getByRole('button', { name: 'Archive' }).click()
      await page.waitForTimeout(500)

      // Open menu — View Live should be disabled
      await page.getByLabel(/Actions for/).first().click()
      const viewLiveBtn = page.getByRole('button', { name: 'View Live' })
      await expect(viewLiveBtn).toBeDisabled()

      // Cleanup
      await page.keyboard.press('Escape')
      await page.getByLabel('Form actions').first().click()
      await page.getByText('Delete form').click()
      await page.getByRole('button', { name: 'Delete' }).click()
    })

    test('Publish transitions draft to active', async ({ page }) => {
      // Create a fresh form
      await page.goto('/dashboard')
      await page.getByRole('button', { name: 'New Form' }).click()
      await expect(page).toHaveURL(/\/build\//)
      await page.goto('/dashboard')

      // Open chip menu and publish
      await page.getByLabel(/Actions for/).first().click()
      await page.getByText('Publish').click()

      // After refresh, chip should show active styling and menu should have Unpublish
      await page.waitForTimeout(500)
      await page.getByLabel(/Actions for/).first().click()
      await expect(page.getByText('Unpublish')).toBeVisible()
      await expect(page.getByText('Archive')).toBeVisible()
      await expect(page.getByText('Publish')).not.toBeVisible()
    })

    test('Archive shows confirmation dialog', async ({ page }) => {
      await page.goto('/dashboard')

      // Find an active facet (from previous test) or create one
      await page.getByLabel(/Actions for/).first().click()

      // If active, Archive should be visible
      const archiveBtn = page.getByText('Archive')
      if (await archiveBtn.isVisible()) {
        await archiveBtn.click()

        // Confirmation dialog
        await expect(page.getByText('Archive facet')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible()
        await page.getByRole('button', { name: 'Cancel' }).click()
      }
    })
  })

  test.describe('Form-level action menu', () => {
    test('Delete form shows confirmation dialog', async ({ page }) => {
      await page.goto('/dashboard')
      const cards = page.locator('[class*="overflow-hidden flex flex-col"]')
      if ((await cards.count()) === 0) {
        await page.getByRole('button', { name: 'New Form' }).click()
        await expect(page).toHaveURL(/\/build\//)
        await page.goto('/dashboard')
      }

      // Open form kebab menu
      await page.getByLabel('Form actions').first().click()
      await page.getByText('Delete form').click()

      // Confirmation
      await expect(page.getByText('Delete form')).toBeVisible()
      await expect(
        page.getByText(/all its facets and response data/),
      ).toBeVisible()

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()
    })
  })
})
