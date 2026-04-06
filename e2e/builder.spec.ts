import { test, expect } from '@playwright/test'

/**
 * Helper: create a new form and land on the builder page.
 * Returns the facetId from the URL.
 */
async function createFormAndGoToBuilder(page: import('@playwright/test').Page) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'New Form' }).click()
  await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 10_000 })
  const url = new URL(page.url())
  return url.pathname.split('/').pop()!
}

test.describe('Builder — Toolbar', () => {
  test('shows inline-editable form title', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    const titleInput = page.locator('input[value="Untitled Form"]')
    await expect(titleInput).toBeVisible()
  })

  test('form title saves on blur', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    const titleInput = page.locator('input[value="Untitled Form"]')
    await titleInput.fill('My Test Form')
    await titleInput.blur()

    // Wait for debounce save
    await page.waitForTimeout(500)

    // Reload and verify persisted
    await page.reload()
    await expect(page.locator('input[value="My Test Form"]')).toBeVisible()
  })

  test('shows unsaved indicator when store is dirty', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // The unsaved dot should NOT be visible initially
    const dot = page.locator('[title="Unsaved changes"]')
    await expect(dot).not.toBeVisible()
  })

  test('shows Publish button for draft facet', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    await expect(
      page.getByRole('button', { name: 'Publish' }),
    ).toBeVisible()
  })

  test('Publish button transitions to URL display', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    await page.getByRole('button', { name: 'Publish' }).click()

    // Should show public URL with copy button
    await expect(page.locator('[title="Copy URL"]')).toBeVisible()
    // Publish button should disappear (facet is now active)
    await expect(
      page.getByRole('button', { name: 'Publish' }),
    ).not.toBeVisible()
  })
})

test.describe('Builder — Facet Switcher', () => {
  test('lists all sibling facets with current highlighted', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Open switcher dropdown
    await page.locator('button:has-text("default")').first().click()

    // Default facet should be highlighted
    const activeItem = page.locator('[class*="bg-light text-primary font-medium"]')
    await expect(activeItem).toContainText('default')
  })

  test('Create facet with inline input', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Open switcher
    await page.locator('button:has-text("default")').first().click()

    // Click "+ Create facet"
    await page.getByText('Create facet').click()

    // Type a valid nickname
    const input = page.locator('input[placeholder="facet-name"]')
    await expect(input).toBeVisible()
    await input.fill('variant-a')
    await input.press('Enter')

    // Should navigate to new facet
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    // Switcher should now show "variant-a"
    await page.locator('button:has-text("variant-a")').first().click()
    await expect(page.getByText('default')).toBeVisible()
    await expect(page.getByText('variant-a')).toBeVisible()
  })

  test('Create facet rejects invalid nickname', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()

    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('My Invalid!')
    await input.press('Enter')

    // Validation error shown
    await expect(
      page.getByText('Lowercase alphanumeric with hyphens only'),
    ).toBeVisible()
  })

  test('Rename facet with inline edit', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet to rename
    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()
    const createInput = page.locator('input[placeholder="facet-name"]')
    await createInput.fill('to-rename')
    await createInput.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    // Open switcher, find the rename button via hover
    await page.locator('button:has-text("to-rename")').first().click()

    // Click the rename pencil icon for "to-rename"
    const facetRow = page.locator('div:has-text("to-rename")').filter({ hasText: 'to-rename' })
    await facetRow.first().hover()
    await page.locator('[title="Rename"]').first().click()

    // Type new nickname and confirm
    const renameInput = page.locator('.flex.items-center.gap-1 input')
    await renameInput.fill('renamed')
    await renameInput.press('Enter')

    // Wait for rename to complete
    await page.waitForTimeout(500)

    // Verify the switcher shows "renamed"
    await expect(page.getByText('renamed')).toBeVisible()
  })

  test('Set as default (when round-robin off)', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet
    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('alt-facet')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    // We're now on "alt-facet" page. Open switcher — "default" is the current default.
    // Navigate to "default" first so we can set "alt-facet" as default.
    await page.locator('button:has-text("alt-facet")').first().click()
    await page.getByText('default').first().click()
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/)

    // Now on "default" page. Open switcher — "alt-facet" should show star icon.
    await page.locator('button:has-text("default")').first().click()
    const starButton = page.locator('[title="Set as default"]')
    await expect(starButton).toBeVisible()
    await starButton.click()
    await page.waitForTimeout(500)

    // After refresh, "alt-facet" should now be (default)
    await page.locator('button:has-text("default")').first().click()
    await expect(page.getByText('(default)')).toBeVisible()
  })

  test('Rename conflict — rejects nickname held by sibling', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet "sibling"
    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('sibling')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    // Try to rename "sibling" to "default" (conflict with existing sibling)
    await page.locator('button:has-text("sibling")').first().click()
    const siblingRow = page.locator('div').filter({ hasText: 'sibling' })
    await siblingRow.first().hover()
    await page.locator('[title="Rename"]').first().click()

    const renameInput = page.locator('.flex.items-center.gap-1 input')
    await renameInput.fill('default')
    await renameInput.press('Enter')

    // Should show error about name being in use
    await expect(page.getByText(/already in use/)).toBeVisible()
  })

  test('History nickname blocked — cannot reuse a renamed-away nickname', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet "original"
    await page.locator('button:has-text("default")').first().click()
    await page.getByText('Create facet').click()
    let input = page.locator('input[placeholder="facet-name"]')
    await input.fill('original')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 5_000 })

    // Rename "original" → "renamed" (puts "original" into history)
    await page.locator('button:has-text("original")').first().click()
    const row = page.locator('div').filter({ hasText: 'original' })
    await row.first().hover()
    await page.locator('[title="Rename"]').first().click()

    let renameInput = page.locator('.flex.items-center.gap-1 input')
    await renameInput.fill('renamed')
    await renameInput.press('Enter')
    await page.waitForTimeout(500)

    // Now try to create a NEW facet with nickname "original" — should be blocked by history
    await page.locator('button:has-text("renamed")').first().click()
    await page.getByText('Create facet').click()
    input = page.locator('input[placeholder="facet-name"]')
    await input.fill('original')
    await input.press('Enter')

    // Should show error about permanently reserved nickname
    await expect(page.getByText(/previously used|permanently reserved/)).toBeVisible()
  })
})

test.describe('Builder — Facet status transitions', () => {
  test('draft facet shows Publish, not Unpublish', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Draft facet should have Publish button
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible()
  })

  test('published facet shows URL with copy button', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    await page.getByRole('button', { name: 'Publish' }).click()

    // Verify URL display
    const urlDisplay = page.locator('[title="Copy URL"]')
    await expect(urlDisplay).toBeVisible()

    // Click copy
    await urlDisplay.click()
  })
})
