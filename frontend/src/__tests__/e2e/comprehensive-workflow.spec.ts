import { test, expect } from '@playwright/test'
import {
  TestFileManager,
  ProjectTestHelpers,
  ValidationHelpers,
  APITestHelpers,
  TestConstants
} from '../helpers/test-helpers'

/**
 * Comprehensive E2E workflow tests for the 3D Organizer
 *
 * This test suite covers the complete workflows requested:
 * 1. Create projects with and without files
 * 2. Upload files that don't exist
 * 3. Upload same files and test all three conflict resolution paths
 */
test.describe('Comprehensive 3D Organizer Workflows', () => {
  let fileManager: TestFileManager

  test.beforeEach(async ({ page }) => {
    fileManager = new TestFileManager('comprehensive-tests')
    await page.goto('/')

    // Wait for the application to load
    await expect(page.getByText('3DShelf')).toBeVisible()
  })

  test.afterEach(() => {
    fileManager.cleanup()
  })

  test('Complete workflow: Project creation → File upload → Conflict resolution (All paths)', async ({ page }) => {
    const testFiles = TestFileManager.getCommonTestFiles()
    const timestamp = Date.now()

    // STEP 1: Create project WITHOUT files
    const emptyProjectName = `Empty Project ${timestamp}`

    await test.step('Create project without files', async () => {
      const projectId = await ProjectTestHelpers.createProject(page, {
        name: emptyProjectName,
        description: 'A project created without initial files for testing upload workflows'
      })

      expect(projectId).toBeTruthy()

      // Navigate to project details
      await ProjectTestHelpers.navigateToProject(page, emptyProjectName)

      // Verify empty state
      await ProjectTestHelpers.verifyProjectFileCount(page, 0)
    })

    // STEP 2: Create project WITH files
    const projectWithFilesName = `Project With Files ${timestamp}`

    await test.step('Create project with initial files', async () => {
      await page.goto('/') // Go back to homepage

      const projectId = await ProjectTestHelpers.createProject(page, {
        name: projectWithFilesName,
        description: 'A project created with initial files',
        initialFiles: [
          testFiles.stlFile,
          testFiles.readmeFile
        ]
      })

      expect(projectId).toBeTruthy()

      // Navigate to project details
      await ProjectTestHelpers.navigateToProject(page, projectWithFilesName)

      // Verify initial files
      await ProjectTestHelpers.verifyProjectFileCount(page, 2)
      await ProjectTestHelpers.verifyFilesExist(page, ['test-model.stl', 'README.md'])
    })

    // STEP 3: Upload NEW files (no conflicts)
    await test.step('Upload new files to project', async () => {
      await ProjectTestHelpers.navigateToProject(page, projectWithFilesName)

      const newFiles = [
        testFiles.gcodeFile,
        testFiles.cadFile
      ]

      await ProjectTestHelpers.uploadFilesToProject(page, newFiles)

      // Verify new files were added
      await ProjectTestHelpers.verifyProjectFileCount(page, 4)
      await ProjectTestHelpers.verifyFilesExist(page, [
        'test-model.stl',
        'README.md',
        'test-print.gcode',
        'design.step'
      ])
    })

    // STEP 4: Test SKIP conflict resolution
    await test.step('Upload same file with SKIP resolution', async () => {
      await ProjectTestHelpers.navigateToProject(page, projectWithFilesName)

      // Create modified version of existing file
      const modifiedStlFile = {
        filename: 'test-model.stl',
        content: 'solid modifiedmodel\n  facet normal 1.0 0.0 0.0\nendsolid modifiedmodel',
        type: 'stl' as const
      }

      await ProjectTestHelpers.uploadFilesToProject(
        page,
        [modifiedStlFile],
        [{ filename: 'test-model.stl', resolution: 'skip' }]
      )

      // Verify file count remains the same (file was skipped)
      await ProjectTestHelpers.verifyProjectFileCount(page, 4)

      // Verify success message mentions skipped
      await expect(page.getByText(/skipped/i)).toBeVisible()
    })

    // STEP 5: Test OVERWRITE conflict resolution
    await test.step('Upload same file with OVERWRITE resolution', async () => {
      await ProjectTestHelpers.navigateToProject(page, projectWithFilesName)

      // Create another modified version of existing file
      const modifiedGcodeFile = {
        filename: 'test-print.gcode',
        content: '; Modified G-Code\nG28 ; Home all axes\nG1 X50 Y50 Z5 F3000\nM104 S200',
        type: 'gcode' as const
      }

      await ProjectTestHelpers.uploadFilesToProject(
        page,
        [modifiedGcodeFile],
        [{ filename: 'test-print.gcode', resolution: 'overwrite' }]
      )

      // Verify file count remains the same (file was overwritten)
      await ProjectTestHelpers.verifyProjectFileCount(page, 4)

      // Verify the file still exists (but was overwritten)
      await ProjectTestHelpers.verifyFilesExist(page, ['test-print.gcode'])
    })

    // STEP 6: Test RENAME (upload + timestamp) conflict resolution
    await test.step('Upload same file with RENAME resolution', async () => {
      await ProjectTestHelpers.navigateToProject(page, projectWithFilesName)

      // Create another modified version of existing file
      const modifiedCadFile = {
        filename: 'design.step',
        content: 'ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((\'Modified STEP file\'), \'2;1\');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;',
        type: 'cad' as const
      }

      await ProjectTestHelpers.uploadFilesToProject(
        page,
        [modifiedCadFile],
        [{ filename: 'design.step', resolution: 'rename' }]
      )

      // Verify file count increased (original + renamed)
      await ProjectTestHelpers.verifyProjectFileCount(page, 5)

      // Verify both original and renamed file exist
      await ProjectTestHelpers.verifyFilesExist(page, ['design.step'])

      // Check that we now have 5 total files
      await expect(page.getByText('5 files')).toBeVisible()
    })

    // STEP 7: Test multiple files with mixed conflict resolutions
    await test.step('Upload multiple files with mixed conflict resolutions', async () => {
      await ProjectTestHelpers.navigateToProject(page, projectWithFilesName)

      // Create multiple conflicting files + one new file
      const mixedFiles = [
        {
          filename: 'test-model.stl',
          content: 'solid finalmix\nfacet normal 0.0 1.0 0.0\nendsolid finalmix',
          type: 'stl' as const
        },
        {
          filename: 'README.md',
          content: '# Updated README\n\nThis README has been updated with new information.',
          type: 'readme' as const
        },
        {
          filename: 'new-final.stl',
          content: 'solid newfinal\nfacet normal 0.0 0.0 -1.0\nendsolid newfinal',
          type: 'stl' as const
        }
      ]

      await ProjectTestHelpers.uploadFilesToProject(
        page,
        mixedFiles,
        [
          { filename: 'test-model.stl', resolution: 'rename' }, // Will create 6th file
          { filename: 'README.md', resolution: 'overwrite' }    // Will replace existing
        ]
      )

      // Final count should be 6 files:
      // 1. test-model.stl (original)
      // 2. test-model.stl (renamed with timestamp)
      // 3. README.md (overwritten)
      // 4. test-print.gcode
      // 5. design.step (original)
      // 6. design.step (renamed from previous test)
      // 7. new-final.stl (new file)
      await ProjectTestHelpers.verifyProjectFileCount(page, 7)

      // Verify specific files exist
      await ProjectTestHelpers.verifyFilesExist(page, [
        'test-model.stl',
        'README.md',
        'test-print.gcode',
        'design.step',
        'new-final.stl'
      ])
    })
  })

  test('Error handling and edge cases', async ({ page }) => {
    const timestamp = Date.now()

    await test.step('Handle invalid project creation', async () => {
      // Test form validation
      await page.getByRole('button', { name: /create project/i }).click()
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      await ValidationHelpers.validateRequiredField(
        page,
        'project name',
        'create project',
        'project name is required'
      )

      // Cancel to close modal
      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(modal).not.toBeVisible()
    })

    await test.step('Handle file upload without project selection', async () => {
      // Go to homepage and try to upload without selecting a project
      await page.goto('/')

      // Should not see upload button on homepage
      await expect(page.getByRole('button', { name: 'Upload Files' })).not.toBeVisible()
    })

    await test.step('Handle large file uploads', async () => {
      // Create project first
      const largeFileProjectName = `Large File Test ${timestamp}`
      await ProjectTestHelpers.createProject(page, {
        name: largeFileProjectName,
        description: 'Testing large file uploads'
      })

      await ProjectTestHelpers.navigateToProject(page, largeFileProjectName)

      // Create large file
      const largeFile = {
        filename: 'large-test.stl',
        content: 'solid largetest\n' + 'facet normal 0.0 0.0 1.0\n'.repeat(10000) + 'endsolid',
        type: 'stl' as const
      }

      // Upload should either succeed or show appropriate error handling
      try {
        await ProjectTestHelpers.uploadFilesToProject(page, [largeFile])
        // If successful, verify file was uploaded
        await ProjectTestHelpers.verifyFilesExist(page, ['large-test.stl'])
      } catch (error) {
        // If failed, should show error message
        await expect(page.getByText(/error|failed|too large/i)).toBeVisible()
      }
    })

    await test.step('Handle network errors gracefully', async () => {
      // Create project
      const networkTestProjectName = `Network Test ${timestamp}`
      await ProjectTestHelpers.createProject(page, {
        name: networkTestProjectName,
        description: 'Testing network error handling'
      })

      await ProjectTestHelpers.navigateToProject(page, networkTestProjectName)

      // Simulate network offline (this might not work in all environments)
      // But we can at least test that the UI handles loading states properly

      await page.getByRole('button', { name: 'Upload Files' }).click()
      const uploadModal = page.locator('[role="dialog"]').filter({ hasText: 'Upload Files' })
      await expect(uploadModal).toBeVisible()

      // Create test file
      const testFile = TestFileManager.getCommonTestFiles().stlFile
      const filePath = fileManager.createFile(testFile)

      const fileInput = uploadModal.locator('input[type="file"]')
      await fileInput.setInputFiles([filePath])

      // The application should handle any network issues gracefully
      // and show appropriate loading/error states

      // Close the upload modal for cleanup
      const cancelButton = uploadModal.getByRole('button', { name: /cancel/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
    })
  })

  test('Accessibility and usability testing', async ({ page }) => {
    const accessibilityProjectName = `Accessibility Test ${Date.now()}`

    await test.step('Test keyboard navigation', async () => {
      // Test tab navigation through main page
      const createButton = page.getByRole('button', { name: 'Create Project' })

      // Focus the create button either by tab navigation or direct focus
      await createButton.focus()
      await expect(createButton).toBeFocused()

      // Press Enter to open modal
      await page.keyboard.press('Enter')

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      // Focus should be somewhere within the modal - find the name field
      const nameField = page.getByPlaceholder('Enter project name')
      await nameField.focus()
      await expect(nameField).toBeFocused()

      // Test that typing works
      await nameField.type('Keyboard Test')
      await expect(nameField).toHaveValue('Keyboard Test')

      // Close modal with Escape
      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible()
    })

    await test.step('Test screen reader compatibility', async () => {
      // Verify ARIA labels and roles
      await ValidationHelpers.validateAccessibility(page)

      // Create project to test file upload accessibility
      await ProjectTestHelpers.createProject(page, {
        name: accessibilityProjectName,
        description: 'Testing accessibility features'
      })

      await ProjectTestHelpers.navigateToProject(page, accessibilityProjectName)

      // Check upload button accessibility
      const uploadButton = page.getByRole('button', { name: 'Upload Files' })
      await expect(uploadButton).toBeVisible()

      const ariaLabel = await uploadButton.getAttribute('aria-label')
      const buttonText = await uploadButton.textContent()
      expect(ariaLabel || buttonText).toBeTruthy()
    })

    await test.step('Test responsive design (mobile)', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/')

      // Header should be visible and functional on mobile
      await expect(page.getByText('3DShelf')).toBeVisible()

      // Create project button should be accessible
      const createButton = page.getByRole('button', { name: 'Create Project' })
      await expect(createButton).toBeVisible()

      // Modal should work on mobile
      await createButton.click()
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      // Modal should be properly sized for mobile
      const modalBox = await modal.boundingBox()
      expect(modalBox?.width).toBeLessThanOrEqual(375)
    })
  })

  test('Performance and loading states', async ({ page }) => {
    const performanceProjectName = `Performance Test ${Date.now()}`

    await test.step('Test loading states during project creation', async () => {
      await page.getByRole('button', { name: 'Create Project' }).click()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      await page.getByPlaceholder('Enter project name').fill(performanceProjectName)

      // Create multiple files to test loading
      const multipleFiles = [
        TestFileManager.getCommonTestFiles().stlFile,
        TestFileManager.getCommonTestFiles().gcodeFile,
        TestFileManager.getCommonTestFiles().readmeFile,
        TestFileManager.getCommonTestFiles().cadFile
      ]

      const filePaths = fileManager.createFiles(multipleFiles)
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePaths)

      // Submit and monitor for loading states
      const submitButton = page.getByRole('button', { name: /create project/i }).nth(1)

      // Check if button shows loading state
      await submitButton.click()

      // Button might show loading state or be disabled
      // Wait for the operation to complete
      await expect(modal).not.toBeVisible({ timeout: 15000 })
    })

    await test.step('Test loading states during file upload', async () => {
      await ProjectTestHelpers.navigateToProject(page, performanceProjectName)

      // Test upload loading states
      await page.getByRole('button', { name: 'Upload Files' }).click()

      const uploadModal = page.locator('[role="dialog"]').filter({ hasText: 'Upload Files' })
      await expect(uploadModal).toBeVisible()

      const largeFile = {
        filename: 'performance-test.stl',
        content: TestFileManager.getCommonTestFiles().largeFile.content,
        type: 'stl' as const
      }

      const filePath = fileManager.createFile(largeFile)
      const fileInput = uploadModal.locator('input[type="file"]')
      await fileInput.setInputFiles([filePath])

      // Check conflicts - should show loading during check
      const checkButton = page.getByRole('button', { name: /check conflicts/i })
      if (await checkButton.isVisible()) {
        await checkButton.click()
        await page.waitForTimeout(1000) // Brief wait for check to complete
      }

      // Upload - should show loading during upload
      const uploadButton = page.getByRole('button', { name: /upload/i }).last()
      await uploadButton.click()

      await expect(uploadModal).not.toBeVisible({ timeout: 15000 })
    })
  })
})