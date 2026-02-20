import { test, expect } from '@playwright/test'

test.describe('Project Details Page', () => {
  let projectName: string
  let projectUrl: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    projectName = `Details Test ${Date.now()}`

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Create a project to test against
    await page.getByRole('button', { name: 'Create Project' }).click()
    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Navigate to the created project
    await page.getByRole('heading', { name: projectName }).click()
    await page.waitForLoadState('networkidle')

    projectUrl = page.url()
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(projectUrl)
    await page.waitForLoadState('networkidle')
  })

  test('should display project name and status badge', async ({ page }) => {
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
    await expect(page.locator('.chakra-badge').first()).toBeVisible()
  })

  test('should display project path', async ({ page }) => {
    await expect(page.getByText('Project Path')).toBeVisible()
  })

  test('should display project statistics', async ({ page }) => {
    await expect(page.getByText('Total Files')).toBeVisible()
    await expect(page.getByText('Total Size')).toBeVisible()
    await expect(page.getByText('Last Scanned')).toBeVisible()
  })

  test('should display files tab with table', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Files' })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText('Type', { exact: true })).toBeVisible()
    await expect(page.getByText('Size', { exact: true })).toBeVisible()
  })

  test('should have action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Download Project' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload Files' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sync Project' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to Projects' })).toBeVisible()
  })

  test('should navigate back to homepage', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Projects' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL('/')
    await expect(page.getByText('3DShelf')).toBeVisible()
  })

  test('should sync project', async ({ page }) => {
    const syncButton = page.getByRole('button', { name: 'Sync Project' })
    await syncButton.click()

    await expect(page.getByText('Syncing...')).toBeVisible()
    await expect(syncButton).toBeEnabled({ timeout: 15000 })
  })

  test('should open and close upload modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload Files' }).click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(page.getByText('Upload Files')).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(modal).not.toBeVisible()
  })

  test('should handle non-existent project gracefully', async ({ page }) => {
    await page.goto('/projects/99999')
    await page.waitForLoadState('networkidle')

    const hasError = await page.getByText(/failed to load|error|not found/i).first().isVisible()
    expect(hasError).toBeTruthy()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(projectUrl)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
  })
})
