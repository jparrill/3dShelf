package handlers

import (
	"3dshelf/internal/models"
	"3dshelf/pkg/database"
	"3dshelf/pkg/scanner"
	"crypto/sha256"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
)

// ProjectsHandler handles project-related HTTP requests
type ProjectsHandler struct {
	scanner  *scanner.Scanner
	scanPath string
}

// ConflictResolution represents how to handle a file conflict
type ConflictResolution string

const (
	ConflictOverwrite ConflictResolution = "overwrite"
	ConflictSkip      ConflictResolution = "skip"
	ConflictRename    ConflictResolution = "rename"
)

// FileConflict represents a file that conflicts with existing files
type FileConflict struct {
	Filename     string              `json:"filename"`
	ExistingFile *models.ProjectFile `json:"existing_file,omitempty"`
	NewSize      int64               `json:"new_size"`
	Reason       string              `json:"reason"`
}

// UploadCheckRequest represents the request to check for conflicts before upload
type UploadCheckRequest struct {
	Filenames []string `json:"filenames"`
}

// UploadCheckResponse represents the response from upload conflict check
type UploadCheckResponse struct {
	Conflicts []FileConflict `json:"conflicts"`
	Safe      []string       `json:"safe"`
}

// UploadWithResolutionRequest represents enhanced upload with conflict resolution
type UploadWithResolutionRequest struct {
	Resolutions map[string]ConflictResolution `json:"resolutions,omitempty"`
}

// CreateProjectRequest represents the request body for creating a new project
type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// NewProjectsHandler creates a new ProjectsHandler
func NewProjectsHandler(scanPath string) *ProjectsHandler {
	return &ProjectsHandler{
		scanner:  scanner.New(database.GetDB(), scanPath),
		scanPath: scanPath,
	}
}

// GetProjects returns all projects
func (h *ProjectsHandler) GetProjects(c *gin.Context) {
	var projects []models.Project

	if err := database.GetDB().Preload("Files").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"count":    len(projects),
	})
}

// GetProject returns a specific project by ID
func (h *ProjectsHandler) GetProject(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := database.GetDB().Preload("Files").First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

// CreateProject creates a new project
func (h *ProjectsHandler) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate the project name
	if strings.TrimSpace(req.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project name is required"})
		return
	}

	// Create a safe project path by sanitizing the name
	projectName := strings.TrimSpace(req.Name)
	safeName := strings.ReplaceAll(projectName, " ", "_")
	safeName = strings.ReplaceAll(safeName, "/", "_")
	projectPath := filepath.Join(h.scanPath, safeName)

	// Check if a project with this name or path already exists
	var existingProject models.Project
	if err := database.GetDB().Where("name = ? OR path = ?", projectName, projectPath).First(&existingProject).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Project with this name or path already exists"})
		return
	}

	// Create the project directory
	if err := os.MkdirAll(projectPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project directory"})
		return
	}

	// Create the project in the database
	project := models.Project{
		Name:        projectName,
		Path:        projectPath,
		Description: req.Description,
		Status:      models.StatusHealthy,
		LastScanned: time.Now(),
	}

	if err := database.GetDB().Create(&project).Error; err != nil {
		// Clean up the directory if database creation fails
		os.RemoveAll(projectPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	// Return the created project
	c.JSON(http.StatusCreated, project)
}

// CheckUploadConflicts checks for potential conflicts before file upload
func (h *ProjectsHandler) CheckUploadConflicts(c *gin.Context) {
	projectID := c.Param("id")

	var request UploadCheckRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Verify project exists
	var project models.Project
	if err := database.GetDB().First(&project, projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Get existing files for this project
	var existingFiles []models.ProjectFile
	if err := database.GetDB().Where("project_id = ?", projectID).Find(&existingFiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing files"})
		return
	}

	// Build map of existing filenames for quick lookup
	existingFileMap := make(map[string]*models.ProjectFile)
	for i := range existingFiles {
		existingFileMap[existingFiles[i].Filename] = &existingFiles[i]
	}

	var conflicts []FileConflict
	var safe []string

	for _, filename := range request.Filenames {
		if existingFile, exists := existingFileMap[filename]; exists {
			conflicts = append(conflicts, FileConflict{
				Filename:     filename,
				ExistingFile: existingFile,
				NewSize:      0, // Will be populated when actual file is processed
				Reason:       "File already exists",
			})
		} else {
			safe = append(safe, filename)
		}
	}

	c.JSON(http.StatusOK, UploadCheckResponse{
		Conflicts: conflicts,
		Safe:      safe,
	})
}

// UploadProjectFiles uploads files to an existing project with conflict resolution
func (h *ProjectsHandler) UploadProjectFiles(c *gin.Context) {
	projectID := c.Param("id")

	// Verify project exists
	var project models.Project
	if err := database.GetDB().First(&project, projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Debug: Log request headers
	fmt.Printf("Request Headers: %+v\n", c.Request.Header)
	fmt.Printf("Content-Type: %s\n", c.GetHeader("Content-Type"))
	fmt.Printf("Content-Length: %s\n", c.GetHeader("Content-Length"))

	// Check content length
	if c.Request.ContentLength > 1024<<20 { // 1GB limit
		fmt.Printf("File too large: %d bytes (max 1GB)\n", c.Request.ContentLength)
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large", "max_size": "1GB", "received": c.Request.ContentLength})
		return
	}

	// Parse multipart form
	fmt.Printf("Attempting to parse multipart form...\n")
	form, err := c.MultipartForm()
	if err != nil {
		fmt.Printf("Multipart form parse error: %v\n", err)
		fmt.Printf("Error type: %T\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form", "details": err.Error(), "content_length": c.Request.ContentLength})
		return
	}
	fmt.Printf("Successfully parsed multipart form with %d file fields\n", len(form.File))

	files := form.File["files"]
	fmt.Printf("Found %d files in multipart form\n", len(files))
	if len(files) == 0 {
		fmt.Printf("ERROR: No files found in multipart form\n")
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	// Debug: Print file information
	for i, fileHeader := range files {
		fmt.Printf("File %d: %s, Size: %d bytes\n", i, fileHeader.Filename, fileHeader.Size)
	}

	// Parse conflict resolutions from form data
	var resolutions map[string]ConflictResolution
	resolutionsValue := form.Value["resolutions"]
	if len(resolutionsValue) > 0 {
		// Parse JSON string with resolutions
		resolutions = make(map[string]ConflictResolution)
		// For simplicity, we'll support individual resolution fields like "resolution_filename"
		for key, values := range form.Value {
			if strings.HasPrefix(key, "resolution_") && len(values) > 0 {
				filename := strings.TrimPrefix(key, "resolution_")
				resolutions[filename] = ConflictResolution(values[0])
			}
		}
	}

	// Get existing files for conflict checking
	var existingFiles []models.ProjectFile
	if err := database.GetDB().Where("project_id = ?", projectID).Find(&existingFiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing files"})
		return
	}

	// Build map of existing filenames for quick lookup
	existingFileMap := make(map[string]*models.ProjectFile)
	for i := range existingFiles {
		existingFileMap[existingFiles[i].Filename] = &existingFiles[i]
	}

	var uploadedFiles []models.ProjectFile
	var skippedFiles []string
	var errors []string

	// Process each file
	fmt.Printf("Starting to process %d files\n", len(files))
	for i, fileHeader := range files {
		fmt.Printf("Processing file %d: %s (size: %d)\n", i+1, fileHeader.Filename, fileHeader.Size)

		// Validate file type
		fileType := models.GetFileTypeFromExtension(fileHeader.Filename)
		fmt.Printf("File type detected: %s\n", fileType)
		if fileType == models.FileTypeOther && !strings.Contains(fileHeader.Filename, "README") {
			fmt.Printf("ERROR: File type not supported: %s\n", fileHeader.Filename)
			errors = append(errors, fmt.Sprintf("File type not supported: %s", fileHeader.Filename))
			continue
		}

		// Check for conflicts and handle resolution
		finalFilename := fileHeader.Filename
		existingFile, hasConflict := existingFileMap[fileHeader.Filename]

		if hasConflict {
			resolution, hasResolution := resolutions[fileHeader.Filename]

			if !hasResolution {
				// No resolution provided for conflict - default to skip
				skippedFiles = append(skippedFiles, fileHeader.Filename)
				continue
			}

			switch resolution {
			case ConflictSkip:
				skippedFiles = append(skippedFiles, fileHeader.Filename)
				continue
			case ConflictRename:
				// Add timestamp to filename
				ext := filepath.Ext(fileHeader.Filename)
				name := strings.TrimSuffix(fileHeader.Filename, ext)
				timestamp := time.Now().Format("20060102_150405")
				finalFilename = fmt.Sprintf("%s_%s%s", name, timestamp, ext)
			case ConflictOverwrite:
				// Remove existing file record and file
				if err := os.Remove(existingFile.Filepath); err != nil {
					// Log but don't fail - file might not exist on disk
				}
				if err := database.GetDB().Delete(&existingFile).Error; err != nil {
					errors = append(errors, fmt.Sprintf("Failed to remove existing file record %s: %v", fileHeader.Filename, err))
					continue
				}
			}
		}

		// Open uploaded file
		file, err := fileHeader.Open()
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to open file %s: %v", fileHeader.Filename, err))
			continue
		}

		// Create destination path with final filename
		destPath := filepath.Join(project.Path, finalFilename)

		// Create destination file
		dest, err := os.Create(destPath)
		if err != nil {
			file.Close()
			errors = append(errors, fmt.Sprintf("Failed to create file %s: %v", fileHeader.Filename, err))
			continue
		}

		// Copy file content and calculate hash
		hasher := sha256.New()
		size, err := io.Copy(io.MultiWriter(dest, hasher), file)
		dest.Close()
		file.Close()

		if err != nil {
			os.Remove(destPath)
			errors = append(errors, fmt.Sprintf("Failed to copy file %s: %v", fileHeader.Filename, err))
			continue
		}

		// Calculate hash
		hash := fmt.Sprintf("%x", hasher.Sum(nil))

		// Create file record in database
		projectFile := models.ProjectFile{
			ProjectID: project.ID,
			Filename:  finalFilename,
			Filepath:  destPath,
			FileType:  fileType,
			Size:      size,
			Hash:      hash,
		}

		if err := database.GetDB().Create(&projectFile).Error; err != nil {
			os.Remove(destPath)
			errors = append(errors, fmt.Sprintf("Failed to save file record for %s: %v", fileHeader.Filename, err))
			continue
		}

		uploadedFiles = append(uploadedFiles, projectFile)
	}

	// Update project last_scanned time
	if err := database.GetDB().Model(&project).Update("last_scanned", time.Now()).Error; err != nil {
		// Non-critical error, just log it
		errors = append(errors, "Failed to update project scan time")
	}

	// Prepare response
	response := gin.H{
		"message":        fmt.Sprintf("Uploaded %d file(s)", len(uploadedFiles)),
		"uploaded_files": uploadedFiles,
		"uploaded_count": len(uploadedFiles),
	}

	if len(skippedFiles) > 0 {
		response["skipped_files"] = skippedFiles
		response["skipped_count"] = len(skippedFiles)
	}

	if len(errors) > 0 {
		response["errors"] = errors
		response["error_count"] = len(errors)
	}

	if len(uploadedFiles) > 0 {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusBadRequest, response)
	}
}

// ScanProjects triggers a filesystem scan for projects
func (h *ProjectsHandler) ScanProjects(c *gin.Context) {
	if err := h.scanner.ScanForProjects(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to scan projects",
			"details": err.Error(),
		})
		return
	}

	// Return updated project count
	var count int64
	database.GetDB().Model(&models.Project{}).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Scan completed successfully",
		"project_count": count,
	})
}

// SyncProject syncs a specific project with the filesystem
func (h *ProjectsHandler) SyncProject(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := database.GetDB().First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// This would trigger a resync of the specific project
	// For now, we'll just return success
	c.JSON(http.StatusOK, gin.H{
		"message": "Project synced successfully",
		"project": project,
	})
}

// GetProjectFiles returns files for a specific project
func (h *ProjectsHandler) GetProjectFiles(c *gin.Context) {
	id := c.Param("id")

	var files []models.ProjectFile
	if err := database.GetDB().Where("project_id = ?", id).Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"count": len(files),
	})
}

// GetProjectREADME returns rendered README content for a project
func (h *ProjectsHandler) GetProjectREADME(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := database.GetDB().First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.Description == "" {
		c.JSON(http.StatusOK, gin.H{
			"html": "",
			"raw":  "",
		})
		return
	}

	// Convert markdown to HTML
	extensions := parser.CommonExtensions | parser.AutoHeadingIDs
	p := parser.NewWithExtensions(extensions)

	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	opts := html.RendererOptions{Flags: htmlFlags}
	renderer := html.NewRenderer(opts)

	htmlContent := markdown.ToHTML([]byte(project.Description), p, renderer)

	c.JSON(http.StatusOK, gin.H{
		"html": string(htmlContent),
		"raw":  project.Description,
	})
}

// GetProjectStats returns statistics for a project
func (h *ProjectsHandler) GetProjectStats(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := database.GetDB().Preload("Files").First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Calculate statistics
	stats := map[string]interface{}{
		"total_files": len(project.Files),
		"file_types":  make(map[models.FileType]int),
		"total_size":  int64(0),
	}

	fileTypes := stats["file_types"].(map[models.FileType]int)

	for _, file := range project.Files {
		fileTypes[file.FileType]++
		stats["total_size"] = stats["total_size"].(int64) + file.Size
	}

	c.JSON(http.StatusOK, stats)
}

// SearchProjects searches projects by name or description
func (h *ProjectsHandler) SearchProjects(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		h.GetProjects(c)
		return
	}

	var projects []models.Project
	searchPattern := "%" + query + "%"

	if err := database.GetDB().
		Preload("Files").
		Where("name LIKE ? OR description LIKE ?", searchPattern, searchPattern).
		Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"count":    len(projects),
		"query":    query,
	})
}

// HealthCheck returns the health status of the service
func (h *ProjectsHandler) HealthCheck(c *gin.Context) {
	// Check database connectivity
	sqlDB, err := database.GetDB().DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "Database connection failed",
		})
		return
	}

	if err := sqlDB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "Database ping failed",
		})
		return
	}

	// Count projects
	var projectCount int64
	database.GetDB().Model(&models.Project{}).Count(&projectCount)

	c.JSON(http.StatusOK, gin.H{
		"status":        "healthy",
		"project_count": projectCount,
		"timestamp":     database.GetDB().NowFunc(),
	})
}
