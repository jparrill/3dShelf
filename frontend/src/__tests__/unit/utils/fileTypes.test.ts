import {
  getFileTypeIcon,
  getFileTypeColor,
  getFileTypeName,
  formatFileSize
} from '@/utils/fileTypes'
import { FileType } from '@/types/project'

describe('File Type Utilities', () => {
  describe('getFileTypeIcon', () => {
    it('returns correct icons for known file types', () => {
      expect(getFileTypeIcon('stl')).toBe('🗿')
      expect(getFileTypeIcon('3mf')).toBe('📦')
      expect(getFileTypeIcon('gcode')).toBe('⚙️')
      expect(getFileTypeIcon('cad')).toBe('📐')
      expect(getFileTypeIcon('readme')).toBe('📄')
      expect(getFileTypeIcon('other')).toBe('📁')
    })

    it('returns default icon for unknown file types', () => {
      expect(getFileTypeIcon('unknown' as FileType)).toBe('📁')
      expect(getFileTypeIcon(undefined as any)).toBe('📁')
    })
  })

  describe('getFileTypeColor', () => {
    it('returns correct colors for known file types', () => {
      expect(getFileTypeColor('stl')).toBe('blue')
      expect(getFileTypeColor('3mf')).toBe('green')
      expect(getFileTypeColor('gcode')).toBe('orange')
      expect(getFileTypeColor('cad')).toBe('purple')
      expect(getFileTypeColor('readme')).toBe('gray')
      expect(getFileTypeColor('other')).toBe('gray')
    })

    it('returns default color for unknown file types', () => {
      expect(getFileTypeColor('unknown' as FileType)).toBe('gray')
      expect(getFileTypeColor(undefined as any)).toBe('gray')
    })
  })

  describe('getFileTypeName', () => {
    it('returns correct names for known file types', () => {
      expect(getFileTypeName('stl')).toBe('STL Model')
      expect(getFileTypeName('3mf')).toBe('3MF Package')
      expect(getFileTypeName('gcode')).toBe('G-Code')
      expect(getFileTypeName('cad')).toBe('CAD File')
      expect(getFileTypeName('readme')).toBe('README')
      expect(getFileTypeName('other')).toBe('Other')
    })

    it('returns default name for unknown file types', () => {
      expect(getFileTypeName('unknown' as FileType)).toBe('Other')
      expect(getFileTypeName(undefined as any)).toBe('Other')
    })
  })

  describe('formatFileSize', () => {
    it('formats zero bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes')
      expect(formatFileSize(1023)).toBe('1023 Bytes')
    })

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(2048)).toBe('2 KB')
      expect(formatFileSize(1048575)).toBe('1024 KB')
    })

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1572864)).toBe('1.5 MB')
      expect(formatFileSize(2097152)).toBe('2 MB')
      expect(formatFileSize(1073741823)).toBe('1024 MB')
    })

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
      expect(formatFileSize(1610612736)).toBe('1.5 GB')
      expect(formatFileSize(2147483648)).toBe('2 GB')
    })

    it('handles large file sizes', () => {
      expect(formatFileSize(5368709120)).toBe('5 GB')
      expect(formatFileSize(10737418240)).toBe('10 GB')
    })

    it('handles fractional sizes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(3145728)).toBe('3 MB')
      expect(formatFileSize(3758096384)).toBe('3.5 GB')
    })

    it('rounds to 2 decimal places', () => {
      expect(formatFileSize(1638)).toBe('1.6 KB') // 1638 / 1024 = 1.599...
      expect(formatFileSize(1638400)).toBe('1.56 MB') // should round properly
    })

    it('handles negative numbers (edge case)', () => {
      // While this shouldn't happen in practice, the function should handle it gracefully
      expect(formatFileSize(-1024)).toBe('-1 KB')
    })
  })

  describe('edge cases and type safety', () => {
    it('handles null and undefined gracefully', () => {
      expect(getFileTypeIcon(null as any)).toBe('📁')
      expect(getFileTypeColor(null as any)).toBe('gray')
      expect(getFileTypeName(null as any)).toBe('Other')
    })

    it('handles empty string file type', () => {
      expect(getFileTypeIcon('' as any)).toBe('📁')
      expect(getFileTypeColor('' as any)).toBe('gray')
      expect(getFileTypeName('' as any)).toBe('Other')
    })

    it('file size function handles floating point numbers', () => {
      expect(formatFileSize(1024.5)).toBe('1 KB')
      expect(formatFileSize(1536.7)).toBe('1.5 KB')
    })
  })

  describe('consistency between functions', () => {
    it('all functions handle the same file types', () => {
      const fileTypes: FileType[] = ['stl', '3mf', 'gcode', 'cad', 'readme', 'other']

      fileTypes.forEach(fileType => {
        expect(getFileTypeIcon(fileType)).toBeDefined()
        expect(getFileTypeColor(fileType)).toBeDefined()
        expect(getFileTypeName(fileType)).toBeDefined()
      })
    })

    it('all functions return fallback values for unknown types', () => {
      const unknownType = 'unknown-type' as FileType

      expect(getFileTypeIcon(unknownType)).toBe('📁')
      expect(getFileTypeColor(unknownType)).toBe('gray')
      expect(getFileTypeName(unknownType)).toBe('Other')
    })
  })
})