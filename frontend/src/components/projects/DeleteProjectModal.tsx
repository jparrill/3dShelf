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

      toast({
        title: 'Proyecto borrado',
        description: `El proyecto "${project.name}" y todos sus archivos han sido eliminados permanentemente`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error deleting project:', error)

      const errorMessage = error.response?.data?.error || 'Error al borrar el proyecto'

      toast({
        title: 'Error al borrar proyecto',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
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
        <ModalHeader color="red.600">Borrar Proyecto</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="warning">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <AlertTitle>¡Esta acción es irreversible!</AlertTitle>
                <AlertDescription>
                  Está a punto de borrar permanentemente el proyecto y todos sus archivos.
                </AlertDescription>
              </VStack>
            </Alert>

            <VStack spacing={3} align="start" bg="gray.50" p={4} borderRadius="md">
              <Text fontSize="md" fontWeight="semibold">
                Proyecto a borrar:
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
                  {fileCount} archivo{fileCount !== 1 ? 's' : ''}
                </Badge>
                <Badge colorScheme={project?.status === 'healthy' ? 'green' : project?.status === 'inconsistent' ? 'yellow' : 'red'}>
                  {project?.status}
                </Badge>
              </Flex>

              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                Ubicación: {project?.path}
              </Text>
            </VStack>

            <Alert status="error">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <AlertDescription fontSize="sm">
                  • Se eliminará el directorio del proyecto del sistema de archivos
                  <br />
                  • Se eliminarán todos los archivos contenidos (STL, 3MF, G-code, etc.)
                  <br />
                  • Se removerán todos los registros de la base de datos
                  <br />
                  • <strong>Esta operación NO se puede deshacer</strong>
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
            Cancelar
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            isLoading={isLoading}
            loadingText="Borrando..."
          >
            Borrar Proyecto Permanentemente
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}