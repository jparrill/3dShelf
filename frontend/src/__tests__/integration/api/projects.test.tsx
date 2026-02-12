import { render, screen, waitFor, fireEvent } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layout/Header'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { server } from '@/__tests__/mocks/server'
import { http, HttpResponse } from 'msw'
import { projectsApi } from '@/lib/api'

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Header + API Integration', () => {
    it('successfully performs scan and shows success feedback', async () => {
      const mockOnSearch = jest.fn()
      const mockOnScanComplete = jest.fn()
      const user = userEvent.setup()

      // Mock successful scan response
      server.use(
        http.post('/api/projects/scan', () => {
          return HttpResponse.json({
            message: 'Scan completed successfully',
            project_count: 10
          })
        })
      )

      render(<Header onSearch={mockOnSearch} onScanComplete={mockOnScanComplete} />)

      const scanButton = screen.getByRole('button', { name: /scan projects/i })
      await user.click(scanButton)

      // Check loading state
      expect(scanButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByText('Scan completed')).toBeInTheDocument()
        expect(screen.getByText('Found 10 projects')).toBeInTheDocument()
      })

      // Verify callback was called
      expect(mockOnScanComplete).toHaveBeenCalledTimes(1)
    })

    it('handles API errors and shows error feedback', async () => {
      const mockOnSearch = jest.fn()
      const mockOnScanComplete = jest.fn()
      const user = userEvent.setup()

      // Mock API error
      server.use(
        http.post('/api/projects/scan', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      render(<Header onSearch={mockOnSearch} onScanComplete={mockOnScanComplete} />)

      const scanButton = screen.getByRole('button', { name: /scan projects/i })
      await user.click(scanButton)

      await waitFor(() => {
        expect(screen.getByText('Scan failed')).toBeInTheDocument()
        expect(screen.getByText('Failed to scan filesystem for projects')).toBeInTheDocument()
      })

      // onScanComplete should not be called on error
      expect(mockOnScanComplete).not.toHaveBeenCalled()
    })

    it('handles timeout errors properly', async () => {
      const mockOnSearch = jest.fn()
      const mockOnScanComplete = jest.fn()
      const user = userEvent.setup()

      // Mock timeout
      server.use(
        http.post('/api/projects/scan', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          throw new Error('timeout')
        })
      )

      render(<Header onSearch={mockOnSearch} onScanComplete={mockOnScanComplete} />)

      const scanButton = screen.getByRole('button', { name: /scan projects/i })
      await user.click(scanButton)

      await waitFor(() => {
        expect(screen.getByText('Scan failed')).toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Direct API Calls', () => {
    it('successfully fetches all projects', async () => {
      const response = await projectsApi.getProjects()

      expect(response).toEqual([
        expect.objectContaining({
          id: '1',
          name: 'Test Project 1',
          status: 'active'
        }),
        expect.objectContaining({
          id: '2',
          name: 'Test Project 2',
          status: 'archived'
        })
      ])
    })

    it('successfully searches projects with query', async () => {
      // Mock filtered search response
      server.use(
        http.get('/api/projects/search', ({ request }) => {
          const url = new URL(request.url)
          const query = url.searchParams.get('q')

          if (query === 'Test Project 1') {
            return HttpResponse.json([{
              id: '1',
              name: 'Test Project 1',
              path: '/projects/test-project-1',
              lastModified: new Date('2024-01-15'),
              status: 'active',
              fileCount: 15,
              totalSize: 1024000,
              description: 'A test project for unit testing',
              tags: ['test', 'mock'],
            }])
          }

          return HttpResponse.json([])
        })
      )

      const response = await projectsApi.searchProjects('Test Project 1')
      expect(response).toHaveLength(1)
      expect(response[0].name).toBe('Test Project 1')
    })

    it('successfully fetches specific project', async () => {
      const project = await projectsApi.getProject(1)

      expect(project).toEqual(expect.objectContaining({
        id: '1',
        name: 'Test Project 1',
        files: expect.arrayContaining([
          expect.objectContaining({
            name: 'model.stl',
            type: 'stl'
          })
        ])
      }))
    })

    it('handles 404 for non-existent project', async () => {
      await expect(projectsApi.getProject(999)).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            status: 404
          })
        })
      )
    })

    it('successfully performs health check', async () => {
      const health = await projectsApi.healthCheck()

      expect(health).toEqual({
        status: 'healthy',
        timestamp: expect.any(String)
      })
    })
  })

  describe('ProjectCard + API Integration', () => {
    it('displays project data from API correctly', () => {
      const mockProject = {
        id: '1',
        name: 'API Test Project',
        path: '/api/test',
        description: 'Project loaded from API',
        status: 'healthy' as const,
        last_scanned: new Date('2024-01-15').toISOString(),
        files: [
          { name: 'model.stl', file_type: 'stl', size: 1024 },
          { name: 'config.gcode', file_type: 'gcode', size: 512 }
        ]
      }

      const mockOnClick = jest.fn()

      render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

      expect(screen.getByText('API Test Project')).toBeInTheDocument()
      expect(screen.getByText('Project loaded from API')).toBeInTheDocument()
      expect(screen.getByText('healthy')).toBeInTheDocument()
      expect(screen.getByText('2 files')).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    it('handles network errors in API calls', async () => {
      // Mock network error
      server.use(
        http.get('/api/projects', () => {
          throw new Error('Network Error')
        })
      )

      await expect(projectsApi.getProjects()).rejects.toThrow('Network Error')
    })

    it('handles malformed API responses', async () => {
      // Mock invalid JSON response
      server.use(
        http.get('/api/projects', () => {
          return new HttpResponse('invalid json', {
            headers: { 'Content-Type': 'application/json' }
          })
        })
      )

      await expect(projectsApi.getProjects()).rejects.toThrow()
    })

    it('handles API rate limiting', async () => {
      // Mock rate limit error
      server.use(
        http.get('/api/projects', () => {
          return new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': '60' }
          })
        })
      )

      await expect(projectsApi.getProjects()).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            status: 429
          })
        })
      )
    })
  })

  describe('Data Consistency', () => {
    it('ensures API data matches component expectations', async () => {
      const projects = await projectsApi.getProjects()
      const mockOnClick = jest.fn()

      projects.forEach(project => {
        expect(() => {
          render(<ProjectCard project={project} onClick={mockOnClick} />)
        }).not.toThrow()
      })
    })

    it('handles missing optional fields gracefully', async () => {
      // Mock project with minimal data
      server.use(
        http.get('/api/projects/1', () => {
          return HttpResponse.json({
            id: '1',
            name: 'Minimal Project',
            path: '/minimal',
            status: 'healthy',
            last_scanned: new Date().toISOString()
            // Missing description, files, etc.
          })
        })
      )

      const project = await projectsApi.getProject(1)
      const mockOnClick = jest.fn()

      expect(() => {
        render(<ProjectCard project={project} onClick={mockOnClick} />)
      }).not.toThrow()

      expect(screen.getByText('Minimal Project')).toBeInTheDocument()
      expect(screen.getByText('No description available')).toBeInTheDocument()
    })
  })

  describe('Loading States Integration', () => {
    it('shows loading states during API calls', async () => {
      const user = userEvent.setup()

      // Mock delayed response
      server.use(
        http.post('/api/projects/scan', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({ message: 'Success', project_count: 5 })
        })
      )

      const mockOnSearch = jest.fn()
      const mockOnScanComplete = jest.fn()

      render(<Header onSearch={mockOnSearch} onScanComplete={mockOnScanComplete} />)

      const scanButton = screen.getByRole('button', { name: /scan projects/i })
      await user.click(scanButton)

      // Should show loading state
      expect(scanButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /scanning.../i })).toBeInTheDocument()

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Scan completed')).toBeInTheDocument()
      }, { timeout: 200 })

      // Loading state should be cleared
      expect(scanButton).toBeEnabled()
    })
  })
})