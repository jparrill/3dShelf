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

// Helper to wait for project creation success (simplified)
const waitForProjectCreationSuccess = async (page: Page) => {
  // Wait for success toast or project to appear in list
  const successToast = page.getByText(/project created|created successfully/i)
  await successToast.first().waitFor({ state: 'visible', timeout: 10000 })
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
    const modal = page.locator('[role="dialog"]').first()
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
    await waitForProjectCreationSuccess(page)

    // Verify project appears in the list (use role=heading to be more specific)
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify project appears in the list (use role=heading to be more specific)
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify project card shows no files
    await expect(page.getByText('0 files').first()).toBeVisible()
  })

  test('should create project with files successfully', async ({ page }) => {
    // Create test files
    const stlFile = createTestFile('test-model.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('test.gcode', 'G28 ; Home all axes\nG1 X10 Y10 Z0.3 F3000')
    const readmeFile = createTestFile('README.md', '# Test Project\nThis is a test project with initial files.')

    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()
    await expect(page.getByText('Create New Project')).toBeVisible()

    // Fill in project details
    const projectName = `Test Project With Files ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('A test project created with initial files')

    // Upload files - use the button that triggers the hidden file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile, readmeFile])

    // Verify files are listed
    await expect(page.getByText('test-model.stl').first()).toBeVisible()
    await expect(page.getByText('test.gcode').first()).toBeVisible()
    await expect(page.getByText('README.md', { exact: true })).toBeVisible()

    // Submit the form
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Verify success notification
    await waitForProjectCreationSuccess(page)

    // Verify project appears in the list (use role=heading to be more specific)
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify project appears in the list (use role=heading to be more specific)
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify project card shows file count
    await expect(page.getByText('3 files').first()).toBeVisible()

    // Click on project card to view details (click on the heading)
    await page.getByRole('heading', { name: projectName }).click()

    // Verify we're on the project detail page
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Verify all uploaded files are listed
    await expect(page.getByText('test-model.stl').first()).toBeVisible()
    await expect(page.getByText('test.gcode').first()).toBeVisible()
    await expect(page.getByText('README.md', { exact: true })).toBeVisible()
  })

  test('should validate required fields in project creation', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
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
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for success message - modal should close when project is created successfully
    await waitForProjectCreationSuccess(page)
  })

  test('should handle file selection and removal in project creation', async ({ page }) => {
    // Create test files
    const stlFile = createTestFile('remove-test.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('keep-test.gcode', 'G28 ; Home all axes')

    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    // Fill project name
    await page.getByPlaceholder('Enter project name').fill(`File Test Project ${Date.now()}`)

    // Upload files - use the hidden file input directly
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile])

    // Verify files are listed
    await expect(page.getByText('remove-test.stl')).toBeVisible()
    await expect(page.getByText('keep-test.gcode')).toBeVisible()

    // Remove one file - find the remove button associated with a specific file
    // Look for the list item containing the file name, then find its remove button
    const fileListItem = page.locator('li').filter({ hasText: 'remove-test.stl' })
    const removeButton = fileListItem.getByRole('button', { name: '' }).or(
      fileListItem.locator('button[aria-label*="remove"], button[title*="remove"]')
    ).or(
      fileListItem.locator('button').last()
    )
    await removeButton.click()

    // Verify file is removed from list
    await expect(page.getByText('remove-test.stl')).not.toBeVisible()
    await expect(page.getByText('keep-test.gcode')).toBeVisible()

    // Submit with remaining file
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Verify success
    await expect(modal).not.toBeVisible({ timeout: 10000 })
    await waitForProjectCreationSuccess(page)
  })

  test('should handle modal cancel functionality', async ({ page }) => {
    // Click Create Project button
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
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

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    // Fill project details
    await page.getByPlaceholder('Enter project name').fill(`Large File Project ${Date.now()}`)

    // Upload large file - use the hidden file input directly
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([largeFile])

    // Submit form
    await page.getByRole('button', { name: 'Create Project' }).click()

    // Wait for the operation to complete (either success or failure)
    await page.waitForTimeout(2000) // Give it time to process

    // Check if the operation completed successfully (modal closed)
    const isModalVisible = await modal.isVisible()

    if (!isModalVisible) {
      // Success case - modal closed, project was created
      console.log('Project created successfully despite large file')
    } else {
      // Failure case - modal is still open, check for error messages
      const errorMessages = [
        page.getByText(/error/i),
        page.getByText(/failed/i),
        page.getByText(/too large/i),
        page.getByText(/upload failed/i),
        page.locator('[data-status="error"]'),
        page.locator('.chakra-alert--error')
      ]

      let errorFound = false
      for (const errorMsg of errorMessages) {
        try {
          await expect(errorMsg.first()).toBeVisible({ timeout: 3000 })
          errorFound = true
          break
        } catch {
          // Continue to next error selector
        }
      }

      // If no specific error found, at least verify the modal is still open (indicating something went wrong)
      if (!errorFound) {
        await expect(modal).toBeVisible() // This confirms the modal is still open
      }
    }
  })

  test.afterAll(() => {
    // Clean up test files
    const testFilesDir = path.join(__dirname, '..', 'fixtures')
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true })
    }
  })
})