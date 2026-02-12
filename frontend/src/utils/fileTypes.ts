import { FileType } from '@/types/project'

export const getFileTypeIcon = (fileType: FileType): string => {
  const icons: Record<FileType, string> = {
    stl: '🗿',
    '3mf': '📦',
    gcode: '⚙️',
    cad: '📐',
    readme: '📄',
    other: '📁'
  }
  return icons[fileType] || icons.other
}

export const getFileTypeColor = (fileType: FileType): string => {
  const colors: Record<FileType, string> = {
    stl: 'blue',
    '3mf': 'green',
    gcode: 'orange',
    cad: 'purple',
    readme: 'gray',
    other: 'gray'
  }
  return colors[fileType] || colors.other
}

export const getFileTypeName = (fileType: FileType): string => {
  const names: Record<FileType, string> = {
    stl: 'STL Model',
    '3mf': '3MF Package',
    gcode: 'G-Code',
    cad: 'CAD File',
    readme: 'README',
    other: 'Other'
  }
  return names[fileType] || names.other
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}