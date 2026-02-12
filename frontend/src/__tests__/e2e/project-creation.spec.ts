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
    await expect(page.getByTestId('header')).toBeVisible()
  })

  test('should create project without files successfully', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: /create project/i }).click()

    // Wait for modal to open
    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    // Fill in project details
    const projectName = `Test Project ${Date.now()}`
    await page.getByPlaceholder(/project name/i).fill(projectName)
    await page.getByPlaceholder(/project description/i).fill('A test project created without initial files')

    // Setup response waiting before clicking submit
    const responsePromise = waitForProjectCreation(page)

    // Submit the form
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

    // Wait for the API response
    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Wait for modal to close
    await expect(modal).not.toBeVisible()

    // Verify success notification
    await expect(page.getByText(/project created successfully/i)).toBeVisible()

    // Verify project appears in the list
    await expect(page.getByText(projectName)).toBeVisible()

    // Verify project card shows no files
    const projectCard = page.locator('[data-testid*="project-card"]').filter({ hasText: projectName })
    await expect(projectCard.getByText('0 files')).toBeVisible()
  })

  test('should create project with files successfully', async ({ page }) => {
    // Create test files
    const stlFile = createTestFile('test-model.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('test.gcode', 'G28 ; Home all axes\nG1 X10 Y10 Z0.3 F3000')
    const readmeFile = createTestFile('README.md', '# Test Project\nThis is a test project with initial files.')

    // Click Create Project button
    await page.getByRole('button', { name: /create project/i }).click()

    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    // Fill in project details
    const projectName = `Test Project With Files ${Date.now()}`
    await page.getByPlaceholder(/project name/i).fill(projectName)
    await page.getByPlaceholder(/project description/i).fill('A test project created with initial files')

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile, readmeFile])

    // Verify files are listed
    await expect(page.getByText('test-model.stl')).toBeVisible()
    await expect(page.getByText('test.gcode')).toBeVisible()
    await expect(page.getByText('README.md')).toBeVisible()

    // Setup response waiting
    const responsePromise = waitForProjectCreation(page)

    // Submit the form
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

    // Wait for the API response
    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Wait for modal to close
    await expect(modal).not.toBeVisible()

    // Verify success notification
    await expect(page.getByText(/project created successfully/i)).toBeVisible()

    // Verify project appears in the list
    await expect(page.getByText(projectName)).toBeVisible()

    // Verify project card shows file count
    const projectCard = page.locator('[data-testid*="project-card"]').filter({ hasText: projectName })
    await expect(projectCard.getByText('3 files')).toBeVisible()

    // Click on project to view details
    await projectCard.click()

    // Verify we're on the project detail page
    await expect(page.getByText(projectName)).toBeVisible()
    await expect(page.getByText(/project files/i)).toBeVisible()

    // Verify all uploaded files are listed
    await expect(page.getByText('test-model.stl')).toBeVisible()
    await expect(page.getByText('test.gcode')).toBeVisible()
    await expect(page.getByText('README.md')).toBeVisible()
  })

  test('should validate required fields in project creation', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: /create project/i }).click()

    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    // Try to submit without name
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

    // Should show validation error
    await expect(page.getByText(/project name is required/i)).toBeVisible()

    // Fill name with spaces only
    await page.getByPlaceholder(/project name/i).fill('   ')
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

    // Should still show validation error
    await expect(page.getByText(/project name is required/i)).toBeVisible()

    // Fill valid name
    await page.getByPlaceholder(/project name/i).fill('Valid Project Name')

    // Description should be optional - submit should work
    const responsePromise = waitForProjectCreation(page)
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

    const response = await responsePromise
    expect(response.status()).toBe(200)

    await expect(modal).not.toBeVisible()
  })

  test('should handle file selection and removal in project creation', async ({ page }) => {
    // Create test files
    const stlFile = createTestFile('remove-test.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('keep-test.gcode', 'G28 ; Home all axes')

    // Click Create Project button
    await page.getByRole('button', { name: /create project/i }).click()

    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    // Fill project name
    await page.getByPlaceholder(/project name/i).fill(`File Test Project ${Date.now()}`)

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile])

    // Verify files are listed
    await expect(page.getByText('remove-test.stl')).toBeVisible()
    await expect(page.getByText('keep-test.gcode')).toBeVisible()

    // Remove one file
    await page.getByTestId('remove-file-remove-test.stl').click()

    // Verify file is removed from list
    await expect(page.getByText('remove-test.stl')).not.toBeVisible()
    await expect(page.getByText('keep-test.gcode')).toBeVisible()

    // Submit with remaining file
    const responsePromise = waitForProjectCreation(page)
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Verify success
    await expect(modal).not.toBeVisible()
    await expect(page.getByText(/project created successfully/i)).toBeVisible()
  })

  test('should handle modal cancel functionality', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: /create project/i }).click()

    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    // Fill some data
    await page.getByPlaceholder(/project name/i).fill('Test Project')
    await page.getByPlaceholder(/project description/i).fill('Test description')

    // Cancel the modal
    await page.getByRole('button', { name: /cancel/i }).click()

    // Verify modal is closed
    await expect(modal).not.toBeVisible()

    // Verify no project was created - we should still be on homepage
    await expect(page.getByRole('button', { name: /create project/i })).toBeVisible()
  })

  test('should handle file upload errors gracefully', async ({ page }) => {
    // Create a very large file to potentially trigger upload errors
    const largeContent = 'A'.repeat(1024 * 1024) // 1MB of 'A's
    const largeFile = createTestFile('large-test.stl', largeContent)

    // Click Create Project button
    await page.getByRole('button', { name: /create project/i }).click()

    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    // Fill project details
    await page.getByPlaceholder(/project name/i).fill(`Large File Project ${Date.now()}`)

    // Upload large file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([largeFile])

    // Submit form
    await page.getByRole('button', { name: /create project/i }).nth(1).click()

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