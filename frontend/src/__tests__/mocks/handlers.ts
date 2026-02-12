import { http, HttpResponse } from 'msw'
import type { Project } from '@/types/project'

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Test Project 1',
    path: '/projects/test-project-1',
    lastModified: new Date('2024-01-15'),
    status: 'active',
    fileCount: 15,
    totalSize: 1024000,
    description: 'A test project for unit testing',
    tags: ['test', 'mock'],
  },
  {
    id: '2',
    name: 'Test Project 2',
    path: '/projects/test-project-2',
    lastModified: new Date('2024-01-10'),
    status: 'archived',
    fileCount: 8,
    totalSize: 512000,
    description: 'Another test project',
    tags: ['test', 'archived'],
  },
]

const mockProject: Project = {
  id: '1',
  name: 'Test Project 1',
  path: '/projects/test-project-1',
  lastModified: new Date('2024-01-15'),
  status: 'active',
  fileCount: 15,
  totalSize: 1024000,
  description: 'A test project for unit testing',
  tags: ['test', 'mock'],
  files: [
    {
      name: 'model.stl',
      path: '/projects/test-project-1/model.stl',
      size: 512000,
      type: 'stl',
      lastModified: new Date('2024-01-15'),
    },
    {
      name: 'config.gcode',
      path: '/projects/test-project-1/config.gcode',
      size: 256000,
      type: 'gcode',
      lastModified: new Date('2024-01-14'),
    },
  ],
  stats: {
    totalFiles: 15,
    totalSize: 1024000,
    lastModified: new Date('2024-01-15'),
    fileTypes: {
      stl: 5,
      gcode: 3,
      jpg: 7,
    },
  },
  readme: '# Test Project 1\\n\\nThis is a test project for demonstration.',
}

export const handlers = [
  // Get all projects
  http.get('/api/projects', () => {
    return HttpResponse.json(mockProjects)
  }),

  // Get specific project
  http.get('/api/projects/:id', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json(mockProject)
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Search projects
  http.get('/api/projects/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')

    if (query) {
      const filtered = mockProjects.filter(project =>
        project.name.toLowerCase().includes(query.toLowerCase())
      )
      return HttpResponse.json(filtered)
    }

    return HttpResponse.json(mockProjects)
  }),

  // Scan filesystem
  http.post('/api/scan', () => {
    return HttpResponse.json({
      message: 'Scan completed',
      newProjects: 1,
      updatedProjects: 2
    })
  }),

  // Sync projects
  http.post('/api/projects/sync', () => {
    return HttpResponse.json({
      message: 'Sync completed',
      syncedProjects: mockProjects.length
    })
  }),

  // Get project files
  http.get('/api/projects/:id/files', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json(mockProject.files || [])
    }
    return HttpResponse.json([])
  }),

  // Get project stats
  http.get('/api/projects/:id/stats', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json(mockProject.stats)
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Get project README
  http.get('/api/projects/:id/readme', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json({ content: mockProject.readme })
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
  }),

  // Error simulation for testing
  http.get('/api/projects/error', () => {
    return new HttpResponse(null, { status: 500 })
  }),
]