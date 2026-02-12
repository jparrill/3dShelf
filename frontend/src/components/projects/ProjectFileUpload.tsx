import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Progress,
  Alert,
  AlertIcon,
  Badge,
  Card,
  CardBody,
  Divider,
  useToast,
  Icon,
  Flex,
  Radio,
  RadioGroup,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react'
import { FiUpload, FiFile, FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi'
import { ProjectFile, UploadTask, FileConflict, ConflictResolution } from '@/types/project'
import { projectsApi } from '@/lib/api'
import { formatFileSize } from '@/utils/fileTypes'

interface ProjectFileUploadProps {
  projectId: number
  isOpen: boolean
  onClose: () => void
  onUploadComplete: (uploadedFiles: ProjectFile[]) => void
}

export const ProjectFileUpload: React.FC<ProjectFileUploadProps> = ({
  projectId,
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)
  const [conflicts, setConflicts] = useState<FileConflict[]>([])
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // Reset state when modal is closed
  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([])
      setUploadTasks([])
      setShowConflicts(false)
      setConflicts([])
      setResolutions({})
      onClose()
    }
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)

    // Create upload tasks
    const tasks: UploadTask[] = fileArray.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      filename: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }))
    setUploadTasks(tasks)
  }

  // Check for conflicts before upload
  const checkConflicts = async () => {
    try {
      const filenames = selectedFiles.map(file => file.name)

      // Validate filenames array
      if (!filenames || filenames.length === 0) {
        console.error('No filenames to check for conflicts')
        return true // No conflicts if no files
      }

      console.log('Checking conflicts for files:', filenames)
      const response = await projectsApi.checkUploadConflicts(projectId, filenames)

      if (response.conflicts.length > 0) {
        setConflicts(response.conflicts)
        setShowConflicts(true)

        // Initialize resolutions to skip by default
        const defaultResolutions: Record<string, ConflictResolution> = {}
        response.conflicts.forEach(conflict => {
          defaultResolutions[conflict.filename] = 'skip'
        })
        setResolutions(defaultResolutions)

        // Update upload tasks with conflicts
        setUploadTasks(prev => prev.map(task => {
          const conflict = response.conflicts.find(c => c.filename === task.filename)
          return conflict ? { ...task, conflict } : task
        }))

        return false // Has conflicts, need resolution
      }

      return true // No conflicts, can proceed
    } catch (error) {
      toast({
        title: 'Error checking conflicts',
        description: 'Failed to check for file conflicts',
        status: 'error',
        duration: 5000
      })
      return false
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    // If we're not showing conflicts yet, check for them first
    if (!showConflicts) {
      const canProceed = await checkConflicts()
      if (!canProceed) {
        // Conflicts were found and are now being shown, don't proceed with upload
        return
      }
    }

    setIsUploading(true)

    try {
      // Create FormData directly with selected files and resolutions
      const formData = new FormData()

      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      // Add conflict resolutions if provided
      if (resolutions && Object.keys(resolutions).length > 0) {
        for (const [filename, resolution] of Object.entries(resolutions)) {
          formData.append(`resolution_${filename}`, resolution)
        }
      }

      // Upload with resolutions using direct API call
      const response = await projectsApi.uploadFormData(projectId, formData)

      // Update task statuses
      setUploadTasks(prev => prev.map(task => {
        if (response.uploaded_files.some(f => f.filename === task.filename)) {
          return { ...task, status: 'completed', progress: 100 }
        } else if (response.skipped_files?.includes(task.filename)) {
          return { ...task, status: 'skipped', progress: 0 }
        } else if (response.errors?.some(error => error.includes(task.filename))) {
          const error = response.errors.find(e => e.includes(task.filename))
          return { ...task, status: 'failed', progress: 0, error }
        }
        return task
      }))

      // Show success toast
      toast({
        title: 'Upload completed',
        description: `${response.uploaded_count} files uploaded successfully`,
        status: 'success',
        duration: 3000
      })

      // Call onUploadComplete with uploaded files
      onUploadComplete(response.uploaded_files)

      // Close modal after short delay
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload files',
        status: 'error',
        duration: 5000
      })

      // Mark all tasks as failed
      setUploadTasks(prev => prev.map(task => ({
        ...task,
        status: 'failed',
        progress: 0,
        error: 'Upload failed'
      })))
    } finally {
      setIsUploading(false)
    }
  }

  // Get status color for upload task
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green'
      case 'failed': return 'red'
      case 'skipped': return 'yellow'
      case 'uploading': return 'blue'
      default: return 'gray'
    }
  }

  // Get status icon for upload task
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return FiCheck
      case 'failed': return FiX
      case 'skipped': return FiX
      case 'uploading': return FiUpload
      default: return FiFile
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" closeOnOverlayClick={!isUploading}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Upload Files</ModalHeader>
        {!isUploading && <ModalCloseButton />}

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* File Selection */}
            {!showConflicts && (
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".stl,.3mf,.gcode,.gco,.dwg,.step,.iges,.stp,.igs,.md"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Icon as={FiFile} />}
                  variant="outline"
                  width="full"
                >
                  {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 'Select Files'}
                </Button>
              </Box>
            )}

            {/* Conflict Resolution */}
            {showConflicts && conflicts.length > 0 && (
              <Box>
                <Alert status="warning" mb={4}>
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">File Conflicts Detected</Text>
                    <Text fontSize="sm">
                      The following files already exist. Choose how to handle each conflict:
                    </Text>
                  </Box>
                </Alert>

                <VStack spacing={3} align="stretch">
                  {conflicts.map((conflict, index) => (
                    <Card key={index} variant="outline">
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <Flex justify="space-between" align="center">
                            <HStack>
                              <Icon as={FiAlertTriangle} color="orange.500" />
                              <Text fontWeight="medium">{conflict.filename}</Text>
                            </HStack>
                            <Badge colorScheme="orange">Conflict</Badge>
                          </Flex>

                          <Text fontSize="sm" color="gray.600">
                            {conflict.reason}
                          </Text>

                          <RadioGroup
                            value={resolutions[conflict.filename]}
                            onChange={(value: ConflictResolution) =>
                              setResolutions(prev => ({ ...prev, [conflict.filename]: value }))
                            }
                          >
                            <Stack spacing={2}>
                              <Radio value="overwrite" colorScheme="red">
                                <Box>
                                  <Text fontWeight="medium">Overwrite existing file</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Replace the existing file with the new one
                                  </Text>
                                </Box>
                              </Radio>
                              <Radio value="skip" colorScheme="yellow">
                                <Box>
                                  <Text fontWeight="medium">Skip this file</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Keep the existing file, don't upload the new one
                                  </Text>
                                </Box>
                              </Radio>
                              <Radio value="rename" colorScheme="green">
                                <Box>
                                  <Text fontWeight="medium">Save with timestamp</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Add timestamp to filename and save both files
                                  </Text>
                                </Box>
                              </Radio>
                            </Stack>
                          </RadioGroup>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Upload Tasks Progress */}
            {uploadTasks.length > 0 && (
              <Box>
                <Text fontSize="lg" fontWeight="medium" mb={3}>
                  Upload Progress
                </Text>
                <VStack spacing={2} align="stretch">
                  {uploadTasks.map((task) => (
                    <Card key={task.id} variant="outline">
                      <CardBody py={3}>
                        <Flex justify="space-between" align="center" mb={2}>
                          <HStack>
                            <Icon
                              as={getStatusIcon(task.status)}
                              color={`${getStatusColor(task.status)}.500`}
                            />
                            <Text>{task.filename}</Text>
                            <Text fontSize="sm" color="gray.500">
                              ({formatFileSize(task.size)})
                            </Text>
                          </HStack>
                          <Badge colorScheme={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </Flex>

                        {task.status === 'uploading' && (
                          <Progress
                            value={task.progress}
                            colorScheme={getStatusColor(task.status)}
                            size="sm"
                          />
                        )}

                        {task.error && (
                          <Text fontSize="sm" color="red.500" mt={1}>
                            {task.error}
                          </Text>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="ghost"
              onClick={handleClose}
              isDisabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Cancel'}
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={FiUpload} />}
              onClick={handleUpload}
              isLoading={isUploading}
              isDisabled={selectedFiles.length === 0}
            >
              {showConflicts ? 'Upload with Resolutions' : 'Upload Files'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}