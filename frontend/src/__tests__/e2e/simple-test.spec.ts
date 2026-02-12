import { test, expect } from '@playwright/test'

test.describe('Simple E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('3DShelf')).toBeVisible()
  })

  test('should create project without files', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for modal
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Fill project details
    const projectName = `Simple Test ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)

    // Submit form - don't wait for API response, just click
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for modal to close (indicates success)
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Wait for success toast or project to appear in list
    const successToast = page.getByText(/project created|created successfully/i)
    await expect(successToast.first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to homepage', async ({ page }) => {
    await expect(page.getByText('3DShelf')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible()
  })
})