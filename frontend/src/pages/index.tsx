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
import { Project } from '@/types/project'
import { projectsApi } from '@/lib/api'

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')

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

  return (
    <Box minH="100vh" bg="gray.50">
      <Header onSearch={handleSearch} onScanComplete={handleScanComplete} />

      <Container maxW="container.xl" py={8}>
        <ProjectGrid
          projects={projects}
          isLoading={isLoading}
          error={error}
          onProjectClick={handleProjectClick}
        />
      </Container>
    </Box>
  )
}