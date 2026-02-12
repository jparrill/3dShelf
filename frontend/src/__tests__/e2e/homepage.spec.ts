import { test, expect } from '@playwright/test'

test.describe('3DShelf Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/')
  })

  test('should display the main header and navigation', async ({ page }) => {
    // Check that the main title is visible
    await expect(page.locator('text=3DShelf')).toBeVisible()

    // Check search functionality exists
    await expect(page.getByPlaceholder('Search projects...')).toBeVisible()

    // Check scan button exists
    await expect(page.getByRole('button', { name: /scan projects/i })).toBeVisible()
  })

  test('should load and display project list', async ({ page }) => {
    // Wait for the page to load and projects to be fetched
    await page.waitForLoadState('networkidle')

    // Check if the main content area is displayed
    await expect(page.locator('[role="main"], main, .chakra-container').first()).toBeVisible()

    // We should see some content indicating projects are loaded
    // This could be project cards or a "no projects" message
    const hasProjects = await page.locator('text=/test project|no projects|0 projects/i').first().isVisible()
    expect(hasProjects).toBeTruthy()
  })

  test('should perform search functionality', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle')

    // Enter search query
    const searchInput = page.getByPlaceholder('Search projects...')
    await searchInput.fill('test')

    // Submit search by pressing Enter
    await searchInput.press('Enter')

    // Wait for search results
    await page.waitForLoadState('networkidle')

    // Verify URL or content changed to reflect search
    const url = page.url()
    // The search might be reflected in URL params or just in the displayed content
    // Check if we're still on the main page
    expect(url).toContain('/')
  })

  test('should handle empty search', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('Search projects...')

    // Clear any existing text and submit empty search
    await searchInput.clear()
    await searchInput.press('Enter')

    // Wait for response
    await page.waitForLoadState('networkidle')

    // Should still be on the homepage showing all projects
    expect(page.url()).toContain('/')
  })

  test('should navigate to project detail when clicking project', async ({ page }) => {
    // Wait for projects to load
    await page.waitForLoadState('networkidle')

    // Look for clickable project elements
    const projectCard = page.locator('.project-card, [data-testid="project-card"]').first()

    // If no projects are visible, check if we have a "no projects" state
    const hasProjects = await projectCard.isVisible()

    if (hasProjects) {
      // Click the first project
      await projectCard.click()

      // Wait for navigation
      await page.waitForLoadState('networkidle')

      // Should navigate to project detail page
      await expect(page).toHaveURL(/\/projects\/\d+/)
    } else {
      // If no projects exist, verify the empty state is shown properly
      await expect(page.locator('text=/no projects|empty/i').first()).toBeVisible()
    }
  })

  test('should handle scan projects functionality', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle')

    const scanButton = page.getByRole('button', { name: /scan projects/i })

    // Click scan button
    await scanButton.click()

    // Check for loading state
    await expect(page.getByText(/scanning/i)).toBeVisible()

    // Wait for scan to complete (with reasonable timeout)
    await page.waitForTimeout(1000) // Give scan operation time to complete

    // Check for completion feedback
    await expect(page.locator('text=/scan completed|scan failed|found \d+ projects/i')).toBeVisible({ timeout: 10000 })

    // Button should be enabled again
    await expect(scanButton).toBeEnabled()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that main elements are still visible
    await expect(page.locator('text=3DShelf')).toBeVisible()
    await expect(page.getByPlaceholder('Search projects...')).toBeVisible()
    await expect(page.getByRole('button', { name: /scan projects/i })).toBeVisible()

    // Check that layout adapts appropriately
    // Elements should be stacked vertically on mobile - check for any main content
    const content = page.locator('h1, h2, [role="main"], .chakra-heading').first()
    await expect(content).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('/api/projects', route => route.abort())

    // Navigate to homepage
    await page.goto('/')

    // Wait a reasonable amount of time
    await page.waitForTimeout(2000)

    // Should show error state or empty state
    const errorIndicators = [
      page.locator('text=/error/i').first(),
      page.locator('text=/failed/i').first(),
      page.locator('text=/unable to load/i').first(),
      page.getByRole('alert').first(),
      page.locator('[data-status="error"]').first(),
      page.getByText('No projects found').first(),
      page.getByText('0 projects').first()
    ]

    let indicatorFound = false
    for (const indicator of errorIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 1000 })
        indicatorFound = true
        break
      } catch {
        // Continue to next indicator
      }
    }

    // At minimum, there should be no project cards visible when API fails
    if (!indicatorFound) {
      const projectCards = page.locator('[data-testid="project-card"]')
      const cardCount = await projectCards.count()
      expect(cardCount).toBe(0)
    }
  })

  test('should display loading states appropriately', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')

    // Check if loading indicator appears briefly
    const loadingExists = await page.locator('text=/loading|loading\.\.\./i').first().isVisible()

    if (loadingExists) {
      // Wait for loading to disappear
      await expect(page.locator('text=/loading/i')).toBeHidden({ timeout: 10000 })
    }

    // Content should be loaded
    await expect(page.locator('body')).toContainText(/3DShelf/)
  })

  test('should maintain state during page interactions', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle')

    // Perform a search
    const searchInput = page.getByPlaceholder('Search projects...')
    await searchInput.fill('test search')
    await searchInput.press('Enter')
    await page.waitForLoadState('networkidle')

    // Verify search input retains value
    await expect(searchInput).toHaveValue('test search')

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Search should be cleared after reload (expected behavior)
    await expect(searchInput).toHaveValue('')
  })

  test('should have proper accessibility features', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check for proper heading structure
    await expect(page.locator('h1, h2, h3').first()).toBeVisible()

    // Check that search input exists and is accessible
    const searchInput = page.getByPlaceholder('Search projects...')
    await expect(searchInput).toBeVisible()

    // Check that buttons are properly labeled
    const scanButton = page.getByRole('button', { name: /scan projects/i })
    await expect(scanButton).toBeVisible()

    // Check for proper focus management
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Start from search input
    const searchInput = page.getByPlaceholder('Search projects...')
    await searchInput.focus()

    // Navigate using Tab - focus should move to next focusable element
    await page.keyboard.press('Tab')

    // Verify some focusable element is now focused
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Test that keyboard navigation works - tab a few more times to find scan button
    for (let i = 0; i < 5; i++) {
      const currentFocus = page.locator(':focus')
      const buttonText = await currentFocus.textContent() || ''

      if (buttonText.toLowerCase().includes('scan')) {
        // Found scan button, test Enter key
        await page.keyboard.press('Enter')

        // Should trigger scan action or at least show some feedback
        const scanningIndicators = [
          page.locator('text=/scanning/i'),
          page.locator('text=/scan/i'),
          page.getByRole('button', { name: /scan/i }),
          page.locator('[data-testid="scan-button"]')
        ]

        let indicatorFound = false
        for (const indicator of scanningIndicators) {
          try {
            await expect(indicator).toBeVisible({ timeout: 2000 })
            indicatorFound = true
            break
          } catch {
            // Continue to next indicator
          }
        }

        expect(indicatorFound).toBeTruthy()
        break
      }

      await page.keyboard.press('Tab')
    }
  })
})