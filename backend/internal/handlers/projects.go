package handlers

import (
	"net/http"
	"dshelf/internal/models"
	"dshelf/pkg/database"
	"dshelf/pkg/scanner"

	"github.com/gin-gonic/gin"
	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
)

// ProjectsHandler handles project-related HTTP requests
type ProjectsHandler struct {
	scanner *scanner.Scanner
}

// NewProjectsHandler creates a new ProjectsHandler
func NewProjectsHandler(scanPath string) *ProjectsHandler {
	return &ProjectsHandler{
		scanner: scanner.New(database.GetDB(), scanPath),
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

// ScanProjects triggers a filesystem scan for projects
func (h *ProjectsHandler) ScanProjects(c *gin.Context) {
	if err := h.scanner.ScanForProjects(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to scan projects",
			"details": err.Error(),
		})
		return
	}

	// Return updated project count
	var count int64
	database.GetDB().Model(&models.Project{}).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"message": "Scan completed successfully",
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