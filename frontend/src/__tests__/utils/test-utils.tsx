import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '@/lib/theme'

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ChakraProvider theme={theme}>
      {children}
    </ChakraProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Utility for testing async components
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 100))
}

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  reload: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  beforePopState: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
}

// Common test data
export const mockProject = {
  id: '1',
  name: 'Test Project',
  path: '/test/project',
  lastModified: new Date('2024-01-15'),
  status: 'active' as const,
  fileCount: 10,
  totalSize: 1024000,
  description: 'Test project description',
  tags: ['test', 'mock'],
}

export const mockProjects = [
  mockProject,
  {
    ...mockProject,
    id: '2',
    name: 'Second Test Project',
    status: 'archived' as const,
  },
]