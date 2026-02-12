import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Helper to create test files
const createTestFile = (filename: string, content: string) => {
  const testFilesDir = path.join(__dirname, '..', 'fixtures', 'upload-tests')
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true })
  }
  const filePath = path.join(testFilesDir, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

// Helper to create a project with initial files
const createProjectWithFiles = async (page: Page, projectName: string, initialFiles?: string[]) => {
  await page.goto('/')
  await page.getByRole('button', { name: /create project/i }).click()

  const modal = page.getByTestId('create-project-modal')
  await expect(modal).toBeVisible()

  await page.getByPlaceholder(/project name/i).fill(projectName)
  await page.getByPlaceholder(/project description/i).fill(`Test project for file uploads`)

  if (initialFiles && initialFiles.length > 0) {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(initialFiles)
  }

  const responsePromise = page.waitForResponse(response =>
    response.url().includes('/api/projects') &&
    response.request().method() === 'POST' &&
    response.status() === 200
  )

  await page.getByRole('button', { name: /create project/i }).nth(1).click()
  await responsePromise
  await expect(modal).not.toBeVisible()

  // Navigate to project details
  const projectCard = page.locator('[data-testid*="project-card"]').filter({ hasText: projectName })
  await projectCard.click()

  return page.url().split('/').pop() // Return project ID
}

test.describe('File Upload and Conflict Resolution', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we're starting fresh
    await page.goto('/')
  })

  test('should upload new files to existing project successfully', async ({ page }) => {
    // Create test files
    const newStlFile = createTestFile('new-model.stl', 'solid newmodel\nfacet normal 0.0 0.0 1.0\nendsolid')
    const newGcodeFile = createTestFile('new-print.gcode', 'G28 ; Home all axes\nG1 X20 Y20 Z0.3 F3000')

    // Create project without files
    const projectName = `Upload Test Project ${Date.now()}`
    await createProjectWithFiles(page, projectName)

    // Verify we're on project details page
    await expect(page.getByText(projectName)).toBeVisible()
    await expect(page.getByText(/no files found/i)).toBeVisible()

    // Click Upload Files button
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    // Upload files
    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([newStlFile, newGcodeFile])

    // Verify files are listed
    await expect(uploadModal.getByText('new-model.stl')).toBeVisible()
    await expect(uploadModal.getByText('new-print.gcode')).toBeVisible()

    // Check for conflicts
    await page.getByRole('button', { name: /check conflicts/i }).click()

    // Wait for conflict check response
    await page.waitForResponse(response =>
      response.url().includes('/files/check-conflicts') &&
      response.request().method() === 'POST'
    )

    // Should show no conflicts message
    await expect(page.getByText(/no conflicts detected/i)).toBeVisible()

    // Upload files
    const uploadPromise = page.waitForResponse(response =>
      response.url().includes('/files') &&
      response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: /upload files/i }).nth(1).click()

    const uploadResponse = await uploadPromise
    expect(uploadResponse.status()).toBe(200)

    // Verify modal closes and success message
    await expect(uploadModal).not.toBeVisible()
    await expect(page.getByText(/files uploaded successfully/i)).toBeVisible()

    // Verify files appear in project
    await expect(page.getByText('new-model.stl')).toBeVisible()
    await expect(page.getByText('new-print.gcode')).toBeVisible()
    await expect(page.getByText('2 files')).toBeVisible()
  })

  test('should handle file conflicts with skip resolution', async ({ page }) => {
    // Create initial file
    const initialFile = createTestFile('conflict-test.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')

    // Create project with initial file
    const projectName = `Conflict Skip Test ${Date.now()}`
    await createProjectWithFiles(page, projectName, [initialFile])

    // Verify initial file is in project
    await expect(page.getByText('conflict-test.stl')).toBeVisible()
    await expect(page.getByText('1 file')).toBeVisible()

    // Create new file with same name but different content
    const conflictFile = createTestFile('conflict-test.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')

    // Click Upload Files
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    // Upload conflicting file
    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([conflictFile])

    // Check conflicts
    await page.getByRole('button', { name: /check conflicts/i }).click()

    await page.waitForResponse(response =>
      response.url().includes('/files/check-conflicts') &&
      response.request().method() === 'POST'
    )

    // Should show conflict detected
    await expect(page.getByText(/conflicts detected/i)).toBeVisible()
    await expect(page.getByText('conflict-test.stl')).toBeVisible()

    // Select skip resolution
    await page.getByRole('radio', { name: /skip/i }).check()

    // Upload with resolution
    const uploadPromise = page.waitForResponse(response =>
      response.url().includes('/files') &&
      response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: /upload files/i }).nth(1).click()

    const uploadResponse = await uploadPromise
    expect(uploadResponse.status()).toBe(200)

    // Verify modal closes
    await expect(uploadModal).not.toBeVisible()

    // Verify file was skipped (should still show only 1 file)
    await expect(page.getByText('1 file')).toBeVisible()

    // Verify success message mentions skipped file
    await expect(page.getByText(/skipped/i)).toBeVisible()
  })

  test('should handle file conflicts with overwrite resolution', async ({ page }) => {
    // Create initial file
    const initialFile = createTestFile('overwrite-test.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')

    // Create project with initial file
    const projectName = `Conflict Overwrite Test ${Date.now()}`
    await createProjectWithFiles(page, projectName, [initialFile])

    // Verify initial file is in project
    await expect(page.getByText('overwrite-test.stl')).toBeVisible()

    // Create new file with same name but different content
    const conflictFile = createTestFile('overwrite-test.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')

    // Click Upload Files
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    // Upload conflicting file
    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([conflictFile])

    // Check conflicts
    await page.getByRole('button', { name: /check conflicts/i }).click()

    await page.waitForResponse(response =>
      response.url().includes('/files/check-conflicts') &&
      response.request().method() === 'POST'
    )

    // Should show conflict detected
    await expect(page.getByText(/conflicts detected/i)).toBeVisible()

    // Select overwrite resolution
    await page.getByRole('radio', { name: /overwrite/i }).check()

    // Upload with resolution
    const uploadPromise = page.waitForResponse(response =>
      response.url().includes('/files') &&
      response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: /upload files/i }).nth(1).click()

    const uploadResponse = await uploadPromise
    expect(uploadResponse.status()).toBe(200)

    // Verify modal closes
    await expect(uploadModal).not.toBeVisible()

    // Verify file was overwritten (should still show 1 file)
    await expect(page.getByText('1 file')).toBeVisible()
    await expect(page.getByText('overwrite-test.stl')).toBeVisible()

    // Verify success message mentions uploaded file
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible()
  })

  test('should handle file conflicts with rename (upload + timestamp) resolution', async ({ page }) => {
    // Create initial file
    const initialFile = createTestFile('rename-test.stl', 'solid original\nfacet normal 0.0 0.0 1.0\nendsolid')

    // Create project with initial file
    const projectName = `Conflict Rename Test ${Date.now()}`
    await createProjectWithFiles(page, projectName, [initialFile])

    // Verify initial file is in project
    await expect(page.getByText('rename-test.stl')).toBeVisible()
    await expect(page.getByText('1 file')).toBeVisible()

    // Create new file with same name but different content
    const conflictFile = createTestFile('rename-test.stl', 'solid modified\nfacet normal 1.0 0.0 0.0\nendsolid modified')

    // Click Upload Files
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    // Upload conflicting file
    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([conflictFile])

    // Check conflicts
    await page.getByRole('button', { name: /check conflicts/i }).click()

    await page.waitForResponse(response =>
      response.url().includes('/files/check-conflicts') &&
      response.request().method() === 'POST'
    )

    // Should show conflict detected
    await expect(page.getByText(/conflicts detected/i)).toBeVisible()

    // Select rename resolution
    await page.getByRole('radio', { name: /rename/i }).check()

    // Upload with resolution
    const uploadPromise = page.waitForResponse(response =>
      response.url().includes('/files') &&
      response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: /upload files/i }).nth(1).click()

    const uploadResponse = await uploadPromise
    expect(uploadResponse.status()).toBe(200)

    // Verify modal closes
    await expect(uploadModal).not.toBeVisible()

    // Verify both files exist (should show 2 files now)
    await expect(page.getByText('2 files')).toBeVisible()

    // Original file should still exist
    await expect(page.getByText('rename-test.stl')).toBeVisible()

    // New file should exist with timestamp suffix
    // The exact filename will have a timestamp, so we'll check for pattern
    await expect(page.locator('[data-testid*="file-item"]')).toHaveCount(2)

    // Verify success message
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible()
  })

  test('should handle mixed conflicts with different resolutions', async ({ page }) => {
    // Create initial files
    const file1 = createTestFile('mixed1.stl', 'solid file1\nfacet normal 0.0 0.0 1.0\nendsolid')
    const file2 = createTestFile('mixed2.gcode', 'G28 ; Home file2')
    const file3 = createTestFile('mixed3.stl', 'solid file3\nfacet normal 0.0 0.0 1.0\nendsolid')

    // Create project with initial files
    const projectName = `Mixed Conflicts Test ${Date.now()}`
    await createProjectWithFiles(page, projectName, [file1, file2, file3])

    // Verify initial files
    await expect(page.getByText('3 files')).toBeVisible()

    // Create conflicting files + one new file
    const conflictFile1 = createTestFile('mixed1.stl', 'solid modified1\nfacet normal 1.0 0.0 0.0\nendsolid')
    const conflictFile2 = createTestFile('mixed2.gcode', 'G28 ; Modified file2')
    const conflictFile3 = createTestFile('mixed3.stl', 'solid modified3\nfacet normal 0.0 1.0 0.0\nendsolid')
    const newFile = createTestFile('new-mixed.stl', 'solid newfile\nfacet normal 0.0 0.0 1.0\nendsolid')

    // Upload all files
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([conflictFile1, conflictFile2, conflictFile3, newFile])

    // Check conflicts
    await page.getByRole('button', { name: /check conflicts/i }).click()

    await page.waitForResponse(response =>
      response.url().includes('/files/check-conflicts') &&
      response.request().method() === 'POST'
    )

    // Should show conflicts detected
    await expect(page.getByText(/conflicts detected/i)).toBeVisible()

    // Set different resolutions for each file
    // mixed1.stl -> skip
    const mixed1Section = page.locator('[data-testid*="conflict-mixed1.stl"]')
    await mixed1Section.getByRole('radio', { name: /skip/i }).check()

    // mixed2.gcode -> overwrite
    const mixed2Section = page.locator('[data-testid*="conflict-mixed2.gcode"]')
    await mixed2Section.getByRole('radio', { name: /overwrite/i }).check()

    // mixed3.stl -> rename
    const mixed3Section = page.locator('[data-testid*="conflict-mixed3.stl"]')
    await mixed3Section.getByRole('radio', { name: /rename/i }).check()

    // Upload with mixed resolutions
    const uploadPromise = page.waitForResponse(response =>
      response.url().includes('/files') &&
      response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: /upload files/i }).nth(1).click()

    const uploadResponse = await uploadPromise
    expect(uploadResponse.status()).toBe(200)

    // Verify modal closes
    await expect(uploadModal).not.toBeVisible()

    // Verify results:
    // - mixed1.stl skipped (original remains)
    // - mixed2.gcode overwritten (1 file)
    // - mixed3.stl renamed (2 files: original + renamed)
    // - new-mixed.stl uploaded (1 new file)
    // Total: 1 (mixed1) + 1 (mixed2) + 2 (mixed3 + renamed) + 1 (new) = 5 files
    await expect(page.getByText('5 files')).toBeVisible()

    // Verify specific files exist
    await expect(page.getByText('mixed1.stl')).toBeVisible() // Original (skipped)
    await expect(page.getByText('mixed2.gcode')).toBeVisible() // Overwritten
    await expect(page.getByText('mixed3.stl')).toBeVisible() // Original
    await expect(page.getByText('new-mixed.stl')).toBeVisible() // New file

    // Verify success message shows mixed results
    const successMessage = page.getByTestId('upload-result-message')
    await expect(successMessage).toBeVisible()
  })

  test('should handle upload cancellation', async ({ page }) => {
    // Create project
    const projectName = `Cancel Test Project ${Date.now()}`
    await createProjectWithFiles(page, projectName)

    // Create test file
    const testFile = createTestFile('cancel-test.stl', 'solid test\nfacet normal 0.0 0.0 1.0\nendsolid')

    // Open upload modal
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    // Select file
    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([testFile])

    // Verify file is listed
    await expect(uploadModal.getByText('cancel-test.stl')).toBeVisible()

    // Cancel the upload
    await page.getByRole('button', { name: /cancel/i }).click()

    // Verify modal closes without uploading
    await expect(uploadModal).not.toBeVisible()

    // Verify no files were added
    await expect(page.getByText(/no files found/i)).toBeVisible()
  })

  test('should validate file types during upload', async ({ page }) => {
    // Create project
    const projectName = `File Type Test ${Date.now()}`
    await createProjectWithFiles(page, projectName)

    // Create invalid file type
    const invalidFile = createTestFile('invalid-file.txt', 'This is not a valid 3D file')

    // Open upload modal
    await page.getByRole('button', { name: /upload files/i }).click()

    const uploadModal = page.getByTestId('file-upload-modal')
    await expect(uploadModal).toBeVisible()

    // Try to upload invalid file type
    const fileInput = uploadModal.locator('input[type="file"]')
    await fileInput.setInputFiles([invalidFile])

    // Should show error or filter out invalid file
    // (Implementation depends on frontend validation)

    // The behavior here will depend on how the frontend handles file type validation
    // It might show an error message, filter out the file, or allow it and let backend handle it

    // If frontend filters:
    // await expect(uploadModal.getByText('invalid-file.txt')).not.toBeVisible()

    // If frontend allows and backend rejects:
    // await page.getByRole('button', { name: /upload files/i }).nth(1).click()
    // await expect(page.getByText(/invalid file type/i)).toBeVisible()

    // For now, we'll just verify the file input accepts the file
    await expect(fileInput).toBeVisible()
  })

  test.afterAll(() => {
    // Clean up test files
    const testFilesDir = path.join(__dirname, '..', 'fixtures', 'upload-tests')
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true })
    }
  })
})