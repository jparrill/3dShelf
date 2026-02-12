import type { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after Playwright tests...')

  // Perform any global cleanup here, such as:
  // - Cleaning up test data
  // - Stopping external services
  // - Removing temporary files
  // - Database cleanup

  console.log('✅ Playwright cleanup completed')
}

export default globalTeardown