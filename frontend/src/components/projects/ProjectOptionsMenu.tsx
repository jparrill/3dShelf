import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  Text
} from '@chakra-ui/react'
import { FiSettings, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { Project } from '@/types/project'

interface ProjectOptionsMenuProps {
  project: Project
  onRename: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectOptionsMenu({ project, onRename, onDelete }: ProjectOptionsMenuProps) {
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRename(project)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(project)
  }

  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Project options"
        icon={<FiSettings />}
        size="sm"
        variant="ghost"
        onClick={handleMenuButtonClick}
        _hover={{
          bg: 'gray.100'
        }}
        _active={{
          bg: 'gray.200'
        }}
      />
      <MenuList>
        <MenuItem icon={<FiEdit2 />} onClick={handleRename}>
          <Text>Renombrar proyecto</Text>
        </MenuItem>
        <MenuItem icon={<FiTrash2 />} onClick={handleDelete} color="red.500">
          <Text>Borrar proyecto</Text>
        </MenuItem>
      </MenuList>
    </Menu>
  )
}