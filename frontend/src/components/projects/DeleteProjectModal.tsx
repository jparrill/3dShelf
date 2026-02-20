import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Flex,
  useToast
} from '@chakra-ui/react'
import { useState } from 'react'
import { Project } from '@/types/project'
import { projectsApi } from '@/lib/api'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import { getProjectStatusColor } from '@/utils/statusColors'

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSuccess: () => void
}

export function DeleteProjectModal({ isOpen, onClose, project, onSuccess }: DeleteProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const fileCount = project?.files?.length || 0

  const handleDelete = async () => {
    if (!project) return

    setIsLoading(true)

    try {
      await projectsApi.deleteProject(project.id)

      showSuccessToast(toast, 'Project deleted', `Project "${project.name}" and all its files have been permanently deleted`)

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error deleting project:', error)

      const errorMessage = error.response?.data?.error || 'An error occurred while deleting the project'

      showErrorToast(toast, 'Failed to delete project', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="red.600">Delete Project</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="warning">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <AlertTitle>This action is irreversible!</AlertTitle>
                <AlertDescription>
                  You are about to permanently delete this project and all its files.
                </AlertDescription>
              </VStack>
            </Alert>

            <VStack spacing={3} align="start" bg="gray.50" p={4} borderRadius="md">
              <Text fontSize="md" fontWeight="semibold">
                Project to delete:
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="red.600">
                {project?.name}
              </Text>
              {project?.description && (
                <Text fontSize="sm" color="gray.600">
                  {project.description}
                </Text>
              )}

              <Flex align="center" gap={3}>
                <Badge colorScheme="blue">
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                </Badge>
                <Badge colorScheme={project ? getProjectStatusColor(project.status) : 'gray'}>
                  {project?.status}
                </Badge>
              </Flex>

              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                Location: {project?.path}
              </Text>
            </VStack>

            <Alert status="error">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <AlertDescription fontSize="sm">
                  • The project directory will be removed from the filesystem
                  <br />
                  • All contained files will be deleted (STL, 3MF, G-code, etc.)
                  <br />
                  • All database records will be removed
                  <br />
                  • <strong>This operation CANNOT be undone</strong>
                </AlertDescription>
              </VStack>
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={handleClose}
            isDisabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            isLoading={isLoading}
            loadingText="Deleting..."
          >
            Delete Project Permanently
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}