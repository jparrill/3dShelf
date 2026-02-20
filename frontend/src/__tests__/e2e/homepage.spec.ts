import { test, expect } from '@playwright/test'

test.describe('3DShelf Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display the header with title, search, and action buttons', async ({ page }) => {
    await expect(page.getByText('3DShelf')).toBeVisible()
    await expect(page.getByPlaceholder('Search projects...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Scan Projects' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible()
  })

  test('should load and display projects or empty state', async ({ page }) => {
    const hasProjectCards = await page.locator('.chakra-card').first().isVisible()
    const hasEmptyState = await page.getByText(/no projects/i).isVisible()

    expect(hasProjectCards || hasEmptyState).toBeTruthy()
  })

  test('should perform search and clear it', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search projects...')

    await searchInput.fill('test')
    await searchInput.press('Enter')
    await page.waitForLoadState('networkidle')

    await expect(searchInput).toHaveValue('test')

    await searchInput.clear()
    await searchInput.press('Enter')
    await page.waitForLoadState('networkidle')

    await expect(searchInput).toHaveValue('')
  })

  test('should scan projects and show feedback', async ({ page }) => {
    const scanButton = page.getByRole('button', { name: 'Scan Projects' })
    await scanButton.click()

    // Should show scanning loading state
    await expect(page.getByText('Scanning...')).toBeVisible()

    // Wait for scan to complete
    await expect(scanButton).toBeEnabled({ timeout: 15000 })

    // Should show a toast with scan results
    const toast = page.getByText(/scan completed|scan failed/i)
    await expect(toast.first()).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to project detail when clicking a project card', async ({ page }) => {
    const projectCard = page.locator('.chakra-card').first()

    if (await projectCard.isVisible()) {
      await projectCard.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/projects\/\d+/)
    } else {
      test.skip(true, 'No projects available')
    }
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('/api/projects', route => route.abort())
    await page.goto('/')
    await page.waitForTimeout(2000)

    const hasError = await page.getByText(/failed to load|error/i).first().isVisible()
    const noCards = (await page.locator('.chakra-card').count()) === 0

    expect(hasError || noCards).toBeTruthy()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('3DShelf')).toBeVisible()
    await expect(page.getByPlaceholder('Search projects...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Scan Projects' })).toBeVisible()
  })

  test('should clear search state after page reload', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search projects...')
    await searchInput.fill('test search')
    await searchInput.press('Enter')
    await page.waitForLoadState('networkidle')

    await expect(searchInput).toHaveValue('test search')

    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(searchInput).toHaveValue('')
  })
})
