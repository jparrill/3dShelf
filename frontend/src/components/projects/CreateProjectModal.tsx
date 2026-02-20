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
  useToast,
  Box,
  Text,
  Icon,
  List,
  ListItem,
  HStack,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react'
import { useState, useRef } from 'react'
import { FiUpload, FiFile, FiX } from 'react-icons/fi'
import { projectsApi } from '@/lib/api'
import { Project } from '@/types/project'
import { showSuccessToast, showErrorToast, showWarningToast } from '@/utils/toast'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (project: Project) => void
}

interface FileUploadItem {
  file: File
  id: string
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<FileUploadItem[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'complete'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleFileSelection = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: FileUploadItem[] = []
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      // Validate file types (STL, 3MF, GCODE, CAD, README)
      const validExtensions = ['.stl', '.3mf', '.gcode', '.gco', '.dwg', '.step', '.iges', '.stp', '.igs', '.md']
      const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      const isReadme = file.name.toLowerCase().includes('readme')

      if (validExtensions.includes(fileExt) || isReadme) {
        newFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9)
        })
      } else {
        showWarningToast(toast, 'Invalid file type', `File "${file.name}" is not a supported file type`)
      }
    }

    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(item => item.id !== id))
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setFiles([])
    setUploadProgress(0)
    setUploadStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      showErrorToast(toast, 'Validation Error', 'Project name is required')
      return
    }

    setIsCreating(true)

    try {
      // Step 1: Create the project
      const project = await projectsApi.createProject(name.trim(), description.trim())

      showSuccessToast(toast, 'Project created', `Project "${project.name}" has been created successfully`)

      // Step 2: Upload files if any
      if (files.length > 0) {
        setUploadStatus('uploading')

        try {
          const fileList = new DataTransfer()
          files.forEach(item => fileList.items.add(item.file))

          const uploadResult = await projectsApi.uploadProjectFiles(project.id, fileList.files)

          setUploadProgress(100)
          setUploadStatus('complete')

          showSuccessToast(toast, 'Files uploaded', `${uploadResult.uploaded_count} file(s) uploaded successfully`)

          if (uploadResult.errors && uploadResult.errors.length > 0) {
            showWarningToast(toast, 'Some files failed to upload', uploadResult.errors.join(', '))
          }
        } catch (uploadError) {
          showErrorToast(toast, 'File upload failed', 'Failed to upload files to the project')
        }
      }

      onProjectCreated(project)
      resetForm()
      onClose()

    } catch (error) {
      console.error('Error creating project:', error)
      showErrorToast(toast, 'Failed to create project', error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      resetForm()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader id="create-project-modal-header">Create New Project</ModalHeader>
        <ModalCloseButton isDisabled={isCreating} />

        <ModalBody>
          <VStack spacing={6}>
            <FormControl isRequired>
              <FormLabel htmlFor="project-name">Project Name</FormLabel>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                isDisabled={isCreating}
              />
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="project-description">Description</FormLabel>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description (optional)"
                rows={3}
                isDisabled={isCreating}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Project Files (Optional)</FormLabel>
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".stl,.3mf,.gcode,.gco,.dwg,.step,.iges,.stp,.igs,.md"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelection(e.target.files)}
                  disabled={isCreating}
                />

                <Button
                  leftIcon={<Icon as={FiUpload} />}
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  isDisabled={isCreating}
                  width="100%"
                  mb={4}
                >
                  Choose Files to Upload
                </Button>

                <Text fontSize="sm" color="gray.600" mb={3}>
                  Supported formats: STL, 3MF, GCODE, CAD files, README.md
                </Text>

                {files.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Selected Files ({files.length}):
                    </Text>
                    <List spacing={2} maxH="150px" overflowY="auto">
                      {files.map((item) => (
                        <ListItem key={item.id}>
                          <HStack justify="space-between" p={2} bg="gray.50" rounded="md">
                            <HStack>
                              <Icon as={FiFile} color="gray.500" />
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {item.file.name}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                </Text>
                              </VStack>
                            </HStack>
                            <Button
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => removeFile(item.id)}
                              isDisabled={isCreating}
                            >
                              <Icon as={FiX} />
                            </Button>
                          </HStack>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            </FormControl>

            {uploadStatus === 'uploading' && (
              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={2} flex={1}>
                  <HStack>
                    <AlertTitle>Uploading files...</AlertTitle>
                  </HStack>
                  <Progress value={uploadProgress} width="100%" colorScheme="blue" />
                </VStack>
              </Alert>
            )}

            {uploadStatus === 'complete' && (
              <Alert status="success">
                <AlertIcon />
                <AlertTitle>Files uploaded successfully!</AlertTitle>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isCreating}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isCreating}
            loadingText={uploadStatus === 'uploading' ? 'Uploading...' : 'Creating...'}
          >
            Create Project
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}