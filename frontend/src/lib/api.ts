import axios from 'axios'
import {
  Project,
  ProjectFile,
  ProjectStats,
  ProjectsResponse,
  ProjectSearchResponse,
  READMEResponse,
  ScanResponse,
  UploadCheckResponse,
  UploadResponse,
  ConflictResolution
} from '@/types/project'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  // Remove default Content-Type to allow axios to set it automatically for FormData
})

export const projectsApi = {
  // Get all projects
  getProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get('/api/projects')
    return response.data
  },

  // Create a new project
  createProject: async (name: string, description?: string): Promise<Project> => {
    const response = await api.post('/api/projects', {
      name,
      description: description || ''
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  // Get a specific project
  getProject: async (id: number): Promise<Project> => {
    const response = await api.get(`/api/projects/${id}`)
    return response.data
  },

  // Search projects
  searchProjects: async (query: string): Promise<ProjectSearchResponse> => {
    const response = await api.get('/api/projects/search', {
      params: { q: query }
    })
    return response.data
  },

  // Scan filesystem for projects
  scanProjects: async (): Promise<ScanResponse> => {
    const response = await api.post('/api/projects/scan', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  // Sync a specific project
  syncProject: async (id: number): Promise<{ message: string; project: Project }> => {
    const response = await api.put(`/api/projects/${id}/sync`)
    return response.data
  },

  // Get project files
  getProjectFiles: async (id: number): Promise<{ files: ProjectFile[]; count: number }> => {
    const response = await api.get(`/api/projects/${id}/files`)
    return response.data
  },

  // Check for upload conflicts before uploading
  checkUploadConflicts: async (id: number, filenames: string[]): Promise<UploadCheckResponse> => {
    const response = await api.post(`/api/projects/${id}/files/check-conflicts`, {
      filenames
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  // Upload files to a project (legacy method without conflict resolution)
  uploadProjectFiles: async (id: number, files: FileList): Promise<UploadResponse> => {
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    const response = await api.post(`/api/projects/${id}/files`, formData)
    return response.data
  },

  // Upload files to a project with conflict resolution
  uploadProjectFilesWithResolution: async (
    id: number,
    files: FileList,
    resolutions?: Record<string, ConflictResolution>
  ): Promise<UploadResponse> => {
    const formData = new FormData()

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    // Add conflict resolutions if provided
    if (resolutions) {
      for (const [filename, resolution] of Object.entries(resolutions)) {
        formData.append(`resolution_${filename}`, resolution)
      }
    }

    const response = await api.post(`/api/projects/${id}/files`, formData)
    return response.data
  },

  // Upload FormData directly (used by upload component)
  uploadFormData: async (id: number, formData: FormData): Promise<UploadResponse> => {
    const response = await api.post(`/api/projects/${id}/files`, formData)
    return response.data
  },

  // Get project README
  getProjectREADME: async (id: number): Promise<READMEResponse> => {
    const response = await api.get(`/api/projects/${id}/readme`)
    return response.data
  },

  // Get project statistics
  getProjectStats: async (id: number): Promise<ProjectStats> => {
    const response = await api.get(`/api/projects/${id}/stats`)
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; project_count: number }> => {
    const response = await api.get('/api/health')
    return response.data
  }
}

export default api