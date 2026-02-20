import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Badge,
  Flex,
  Icon,
  Tooltip,
  Stack
} from '@chakra-ui/react'
import { FiFolder, FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { Project, ProjectStatus } from '@/types/project'
import { getFileTypeIcon } from '@/utils/fileTypes'
import { getProjectStatusColor } from '@/utils/statusColors'
import { ProjectOptionsMenu } from './ProjectOptionsMenu'

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onRename?: (project: Project) => void
  onDelete?: (project: Project) => void
}

function getStatusIcon(status: ProjectStatus) {
  switch (status) {
    case 'healthy':
      return { icon: FiCheckCircle, color: 'green.500' }
    case 'inconsistent':
      return { icon: FiAlertTriangle, color: 'yellow.500' }
    case 'error':
      return { icon: FiXCircle, color: 'red.500' }
    default:
      return { icon: FiFolder, color: 'gray.500' }
  }
}

export function ProjectCard({ project, onClick, onRename, onDelete }: ProjectCardProps) {
  const statusConfig = getStatusIcon(project.status)
  const statusColor = getProjectStatusColor(project.status)

  const fileTypeCounts = project.files?.reduce((acc, file) => {
    acc[file.file_type] = (acc[file.file_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const totalFiles = project.files?.length || 0

  return (
    <Card
      cursor="pointer"
      onClick={onClick}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md',
        borderColor: 'brand.200',
      }}
    >
      <CardBody>
        <Stack spacing={4}>
          <Flex justify="space-between" align="flex-start">
            <Box flex="1" pr={2}>
              <Heading size="md" mb={2} color="gray.800">
                {project.name}
              </Heading>
              <Text fontSize="sm" color="gray.600" noOfLines={2}>
                {project.description || 'No description available'}
              </Text>
            </Box>

            <Flex align="center" gap={2}>
              <Tooltip label={`Status: ${project.status}`}>
                <Box>
                  <Icon
                    as={statusConfig.icon}
                    color={statusConfig.color}
                    boxSize={5}
                  />
                </Box>
              </Tooltip>
              {(onRename || onDelete) && (
                <ProjectOptionsMenu
                  project={project}
                  onRename={onRename || (() => {})}
                  onDelete={onDelete || (() => {})}
                />
              )}
            </Flex>
          </Flex>

          <Flex justify="space-between" align="center">
            <Badge colorScheme={statusColor} variant="subtle">
              {project.status}
            </Badge>

            <Flex align="center" gap={2}>
              <Icon as={FiFolder} color="gray.400" boxSize={4} />
              <Text fontSize="sm" color="gray.600">
                {totalFiles} files
              </Text>
            </Flex>
          </Flex>

          {/* File type indicators */}
          {Object.keys(fileTypeCounts).length > 0 && (
            <Flex gap={1} wrap="wrap">
              {Object.entries(fileTypeCounts).map(([fileType, count]) => (
                <Tooltip
                  key={fileType}
                  label={`${count} ${fileType.toUpperCase()} files`}
                >
                  <Box fontSize="sm" opacity={0.8}>
                    {getFileTypeIcon(fileType as any)}{count}
                  </Box>
                </Tooltip>
              ))}
            </Flex>
          )}

          <Text fontSize="xs" color="gray.500">
            Last scanned: {new Date(project.last_scanned).toLocaleDateString()}
          </Text>
        </Stack>
      </CardBody>
    </Card>
  )
}