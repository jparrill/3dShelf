import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider } from '@chakra-ui/react'
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal'
import { Project } from '@/types/project'
import { projectsApi } from '@/lib/api'
import theme from '@/lib/theme'

// Mock scrollTo function for tests
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

// Mock the API
jest.mock('@/lib/api')
const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>

const mockProject: Project = {
  id: 1,
  name: 'Test Project',
  description: 'Test description',
  path: '/test/path',
  status: 'healthy',
  last_scanned: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  files: [
    {
      id: 1,
      project_id: 1,
      filename: 'test.stl',
      filepath: '/test/path/test.stl',
      file_type: 'stl',
      size: 1000,
      hash: 'abc123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      project_id: 1,
      filename: 'README.md',
      filepath: '/test/path/README.md',
      file_type: 'readme',
      size: 500,
      hash: 'def456',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

// Custom render function to include ChakraProvider
const renderWithChakra = (ui: React.ReactElement) => {
  return render(
    <ChakraProvider theme={theme}>
      {ui}
    </ChakraProvider>
  )
}

// Mock toast
const mockToast = jest.fn()
jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: () => mockToast
}))

describe('DeleteProjectModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when closed', () => {
    renderWithChakra(
      <DeleteProjectModal
        isOpen={false}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByText('Delete Project')).not.toBeInTheDocument()
  })

  it('renders modal with project information when open', () => {
    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Delete Project')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('2 files')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText('Location: /test/path')).toBeInTheDocument()
  })

  it('shows warning messages about irreversible action', () => {
    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('This action is irreversible!')).toBeInTheDocument()
    expect(screen.getByText(/The project directory will be removed/)).toBeInTheDocument()
    expect(screen.getByText(/All contained files will be deleted/)).toBeInTheDocument()
    expect(screen.getByText(/All database records will be removed/)).toBeInTheDocument()
    expect(screen.getByText(/This operation CANNOT be undone/)).toBeInTheDocument()
  })

  it('shows correct file count', () => {
    const singleFileProject = {
      ...mockProject,
      files: [mockProject.files![0]]
    }

    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={singleFileProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('1 file')).toBeInTheDocument()
  })

  it('handles project with no files', () => {
    const noFilesProject = {
      ...mockProject,
      files: []
    }

    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={noFilesProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('0 files')).toBeInTheDocument()
  })

  it('deletes project successfully', async () => {
    mockProjectsApi.deleteProject.mockResolvedValue({
      message: 'Project deleted successfully',
      deleted_project: { id: 1, name: 'Test Project', path: '/test/path' }
    })

    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    const deleteButton = screen.getByText('Delete Project Permanently')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockProjectsApi.deleteProject).toHaveBeenCalledWith(1)
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project deleted',
        description: 'Project "Test Project" and all its files have been permanently deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const errorResponse = {
      response: {
        data: {
          error: 'Failed to delete project'
        }
      }
    }
    mockProjectsApi.deleteProject.mockRejectedValue(errorResponse)

    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    const deleteButton = screen.getByText('Delete Project Permanently')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to delete project',
        description: 'Failed to delete project',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      expect(mockOnSuccess).not.toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  it('closes modal when cancel is clicked', async () => {
    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows loading state during deletion', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    mockProjectsApi.deleteProject.mockReturnValue(promise as any)

    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    const deleteButton = screen.getByText('Delete Project Permanently')
    await user.click(deleteButton)

    expect(screen.getByText('Deleting...')).toBeInTheDocument()
    expect(deleteButton).toBeDisabled()

    // Resolve the promise to end loading state
    resolvePromise!({
      message: 'Success',
      deleted_project: { id: 1, name: 'Test Project', path: '/test/path' }
    })
  })

  it('disables close button during deletion', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    mockProjectsApi.deleteProject.mockReturnValue(promise as any)

    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    const deleteButton = screen.getByText('Delete Project Permanently')
    await user.click(deleteButton)

    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toBeDisabled()

    // Resolve the promise to end loading state
    resolvePromise!({
      message: 'Success',
      deleted_project: { id: 1, name: 'Test Project', path: '/test/path' }
    })
  })

  it('handles null project gracefully', () => {
    renderWithChakra(
      <DeleteProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={null}
        onSuccess={mockOnSuccess}
      />
    )

    // Should still render the modal structure without crashing
    expect(screen.getByText('Delete Project')).toBeInTheDocument()
  })
})
