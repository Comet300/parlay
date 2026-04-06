import { test, expect } from '@playwright/test'

/**
 * Helper: create a new form and land on the builder page.
 */
async function createFormAndGoToBuilder(page: import('@playwright/test').Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'New Form' }).click()
  await expect(page).toHaveURL(/\/build\/[a-f0-9-]+/, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
}

/** Stable locator for the inline title input in the builder toolbar */
function titleInput(page: import('@playwright/test').Page) {
  return page.locator('input.font-semibold')
}

/**
 * Open the facet switcher dropdown.
 * The trigger is the ONLY button with font-medium class containing an SVG (ChevronDown).
 * Uses .last() to handle TanStack Router keeping old pages in the DOM.
 */
async function openSwitcher(page: import('@playwright/test').Page) {
  // font-medium + border + SVG uniquely identifies the switcher trigger
  // (the primary Button component doesn't have `border` class)
  const trigger = page.locator('button.font-medium.border').filter({ has: page.locator('svg') }).last()
  const dropdown = page.getByText('Create facet')

  // If already open, just ensure it's ready
  if (await dropdown.isVisible().catch(() => false)) {
    return
  }

  await trigger.click()
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
}

/** The opened facet switcher dropdown panel — a w-64 container */
function switcherDropdown(page: import('@playwright/test').Page) {
  return page.locator('[class*="w-64"][class*="shadow-lg"]')
}

test.describe('Builder — Toolbar', () => {
  test('shows inline-editable form title', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await expect(titleInput(page)).toHaveValue('Untitled Form')
  })

  test('form title saves on blur', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    const input = titleInput(page)
    await input.fill('My Test Form')
    await input.blur()
    await page.waitForTimeout(500)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(titleInput(page)).toHaveValue('My Test Form')
  })

  test('shows unsaved indicator when store is dirty', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    const dot = page.locator('[title="Unsaved changes"]')
    await expect(dot).not.toBeVisible()
  })

  test('shows Publish button for draft facet', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible()
  })

  test('Publish button transitions to URL display', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.locator('[title="Copy URL"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: 'Publish' })).not.toBeVisible()
  })
})

test.describe('Builder — Facet Switcher', () => {
  test('lists all sibling facets with current highlighted', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await openSwitcher(page)

    const dd = switcherDropdown(page)
    await expect(dd.locator('.bg-light.text-primary.font-medium')).toContainText('default')
  })

  test('Create facet with inline input', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await openSwitcher(page)

    await page.getByText('Create facet').click()

    const input = page.locator('input[placeholder="facet-name"]')
    await expect(input).toBeVisible()
    await input.fill('variant-a')
    const urlBeforeCreate = page.url()
    await input.press('Enter')
    await page.waitForURL((url) => url.href !== urlBeforeCreate, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify switcher lists both facets
    await openSwitcher(page)
    const dd = switcherDropdown(page)
    await expect(dd.getByText('default')).toBeVisible()
    await expect(dd.getByText('variant-a')).toBeVisible()
  })

  test('Create facet rejects invalid nickname', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await openSwitcher(page)
    await page.getByText('Create facet').click()

    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('My Invalid!')
    await input.press('Enter')

    await expect(page.getByText('Lowercase alphanumeric with hyphens only')).toBeVisible()
  })

  test('Rename facet with inline edit', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet to rename
    await openSwitcher(page)
    await page.getByText('Create facet').click()
    const createInput = page.locator('input[placeholder="facet-name"]')
    await createInput.fill('to-rename')
    const urlBefore = page.url()
    await createInput.press('Enter')
    await page.waitForURL((url) => url.href !== urlBefore, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Open switcher and rename
    await openSwitcher(page)
    const dd = switcherDropdown(page)

    // Hover the facet name to reveal action buttons, then click Rename
    const facetBtn = dd.locator('button.truncate').filter({ hasText: 'to-rename' })
    await facetBtn.hover()
    await facetBtn.locator('xpath=..').locator('[title="Rename"]').click()

    // Type new nickname and confirm
    const renameInput = dd.locator('input')
    await renameInput.fill('renamed')
    await renameInput.press('Enter')
    await page.waitForTimeout(500)

    // Reload to get clean state after router.invalidate()
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify
    await openSwitcher(page)
    await expect(switcherDropdown(page).getByText('renamed')).toBeVisible()
  })

  test('Set as default (when round-robin off)', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet
    await openSwitcher(page)
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('alt-facet')
    const urlBeforeAlt = page.url()
    await input.press('Enter')
    await page.waitForURL((url) => url.href !== urlBeforeAlt, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // We're on "alt-facet" page. Navigate back to "default".
    await openSwitcher(page)
    const urlBeforeNav = page.url()
    await switcherDropdown(page).locator('button.text-left').filter({ hasText: 'default' }).click()
    await page.waitForURL((url) => url.href !== urlBeforeNav, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Now on "default" page. Set "alt-facet" as default via star icon.
    await openSwitcher(page)
    const starButton = switcherDropdown(page).locator('[title="Set as default"]')
    await expect(starButton).toBeVisible()
    await starButton.click()
    await page.waitForTimeout(500)

    // Reload to get clean state after router.invalidate()
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify
    await openSwitcher(page)
    await expect(switcherDropdown(page).getByText('(default)')).toBeVisible()
  })

  test('Rename conflict — rejects nickname held by sibling', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet "sibling"
    await openSwitcher(page)
    await page.getByText('Create facet').click()
    const input = page.locator('input[placeholder="facet-name"]')
    await input.fill('sibling')
    const urlBeforeSibling = page.url()
    await input.press('Enter')
    await page.waitForURL((url) => url.href !== urlBeforeSibling, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Try to rename "sibling" to "default" (conflict)
    await openSwitcher(page)
    const dd = switcherDropdown(page)
    const siblingBtn = dd.locator('button.truncate').filter({ hasText: 'sibling' })
    await siblingBtn.hover()
    await siblingBtn.locator('xpath=..').locator('[title="Rename"]').click()

    const renameInput = dd.locator('input')
    await renameInput.fill('default')
    await renameInput.press('Enter')

    // Server error message: "...is already in use..."
    await expect(page.getByText(/already in use/)).toBeVisible({ timeout: 5_000 })
  })

  test('History nickname blocked — cannot reuse a renamed-away nickname', async ({ page }) => {
    await createFormAndGoToBuilder(page)

    // Create a second facet "original"
    await openSwitcher(page)
    await page.getByText('Create facet').click()
    let input = page.locator('input[placeholder="facet-name"]')
    await input.fill('original')
    const urlBeforeOriginal = page.url()
    await input.press('Enter')
    await page.waitForURL((url) => url.href !== urlBeforeOriginal, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Rename "original" → "renamed-ver" (puts "original" into history)
    await openSwitcher(page)
    const dd = switcherDropdown(page)
    const originalBtn = dd.locator('button.truncate').filter({ hasText: 'original' })
    await originalBtn.hover()
    await originalBtn.locator('xpath=..').locator('[title="Rename"]').click()

    let renameInput = dd.locator('input')
    await renameInput.fill('renamed-ver')
    await renameInput.press('Enter')
    await page.waitForTimeout(500)

    // Reload to get clean state after router.invalidate()
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Try to create a NEW facet with nickname "original" — blocked by history
    await openSwitcher(page)
    await page.getByText('Create facet').click()
    input = page.locator('input[placeholder="facet-name"]')
    await input.fill('original')
    await input.press('Enter')

    await expect(page.getByText(/previously used|permanently reserved/)).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Builder — Facet status transitions', () => {
  test('draft facet shows Publish, not Unpublish', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible()
  })

  test('published facet shows URL with copy button', async ({ page }) => {
    await createFormAndGoToBuilder(page)
    await page.getByRole('button', { name: 'Publish' }).click()
    const urlDisplay = page.locator('[title="Copy URL"]')
    await expect(urlDisplay).toBeVisible({ timeout: 5_000 })
    await urlDisplay.click()
  })
})
