import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  Icon,
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
        as={Box}
        onClick={handleMenuButtonClick}
        cursor="pointer"
        borderRadius="md"
        p={1}
        _hover={{
          bg: 'gray.100'
        }}
        _active={{
          bg: 'gray.200'
        }}
      >
        <Icon
          as={FiSettings}
          boxSize={5}
          color="gray.600"
        />
      </MenuButton>
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