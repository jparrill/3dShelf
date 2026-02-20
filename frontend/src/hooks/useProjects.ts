import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useToast } from '@chakra-ui/react'
import { Project } from '@/types/project'
import { projectsApi } from '@/lib/api'
import { showSuccessToast } from '@/utils/toast'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const router = useRouter()
  const toast = useToast()

  const loadProjects = async (searchQuery = '') => {
    setIsLoading(true)
    setError(null)

    try {
      let response
      if (searchQuery.trim()) {
        response = await projectsApi.searchProjects(searchQuery)
        setCurrentQuery(searchQuery)
      } else {
        response = await projectsApi.getProjects()
        setCurrentQuery('')
      }

      setProjects(response.projects)
    } catch (err) {
      setError('Failed to load projects')
      console.error('Error loading projects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleSearch = (query: string) => {
    loadProjects(query)
  }

  const handleScanComplete = () => {
    loadProjects(currentQuery)
  }

  const handleProjectClick = (project: Project) => {
    router.push(`/projects/${project.id}`)
  }

  const handleCreateProject = () => {
    setIsCreateModalOpen(true)
  }

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev])
    showSuccessToast(toast, 'Project created successfully', `Project "${project.name}" has been created`)
  }

  const handleRenameProject = (project: Project) => {
    setSelectedProject(project)
    setIsRenameModalOpen(true)
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteModalOpen(true)
  }

  const handleRenameSuccess = () => {
    loadProjects(currentQuery)
  }

  const handleDeleteSuccess = () => {
    if (selectedProject) {
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id))
    }
  }

  return {
    projects,
    isLoading,
    error,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isRenameModalOpen,
    setIsRenameModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    selectedProject,
    handleSearch,
    handleScanComplete,
    handleProjectClick,
    handleCreateProject,
    handleProjectCreated,
    handleRenameProject,
    handleDeleteProject,
    handleRenameSuccess,
    handleDeleteSuccess,
  }
}
