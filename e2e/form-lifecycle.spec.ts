import { test, expect } from '@playwright/test'

/** Navigate to dashboard and wait for hydration */
async function gotoDashboard(page: import('@playwright/test').Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

/** Stable locator for the inline title input in the builder toolbar */
function titleInput(page: import('@playwright/test').Page) {
  return page.locator('input.font-semibold')
}

test.describe('Form lifecycle', () => {
  test('create form → edit title → delete form', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    const input = titleInput(page)
    await input.fill('Lifecycle Test Form')
    await input.blur()
    await page.waitForTimeout(500)

    await gotoDashboard(page)
    await expect(page.getByText('Lifecycle Test Form')).toBeVisible()

    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'Lifecycle Test Form' })
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()

    await expect(page.getByText(/all its facets and response data/)).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Lifecycle Test Form')).not.toBeVisible()
  })
})

test.describe('Facet lifecycle', () => {
  test('publish → unpublish → archive → re-activate', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await gotoDashboard(page)

    // Scope interactions to the first form card
    const card = page.locator('[class*="overflow-hidden flex flex-col"]').first()

    // === draft → active (Publish) ===
    await card.getByLabel(/Actions for/).first().click()
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await page.waitForTimeout(500)

    // === active → draft (Unpublish) ===
    await card.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Unpublish')).toBeVisible()
    await page.getByText('Unpublish').click()
    await page.waitForTimeout(500)

    // === back to draft, publish again for archive test ===
    await card.getByLabel(/Actions for/).first().click()
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await page.waitForTimeout(500)

    // === active → archived (Archive with confirmation) ===
    await card.getByLabel(/Actions for/).first().click()
    await page.getByRole('button', { name: 'Archive', exact: true }).click()

    // Confirm dialog should appear
    await expect(page.getByText('Archive facet')).toBeVisible()
    await page.getByRole('button', { name: 'Archive' }).last().click()
    await page.waitForTimeout(500)

    // === archived → active (Re-activate) ===
    await card.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Re-activate')).toBeVisible()
    await page.getByText('Re-activate').click()
    await page.waitForTimeout(500)

    // Should be active again
    await card.getByLabel(/Actions for/).first().click()
    await expect(page.getByText('Unpublish')).toBeVisible()

    // Cleanup
    await page.keyboard.press('Escape')
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })

  test('delete default facet auto-promotes oldest remaining', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Create a second facet
    await page.locator(`button:has-text("default")`).first().click()
    await expect(page.getByText('Create facet')).toBeVisible()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('variant-a')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })

    await gotoDashboard(page)

    // Find the card with both "default" and "variant-a" chips
    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'variant-a' })
      .first()
    await expect(card.getByText('(default)').first()).toBeVisible()

    // Delete the "default" facet
    await card.getByLabel('Actions for default').click()
    await page.getByText('Delete facet').click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(500)

    // "variant-a" should now be promoted to default
    await expect(card.getByText('(default)').first()).toBeVisible()
    await expect(card.getByText('variant-a')).toBeVisible()

    // Cleanup
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })

  test('delete last facet deletes the entire form', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Give it a unique title to track
    const input = titleInput(page)
    await input.fill('Delete-Last-Facet-Test')
    await input.blur()
    await page.waitForTimeout(500)

    await gotoDashboard(page)
    await expect(page.getByText('Delete-Last-Facet-Test')).toBeVisible()

    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'Delete-Last-Facet-Test' })
    await card.getByLabel(/Actions for/).click()
    await page.getByText('Delete facet').click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Delete-Last-Facet-Test')).not.toBeVisible()
  })
})

test.describe('Round-robin toggle', () => {
  test('toggling OFF prompts for default facet selection', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Give it a unique title for targeting
    const titleEl = titleInput(page)
    await titleEl.fill('RR-Toggle-Test')
    await titleEl.blur()
    await page.waitForTimeout(500)

    // Create second facet
    await page.locator(`button:has-text("default")`).first().click()
    await expect(page.getByText('Create facet')).toBeVisible()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('second')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })

    await gotoDashboard(page)

    // Target the specific card
    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'RR-Toggle-Test' })

    // Toggle ON first — use click() for controlled React checkbox
    const toggle = card.getByRole('checkbox', { name: 'Round-robin' })
    await toggle.click()
    await page.waitForTimeout(500)

    // Now toggle OFF — should show prompt
    await toggle.click()
    await expect(card.getByText('Select default facet:')).toBeVisible()

    // Select a facet
    const selector = card.locator('select').last()
    await selector.selectOption({ index: 1 })
    await page.waitForTimeout(500)

    // Prompt should disappear
    await expect(card.getByText('Select default facet:')).not.toBeVisible()

    // Cleanup
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })

  test('cancel dismisses prompt and keeps round-robin ON', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    const titleEl = titleInput(page)
    await titleEl.fill('RR-Cancel-Test')
    await titleEl.blur()
    await page.waitForTimeout(500)

    // Create second facet
    await page.locator('button:has-text("default")').first().click()
    await expect(page.getByText('Create facet')).toBeVisible()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('second')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })

    await gotoDashboard(page)

    const card = page.locator('[class*="overflow-hidden flex flex-col"]')
      .filter({ hasText: 'RR-Cancel-Test' })
      .first()

    // Toggle ON
    const toggle = card.getByRole('checkbox', { name: 'Round-robin' })
    await toggle.click()
    await page.waitForTimeout(500)

    // Toggle OFF → prompt appears
    await toggle.click()
    await expect(card.getByText('Select default facet:')).toBeVisible()

    // Click Cancel
    await card.getByRole('button', { name: 'Cancel' }).click()

    // Prompt disappears, round-robin stays ON
    await expect(card.getByText('Select default facet:')).not.toBeVisible()
    await expect(toggle).toBeChecked()

    // Cleanup
    await card.getByLabel('Form actions').click()
    await page.getByText('Delete form').click()
    await page.getByRole('button', { name: 'Delete' }).click()
  })
})

test.describe('Dashboard search', () => {
  test('filters forms by title (case-insensitive)', async ({ page }) => {
    await gotoDashboard(page)
    await page.getByRole('button', { name: 'New Form' }).click()
    await expect(page).toHaveURL(/\/build\//, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    const input = titleInput(page)
    await input.fill('Searchable Unique Title')
    await input.blur()
    await page.waitForTimeout(500)

    await gotoDashboard(page)

    const searchInput = page.getByPlaceholder('Search forms...')
    await searchInput.fill('searchable')
    await page.waitForTimeout(1000)

    await expect(page.getByText('Searchable Unique Title')).toBeVisible()

    await searchInput.fill('nonexistent-xyz-123')
    await page.waitForTimeout(1000)
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
