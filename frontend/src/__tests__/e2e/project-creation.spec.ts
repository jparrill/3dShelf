import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'creation-tests')

const createTestFile = (filename: string, content: string) => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  }
  const filePath = path.join(FIXTURES_DIR, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

test.describe('Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('3DShelf')).toBeVisible()
  })

  test('should create a project without files', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    const projectName = `No Files Project ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('Project without any files')

    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    await expect(page.getByText(/project created|created successfully/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
    await expect(page.getByText('0 files').first()).toBeVisible()
  })

  test('should create a project with a single file', async ({ page }) => {
    const stlFile = createTestFile('single-model.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')

    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    const projectName = `Single File Project ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile])

    await expect(page.getByText('single-model.stl').first()).toBeVisible()

    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    await expect(page.getByText(/project created|created successfully/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
    await expect(page.getByText('1 file').first()).toBeVisible()
  })

  test('should create a project with multiple files', async ({ page }) => {
    const stlFile = createTestFile('model.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('print.gcode', 'G28 ; Home all axes\nG1 X10 Y10 Z0.3 F3000')
    const readmeFile = createTestFile('README.md', '# Test Project\nMultiple files project.')

    await page.getByRole('button', { name: 'Create Project' }).click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    const projectName = `Multi File Project ${Date.now()}`
    await page.getByPlaceholder('Enter project name').fill(projectName)
    await page.getByPlaceholder('Enter project description (optional)').fill('Project with multiple files')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([stlFile, gcodeFile, readmeFile])

    // Verify all files listed in modal
    await expect(page.getByText('model.stl').first()).toBeVisible()
    await expect(page.getByText('print.gcode').first()).toBeVisible()
    await expect(page.getByText('README.md', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    await expect(page.getByText(/project created|created successfully/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
    await expect(page.getByText('3 files').first()).toBeVisible()

    // Navigate to project detail and verify files are in the table
    await page.getByRole('heading', { name: projectName }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('model.stl')).toBeVisible()
    await expect(page.getByText('print.gcode')).toBeVisible()
    await expect(page.getByText('README.md')).toBeVisible()
  })

  test.afterAll(() => {
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
    }
  })
})
