import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layout/Header'
import { projectsApi } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  projectsApi: {
    scanProjects: jest.fn()
  }
}))

const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>

describe('Header Component', () => {
  const mockOnSearch = jest.fn()
  const mockOnScanComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    onSearch: mockOnSearch,
    onScanComplete: mockOnScanComplete
  }

  it('renders header with title and controls', () => {
    render(<Header {...defaultProps} />)

    expect(screen.getByText('3DShelf')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scan projects/i })).toBeInTheDocument()
  })

  it('handles search input changes', async () => {
    const user = userEvent.setup()
    render(<Header {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search projects...')
    await user.type(searchInput, 'test query')

    expect(searchInput).toHaveValue('test query')
  })

  it('calls onSearch when form is submitted', async () => {
    const user = userEvent.setup()
    render(<Header {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search projects...')
    await user.type(searchInput, 'test query')

    fireEvent.submit(searchInput.closest('form')!)

    expect(mockOnSearch).toHaveBeenCalledWith('test query')
  })

  it('handles successful scan operation', async () => {
    const mockScanResult = { project_count: 5 }
    mockProjectsApi.scanProjects.mockResolvedValueOnce(mockScanResult)

    const user = userEvent.setup()
    render(<Header {...defaultProps} />)

    const scanButton = screen.getByRole('button', { name: /scan projects/i })
    await user.click(scanButton)

    // Check loading state
    expect(screen.getByRole('button', { name: /scanning.../i })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockProjectsApi.scanProjects).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(mockOnScanComplete).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('Scan completed')).toBeInTheDocument()
      expect(screen.getByText('Found 5 projects')).toBeInTheDocument()
    })
  })

  it('handles scan operation failure', async () => {
    const mockError = new Error('Scan failed')
    mockProjectsApi.scanProjects.mockRejectedValueOnce(mockError)

    const user = userEvent.setup()
    render(<Header {...defaultProps} />)

    const scanButton = screen.getByRole('button', { name: /scan projects/i })
    await user.click(scanButton)

    await waitFor(() => {
      expect(mockProjectsApi.scanProjects).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('Scan failed')).toBeInTheDocument()
      expect(screen.getByText('Failed to scan filesystem for projects')).toBeInTheDocument()
    })

    // onScanComplete should not be called on error
    expect(mockOnScanComplete).not.toHaveBeenCalled()
  })

  it('disables scan button during scanning', async () => {
    // Mock a delayed response to test loading state
    mockProjectsApi.scanProjects.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ project_count: 1 }), 100))
    )

    const user = userEvent.setup()
    render(<Header {...defaultProps} />)

    const scanButton = screen.getByRole('button', { name: /scan projects/i })
    await user.click(scanButton)

    // Button should be disabled during scanning
    expect(scanButton).toBeDisabled()
    expect(screen.getByRole('button', { name: /scanning.../i })).toBeInTheDocument()

    // Wait for operation to complete
    await waitFor(() => {
      expect(mockOnScanComplete).toHaveBeenCalledTimes(1)
    }, { timeout: 200 })
  })

  it('resets scan button state after operation completes', async () => {
    mockProjectsApi.scanProjects.mockResolvedValueOnce({ project_count: 1 })

    const user = userEvent.setup()
    render(<Header {...defaultProps} />)

    const scanButton = screen.getByRole('button', { name: /scan projects/i })
    await user.click(scanButton)

    await waitFor(() => {
      expect(mockOnScanComplete).toHaveBeenCalledTimes(1)
    })

    // Button should be enabled again
    await waitFor(() => {
      expect(scanButton).toBeEnabled()
      expect(scanButton).toHaveTextContent('Scan Projects')
    })
  })

  it('has proper accessibility attributes', () => {
    render(<Header {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search projects...')
    const scanButton = screen.getByRole('button', { name: /scan projects/i })

    expect(searchInput).toHaveAttribute('type', 'text')
    expect(scanButton).toHaveAttribute('type', 'button')
  })
})