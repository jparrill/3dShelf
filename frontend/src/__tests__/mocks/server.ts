import { setupServer } from 'msw'
import { handlers } from './handlers'

// Setup MSW server with the handlers
export const server = setupServer(...handlers)

// Enable API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Disable API mocking after all tests
afterAll(() => {
  server.close()
})