import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🧪 Setting up Playwright tests...')

  // Create a browser instance for setup operations if needed
  const browser = await chromium.launch()

  // You can perform any global setup here, such as:
  // - Authentication
  // - Database seeding
  // - Starting external services
  // - Setting up test data

  // Wait for the development server to be ready
  const page = await browser.newPage()
  try {
    // Wait for the server to respond
    await page.goto('http://127.0.0.1:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })
    console.log('✅ Development server is ready')
  } catch (error) {
    console.error('❌ Development server failed to start:', error)
    throw error
  } finally {
    await page.close()
    await browser.close()
  }

  console.log('🚀 Playwright setup completed')
}

export default globalSetup