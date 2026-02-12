package models

import (
	"time"

	"gorm.io/gorm"
)

// ProjectStatus represents the health status of a project
type ProjectStatus string

const (
	StatusHealthy      ProjectStatus = "healthy"
	StatusInconsistent ProjectStatus = "inconsistent"
	StatusError        ProjectStatus = "error"
)

// FileType represents the type of a project file
type FileType string

const (
	FileTypeSTL    FileType = "stl"
	FileType3MF    FileType = "3mf"
	FileTypeGCode  FileType = "gcode"
	FileTypeCAD    FileType = "cad"
	FileTypeREADME FileType = "readme"
	FileTypeOther  FileType = "other"
)

// Project represents a 3D printing project
type Project struct {
	ID          uint          `json:"id" gorm:"primaryKey"`
	Name        string        `json:"name" gorm:"not null"`
	Path        string        `json:"path" gorm:"uniqueIndex;not null"`
	Description string        `json:"description" gorm:"type:text"`
	Status      ProjectStatus `json:"status" gorm:"default:healthy"`
	LastScanned time.Time     `json:"last_scanned"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Files []ProjectFile `json:"files,omitempty" gorm:"foreignKey:ProjectID"`
}

// ProjectFile represents a file within a project
type ProjectFile struct {
	ID        uint     `json:"id" gorm:"primaryKey"`
	ProjectID uint     `json:"project_id" gorm:"not null"`
	Filename  string   `json:"filename" gorm:"not null"`
	Filepath  string   `json:"filepath" gorm:"not null"`
	FileType  FileType `json:"file_type" gorm:"not null"`
	Size      int64    `json:"size"`
	Hash      string   `json:"hash"` // For integrity checking
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Project Project `json:"-" gorm:"foreignKey:ProjectID"`
}

// GetFileTypeFromExtension determines the file type based on file extension
func GetFileTypeFromExtension(filename string) FileType {
	if len(filename) < 3 {
		return FileTypeOther
	}

	// Check for README files first
	if filename == "README.md" || filename == "readme.md" || filename == "README.MD" {
		return FileTypeREADME
	}

	// Find the extension (everything after the last dot)
	var ext string
	for i := len(filename) - 1; i >= 0; i-- {
		if filename[i] == '.' {
			ext = filename[i:]
			break
		}
	}

	switch ext {
	case ".stl", ".STL":
		return FileTypeSTL
	case ".3mf", ".3MF":
		return FileType3MF
	case ".gcode", ".gco", ".GCODE", ".GCO":
		return FileTypeGCode
	case ".dwg", ".DWG", ".step", ".iges", ".stp", ".igs", ".STEP", ".IGES", ".STP", ".IGS":
		return FileTypeCAD
	default:
		return FileTypeOther
	}
}