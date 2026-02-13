import {
  SimpleGrid,
  Box,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react'
import { Project } from '@/types/project'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: Project[]
  isLoading: boolean
  error: string | null
  onProjectClick: (project: Project) => void
  onProjectRename?: (project: Project) => void
  onProjectDelete?: (project: Project) => void
}

export function ProjectGrid({ projects, isLoading, error, onProjectClick, onProjectRename, onProjectDelete }: ProjectGridProps) {
  if (isLoading) {
    return (
      <Center py={20}>
        <Box textAlign="center">
          <Spinner size="xl" color="brand.500" thickness="4px" mb={4} />
          <Text color="gray.600">Loading projects...</Text>
        </Box>
      </Center>
    )
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md" mb={6}>
        <AlertIcon />
        <Box>
          <AlertTitle>Failed to load projects!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    )
  }

  if (projects.length === 0) {
    return (
      <Center py={20}>
        <Box textAlign="center">
          <Text fontSize="xl" color="gray.600" mb={2}>
            No projects found
          </Text>
          <Text color="gray.500">
            Try scanning your filesystem for 3D printing projects
          </Text>
        </Box>
      </Center>
    )
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={6}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project)}
          onRename={onProjectRename}
          onDelete={onProjectDelete}
        />
      ))}
    </SimpleGrid>
  )
}