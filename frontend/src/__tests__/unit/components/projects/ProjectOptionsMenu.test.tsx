import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { ProjectOptionsMenu } from '@/components/projects/ProjectOptionsMenu'
import { Project } from '@/types/project'
import theme from '@/lib/theme'

// Mock scrollTo function for tests
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

const mockProject: Project = {
  id: 1,
  name: 'Test Project',
  description: 'Test description',
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

describe('ProjectOptionsMenu', () => {
  const mockOnRename = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the settings icon button', () => {
    renderWithChakra(
      <ProjectOptionsMenu
        project={mockProject}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />
    )

    // Check for the menu button by looking for the element with menu-button class
    const menuButton = document.querySelector('.chakra-menu__menu-button')
    expect(menuButton).toBeInTheDocument()
  })

  it('opens menu when settings icon is clicked', () => {
    renderWithChakra(
      <ProjectOptionsMenu
        project={mockProject}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    expect(screen.getByText('Renombrar proyecto')).toBeInTheDocument()
    expect(screen.getByText('Borrar proyecto')).toBeInTheDocument()
  })

  it('calls onRename when rename option is clicked', () => {
    renderWithChakra(
      <ProjectOptionsMenu
        project={mockProject}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    const renameOption = screen.getByText('Renombrar proyecto')
    fireEvent.click(renameOption)

    expect(mockOnRename).toHaveBeenCalledWith(mockProject)
    expect(mockOnRename).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete option is clicked', () => {
    renderWithChakra(
      <ProjectOptionsMenu
        project={mockProject}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    const deleteOption = screen.getByText('Borrar proyecto')
    fireEvent.click(deleteOption)

    expect(mockOnDelete).toHaveBeenCalledWith(mockProject)
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
  })

  it('stops event propagation when menu button is clicked', () => {
    const mockClickHandler = jest.fn()

    renderWithChakra(
      <div onClick={mockClickHandler}>
        <ProjectOptionsMenu
          project={mockProject}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      </div>
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    // The parent onClick should not be called due to stopPropagation
    expect(mockClickHandler).not.toHaveBeenCalled()
  })

  it('stops event propagation when rename option is clicked', () => {
    const mockClickHandler = jest.fn()

    renderWithChakra(
      <div onClick={mockClickHandler}>
        <ProjectOptionsMenu
          project={mockProject}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      </div>
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    const renameOption = screen.getByText('Renombrar proyecto')
    fireEvent.click(renameOption)

    // The parent onClick should not be called due to stopPropagation
    expect(mockClickHandler).not.toHaveBeenCalled()
    expect(mockOnRename).toHaveBeenCalledWith(mockProject)
  })

  it('stops event propagation when delete option is clicked', () => {
    const mockClickHandler = jest.fn()

    renderWithChakra(
      <div onClick={mockClickHandler}>
        <ProjectOptionsMenu
          project={mockProject}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      </div>
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    const deleteOption = screen.getByText('Borrar proyecto')
    fireEvent.click(deleteOption)

    // The parent onClick should not be called due to stopPropagation
    expect(mockClickHandler).not.toHaveBeenCalled()
    expect(mockOnDelete).toHaveBeenCalledWith(mockProject)
  })

  it('renders delete option in red color', () => {
    renderWithChakra(
      <ProjectOptionsMenu
        project={mockProject}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />
    )

    const menuButton = document.querySelector('.chakra-menu__menu-button')!
    fireEvent.click(menuButton)

    const deleteOption = screen.getByText('Borrar proyecto')
    expect(deleteOption).toHaveStyle('color: var(--chakra-colors-red-500)')
  })
})