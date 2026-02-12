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