import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Icon,
  Flex,
  Progress,
} from '@chakra-ui/react'
import { FiUpload, FiFile, FiCheck, FiX } from 'react-icons/fi'
import { UploadTask } from '@/types/project'
import { formatFileSize } from '@/utils/fileTypes'

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'green'
    case 'failed': return 'red'
    case 'skipped': return 'yellow'
    case 'uploading': return 'blue'
    default: return 'gray'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return FiCheck
    case 'failed': return FiX
    case 'skipped': return FiX
    case 'uploading': return FiUpload
    default: return FiFile
  }
}

interface UploadProgressListProps {
  tasks: UploadTask[]
}

export function UploadProgressList({ tasks }: UploadProgressListProps) {
  return (
    <Box>
      <Text fontSize="lg" fontWeight="medium" mb={3}>
        Upload Progress
      </Text>
      <VStack spacing={2} align="stretch">
        {tasks.map((task) => (
          <Card key={task.id} variant="outline">
            <CardBody py={3}>
              <Flex justify="space-between" align="center" mb={2}>
                <HStack>
                  <Icon
                    as={getStatusIcon(task.status)}
                    color={`${getStatusColor(task.status)}.500`}
                  />
                  <Text>{task.filename}</Text>
                  <Text fontSize="sm" color="gray.500">
                    ({formatFileSize(task.size)})
                  </Text>
                </HStack>
                <Badge colorScheme={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </Flex>

              {task.status === 'uploading' && (
                <Progress
                  value={task.progress}
                  colorScheme={getStatusColor(task.status)}
                  size="sm"
                />
              )}

              {task.error && (
                <Text fontSize="sm" color="red.500" mt={1}>
                  {task.error}
                </Text>
              )}
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  )
}
