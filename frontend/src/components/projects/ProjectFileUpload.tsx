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
  useToast,
  Icon,
} from '@chakra-ui/react'
import { FiUpload, FiFile } from 'react-icons/fi'
import { ProjectFile, UploadTask, FileConflict, ConflictResolution } from '@/types/project'
import { projectsApi } from '@/lib/api'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import { FileConflictResolver } from './FileConflictResolver'
import { UploadProgressList } from './UploadProgressList'

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)

    const tasks: UploadTask[] = fileArray.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      filename: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }))
    setUploadTasks(tasks)
  }

  const checkConflicts = async () => {
    try {
      const filenames = selectedFiles.map(file => file.name)

      if (!filenames || filenames.length === 0) {
        return true
      }

      const response = await projectsApi.checkUploadConflicts(projectId, filenames)

      if (response.conflicts && response.conflicts.length > 0) {
        setConflicts(response.conflicts)
        setShowConflicts(true)
        setResolutions({})

        setUploadTasks(prev => prev.map(task => {
          const conflict = response.conflicts.find(c => c.filename === task.filename)
          return conflict ? { ...task, conflict } : task
        }))

        return false
      }

      return true
    } catch (error) {
      showErrorToast(toast, 'Error checking conflicts', 'Failed to check for file conflicts')
      return false
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    if (!showConflicts) {
      const canProceed = await checkConflicts()
      if (!canProceed) return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()

      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      if (resolutions && Object.keys(resolutions).length > 0) {
        for (const [filename, resolution] of Object.entries(resolutions)) {
          formData.append(`resolution_${filename}`, resolution)
        }
      }

      const response = await projectsApi.uploadFormData(projectId, formData)

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

      showSuccessToast(toast, 'Upload completed', `${response.uploaded_count} files uploaded successfully`)

      onUploadComplete(response.uploaded_files)

      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      showErrorToast(toast, 'Upload failed', 'Failed to upload files')

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

  const handleResolutionChange = (filename: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({ ...prev, [filename]: resolution }))
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" closeOnOverlayClick={!isUploading}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader id="upload-files-modal-header">Upload Files</ModalHeader>
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
              <FileConflictResolver
                conflicts={conflicts}
                resolutions={resolutions}
                onResolutionChange={handleResolutionChange}
              />
            )}

            {/* Upload Tasks Progress */}
            {uploadTasks.length > 0 && (
              <UploadProgressList tasks={uploadTasks} />
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
              isDisabled={
                selectedFiles.length === 0 ||
                (showConflicts && conflicts.some(conflict => !resolutions[conflict.filename]))
              }
            >
              {showConflicts ? 'Upload with Resolutions' : 'Upload Files'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
