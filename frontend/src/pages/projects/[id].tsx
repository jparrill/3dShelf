import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Button,
  Badge,
  Icon,
  Stack,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useToast,
  IconButton,
  Tooltip
} from '@chakra-ui/react'
import { FiArrowLeft, FiRefreshCw, FiFolder, FiUpload, FiTrash2 } from 'react-icons/fi'
import { Project, ProjectFile, ProjectStats, READMEResponse } from '@/types/project'
import { projectsApi } from '@/lib/api'
import { getFileTypeIcon, getFileTypeName, formatFileSize } from '@/utils/fileTypes'
import { ProjectFileUpload } from '@/components/projects/ProjectFileUpload'

export default function ProjectDetailPage() {
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
      await loadProjectData() // Reload data after sync
    } catch (err) {
      setError('Failed to sync project')
      console.error('Error syncing project:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUploadComplete = async (uploadedFiles: ProjectFile[]) => {
    // Reload project data to show new files
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

      toast({
        title: "File deleted successfully",
        description: `${fileToDelete.filename} has been removed from the project`,
        status: "success",
        duration: 3000,
        isClosable: true,
      })

      // Reload project data to update the file list
      await loadProjectData()

    } catch (err) {
      console.error('Error deleting file:', err)
      toast({
        title: "Failed to delete file",
        description: "There was an error deleting the file. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      })
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

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Center py={20}>
          <Box textAlign="center">
            <Spinner size="xl" color="brand.500" thickness="4px" mb={4} />
            <Text color="gray.600">Loading project details...</Text>
          </Box>
        </Center>
      </Box>
    )
  }

  if (error || !project) {
    return (
      <Box minH="100vh" bg="gray.50" p={8}>
        <Container maxW="container.xl">
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Failed to load project!</AlertTitle>
              <AlertDescription>{error || 'Project not found'}</AlertDescription>
            </Box>
          </Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" px={6} py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={4}>
              <Button
                variant="ghost"
                leftIcon={<Icon as={FiArrowLeft} />}
                onClick={() => router.push('/')}
              >
                Back to Projects
              </Button>
              <Icon as={FiFolder} boxSize={6} color="brand.500" />
              <Heading size="lg" color="gray.800">
                {project.name}
              </Heading>
              <Badge colorScheme={project.status === 'healthy' ? 'green' : project.status === 'inconsistent' ? 'yellow' : 'red'}>
                {project.status}
              </Badge>
            </Flex>

            <Flex gap={3}>
              <Button
                leftIcon={<Icon as={FiUpload} />}
                onClick={() => setIsUploadModalOpen(true)}
                colorScheme="brand"
                variant="solid"
              >
                Upload Files
              </Button>
              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={handleSync}
                isLoading={isSyncing}
                loadingText="Syncing..."
                colorScheme="brand"
                variant="outline"
              >
                Sync Project
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <Stack spacing={6}>
          {/* Project Info */}
          <Card>
            <CardBody>
              <Stack spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Project Path</Text>
                  <Text fontFamily="mono" fontSize="sm" bg="gray.100" p={2} borderRadius="md">
                    {project.path}
                  </Text>
                </Box>

                {stats && (
                  <Flex gap={8}>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Total Files</Text>
                      <Text fontSize="lg" fontWeight="bold">{stats.total_files}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Total Size</Text>
                      <Text fontSize="lg" fontWeight="bold">{formatFileSize(stats.total_size)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Last Scanned</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {new Date(project.last_scanned).toLocaleDateString()}
                      </Text>
                    </Box>
                  </Flex>
                )}
              </Stack>
            </CardBody>
          </Card>

          {/* Tabs for content */}
          <Tabs colorScheme="brand">
            <TabList>
              <Tab>Files</Tab>
              {readme && readme.html && <Tab>README</Tab>}
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={6}>
                <Card>
                  <CardBody>
                    <TableContainer>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Type</Th>
                            <Th>Size</Th>
                            <Th>Modified</Th>
                            <Th width="100px">Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {files.map((file) => (
                            <Tr key={file.id}>
                              <Td>
                                <Flex align="center" gap={2}>
                                  <Text fontSize="lg">
                                    {getFileTypeIcon(file.file_type)}
                                  </Text>
                                  <Text>{file.filename}</Text>
                                </Flex>
                              </Td>
                              <Td>
                                <Badge variant="subtle">
                                  {getFileTypeName(file.file_type)}
                                </Badge>
                              </Td>
                              <Td>{formatFileSize(file.size)}</Td>
                              <Td>{new Date(file.updated_at).toLocaleDateString()}</Td>
                              <Td>
                                <Tooltip label="Delete file" hasArrow>
                                  <IconButton
                                    icon={<Icon as={FiTrash2} />}
                                    aria-label="Delete file"
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => handleDeleteClick(file)}
                                  />
                                </Tooltip>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              </TabPanel>

              {readme && readme.html && (
                <TabPanel p={0} pt={6}>
                  <Card>
                    <CardBody>
                      <Box
                        dangerouslySetInnerHTML={{ __html: readme.html }}
                        sx={{
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            mt: 6,
                            mb: 4,
                            fontWeight: 'bold',
                          },
                          '& h1': { fontSize: '2xl' },
                          '& h2': { fontSize: 'xl' },
                          '& h3': { fontSize: 'lg' },
                          '& p': { mb: 4 },
                          '& ul, & ol': { ml: 6, mb: 4 },
                          '& li': { mb: 1 },
                          '& code': {
                            bg: 'gray.100',
                            px: 1,
                            py: 0.5,
                            borderRadius: 'sm',
                            fontSize: 'sm',
                            fontFamily: 'mono',
                          },
                          '& pre': {
                            bg: 'gray.100',
                            p: 4,
                            borderRadius: 'md',
                            overflow: 'auto',
                            fontSize: 'sm',
                            fontFamily: 'mono',
                          },
                        }}
                      />
                    </CardBody>
                  </Card>
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </Stack>
      </Container>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleDeleteCancel}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete File
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete <strong>{fileToDelete?.filename}</strong>?
              <br />
              <Text mt={2} color="red.600" fontSize="sm">
                This action cannot be undone. The file will be permanently removed from the project and filesystem.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isLoading={isDeletingFile}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Upload Modal */}
      {project && (
        <ProjectFileUpload
          projectId={project.id}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </Box>
  )
}