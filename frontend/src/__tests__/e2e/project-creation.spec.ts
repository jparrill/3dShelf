import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Helper to create test files
const createTestFile = (filename: string, content: string) => {
  const testFilesDir = path.join(__dirname, '..', 'fixtures')
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true })
  }
  const filePath = path.join(testFilesDir, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

// Helper to wait for API response
const waitForProjectCreation = async (page: Page) => {
  const responsePromise = page.waitForResponse(response =>
    response.url().includes('/api/projects') &&
    response.request().method() === 'POST' &&
    response.status() === 200
  )
  return responsePromise
}

test.describe('Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the header to be visible (contains 3DShelf heading)
    await expect(page.getByText('3DShelf')).toBeVisible()
  })

  test('should create project without files successfully', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for modal to open (contains "Create New Project" header)
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(page.getByText('Create New Project')).toBeVisible()

    // Fill in project details
    const projectName = `Test Project ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('A test project created without initial files')

    // Submit the form
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Verify success notification (toast message)
    await expect(page.getByText(/project created/i).first()).toBeVisible({ timeout: 10000 })

    // Verify project appears in the list (use role=heading to be more specific)
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify project card shows no files
    await expect(page.getByText('0 files')).toBeVisible()
  })

  test('should create project with files successfully', async ({ page }) => {
    // Create test files
    const stlFile = createTestFile('test-model.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('test.gcode', 'G28 ; Home all axes\nG1 X10 Y10 Z0.3 F3000')
    const readmeFile = createTestFile('README.md', '# Test Project\nThis is a test project with initial files.')

    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(page.getByText('Create New Project')).toBeVisible()

    // Fill in project details
    const projectName = `Test Project With Files ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('A test project created with initial files')

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile, readmeFile])

    // Verify files are listed
    await expect(page.getByText('test-model.stl').first()).toBeVisible()
    await expect(page.getByText('test.gcode').first()).toBeVisible()
    await expect(page.getByText('README.md', { exact: true })).toBeVisible()

    // Setup response waiting
    const responsePromise = waitForProjectCreation(page)

    // Submit the form
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for the API response
    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Wait for modal to close
    await expect(modal).not.toBeVisible()

    // Verify success notification
    await expect(page.getByText(/project created successfully/i)).toBeVisible()

    // Verify project appears in the list (use role=heading to be more specific)
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify project card shows file count
    await expect(page.getByText('3 files')).toBeVisible()

    // Click on project card to view details
    const projectCard = page.locator('[role="button"]').filter({ hasText: projectName }).first()
    await projectCard.click()

    // Verify we're on the project detail page
    await expect(page.getByText(projectName)).toBeVisible()
    await expect(page.getByText(/project files/i)).toBeVisible()

    // Verify all uploaded files are listed
    await expect(page.getByText('test-model.stl').first()).toBeVisible()
    await expect(page.getByText('test.gcode').first()).toBeVisible()
    await expect(page.getByText('README.md', { exact: true })).toBeVisible()
  })

  test('should validate required fields in project creation', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Try to submit without name
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Should show validation error in toast
    await expect(page.getByText('Project name is required').first()).toBeVisible()

    // Fill name with spaces only
    await page.getByPlaceholder('Enter project name').fill('   ')
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Should still show validation error
    await expect(page.getByText('Project name is required').first()).toBeVisible()

    // Fill valid name
    await page.getByPlaceholder('Enter project name').fill('Valid Project Name')

    // Description should be optional - submit should work
    const responsePromise = waitForProjectCreation(page)
    await page.getByRole('button', { name: 'Create Project' }).click()

    const response = await responsePromise
    expect(response.status()).toBe(200)

    await expect(modal).not.toBeVisible()
  })

  test('should handle file selection and removal in project creation', async ({ page }) => {
    // Create test files
    const stlFile = createTestFile('remove-test.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('keep-test.gcode', 'G28 ; Home all axes')

    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Fill project name
    await page.getByPlaceholder('Enter project name').fill(`File Test Project ${Date.now()}`)

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile])

    // Verify files are listed
    await expect(page.getByText('remove-test.stl')).toBeVisible()
    await expect(page.getByText('keep-test.gcode')).toBeVisible()

    // Remove one file (click any X button)
    await page.locator('button').filter({ has: page.locator('svg') }).first().click()

    // Verify file is removed from list
    await expect(page.getByText('remove-test.stl')).not.toBeVisible()
    await expect(page.getByText('keep-test.gcode')).toBeVisible()

    // Submit with remaining file
    const responsePromise = waitForProjectCreation(page)
    await page.getByRole('button', { name: 'Create Project' }).click()

    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Verify success
    await expect(modal).not.toBeVisible()
    await expect(page.getByText(/project created successfully/i)).toBeVisible()
  })

  test('should handle modal cancel functionality', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Fill some data
    await page.getByPlaceholder('Enter project name').fill('Test Project')
    await page.getByPlaceholder('Enter project description (optional)').fill('Test description')

    // Cancel the modal
    await page.getByRole('button', { name: /cancel/i }).click()

    // Verify modal is closed
    await expect(modal).not.toBeVisible()

    // Verify no project was created - we should still be on homepage
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible()
  })

  test('should handle file upload errors gracefully', async ({ page }) => {
    // Create a very large file to potentially trigger upload errors
    const largeContent = 'A'.repeat(1024 * 1024) // 1MB of 'A's
    const largeFile = createTestFile('large-test.stl', largeContent)

    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Fill project details
    await page.getByPlaceholder('Enter project name').fill(`Large File Project ${Date.now()}`)

    // Upload large file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([largeFile])

    // Submit form
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for either success or error response
    await page.waitForResponse(response =>
      response.url().includes('/api/projects') &&
      response.request().method() === 'POST'
    )

    // The test should handle both success and failure gracefully
    // If it succeeds, modal should close
    // If it fails, error message should be shown
    await Promise.race([
      expect(modal).not.toBeVisible(), // Success case
      expect(page.getByText(/error/i)).toBeVisible() // Error case
    ])
  })

  test.afterAll(() => {
    // Clean up test files
    const testFilesDir = path.join(__dirname, '..', 'fixtures')
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true })
    }
  })
})