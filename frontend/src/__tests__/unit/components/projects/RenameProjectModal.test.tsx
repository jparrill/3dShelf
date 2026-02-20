import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider } from '@chakra-ui/react'
import { RenameProjectModal } from '@/components/projects/RenameProjectModal'
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
  name: 'Original Project',
  description: 'Original description',
  path: '/test/path',
  status: 'healthy',
  last_scanned: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  files: []
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

describe('RenameProjectModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when closed', () => {
    renderWithChakra(
      <RenameProjectModal
        isOpen={false}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByText('Rename Project')).not.toBeInTheDocument()
  })

  it('renders modal when open', () => {
    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Rename Project')).toBeInTheDocument()
    expect(screen.getByText('Renaming project:')).toBeInTheDocument()
    expect(screen.getByText('Original Project')).toBeInTheDocument()

    // Use placeholder text to find inputs
    expect(screen.getByPlaceholderText('Enter the new project name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Project description (optional)')).toBeInTheDocument()
  })

  it('populates form fields with project data when opened', async () => {
    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Original Project')
      const descriptionInput = screen.getByDisplayValue('Original description')

      expect(nameInput).toBeInTheDocument()
      expect(descriptionInput).toBeInTheDocument()
    })
  })

  it('updates form fields when user types', async () => {
    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Enter the new project name')
      const descriptionInput = screen.getByPlaceholderText('Project description (optional)')

      expect(nameInput).toBeInTheDocument()
      expect(descriptionInput).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Enter the new project name')
    const descriptionInput = screen.getByPlaceholderText('Project description (optional)')

    await user.clear(nameInput)
    await user.type(nameInput, 'New Project Name')

    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'New description')

    expect(nameInput).toHaveValue('New Project Name')
    expect(descriptionInput).toHaveValue('New description')
  })

  it('disables submit button when name is empty', async () => {
    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      const submitButton = screen.getByText('Rename')
      expect(submitButton).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Enter the new project name')
    const submitButton = screen.getByText('Rename')

    await user.clear(nameInput)

    expect(submitButton).toBeDisabled()
  })

  it('submits form successfully with valid data', async () => {
    mockProjectsApi.updateProject.mockResolvedValue({
      message: 'Project updated successfully',
      project: { ...mockProject, name: 'New Name', description: 'New description' }
    })

    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Enter the new project name')
    const descriptionInput = screen.getByPlaceholderText('Project description (optional)')
    const submitButton = screen.getByText('Rename')

    await user.clear(nameInput)
    await user.type(nameInput, 'New Project Name')

    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'New description')

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockProjectsApi.updateProject).toHaveBeenCalledWith(
        1,
        'New Project Name',
        'New description'
      )
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project updated',
        description: 'Project "Original Project" has been renamed to "New Project Name"',
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
          error: 'Project name already exists'
        }
      }
    }
    mockProjectsApi.updateProject.mockRejectedValue(errorResponse)

    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Enter the new project name')
    const submitButton = screen.getByText('Rename')

    await user.clear(nameInput)
    await user.type(nameInput, 'Duplicate Name')

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to update project',
        description: 'Project name already exists',
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
      <RenameProjectModal
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

  it('clears form when modal closes', async () => {
    const { rerender } = renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter the new project name')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Enter the new project name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Modified Name')

    // Close modal
    rerender(
      <RenameProjectModal
        isOpen={false}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    // Reopen modal
    rerender(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      const nameInputAfterReopen = screen.getByDisplayValue('Original Project')
      expect(nameInputAfterReopen).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    mockProjectsApi.updateProject.mockReturnValue(promise as any)

    renderWithChakra(
      <RenameProjectModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        onSuccess={mockOnSuccess}
      />
    )

    const submitButton = screen.getByText('Rename')
    await user.click(submitButton)

    expect(screen.getByText('Renaming...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise to end loading state
    resolvePromise!({
      message: 'Success',
      project: mockProject
    })
  })
})
