export type ProjectStatus = 'healthy' | 'inconsistent' | 'error'

export type FileType = 'stl' | '3mf' | 'gcode' | 'cad' | 'readme' | 'other'

export interface ProjectFile {
  id: number
  project_id: number
  filename: string
  filepath: string
  file_type: FileType
  size: number
  hash: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  name: string
  path: string
  description: string
  status: ProjectStatus
  last_scanned: string
  created_at: string
  updated_at: string
  files?: ProjectFile[]
}

export interface ProjectStats {
  total_files: number
  file_types: Record<FileType, number>
  total_size: number
}

export interface ScanResponse {
  message: string
  project_count: number
}

export interface ProjectsResponse {
  projects: Project[]
  count: number
}

export interface ProjectSearchResponse extends ProjectsResponse {
  query: string
}

export interface READMEResponse {
  html: string
  raw: string
}

// File upload conflict handling
export type ConflictResolution = 'overwrite' | 'skip' | 'rename'

export interface FileConflict {
  filename: string
  existing_file?: ProjectFile
  new_size: number
  reason: string
}

export interface UploadCheckResponse {
  conflicts: FileConflict[]
  safe: string[]
}

export interface UploadTask {
  id: string
  filename: string
  size: number
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'skipped'
  progress: number
  error?: string
  conflict?: FileConflict
  resolution?: ConflictResolution
}

export interface UploadResponse {
  message: string
  uploaded_files: ProjectFile[]
  uploaded_count: number
  skipped_files?: string[]
  skipped_count?: number
  errors?: string[]
  error_count?: number
}