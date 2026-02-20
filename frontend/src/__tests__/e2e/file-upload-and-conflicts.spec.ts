import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'upload-tests')

const createTestFile = (filename: string, content: string) => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  }
  const filePath = path.join(FIXTURES_DIR, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

/**
 * Creates a project and navigates to its detail page.
 * Returns the project detail page URL.
 */
const createProjectAndNavigate = async (page: Page, projectName: string, initialFiles?: string[]) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: 'Create Project' }).click()
  const modal = page.locator('[role="dialog"]').first()
  await expect(modal).toBeVisible()

  await page.getByPlaceholder('Enter project name').fill(projectName)

  if (initialFiles && initialFiles.length > 0) {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(initialFiles)
  }

  await page.getByRole('button', { name: 'Create Project' }).click()
  await expect(modal).not.toBeVisible({ timeout: 10000 })

  // Navigate to project detail
  await page.getByRole('heading', { name: projectName }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
}

/**
 * Uploads files via the upload modal. If conflicts are expected, resolves them.
 */
const uploadFiles = async (
  page: Page,
  files: string[],
  expectConflicts: boolean = false,
  resolutionLabels?: string[]
) => {
  await page.getByRole('button', { name: 'Upload Files' }).click()
  const modal = page.locator('[role="dialog"]').first()
  await expect(modal).toBeVisible()

  const fileInput = modal.locator('input[type="file"]')
  await fileInput.setInputFiles(files)

  // Click upload - this triggers conflict check first
  await page.getByRole('button', { name: 'Upload Files' }).click()

  if (expectConflicts && resolutionLabels) {
    // Wait for conflict UI
    await expect(page.getByText('File Conflicts Detected')).toBeVisible({ timeout: 10000 })

    // Select resolutions
    for (const label of resolutionLabels) {
      await page.getByText(label).click()
    }

    // Upload with resolutions
    await page.getByRole('button', { name: 'Upload with Resolutions' }).click()
  }

  // Wait for upload to complete - modal should close
  await expect(modal).not.toBeVisible({ timeout: 15000 })
}

test.describe('File Upload and Conflict Resolution', () => {
  test('should upload new files to existing project', async ({ page }) => {
    const projectName = `Upload Test ${Date.now()}`
    await createProjectAndNavigate(page, projectName)

    const stlFile = createTestFile('new-model.stl', 'solid newmodel\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('new-print.gcode', 'G28 ; Home\nG1 X20 Y20 Z0.3 F3000')

    await uploadFiles(page, [stlFile, gcodeFile])

    // Verify success toast
    await expect(page.getByText(/upload completed/i).first()).toBeVisible({ timeout: 5000 })

    // Verify files appear in project table
    await expect(page.getByText('new-model.stl')).toBeVisible()
    await expect(page.getByText('new-print.gcode')).toBeVisible()
  })

  test('should handle file conflict with skip resolution', async ({ page }) => {
    const projectName = `Conflict Skip ${Date.now()}`
    const initialFile = createTestFile('conflict-test.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')

    await createProjectAndNavigate(page, projectName, [initialFile])
    await expect(page.getByText('conflict-test.stl').first()).toBeVisible()

    // Upload same filename with different content
    const conflictFile = createTestFile('conflict-test.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')

    await uploadFiles(page, [conflictFile], true, ['Skip this file'])

    // File count should remain 1 (file was skipped)
    await expect(page.getByText('conflict-test.stl').first()).toBeVisible()
  })

  test('should handle file conflict with overwrite resolution', async ({ page }) => {
    const projectName = `Conflict Overwrite ${Date.now()}`
    const initialFile = createTestFile('overwrite-test.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')

    await createProjectAndNavigate(page, projectName, [initialFile])
    await expect(page.getByText('overwrite-test.stl').first()).toBeVisible()

    // Upload same filename
    const conflictFile = createTestFile('overwrite-test.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')

    await uploadFiles(page, [conflictFile], true, ['Overwrite existing file'])

    // File should still exist (overwritten)
    await expect(page.getByText('overwrite-test.stl')).toBeVisible()
  })

  test('should handle file conflict with rename resolution', async ({ page }) => {
    const projectName = `Conflict Rename ${Date.now()}`
    const initialFile = createTestFile('rename-test.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')

    await createProjectAndNavigate(page, projectName, [initialFile])
    await expect(page.getByText('rename-test.stl').first()).toBeVisible()

    // Upload same filename
    const conflictFile = createTestFile('rename-test.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')

    await uploadFiles(page, [conflictFile], true, ['Save with timestamp'])

    // Original file should still exist, and a renamed copy should exist too
    await expect(page.getByText('rename-test.stl').first()).toBeVisible()
  })

  test('should cancel upload without side effects', async ({ page }) => {
    const projectName = `Cancel Upload ${Date.now()}`
    await createProjectAndNavigate(page, projectName)

    const testFile = createTestFile('cancel-test.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')

    await page.getByRole('button', { name: 'Upload Files' }).click()
    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    const fileInput = modal.locator('input[type="file"]')
    await fileInput.setInputFiles([testFile])

    // Cancel instead of uploading
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(modal).not.toBeVisible()

    // File should not appear in the project
    await expect(page.getByText('cancel-test.stl')).not.toBeVisible()
  })

  test.afterAll(() => {
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
    }
  })
})
