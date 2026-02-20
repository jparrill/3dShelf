import { ProjectStatus } from '@/types/project'

export function getProjectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'healthy':
      return 'green'
    case 'inconsistent':
      return 'yellow'
    case 'error':
      return 'red'
    default:
      return 'gray'
  }
}
