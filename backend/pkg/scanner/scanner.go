package scanner

import (
	"crypto/sha256"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"dshelf/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Scanner handles filesystem scanning for 3D printing projects
type Scanner struct {
	db       *gorm.DB
	scanPath string
}

// New creates a new Scanner instance
func New(db *gorm.DB, scanPath string) *Scanner {
	return &Scanner{
		db:       db,
		scanPath: scanPath,
	}
}

// ScanForProjects scans the filesystem for 3D printing projects
func (s *Scanner) ScanForProjects() error {
	// Walk through the scan path
	return filepath.WalkDir(s.scanPath, s.walkFunction)
}

// walkFunction is called for each file/directory during the walk
func (s *Scanner) walkFunction(path string, d fs.DirEntry, err error) error {
	if err != nil {
		return err
	}

	// Skip if it's not a directory
	if !d.IsDir() {
		return nil
	}

	// Skip hidden directories and root scan path
	if strings.HasPrefix(d.Name(), ".") || path == s.scanPath {
		return nil
	}

	// Check if this directory contains 3D printing files
	if s.containsProjectFiles(path) {
		return s.processProject(path)
	}

	return nil
}

// containsProjectFiles checks if a directory contains 3D printing related files
func (s *Scanner) containsProjectFiles(dirPath string) bool {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filename := entry.Name()
		fileType := models.GetFileTypeFromExtension(filename)

		// Consider it a project if it contains STL, 3MF, or G-code files
		if fileType == models.FileTypeSTL || fileType == models.FileType3MF || fileType == models.FileTypeGCode {
			return true
		}
	}

	return false
}

// processProject processes a discovered project directory
func (s *Scanner) processProject(projectPath string) error {
	projectName := filepath.Base(projectPath)

	// Check if project already exists
	var existingProject models.Project
	result := s.db.Where("path = ?", projectPath).First(&existingProject)

	if result.Error == nil {
		// Project exists, update it
		return s.updateProject(&existingProject, projectPath)
	} else if result.Error == gorm.ErrRecordNotFound {
		// New project, create it
		return s.createProject(projectName, projectPath)
	} else {
		return result.Error
	}
}

// createProject creates a new project in the database
func (s *Scanner) createProject(name, path string) error {
	project := models.Project{
		Name:        name,
		Path:        path,
		Status:      models.StatusHealthy,
		LastScanned: time.Now(),
	}

	// Read README if it exists
	readmePath := filepath.Join(path, "README.md")
	if _, err := os.Stat(readmePath); err == nil {
		description, err := s.readREADME(readmePath)
		if err == nil {
			project.Description = description
		}
	}

	// Create the project
	if err := s.db.Create(&project).Error; err != nil {
		return err
	}

	// Scan and add files
	return s.scanProjectFiles(&project, path)
}

// updateProject updates an existing project
func (s *Scanner) updateProject(project *models.Project, path string) error {
	// Update last scanned time
	project.LastScanned = time.Now()

	// Update README if it exists
	readmePath := filepath.Join(path, "README.md")
	if _, err := os.Stat(readmePath); err == nil {
		description, err := s.readREADME(readmePath)
		if err == nil {
			project.Description = description
		}
	}

	// Save project updates
	if err := s.db.Save(project).Error; err != nil {
		return err
	}

	// Remove old files from database
	if err := s.db.Where("project_id = ?", project.ID).Delete(&models.ProjectFile{}).Error; err != nil {
		return err
	}

	// Rescan files
	return s.scanProjectFiles(project, path)
}

// scanProjectFiles scans and adds files for a project
func (s *Scanner) scanProjectFiles(project *models.Project, projectPath string) error {
	entries, err := os.ReadDir(projectPath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filename := entry.Name()
		filePath := filepath.Join(projectPath, filename)

		// Get file info
		fileInfo, err := entry.Info()
		if err != nil {
			continue
		}

		// Calculate file hash for integrity checking
		hash, err := s.calculateFileHash(filePath)
		if err != nil {
			continue
		}

		// Create project file record
		projectFile := models.ProjectFile{
			ProjectID: project.ID,
			Filename:  filename,
			Filepath:  filePath,
			FileType:  models.GetFileTypeFromExtension(filename),
			Size:      fileInfo.Size(),
			Hash:      hash,
		}

		if err := s.db.Create(&projectFile).Error; err != nil {
			return err
		}
	}

	return nil
}

// readREADME reads the content of a README file (first 1000 characters)
func (s *Scanner) readREADME(readmePath string) (string, error) {
	file, err := os.Open(readmePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// Read up to 1000 characters for description
	buffer := make([]byte, 1000)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	return string(buffer[:n]), nil
}

// calculateFileHash calculates SHA-256 hash of a file for integrity checking
func (s *Scanner) calculateFileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}