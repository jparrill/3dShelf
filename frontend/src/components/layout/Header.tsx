import {
  Box,
  Flex,
  Heading,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  useToast,
  Icon
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiSearch, FiRefreshCw, FiFolder, FiPlus } from 'react-icons/fi'
import { projectsApi } from '@/lib/api'
import { showSuccessToast, showErrorToast } from '@/utils/toast'

interface HeaderProps {
  onSearch: (query: string) => void
  onScanComplete: () => void
  onCreateProject?: () => void
}

export function Header({ onSearch, onScanComplete, onCreateProject }: HeaderProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const toast = useToast()

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const result = await projectsApi.scanProjects()
      showSuccessToast(toast, 'Scan completed', `Found ${result.project_count} projects`)
      onScanComplete()
    } catch (error) {
      showErrorToast(toast, 'Scan failed', 'Failed to scan filesystem for projects')
    } finally {
      setIsScanning(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  return (
    <Box bg="white" borderBottom="1px solid" borderColor="gray.200" px={6} py={4}>
      <Flex justify="space-between" align="center">
        <Flex align="center" gap={4}>
          <Icon as={FiFolder} boxSize={8} color="brand.500" />
          <Heading size="lg" color="gray.800">
            3DShelf
          </Heading>
        </Flex>

        <Flex gap={4} align="center">
          <Box as="form" onSubmit={handleSearchSubmit}>
            <InputGroup maxW="400px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                _focus={{
                  bg: 'white',
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                }}
              />
            </InputGroup>
          </Box>

          <Button
            leftIcon={<Icon as={FiPlus} />}
            onClick={onCreateProject}
            colorScheme="brand"
            mr={2}
          >
            Create Project
          </Button>

          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={handleScan}
            isLoading={isScanning}
            loadingText="Scanning..."
            colorScheme="brand"
            variant="outline"
          >
            Scan Projects
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}