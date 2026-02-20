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
 * Creates a project with optional initial files and navigates to its detail page.
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
 * Uploads files via the upload modal. Optionally handles conflict resolution.
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

  // Click upload - triggers conflict check first
  await page.getByRole('button', { name: 'Upload Files' }).click()

  if (expectConflicts && resolutionLabels) {
    await expect(page.getByText('File Conflicts Detected')).toBeVisible({ timeout: 10000 })

    for (const label of resolutionLabels) {
      await page.getByText(label).click()
    }

    await page.getByRole('button', { name: 'Upload with Resolutions' }).click()
  }

  // Wait for modal to close (upload complete)
  await expect(modal).not.toBeVisible({ timeout: 15000 })
}

test.describe('File Upload and Conflict Resolution', () => {
  test('should upload a new file to an existing project', async ({ page }) => {
    const projectName = `Upload New File ${Date.now()}`
    await createProjectAndNavigate(page, projectName)

    const stlFile = createTestFile('new-model.stl', 'solid newmodel\nfacet normal 0.0 0.0 1.0\nendsolid')
    await uploadFiles(page, [stlFile])

    await expect(page.getByText(/upload completed/i).first()).toBeVisible({ timeout: 5000 })

    // Reload to see updated file list
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('new-model.stl')).toBeVisible()
  })

  test('should upload an existing file with overwrite resolution (file count stays the same)', async ({ page }) => {
    const initialFile = createTestFile('overwrite-target.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')
    const projectName = `Overwrite Test ${Date.now()}`
    await createProjectAndNavigate(page, projectName, [initialFile])

    // Verify initial file is present
    await expect(page.getByText('overwrite-target.stl').first()).toBeVisible()

    // Get initial file count from stats
    const initialTotalFiles = page.getByText('Total Files').locator('..').locator('p').last()
    const initialCount = await initialTotalFiles.textContent()

    // Upload same filename with different content -> overwrite
    const conflictFile = createTestFile('overwrite-target.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')
    await uploadFiles(page, [conflictFile], true, ['Overwrite existing file'])

    // Reload and verify file count stays the same (overwritten, not added)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('overwrite-target.stl')).toBeVisible()
    const afterTotalFiles = page.getByText('Total Files').locator('..').locator('p').last()
    const afterCount = await afterTotalFiles.textContent()
    expect(afterCount).toBe(initialCount)
  })

  test('should upload an existing file with skip resolution (no file uploaded)', async ({ page }) => {
    const initialFile = createTestFile('skip-target.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')
    const projectName = `Skip Test ${Date.now()}`
    await createProjectAndNavigate(page, projectName, [initialFile])

    await expect(page.getByText('skip-target.stl').first()).toBeVisible()

    const initialTotalFiles = page.getByText('Total Files').locator('..').locator('p').last()
    const initialCount = await initialTotalFiles.textContent()

    // Upload same filename -> skip
    const conflictFile = createTestFile('skip-target.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')
    await uploadFiles(page, [conflictFile], true, ['Skip this file'])

    // Reload and verify file count unchanged (file was skipped)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('skip-target.stl')).toBeVisible()
    const afterTotalFiles = page.getByText('Total Files').locator('..').locator('p').last()
    const afterCount = await afterTotalFiles.textContent()
    expect(afterCount).toBe(initialCount)
  })

  test('should upload an existing file with add_timestamp resolution (one new file added)', async ({ page }) => {
    const initialFile = createTestFile('rename-target.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')
    const projectName = `Rename Test ${Date.now()}`
    await createProjectAndNavigate(page, projectName, [initialFile])

    await expect(page.getByText('rename-target.stl').first()).toBeVisible()

    const initialTotalFiles = page.getByText('Total Files').locator('..').locator('p').last()
    const initialCount = Number(await initialTotalFiles.textContent())

    // Upload same filename -> save with timestamp (adds a new file)
    const conflictFile = createTestFile('rename-target.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')
    await uploadFiles(page, [conflictFile], true, ['Save with timestamp'])

    // Reload and verify file count increased by 1
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Original file should still be there
    await expect(page.getByText('rename-target.stl').first()).toBeVisible()

    const afterTotalFiles = page.getByText('Total Files').locator('..').locator('p').last()
    const afterCount = Number(await afterTotalFiles.textContent())
    expect(afterCount).toBe(initialCount + 1)
  })

  test.afterAll(() => {
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
    }
  })
})
