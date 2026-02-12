import axios from 'axios'
import { projectsApi } from '@/lib/api'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}

// Mock axios.create to return our mock instance
mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

describe('projectsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProjects', () => {
    it('fetches all projects successfully', async () => {
      const mockData = { projects: [{ id: 1, name: 'Test Project' }] }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData })

      const result = await projectsApi.getProjects()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects')
      expect(result).toEqual(mockData)
    })

    it('handles API error when fetching projects', async () => {
      const mockError = new Error('API Error')
      mockAxiosInstance.get.mockRejectedValueOnce(mockError)

      await expect(projectsApi.getProjects()).rejects.toThrow('API Error')
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects')
    })
  })

  describe('getProject', () => {
    it('fetches a specific project successfully', async () => {
      const mockProject = { id: 1, name: 'Test Project' }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProject })

      const result = await projectsApi.getProject(1)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/1')
      expect(result).toEqual(mockProject)
    })

    it('handles 404 error for non-existent project', async () => {
      const mockError = { response: { status: 404 } }
      mockAxiosInstance.get.mockRejectedValueOnce(mockError)

      await expect(projectsApi.getProject(999)).rejects.toEqual(mockError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/999')
    })
  })

  describe('searchProjects', () => {
    it('searches projects with query parameter', async () => {
      const mockResults = { projects: [{ id: 1, name: 'Searched Project' }] }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResults })

      const result = await projectsApi.searchProjects('test query')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/search', {
        params: { q: 'test query' }
      })
      expect(result).toEqual(mockResults)
    })

    it('handles empty search query', async () => {
      const mockResults = { projects: [] }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResults })

      const result = await projectsApi.searchProjects('')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/search', {
        params: { q: '' }
      })
      expect(result).toEqual(mockResults)
    })
  })

  describe('scanProjects', () => {
    it('initiates project scan successfully', async () => {
      const mockResponse = { message: 'Scan completed', project_count: 5 }
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await projectsApi.scanProjects()

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/projects/scan')
      expect(result).toEqual(mockResponse)
    })

    it('handles scan timeout error', async () => {
      const mockError = { code: 'ECONNABORTED', message: 'timeout' }
      mockAxiosInstance.post.mockRejectedValueOnce(mockError)

      await expect(projectsApi.scanProjects()).rejects.toEqual(mockError)
    })
  })

  describe('syncProject', () => {
    it('syncs a specific project successfully', async () => {
      const mockResponse = {
        message: 'Sync completed',
        project: { id: 1, name: 'Synced Project' }
      }
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse })

      const result = await projectsApi.syncProject(1)

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/projects/1/sync')
      expect(result).toEqual(mockResponse)
    })

    it('handles sync failure', async () => {
      const mockError = { response: { status: 500 } }
      mockAxiosInstance.put.mockRejectedValueOnce(mockError)

      await expect(projectsApi.syncProject(1)).rejects.toEqual(mockError)
    })
  })

  describe('getProjectFiles', () => {
    it('fetches project files successfully', async () => {
      const mockFiles = {
        files: [
          { name: 'model.stl', size: 1024, file_type: 'stl' },
          { name: 'config.gcode', size: 512, file_type: 'gcode' }
        ],
        count: 2
      }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockFiles })

      const result = await projectsApi.getProjectFiles(1)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/1/files')
      expect(result).toEqual(mockFiles)
    })
  })

  describe('getProjectREADME', () => {
    it('fetches project README successfully', async () => {
      const mockREADME = { content: '# Test Project\\n\\nDescription here' }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockREADME })

      const result = await projectsApi.getProjectREADME(1)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/1/readme')
      expect(result).toEqual(mockREADME)
    })

    it('handles missing README file', async () => {
      const mockError = { response: { status: 404 } }
      mockAxiosInstance.get.mockRejectedValueOnce(mockError)

      await expect(projectsApi.getProjectREADME(1)).rejects.toEqual(mockError)
    })
  })

  describe('getProjectStats', () => {
    it('fetches project statistics successfully', async () => {
      const mockStats = {
        total_files: 10,
        total_size: 2048000,
        file_types: { stl: 3, gcode: 2, jpg: 5 }
      }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockStats })

      const result = await projectsApi.getProjectStats(1)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/projects/1/stats')
      expect(result).toEqual(mockStats)
    })
  })

  describe('healthCheck', () => {
    it('performs health check successfully', async () => {
      const mockHealth = { status: 'healthy', project_count: 15 }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockHealth })

      const result = await projectsApi.healthCheck()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/health')
      expect(result).toEqual(mockHealth)
    })

    it('handles unhealthy service response', async () => {
      const mockError = { response: { status: 503 } }
      mockAxiosInstance.get.mockRejectedValueOnce(mockError)

      await expect(projectsApi.healthCheck()).rejects.toEqual(mockError)
    })
  })

  describe('axios configuration', () => {
    it('creates axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8080', // default when NEXT_PUBLIC_API_URL is not set
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('error handling', () => {
    it('propagates axios timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded')
      timeoutError.name = 'ECONNABORTED'
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError)

      await expect(projectsApi.getProjects()).rejects.toThrow('timeout of 30000ms exceeded')
    })

    it('propagates network errors', async () => {
      const networkError = new Error('Network Error')
      networkError.name = 'NETWORK_ERROR'
      mockAxiosInstance.get.mockRejectedValueOnce(networkError)

      await expect(projectsApi.getProjects()).rejects.toThrow('Network Error')
    })

    it('propagates HTTP errors with response data', async () => {
      const httpError = {
        response: {
          status: 422,
          data: { error: 'Validation failed', details: 'Missing required fields' }
        }
      }
      mockAxiosInstance.post.mockRejectedValueOnce(httpError)

      await expect(projectsApi.scanProjects()).rejects.toEqual(httpError)
    })
  })
})