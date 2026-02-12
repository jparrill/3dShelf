import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { projectsApi } from '@/lib/api'
import { Project } from '@/types/project'

// Mock the API
jest.mock('@/lib/api', () => ({
  projectsApi: {
    createProject: jest.fn(),
    uploadProjectFiles: jest.fn()
  }
}))

const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>

// Mock file creation for testing
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const content = 'mock file content'
  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })

  // Mock the size property since File constructor doesn't set it properly in tests
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })

  return file
}

describe('CreateProjectModal', () => {
  const mockOnClose = jest.fn()
  const mockOnProjectCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onProjectCreated: mockOnProjectCreated
  }

  const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    path: '/test/path',
    description: 'Test description',
    status: 'healthy',
    last_scanned: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }

  it('renders modal with form fields when open', () => {
    render(<CreateProjectModal {...defaultProps} />)

    expect(screen.getByText('Create New Project')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter project description (optional)')).toBeInTheDocument()
    expect(screen.getByText('Choose Files to Upload')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render modal when closed', () => {
    render(<CreateProjectModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Create New Project')).not.toBeInTheDocument()
  })

  it('updates form fields when user types', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    const descriptionInput = screen.getByPlaceholderText('Enter project description (optional)')

    await user.type(nameInput, 'My New Project')
    await user.type(descriptionInput, 'This is a test project')

    expect(nameInput).toHaveValue('My New Project')
    expect(descriptionInput).toHaveValue('This is a test project')
  })

  it('shows validation error for empty project name', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const createButton = screen.getByRole('button', { name: /create project/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument()
    })

    expect(mockProjectsApi.createProject).not.toHaveBeenCalled()
  })

  it('creates project successfully with valid data', async () => {
    const user = userEvent.setup()
    mockProjectsApi.createProject.mockResolvedValue(mockProject)

    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    const descriptionInput = screen.getByPlaceholderText('Enter project description (optional)')
    const createButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, 'Test Project')
    await user.type(descriptionInput, 'Test description')
    await user.click(createButton)

    await waitFor(() => {
      expect(mockProjectsApi.createProject).toHaveBeenCalledWith('Test Project', 'Test description')
    })

    await waitFor(() => {
      expect(mockOnProjectCreated).toHaveBeenCalledWith(mockProject)
    })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('creates project without description', async () => {
    const user = userEvent.setup()
    mockProjectsApi.createProject.mockResolvedValue(mockProject)

    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    const createButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, 'Test Project')
    await user.click(createButton)

    await waitFor(() => {
      expect(mockProjectsApi.createProject).toHaveBeenCalledWith('Test Project', '')
    })
  })

  it('handles file selection and displays selected files', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    // Find the button that triggers file selection
    const fileButton = screen.getByRole('button', { name: /choose files to upload/i })
    expect(fileButton).toBeInTheDocument()

    // Find the hidden file input
    const hiddenInput = fileButton.closest('div')?.querySelector('input[type="file"]') as HTMLInputElement
    expect(hiddenInput).toBeInTheDocument()

    const mockFile = createMockFile('test.stl', 'application/octet-stream', 2048)

    await user.upload(hiddenInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('test.stl')).toBeInTheDocument()
      expect(screen.getByText(/MB/)).toBeInTheDocument()
      expect(screen.getByText('Selected Files (1):')).toBeInTheDocument()
    })
  })

  it('filters out invalid file types', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const hiddenInput = screen.getByRole('button', { name: /choose files to upload/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement

    const invalidFile = createMockFile('test.txt', 'text/plain')

    await user.upload(hiddenInput, invalidFile)

    // Should show warning toast (we can't easily test toast content, but the file shouldn't appear)
    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
      expect(screen.queryByText('Selected Files')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows removing selected files', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const hiddenInput = screen.getByRole('button', { name: /choose files to upload/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.stl', 'application/octet-stream')

    await user.upload(hiddenInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('test.stl')).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: '' }).closest('button') as HTMLElement
    await user.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByText('test.stl')).not.toBeInTheDocument()
      expect(screen.queryByText('Selected Files')).not.toBeInTheDocument()
    })
  })

  it('creates project and uploads files', async () => {
    const user = userEvent.setup()
    mockProjectsApi.createProject.mockResolvedValue(mockProject)
    mockProjectsApi.uploadProjectFiles.mockResolvedValue({
      message: 'Files uploaded',
      uploaded_files: [],
      uploaded_count: 1
    })

    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    const hiddenInput = screen.getByRole('button', { name: /choose files to upload/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.stl', 'application/octet-stream')

    await user.type(nameInput, 'Test Project')
    await user.upload(hiddenInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('test.stl')).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /create project/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(mockProjectsApi.createProject).toHaveBeenCalledWith('Test Project', '')
    })

    await waitFor(() => {
      expect(mockProjectsApi.uploadProjectFiles).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    mockProjectsApi.createProject.mockRejectedValue(new Error('API Error'))

    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    const createButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, 'Test Project')
    await user.click(createButton)

    await waitFor(() => {
      expect(mockProjectsApi.createProject).toHaveBeenCalled()
    })

    // The modal should remain open on error
    expect(screen.getByText('Create New Project')).toBeInTheDocument()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes modal when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('clears form data when modal closes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    await user.type(nameInput, 'Test Project')
    expect(nameInput).toHaveValue('Test Project')

    // Close modal by calling onClose
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Reopen modal
    rerender(<CreateProjectModal {...defaultProps} isOpen={true} />)

    const newNameInput = screen.getByPlaceholderText('Enter project name')
    expect(newNameInput).toHaveValue('')
  })

  it('disables form when creating project', async () => {
    const user = userEvent.setup()
    // Mock a slow API response
    mockProjectsApi.createProject.mockImplementation(() => new Promise(() => {}))

    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText('Enter project name')
    const createButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, 'Test Project')
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
      expect(screen.getByPlaceholderText('Enter project name')).toBeDisabled()
    })
  })
})