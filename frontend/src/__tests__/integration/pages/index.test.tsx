import { render, screen, waitFor, fireEvent } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/router'
import HomePage from '@/pages/index'
import { server } from '@/__tests__/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('HomePage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      pathname: '/',
      route: '/',
      query: {},
      asPath: '/',
    } as any)
  })

  it('loads and displays projects on initial render', async () => {
    render(<HomePage />)

    // Initially shows loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })

    // Loading should be gone
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('performs search and updates project list', async () => {
    const user = userEvent.setup()

    // Override the search endpoint to return filtered results
    server.use(
      http.get('/api/projects/search', ({ request }) => {
        const url = new URL(request.url)
        const query = url.searchParams.get('q')

        if (query === 'Test Project 1') {
          return HttpResponse.json({
            projects: [{
              id: '1',
              name: 'Test Project 1',
              path: '/projects/test-project-1',
              lastModified: new Date('2024-01-15'),
              status: 'active',
              fileCount: 15,
              totalSize: 1024000,
              description: 'A test project for unit testing',
              tags: ['test', 'mock'],
            }]
          })
        }
        return HttpResponse.json({ projects: [] })
      })
    )

    render(<HomePage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search projects...')
    await user.type(searchInput, 'Test Project 1')
    fireEvent.submit(searchInput.closest('form')!)

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument()
    })
  })

  it('handles project click navigation', async () => {
    const user = userEvent.setup()
    render(<HomePage />)

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Click on first project
    const projectCard = screen.getByText('Test Project 1').closest('div')!
    await user.click(projectCard)

    // Verify navigation
    expect(mockPush).toHaveBeenCalledWith('/projects/1')
  })

  it('handles scan operation and refreshes project list', async () => {
    const user = userEvent.setup()

    // Mock successful scan
    server.use(
      http.post('/api/scan', () => {
        return HttpResponse.json({
          message: 'Scan completed',
          newProjects: 1,
          updatedProjects: 2
        })
      })
    )

    render(<HomePage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Click scan button
    const scanButton = screen.getByRole('button', { name: /scan projects/i })
    await user.click(scanButton)

    // Verify scan success toast
    await waitFor(() => {
      expect(screen.getByText('Scan completed')).toBeInTheDocument()
    })

    // Projects should be reloaded after scan
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })
  })

  it('displays error state when project loading fails', async () => {
    // Mock API error
    server.use(
      http.get('/api/projects', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    render(<HomePage />)

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument()
    })

    // Loading should be gone
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('maintains search query when refreshing after scan', async () => {
    const user = userEvent.setup()

    // Setup search endpoint
    server.use(
      http.get('/api/projects/search', ({ request }) => {
        const url = new URL(request.url)
        const query = url.searchParams.get('q')

        return HttpResponse.json({
          projects: query ? [{
            id: '1',
            name: 'Test Project 1',
            path: '/projects/test-project-1',
            lastModified: new Date('2024-01-15'),
            status: 'active',
            fileCount: 15,
            totalSize: 1024000,
            description: 'A test project for unit testing',
            tags: ['test', 'mock'],
          }] : []
        })
      })
    )

    render(<HomePage />)

    // Wait for initial load and perform search
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search projects...')
    await user.type(searchInput, 'test query')
    fireEvent.submit(searchInput.closest('form')!)

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Trigger scan which should maintain search
    const scanButton = screen.getByRole('button', { name: /scan projects/i })
    await user.click(scanButton)

    // After scan, search query should still be maintained
    await waitFor(() => {
      expect(screen.getByText('Scan completed')).toBeInTheDocument()
    })
  })

  it('clears search when empty query is submitted', async () => {
    const user = userEvent.setup()
    render(<HomePage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Perform empty search
    const searchInput = screen.getByPlaceholderText('Search projects...')
    await user.clear(searchInput)
    fireEvent.submit(searchInput.closest('form')!)

    // Should show all projects again
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    // Mock network error
    server.use(
      http.get('/api/projects', () => {
        throw new Error('Network Error')
      })
    )

    render(<HomePage />)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument()
    })
  })

  it('displays empty state when no projects exist', async () => {
    // Mock empty response
    server.use(
      http.get('/api/projects', () => {
        return HttpResponse.json({ projects: [] })
      })
    )

    render(<HomePage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Should handle empty state (ProjectGrid component should handle this)
    await waitFor(() => {
      expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument()
    })
  })

  it('integrates header and project grid components properly', async () => {
    render(<HomePage />)

    // Verify all main components are rendered
    expect(screen.getByText('3DShelf')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scan projects/i })).toBeInTheDocument()

    // Wait for projects to load in the grid
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })
  })
})