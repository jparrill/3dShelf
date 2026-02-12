/**
 * E2E Test Setup and Configuration for 3D Organizer
 *
 * This file contains setup configurations and utilities for Playwright E2E tests
 */

import { test as base, expect } from '@playwright/test'
import { TestFileManager, ProjectTestHelpers } from '../helpers/test-helpers'

// Extend base test with custom fixtures
export const test = base.extend<{
  fileManager: TestFileManager
  projectHelpers: typeof ProjectTestHelpers
}>({
  fileManager: async ({}, use, testInfo) => {
    const fileManager = new TestFileManager(testInfo.title.replace(/[^a-zA-Z0-9]/g, '-'))
    await use(fileManager)
    fileManager.cleanup()
  },

  projectHelpers: async ({}, use) => {
    await use(ProjectTestHelpers)
  }
})

// Custom expect extensions for 3D Organizer specific assertions
expect.extend({
  /**
   * Assert that a project has a specific number of files
   */
  async toHaveFileCount(page: any, expectedCount: number) {
    if (expectedCount === 0) {
      const noFilesMessage = await page.getByText(/no files found/i).isVisible()
      return {
        message: () => `Expected project to have no files`,
        pass: noFilesMessage
      }
    }

    const fileCountText = await page.getByText(`${expectedCount} file${expectedCount > 1 ? 's' : ''}`).isVisible()
    return {
      message: () => `Expected project to have ${expectedCount} file(s)`,
      pass: fileCountText
    }
  },

  /**
   * Assert that specific files exist in the project
   */
  async toHaveFiles(page: any, filenames: string[]) {
    const results = await Promise.all(
      filenames.map(filename => page.getByText(filename).isVisible())
    )

    const missingFiles = filenames.filter((_, index) => !results[index])

    return {
      message: () => missingFiles.length > 0
        ? `Expected files to exist: ${missingFiles.join(', ')}`
        : `All files exist as expected`,
      pass: missingFiles.length === 0
    }
  },

  /**
   * Assert that files do not exist in the project
   */
  async toNotHaveFiles(page: any, filenames: string[]) {
    const results = await Promise.all(
      filenames.map(filename => page.getByText(filename).isVisible())
    )

    const existingFiles = filenames.filter((_, index) => results[index])

    return {
      message: () => existingFiles.length > 0
        ? `Expected files to not exist: ${existingFiles.join(', ')}`
        : `No unexpected files found`,
      pass: existingFiles.length === 0
    }
  }
})

// Declare the custom matchers for TypeScript
declare module '@playwright/test' {
  interface Matchers<R> {
    toHaveFileCount(expectedCount: number): R
    toHaveFiles(filenames: string[]): R
    toNotHaveFiles(filenames: string[]): R
  }
}

// Test data constants
export const TEST_DATA = {
  PROJECTS: {
    EMPTY: 'Empty Test Project',
    WITH_FILES: 'Project With Initial Files',
    CONFLICT_TEST: 'Conflict Resolution Test',
    PERFORMANCE: 'Performance Test Project'
  },

  FILES: {
    STL_SMALL: {
      filename: 'small-model.stl',
      content: 'solid small\nfacet normal 0.0 0.0 1.0\nendsolid',
      type: 'stl' as const
    },
    GCODE_SIMPLE: {
      filename: 'simple.gcode',
      content: 'G28\nG1 X10 Y10 Z0.3',
      type: 'gcode' as const
    },
    README_BASIC: {
      filename: 'README.md',
      content: '# Test Project\nBasic test documentation.',
      type: 'readme' as const
    }
  },

  API_ENDPOINTS: {
    PROJECTS: '/api/projects',
    PROJECT_FILES: '/files',
    CHECK_CONFLICTS: '/files/check-conflicts',
    HEALTH: '/api/health'
  },

  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000
  }
}

// Global test hooks
test.beforeAll(async () => {
  console.log('Starting 3D Organizer E2E Test Suite')
})

test.afterAll(async () => {
  console.log('Completed 3D Organizer E2E Test Suite')
})

export { expect }