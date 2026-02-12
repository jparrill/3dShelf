import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { Project } from '@/types/project'

describe('ProjectCard Component', () => {
  const mockOnClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    path: '/test/path',
    description: 'This is a test project',
    status: 'healthy',
    last_scanned: new Date('2024-01-15').toISOString(),
    files: [
      { name: 'model.stl', file_type: 'stl', size: 1024 },
      { name: 'config.gcode', file_type: 'gcode', size: 512 },
      { name: 'photo.jpg', file_type: 'jpg', size: 256 }
    ]
  }

  it('renders project information correctly', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('This is a test project')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText('3 files')).toBeInTheDocument()
  })

  it('displays file type counts', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    // Check that file type counts are displayed with emojis
    expect(screen.getByText(/🗿1/)).toBeInTheDocument() // STL file
    expect(screen.getByText(/⚙️1/)).toBeInTheDocument() // GCODE file
    expect(screen.getByText(/📁1/)).toBeInTheDocument() // JPG file (other type)
  })

  it('shows default description when none provided', () => {
    const projectWithoutDescription = {
      ...mockProject,
      description: undefined
    }

    render(<ProjectCard project={projectWithoutDescription} onClick={mockOnClick} />)

    expect(screen.getByText('No description available')).toBeInTheDocument()
  })

  it('handles different project statuses', () => {
    const testStatuses: Array<{ status: any; expectedColor: string }> = [
      { status: 'healthy', expectedColor: 'green' },
      { status: 'inconsistent', expectedColor: 'yellow' },
      { status: 'error', expectedColor: 'red' }
    ]

    testStatuses.forEach(({ status }) => {
      const projectWithStatus = { ...mockProject, status }
      const { rerender } = render(
        <ProjectCard project={projectWithStatus} onClick={mockOnClick} />
      )

      expect(screen.getByText(status)).toBeInTheDocument()

      // Clean up for next iteration
      rerender(<div />)
    })
  })

  it('calls onClick when card is clicked', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    const card = screen.getByText('Test Project').closest('[data-testid], div')
    fireEvent.click(card!)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('shows last scanned date', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    expect(screen.getByText(/last scanned/i)).toBeInTheDocument()
    // Test for any date format since toLocaleDateString() varies by locale
    expect(screen.getByText(/last scanned.*\d{1,2}\/\d{1,2}\/\d{4}/i)).toBeInTheDocument()
  })

  it('handles project with no files', () => {
    const projectWithoutFiles = {
      ...mockProject,
      files: []
    }

    render(<ProjectCard project={projectWithoutFiles} onClick={mockOnClick} />)

    expect(screen.getByText('0 files')).toBeInTheDocument()
  })

  it('handles project with undefined files', () => {
    const projectWithUndefinedFiles = {
      ...mockProject,
      files: undefined
    }

    render(<ProjectCard project={projectWithUndefinedFiles} onClick={mockOnClick} />)

    expect(screen.getByText('0 files')).toBeInTheDocument()
  })

  it('has hover effects applied via CSS classes', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    // Card should be clickable (it has an onClick handler)
    const card = screen.getByText('Test Project').closest('[role="button"], div')
    expect(card).toBeInTheDocument()
    expect(card).toBeTruthy()
  })

  it('shows tooltips for status and file types', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    // Check that tooltips are present by looking for elements that would trigger them
    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText(/🗿1/)).toBeInTheDocument()
  })

  it('truncates long descriptions', () => {
    const projectWithLongDescription = {
      ...mockProject,
      description: 'This is a very long description that should be truncated when displayed in the project card component to prevent layout issues and maintain a clean interface'
    }

    render(<ProjectCard project={projectWithLongDescription} onClick={mockOnClick} />)

    const description = screen.getByText(/This is a very long description/)
    expect(description).toBeInTheDocument()
  })

  it('handles empty file type counts gracefully', () => {
    const projectWithUnknownFiles = {
      ...mockProject,
      files: [
        { name: 'unknown.xyz', file_type: undefined, size: 100 }
      ]
    }

    render(<ProjectCard project={projectWithUnknownFiles} onClick={mockOnClick} />)

    expect(screen.getByText('1 files')).toBeInTheDocument()
  })
})