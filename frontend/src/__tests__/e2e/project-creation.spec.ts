import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const createTestFile = (filename: string, content: string) => {
  const testFilesDir = path.join(__dirname, '..', 'fixtures')
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true })
  }
  const filePath = path.join(testFilesDir, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

test.describe('Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('3DShelf')).toBeVisible()
  })

  test('should create project without files', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()
    await expect(page.getByText('Create New Project')).toBeVisible()

    const projectName = `Test Project ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('A test project without files')

    await page.getByRole('button', { name: 'Create Project' }).click()

    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Verify success toast
    await expect(page.getByText(/project created|created successfully/i).first()).toBeVisible({ timeout: 10000 })

    // Verify project appears in list
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
    await expect(page.getByText('0 files').first()).toBeVisible()
  })

  test('should create project with files', async ({ page }) => {
    const stlFile = createTestFile('test-model.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('test.gcode', 'G28 ; Home all axes\nG1 X10 Y10 Z0.3 F3000')
    const readmeFile = createTestFile('README.md', '# Test Project\nThis is a test project with initial files.')

    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    const projectName = `Project With Files ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('Project with initial files')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile, readmeFile])

    // Verify files are listed in the modal
    await expect(page.getByText('test-model.stl').first()).toBeVisible()
    await expect(page.getByText('test.gcode').first()).toBeVisible()
    await expect(page.getByText('README.md', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    await expect(page.getByText(/project created|created successfully/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
    await expect(page.getByText('3 files').first()).toBeVisible()
  })

  test('should validate required project name', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    // Try to submit without name
    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(page.getByText('Project name is required').first()).toBeVisible()

    // Try with whitespace only
    await page.getByPlaceholder('Enter project name').fill('   ')
    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(page.getByText('Project name is required').first()).toBeVisible()

    // Fill valid name - should work
    await page.getByPlaceholder('Enter project name').fill('Valid Project Name')
    await page.getByRole('button', { name: 'Create Project' }).click()

    await expect(modal).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/project created|created successfully/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('should cancel project creation without side effects', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    await page.getByPlaceholder('Enter project name').fill('Should Not Exist')
    await page.getByPlaceholder('Enter project description (optional)').fill('This project should not be created')

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(modal).not.toBeVisible()

    // Should still be on homepage, no new project created
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible()
    await expect(page.getByText('Should Not Exist')).not.toBeVisible()
  })

  test('should handle large file upload during creation', async ({ page }) => {
    const largeContent = 'A'.repeat(1024 * 1024) // 1MB
    const largeFile = createTestFile('large-test.stl', largeContent)

    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    await page.getByPlaceholder('Enter project name').fill(`Large File Project ${Date.now()}`)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([largeFile])

    await page.getByRole('button', { name: 'Create Project' }).click()

    // Should either succeed (modal closes) or show an error
    await page.waitForTimeout(5000)

    const modalClosed = !(await modal.isVisible())
    const hasError = await page.getByText(/error|failed|too large/i).first().isVisible()

    expect(modalClosed || hasError).toBeTruthy()
  })

  test.afterAll(() => {
    const testFilesDir = path.join(__dirname, '..', 'fixtures')
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true })
    }
  })
})
