import {
  Box,
  Container,
} from '@chakra-ui/react'
import { Header } from '@/components/layout/Header'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { RenameProjectModal } from '@/components/projects/RenameProjectModal'
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal'
import { useProjects } from '@/hooks/useProjects'

export default function HomePage() {
  const {
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
  } = useProjects()

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
          onProjectRename={handleRenameProject}
          onProjectDelete={handleDeleteProject}
        />
      </Container>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <RenameProjectModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        project={selectedProject}
        onSuccess={handleRenameSuccess}
      />

      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        project={selectedProject}
        onSuccess={handleDeleteSuccess}
      />
    </Box>
  )
}
