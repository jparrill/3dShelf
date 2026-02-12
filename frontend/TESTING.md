# 3DShelf Frontend Testing Guide

## Overview

This document provides comprehensive information about the testing setup and strategies for the 3DShelf frontend application.

## Testing Stack

- **Jest** - Test runner and framework
- **React Testing Library** - Component testing utilities
- **Playwright** - End-to-end testing
- **MSW (Mock Service Worker)** - API mocking
- **TypeScript** - Type safety in tests

## Test Structure

```
src/__tests__/
├── setup.ts                 # Jest setup and global mocks
├── utils/
│   └── test-utils.tsx       # Custom render function and utilities
├── mocks/
│   ├── handlers.ts          # MSW API handlers
│   └── server.ts            # MSW server setup
├── unit/                    # Unit tests
│   ├── components/
│   ├── lib/
│   └── utils/
├── integration/             # Integration tests
│   ├── pages/
│   └── api/
└── e2e/                     # End-to-end tests
    ├── homepage.spec.ts
    └── project-details.spec.ts
```

## Test Types

### 1. Unit Tests
Test individual components, functions, and modules in isolation.

**Location**: `src/__tests__/unit/`

**Examples**:
- Component rendering and props
- User interactions (clicks, form inputs)
- Utility function behavior
- API client methods

**Run**: `npm run test:unit`

### 2. Integration Tests
Test multiple components working together and API interactions.

**Location**: `src/__tests__/integration/`

**Examples**:
- Page-level component integration
- API + component integration
- Data flow between components

**Run**: `npm run test:integration`

### 3. End-to-End Tests
Test complete user workflows in a real browser environment.

**Location**: `src/__tests__/e2e/`

**Examples**:
- User navigation flows
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility testing

**Run**: `npm run test:e2e`

## Available Commands

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Playwright UI mode
npm run test:e2e:ui
```

## Coverage Requirements

The project maintains the following coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in:
- `coverage/` - HTML and LCOV reports
- `coverage/lcov-report/index.html` - Interactive HTML report

## Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@/__tests__/utils/test-utils'
import { ProjectCard } from '@/components/projects/ProjectCard'

describe('ProjectCard', () => {
  it('renders project information', () => {
    const mockProject = {
      id: '1',
      name: 'Test Project',
      description: 'Test description'
    }

    render(<ProjectCard project={mockProject} onClick={jest.fn()} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })
})
```

### Integration Test Example

```typescript
import { render, screen, waitFor } from '@/__tests__/utils/test-utils'
import HomePage from '@/pages/index'
import { server } from '@/__tests__/mocks/server'

describe('HomePage Integration', () => {
  it('loads and displays projects', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should navigate through the application', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('text=3DShelf')).toBeVisible()

  const projectCard = page.locator('.project-card').first()
  await projectCard.click()

  await expect(page).toHaveURL(/\/projects\/\d+/)
})
```

## API Mocking

We use MSW (Mock Service Worker) for API mocking in tests.

### Handlers Configuration
- Located in `src/__tests__/mocks/handlers.ts`
- Provides mock responses for all API endpoints
- Supports error simulation for testing edge cases

### Custom Mock Responses
```typescript
import { server } from '@/__tests__/mocks/server'
import { http, HttpResponse } from 'msw'

// Override specific endpoint in test
server.use(
  http.get('/api/projects', () => {
    return HttpResponse.json({ projects: [] })
  })
)
```

## Best Practices

### 1. Test Structure
- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Keep tests focused and test one thing at a time

### 2. Test Data
- Use factory functions for creating test data
- Prefer minimal test data that covers the scenario
- Avoid hardcoded IDs when possible

### 3. Async Testing
- Always use `waitFor` for async operations
- Set appropriate timeouts for slow operations
- Clean up async operations in `afterEach`

### 4. Component Testing
- Test user interactions, not implementation details
- Use `screen.getByRole()` for accessibility-friendly queries
- Test error states and loading states

### 5. Accessibility Testing
- Include accessibility checks in E2E tests
- Test keyboard navigation
- Verify proper ARIA attributes

## Continuous Integration

Tests run automatically on:
- Pull requests to `main` branch
- Pushes to `main` and `develop` branches
- Changes to `frontend/` directory

### CI Pipeline Steps
1. **Dependency Installation**: Install npm packages
2. **Type Checking**: Run TypeScript type checking
3. **Linting**: Run ESLint for code quality
4. **Unit Tests**: Execute unit test suite
5. **Integration Tests**: Execute integration test suite
6. **Coverage Report**: Generate and upload coverage
7. **E2E Tests**: Run Playwright tests in CI environment
8. **Artifact Upload**: Save test reports and coverage

## Debugging Tests

### Unit/Integration Tests
```bash
# Run tests in debug mode
npm test -- --no-coverage --watchAll=false

# Run specific test file
npm test -- Header.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should handle search"
```

### E2E Tests
```bash
# Run with browser visible
npx playwright test --headed

# Run in UI mode
npx playwright test --ui

# Debug specific test
npx playwright test --debug homepage.spec.ts
```

## Common Issues and Solutions

### 1. Tests Timing Out
- Increase timeout in `jest.config.js` or `playwright.config.ts`
- Use `waitFor` with custom timeout
- Check for unresolved promises

### 2. MSW Not Working
- Ensure server is started in `beforeAll`
- Reset handlers in `afterEach`
- Check handler patterns match actual requests

### 3. Component Not Rendering
- Verify all required providers are included
- Check for missing props
- Use `screen.debug()` to see rendered output

### 4. Playwright Tests Flaky
- Add explicit waits for elements
- Use `page.waitForLoadState('networkidle')`
- Avoid hardcoded timeouts

## Performance Testing

While not automated, consider manual performance testing:
- Bundle size analysis with `npm run build`
- Lighthouse audits for pages
- Network throttling in E2E tests

## Test Coverage Analysis

Coverage reports help identify:
- Untested code paths
- Missing edge case tests
- Over-tested areas

View the interactive coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Contributing

When adding new features:
1. Write tests alongside implementation
2. Maintain or improve coverage percentages
3. Add E2E tests for user-facing features
4. Update this documentation for new testing patterns

For more information about specific testing utilities and patterns, refer to:
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)