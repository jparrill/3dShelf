import axios from 'axios'
import {
  Project,
  ProjectFile,
  ProjectStats,
  ProjectsResponse,
  ProjectSearchResponse,
  READMEResponse,
  ScanResponse
} from '@/types/project'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const projectsApi = {
  // Get all projects
  getProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get('/api/projects')
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
    const response = await api.post('/api/projects/scan')
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