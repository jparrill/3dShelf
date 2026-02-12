import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Flex,
  useToast
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { Header } from '@/components/layout/Header'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { Project } from '@/types/project'
import { projectsApi } from '@/lib/api'

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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
    // Reload projects after scan
    loadProjects(currentQuery)
  }

  const handleProjectClick = (project: Project) => {
    router.push(`/projects/${project.id}`)
  }

  const handleCreateProject = () => {
    setIsCreateModalOpen(true)
  }

  const handleProjectCreated = (project: Project) => {
    // Add the new project to the list
    setProjects(prev => [project, ...prev])
    toast({
      title: 'Project created successfully',
      description: `Project "${project.name}" has been created`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Header
        onSearch={handleSearch}
        onScanComplete={handleScanComplete}
        onCreateProject={handleCreateProject}
      />

      <Container maxW="container.xl" py={8}>
        <ProjectGrid
          projects={projects}
          isLoading={isLoading}
          error={error}
          onProjectClick={handleProjectClick}
        />
      </Container>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </Box>
  )
}