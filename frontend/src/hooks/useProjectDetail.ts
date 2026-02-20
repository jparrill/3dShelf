import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useDisclosure, useToast } from '@chakra-ui/react'
import { Project, ProjectFile, ProjectStats, READMEResponse } from '@/types/project'
import { projectsApi } from '@/lib/api'
import { showSuccessToast, showErrorToast, showInfoToast } from '@/utils/toast'

export function useProjectDetail() {
  const router = useRouter()
  const { id } = router.query
  const toast = useToast()
  const { isOpen: isDeleteDialogOpen, onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure()

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [readme, setReadme] = useState<READMEResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null)
  const [isDeletingFile, setIsDeletingFile] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const projectId = Number(id)

  const loadProjectData = async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const [projectData, filesData, statsData, readmeData] = await Promise.all([
        projectsApi.getProject(projectId),
        projectsApi.getProjectFiles(projectId),
        projectsApi.getProjectStats(projectId),
        projectsApi.getProjectREADME(projectId)
      ])

      setProject(projectData)
      setFiles(filesData.files)
      setStats(statsData)
      setReadme(readmeData)
    } catch (err) {
      setError('Failed to load project details')
      console.error('Error loading project:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    if (!projectId) return

    setIsSyncing(true)
    try {
      await projectsApi.syncProject(projectId)
      await loadProjectData()
    } catch (err) {
      setError('Failed to sync project')
      console.error('Error syncing project:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUploadComplete = async (uploadedFiles: ProjectFile[]) => {
    await loadProjectData()
  }

  const handleDeleteClick = (file: ProjectFile) => {
    setFileToDelete(file)
    onDeleteDialogOpen()
  }

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !projectId) return

    setIsDeletingFile(true)
    try {
      await projectsApi.deleteProjectFile(projectId, fileToDelete.id)

      showSuccessToast(toast, 'File deleted successfully', `${fileToDelete.filename} has been removed from the project`)

      await loadProjectData()
    } catch (err) {
      console.error('Error deleting file:', err)
      showErrorToast(toast, 'Failed to delete file', 'There was an error deleting the file. Please try again.')
    } finally {
      setIsDeletingFile(false)
      setFileToDelete(null)
      onDeleteDialogClose()
    }
  }

  const handleDeleteCancel = () => {
    setFileToDelete(null)
    onDeleteDialogClose()
  }

  const handleDownloadFile = async (file: ProjectFile) => {
    if (!projectId) return

    try {
      await projectsApi.downloadProjectFile(projectId, file.id)
      showInfoToast(toast, 'File download started', `${file.filename} is being downloaded`)
    } catch (err) {
      console.error('Error downloading file:', err)
      showErrorToast(toast, 'Failed to download file', 'There was an error downloading the file. Please try again.')
    }
  }

  const handleDownloadProject = async () => {
    if (!projectId) return

    try {
      await projectsApi.downloadProject(projectId)
      showInfoToast(toast, 'Project download started', `${project?.name || 'Project'} is being downloaded as ZIP`)
    } catch (err) {
      console.error('Error downloading project:', err)
      showErrorToast(toast, 'Failed to download project', 'There was an error downloading the project. Please try again.')
    }
  }

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  return {
    project,
    files,
    stats,
    readme,
    isLoading,
    error,
    isSyncing,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isDeleteDialogOpen,
    fileToDelete,
    isDeletingFile,
    cancelRef,
    handleSync,
    handleUploadComplete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleDownloadFile,
    handleDownloadProject,
    router,
  }
}
