import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'download-tests')

const createTestFile = (filename: string, content: string) => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  }
  const filePath = path.join(FIXTURES_DIR, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

/**
 * Creates a project with files and navigates to its detail page.
 * Returns the project name used for later assertions.
 */
const createProjectWithFilesAndNavigate = async (
  page: Page,
  projectName: string,
  files: string[]
) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: 'Create Project' }).click()
  const modal = page.locator('[role="dialog"]').first()
  await expect(modal).toBeVisible()

  await page.getByPlaceholder('Enter project name').fill(projectName)

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(files)

  await page.getByRole('button', { name: 'Create Project' }).click()
  await expect(modal).not.toBeVisible({ timeout: 10000 })

  // Navigate to project detail
  await page.getByRole('heading', { name: projectName }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
}

test.describe('File and Project Downloads', () => {
  let projectName: string

  test.beforeAll(async ({ browser }) => {
    // Create a project with files to use for all download tests
    const stlFile = createTestFile('download-model.stl', 'solid download\nfacet normal 0.0 0.0 1.0\nendsolid')
    const gcodeFile = createTestFile('download-print.gcode', 'G28 ; Home\nG1 X10 Y10 Z0.3 F3000')

    projectName = `Download Test ${Date.now()}`

    const page = await browser.newPage()
    await createProjectWithFilesAndNavigate(page, projectName, [stlFile, gcodeFile])
    await page.close()
  })

  test('should download a single file with the correct filename', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('heading', { name: projectName }).click()
    await page.waitForLoadState('networkidle')

    // Verify the file row is visible
    await expect(page.getByText('download-model.stl')).toBeVisible()

    // The frontend uses fetch() to call /api/projects/:id/files/:fileId/download,
    // then creates a blob URL and triggers a download via a hidden <a> element.
    // We intercept the backend API response to verify the Content-Disposition filename.
    const downloadResponsePromise = page.waitForResponse(
      response => response.url().includes('/download') && response.url().includes('/files/')
    )

    // Click the download button for the first file in the table row containing 'download-model.stl'
    const fileRow = page.locator('tr').filter({ hasText: 'download-model.stl' })
    await fileRow.getByLabel('Download file').click()

    const downloadResponse = await downloadResponsePromise
    expect(downloadResponse.status()).toBe(200)

    // Verify Content-Disposition header has the correct filename
    const contentDisposition = downloadResponse.headers()['content-disposition']
    expect(contentDisposition).toContain('download-model.stl')
  })

  test('should download a second file with its own correct filename', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('heading', { name: projectName }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('download-print.gcode')).toBeVisible()

    const downloadResponsePromise = page.waitForResponse(
      response => response.url().includes('/download') && response.url().includes('/files/')
    )

    const fileRow = page.locator('tr').filter({ hasText: 'download-print.gcode' })
    await fileRow.getByLabel('Download file').click()

    const downloadResponse = await downloadResponsePromise
    expect(downloadResponse.status()).toBe(200)

    const contentDisposition = downloadResponse.headers()['content-disposition']
    expect(contentDisposition).toContain('download-print.gcode')
  })

  test('should download the entire project as a ZIP with correct filename', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('heading', { name: projectName }).click()
    await page.waitForLoadState('networkidle')

    // The backend creates the ZIP filename from the project name replacing spaces with underscores:
    // e.g. "Download Test 1234" -> "Download_Test_1234.zip"
    const expectedZipName = projectName.replace(/ /g, '_') + '.zip'

    const downloadResponsePromise = page.waitForResponse(
      response => response.url().includes('/download') && !response.url().includes('/files/')
    )

    await page.getByRole('button', { name: 'Download Project' }).click()

    const downloadResponse = await downloadResponsePromise
    expect(downloadResponse.status()).toBe(200)

    const contentDisposition = downloadResponse.headers()['content-disposition']
    expect(contentDisposition).toContain(expectedZipName)

    // Verify Content-Type is application/zip
    const contentType = downloadResponse.headers()['content-type']
    expect(contentType).toContain('application/zip')
  })

  test.afterAll(() => {
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
    }
  })
})
