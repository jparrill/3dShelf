import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Badge,
  Card,
  CardBody,
  Icon,
  Flex,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react'
import { FiAlertTriangle } from 'react-icons/fi'
import { FileConflict, ConflictResolution } from '@/types/project'

interface FileConflictResolverProps {
  conflicts: FileConflict[]
  resolutions: Record<string, ConflictResolution>
  onResolutionChange: (filename: string, resolution: ConflictResolution) => void
}

export function FileConflictResolver({ conflicts, resolutions, onResolutionChange }: FileConflictResolverProps) {
  return (
    <Box>
      <Alert status="warning" mb={4}>
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">File Conflicts Detected</Text>
          <Text fontSize="sm">
            The following files already exist. Choose how to handle each conflict:
          </Text>
        </Box>
      </Alert>

      <VStack spacing={3} align="stretch">
        {conflicts.map((conflict, index) => (
          <Card key={index} variant="outline">
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Flex justify="space-between" align="center">
                  <HStack>
                    <Icon as={FiAlertTriangle} color="orange.500" />
                    <Text fontWeight="medium">{conflict.filename}</Text>
                  </HStack>
                  <Badge colorScheme="orange">Conflict</Badge>
                </Flex>

                <Text fontSize="sm" color="gray.600">
                  {conflict.reason}
                </Text>

                {!resolutions[conflict.filename] && (
                  <Text fontSize="sm" color="red.500" fontWeight="medium">
                    Please choose how to handle this conflict
                  </Text>
                )}

                <RadioGroup
                  value={resolutions[conflict.filename]}
                  onChange={(value: ConflictResolution) => onResolutionChange(conflict.filename, value)}
                >
                  <Stack spacing={2}>
                    <Radio value="overwrite" colorScheme="red">
                      <Box>
                        <Text fontWeight="medium">Overwrite existing file</Text>
                        <Text fontSize="sm" color="gray.600">
                          Replace the existing file with the new one
                        </Text>
                      </Box>
                    </Radio>
                    <Radio value="skip" colorScheme="yellow">
                      <Box>
                        <Text fontWeight="medium">Skip this file</Text>
                        <Text fontSize="sm" color="gray.600">
                          Keep the existing file, don't upload the new one
                        </Text>
                      </Box>
                    </Radio>
                    <Radio value="rename" colorScheme="green">
                      <Box>
                        <Text fontWeight="medium">Save with timestamp</Text>
                        <Text fontSize="sm" color="gray.600">
                          Add timestamp to filename and save both files
                        </Text>
                      </Box>
                    </Radio>
                  </Stack>
                </RadioGroup>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  )
}
