import { test, expect } from '@playwright/test'

/**
 * End-to-end lifecycle tests covering full form/facet CRUD flows
 * as described in the spec scenarios.
 */

test.describe('Form lifecycle', () => {
  test('create form → edit title → delete form', async ({ page }) => {
    // === Scenario: New Form creation ===
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 10_000 })

    // === Scenario: Title update ===
    const titleInput = page.locator('input[value="Untitled Form"]')
    await titleInput.fill('Lifecycle Test Form')
    await titleInput.blur()
    await page.waitForTimeout(500)

    // Verify on dashboard
    await page.goto('/dashboard')
    await expect(page.getByText('Lifecycle Test Form')).toBeVisible()

    // === Scenario: Form deletion ===
    // Open form-level menu on the card
    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'Lifecycle Test Form' })
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()

    // Confirm dialog
    await expect(page.getByText(/all its facets and response data/)).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).click()

    // Form should be gone
    await page.waitForTimeout(500)
    await expect(page.getByText('Lifecycle Test Form')).not.toBeVisible()
  })
})

test.describe('Facet lifecycle', () => {
  test('publish → unpublish → archive → re-activate', async ({ page }) => {
    // Create a form
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//)

    // Go back to dashboard to use chip menus
    await page.goto('/dashboard')

    // === draft → active (Publish) ===
    await page.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Publish')).toBeVisible()
    await page.getByText('Publish').click()
    await page.waitForTimeout(500)

    // === active → draft (Unpublish) ===
    await page.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Unpublish')).toBeVisible()
    await expect(page.getByText('Archive')).toBeVisible()
    await page.getByText('Unpublish').click()
    await page.waitForTimeout(500)

    // === back to draft, publish again for archive test ===
    await page.getByLabel(/Actions for/).first().click()
    await page.getByText('Publish').click()
    await page.waitForTimeout(500)

    // === active → archived (Archive with confirmation) ===
    await page.getByLabel(/Actions for/).first().click()
    await page.getByText('Archive').click()

    // Confirm dialog should appear
    await expect(page.getByText('Archive facet')).toBeVisible()
    await page.getByRole('button', { name: 'Archive' }).click()
    await page.waitForTimeout(500)

    // === archived → active (Re-activate) ===
    await page.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Re-activate')).toBeVisible()
    await page.getByText('Re-activate').click()
    await page.waitForTimeout(500)

    // Should be active again — Unpublish should be available
    await page.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Unpublish')).toBeVisible()

    // Cleanup: delete the form
    await page.keyboard.press('Escape')
    await page.getByLabel('Form actions').first().click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })

  test('delete default facet auto-promotes oldest remaining', async ({ page }) => {
    // Create a form
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//)

    // Create a second facet via the switcher
    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('variant-a')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    // Go to dashboard
    await page.goto('/dashboard')

    // There should be two facet chips: "default" (is_default) and "variant-a"
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').first()
    await expect(card.getByText('(default)')).toBeVisible()

    // Delete the "default" facet
    const defaultChipMenu = page.getByLabel('Actions for default')
    await defaultChipMenu.click()
    await page.getByText('Delete facet').click()

    // Confirm
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(500)

    // "variant-a" should now be promoted to default
    await expect(page.getByText('(default)')).toBeVisible()
    await expect(page.getByText('variant-a')).toBeVisible()

    // Cleanup
    await page.getByLabel('Form actions').first().click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })

  test('delete last facet deletes the entire form', async ({ page }) => {
    // Create a form
    await page.goto('/dashboard')
    const formCountBefore = await page.locator('[class*="overflow-hidden flex flex-col"]').count()

    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//)
    await page.goto('/dashboard')

    // Verify one more card
    const formCountAfter = await page.locator('[class*="overflow-hidden flex flex-col"]').count()
    expect(formCountAfter).toBe(formCountBefore + 1)

    // Delete the only facet
    const lastCard = page.locator('[class*="overflow-hidden flex flex-col"]').first()
    await lastCard.getByLabel(/Actions for/).click()
    await page.getByText('Delete facet').click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(500)

    // Form should be gone too
    const formCountFinal = await page.locator('[class*="overflow-hidden flex flex-col"]').count()
    expect(formCountFinal).toBe(formCountBefore)
  })
})

test.describe('Round-robin toggle', () => {
  test('toggling OFF prompts for default facet selection', async ({ page }) => {
    // Create a form with 2 facets
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//)

    // Create second facet
    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('second')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    await page.goto('/dashboard')

    // Toggle ON first
    const toggle = page.getByText('Round-robin').locator('..').locator('input[type="checkbox"]')
    await toggle.check()
    await page.waitForTimeout(500)

    // Now toggle OFF — should show prompt
    await toggle.uncheck()
    await expect(page.getByText('Select default facet:')).toBeVisible()

    // Select a facet
    const selector = page.getByText('Select default facet:').locator('..').locator('select')
    await selector.selectOption({ index: 1 })
    await page.waitForTimeout(500)

    // Prompt should disappear
    await expect(page.getByText('Select default facet:')).not.toBeVisible()

    // Cleanup
    await page.getByLabel('Form actions').first().click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })
})

test.describe('Dashboard search', () => {
  test('filters forms by title (case-insensitive)', async ({ page }) => {
    // Create a form with a unique title
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//)

    const titleInput = page.locator('input[value="Untitled Form"]')
    await titleInput.fill('Searchable Unique Title')
    await titleInput.blur()
    await page.waitForTimeout(500)

    await page.goto('/dashboard')

    // Search for it
    const searchInput = page.getByPlaceholder('Search forms...')
    await searchInput.fill('searchable')
    await page.waitForTimeout(500)

    await expect(page.getByText('Searchable Unique Title')).toBeVisible()

    // Search for something else
    await searchInput.fill('nonexistent-xyz-123')
    await page.waitForTimeout(500)
    await expect(page.getByText('Searchable Unique Title')).not.toBeVisible()

    // Cleanup
    await searchInput.clear()
    await page.waitForTimeout(500)
    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'Searchable Unique Title' })
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })
})
