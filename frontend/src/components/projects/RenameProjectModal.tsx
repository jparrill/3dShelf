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
import { showSuccessToast, showErrorToast } from '@/utils/toast'

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

      showSuccessToast(toast, 'Project updated', `Project "${project.name}" has been renamed to "${name.trim()}"`)


      onSuccess()
      onClose()
      setName('')
      setDescription('')
    } catch (error: any) {
      console.error('Error updating project:', error)

      const errorMessage = error.response?.data?.error || 'An error occurred while updating the project'

      showErrorToast(toast, 'Failed to update project', errorMessage)
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
          <ModalHeader>Rename Project</ModalHeader>
          <ModalCloseButton isDisabled={isLoading} />

          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Renaming project: <strong>{project?.name}</strong>
              </Text>

              <FormControl isRequired>
                <FormLabel>New name</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter the new project name"
                  isDisabled={isLoading}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description (optional)"
                  isDisabled={isLoading}
                  resize="vertical"
                  minH="80px"
                />
              </FormControl>

              <Text fontSize="xs" color="gray.500" textAlign="center">
                The project directory will also be renamed to reflect the new name.
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
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isLoading}
              loadingText="Renaming..."
              isDisabled={!name.trim()}
            >
              Rename
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}