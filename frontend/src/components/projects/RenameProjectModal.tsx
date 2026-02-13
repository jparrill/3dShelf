import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Text,
  useToast
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { Project } from '@/types/project'
import { projectsApi } from '@/lib/api'

interface RenameProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSuccess: () => void
}

export function RenameProjectModal({ isOpen, onClose, project, onSuccess }: RenameProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (project && isOpen) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project || !name.trim()) {
      return
    }

    setIsLoading(true)

    try {
      await projectsApi.updateProject(project.id, name.trim(), description.trim())

      toast({
        title: 'Proyecto actualizado',
        description: `El proyecto "${project.name}" ha sido renombrado a "${name.trim()}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      onSuccess()
      onClose()
      setName('')
      setDescription('')
    } catch (error: any) {
      console.error('Error updating project:', error)

      const errorMessage = error.response?.data?.error || 'Error al actualizar el proyecto'

      toast({
        title: 'Error al actualizar proyecto',
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
      setName('')
      setDescription('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Renombrar Proyecto</ModalHeader>
          <ModalCloseButton isDisabled={isLoading} />

          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Está renombrando el proyecto: <strong>{project?.name}</strong>
              </Text>

              <FormControl isRequired>
                <FormLabel>Nuevo nombre</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ingrese el nuevo nombre del proyecto"
                  isDisabled={isLoading}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Descripción</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del proyecto (opcional)"
                  isDisabled={isLoading}
                  resize="vertical"
                  minH="80px"
                />
              </FormControl>

              <Text fontSize="xs" color="gray.500" textAlign="center">
                El directorio del proyecto también será renombrado para reflejar el nuevo nombre.
              </Text>
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
              colorScheme="blue"
              type="submit"
              isLoading={isLoading}
              loadingText="Renombrando..."
              isDisabled={!name.trim()}
            >
              Renombrar
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}