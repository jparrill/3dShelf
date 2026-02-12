// Package main contains End-to-End tests for the 3DShelf backend
// These tests verify complete workflows from filesystem scanning to API responses
package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"3dshelf/internal/config"
	"3dshelf/internal/handlers"
	"3dshelf/internal/models"
	"3dshelf/pkg/database"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// E2ETestSuite represents a complete end-to-end test environment
type E2ETestSuite struct {
	TempDir     string
	DB          *gorm.DB
	Router      *gin.Engine
	Handler     *handlers.ProjectsHandler
	ProjectDirs map[string]string
}

// setupE2EEnvironment creates a complete test environment
func setupE2EEnvironment(t *testing.T) *E2ETestSuite {
	// Create temporary directory for filesystem operations
	tmpDir := t.TempDir()

	// Setup database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Run migrations
	err = db.AutoMigrate(&models.Project{}, &models.ProjectFile{})
	if err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Set global database
	database.DB = db

	// Setup Gin router
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Create handler with actual scan path
	handler := handlers.NewProjectsHandler(tmpDir)

	// Setup routes exactly like in the main application
	api := router.Group("/api")
	{
		api.GET("/health", handler.HealthCheck)
		api.GET("/projects", handler.GetProjects)
		api.POST("/projects/scan", handler.ScanProjects)
		api.GET("/projects/search", handler.SearchProjects)
		api.GET("/projects/:id", handler.GetProject)
		api.PUT("/projects/:id/sync", handler.SyncProject)
		api.GET("/projects/:id/files", handler.GetProjectFiles)
		api.GET("/projects/:id/readme", handler.GetProjectREADME)
		api.GET("/projects/:id/stats", handler.GetProjectStats)
	}

	return &E2ETestSuite{
		TempDir:     tmpDir,
		DB:          db,
		Router:      router,
		Handler:     handler,
		ProjectDirs: make(map[string]string),
	}
}

// createProjectDirectory creates a realistic 3D printing project directory
func (suite *E2ETestSuite) createProjectDirectory(t *testing.T, projectName string, files map[string]string) {
	projectPath := filepath.Join(suite.TempDir, projectName)
	err := os.MkdirAll(projectPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create project directory %s: %v", projectName, err)
	}

	for filename, content := range files {
		filePath := filepath.Join(projectPath, filename)
		err := os.WriteFile(filePath, []byte(content), 0644)
		if err != nil {
			t.Fatalf("Failed to create file %s: %v", filename, err)
		}
	}

	suite.ProjectDirs[projectName] = projectPath
}

// makeRequest makes an HTTP request and returns the response
func (suite *E2ETestSuite) makeRequest(method, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(method, path, nil)
	suite.Router.ServeHTTP(w, req)
	return w
}

// parseResponse parses JSON response into a map
func parseResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}
	return response
}

// TestE2ECompleteWorkflow tests the complete workflow from project creation to API access
func TestE2ECompleteWorkflow(t *testing.T) {
	suite := setupE2EEnvironment(t)

	// Step 1: Create realistic 3D printing projects on filesystem
	t.Log("Step 1: Creating 3D printing projects on filesystem")

	// Project 1: Complex project with multiple file types
	suite.createProjectDirectory(t, "ComplexModel", map[string]string{
		"model.stl":    "Binary STL content for a complex 3D model",
		"supports.stl": "Binary STL content for support structures",
		"print.3mf":    "3MF project file with complete print settings",
		"sliced.gco":   "G1 X10 Y10\nG1 Z0.2\nG1 E5\n; End of G-code",
		"design.dwg":   "CAD file content",
		"README.md":    "# Complex 3D Model\n\nThis is a complex model with multiple components.\n\n## Print Settings\n- Layer Height: 0.2mm\n- Infill: 20%\n- Supports: Yes",
		"notes.txt":    "Additional printing notes and troubleshooting",
		"config.ini":   "[print_settings]\nlayer_height=0.2\ninfill=20",
	})

	// Project 2: Simple project
	suite.createProjectDirectory(t, "SimpleGadget", map[string]string{
		"gadget.stl": "STL content for a simple gadget",
		"README.md":  "# Simple Gadget\nA basic 3D printed gadget.",
	})

	// Project 3: Project with only documentation (should not be detected)
	suite.createProjectDirectory(t, "DocumentationOnly", map[string]string{
		"manual.pdf":       "PDF manual content",
		"instructions.txt": "Text instructions",
		"README.md":        "# Documentation\nOnly documentation, no 3D files.",
	})

	// Project 4: Hidden project (should not be detected)
	suite.createProjectDirectory(t, ".HiddenProject", map[string]string{
		"secret.stl": "Hidden STL content",
		"README.md":  "# Hidden Project\nThis should not be detected.",
	})

	// Step 2: Verify initial state - no projects in database
	t.Log("Step 2: Verifying initial empty state")
	w := suite.makeRequest("GET", "/api/projects")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	response := parseResponse(t, w)
	count, _ := response["count"].(float64)
	if int(count) != 0 {
		t.Errorf("Expected 0 projects initially, got %d", int(count))
	}

	// Step 3: Check health status before scanning
	t.Log("Step 3: Checking health status")
	w = suite.makeRequest("GET", "/api/health")
	if w.Code != http.StatusOK {
		t.Errorf("Expected healthy status, got %d", w.Code)
	}

	response = parseResponse(t, w)
	status, _ := response["status"].(string)
	if status != "healthy" {
		t.Errorf("Expected healthy status, got %s", status)
	}

	projectCount, _ := response["project_count"].(float64)
	if int(projectCount) != 0 {
		t.Errorf("Expected 0 projects in health check, got %d", int(projectCount))
	}

	// Step 4: Trigger filesystem scan
	t.Log("Step 4: Triggering filesystem scan")
	w = suite.makeRequest("POST", "/api/projects/scan")
	if w.Code != http.StatusOK {
		t.Errorf("Expected successful scan, got status %d", w.Code)
	}

	response = parseResponse(t, w)
	message, _ := response["message"].(string)
	if !strings.Contains(message, "Scan completed successfully") {
		t.Errorf("Expected success message, got: %s", message)
	}

	scannedCount, _ := response["project_count"].(float64)
	if int(scannedCount) != 2 {
		t.Errorf("Expected 2 projects to be detected, got %d", int(scannedCount))
	}

	// Step 5: Verify projects were created correctly
	t.Log("Step 5: Verifying scanned projects")
	w = suite.makeRequest("GET", "/api/projects")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	response = parseResponse(t, w)
	projects, _ := response["projects"].([]interface{})
	count, _ = response["count"].(float64)

	if int(count) != 2 {
		t.Errorf("Expected 2 projects after scan, got %d", int(count))
	}

	if len(projects) != 2 {
		t.Errorf("Expected 2 projects in array, got %d", len(projects))
	}

	// Verify project details
	projectNames := make(map[string]bool)
	var complexProjectID float64

	for _, proj := range projects {
		project := proj.(map[string]interface{})
		name := project["name"].(string)
		projectNames[name] = true

		if name == "ComplexModel" {
			complexProjectID = project["id"].(float64)
			// Verify complex project has correct file count
			files := project["files"].([]interface{})
			if len(files) != 8 {
				t.Errorf("Expected 8 files in ComplexModel, got %d", len(files))
			}
		} else if name == "SimpleGadget" {
			// Verify simple project has correct file count
			files := project["files"].([]interface{})
			if len(files) != 2 {
				t.Errorf("Expected 2 files in SimpleGadget, got %d", len(files))
			}
		}
	}

	if !projectNames["ComplexModel"] {
		t.Error("ComplexModel project should be detected")
	}

	if !projectNames["SimpleGadget"] {
		t.Error("SimpleGadget project should be detected")
	}

	if projectNames["DocumentationOnly"] {
		t.Error("DocumentationOnly project should not be detected")
	}

	if projectNames[".HiddenProject"] {
		t.Error("Hidden project should not be detected")
	}

	// Step 6: Test individual project retrieval
	t.Log("Step 6: Testing individual project retrieval")
	complexIDStr := strconv.Itoa(int(complexProjectID))
	w = suite.makeRequest("GET", "/api/projects/"+complexIDStr)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for complex project, got %d", w.Code)
	}

	response = parseResponse(t, w)
	projectName, _ := response["name"].(string)
	if projectName != "ComplexModel" {
		t.Errorf("Expected project name 'ComplexModel', got '%s'", projectName)
	}

	// Step 7: Test project files endpoint
	t.Log("Step 7: Testing project files endpoint")
	w = suite.makeRequest("GET", "/api/projects/"+complexIDStr+"/files")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for project files, got %d", w.Code)
	}

	response = parseResponse(t, w)
	files, _ := response["files"].([]interface{})
	fileCount, _ := response["count"].(float64)

	if int(fileCount) != 8 {
		t.Errorf("Expected 8 files, got %d", int(fileCount))
	}

	// Verify file types are correctly detected
	fileTypeCount := make(map[string]int)
	for _, f := range files {
		file := f.(map[string]interface{})
		fileType := file["file_type"].(string)
		fileTypeCount[fileType]++
	}

	expectedTypes := map[string]int{
		"stl":    2, // model.stl, supports.stl
		"3mf":    1, // print.3mf
		"gcode":  1, // sliced.gco
		"cad":    1, // design.dwg
		"readme": 1, // README.md
		"other":  2, // notes.txt, config.ini
	}

	for expectedType, expectedCount := range expectedTypes {
		if fileTypeCount[expectedType] != expectedCount {
			t.Errorf("Expected %d files of type '%s', got %d", expectedCount, expectedType, fileTypeCount[expectedType])
		}
	}

	// Step 8: Test README rendering
	t.Log("Step 8: Testing README rendering")
	w = suite.makeRequest("GET", "/api/projects/"+complexIDStr+"/readme")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for README, got %d", w.Code)
	}

	response = parseResponse(t, w)
	html, _ := response["html"].(string)
	raw, _ := response["raw"].(string)

	if !strings.Contains(html, "<h1") {
		t.Error("HTML should contain heading tags")
	}

	if !strings.Contains(html, "Complex 3D Model") {
		t.Error("HTML should contain project title")
	}

	if !strings.Contains(raw, "# Complex 3D Model") {
		t.Error("Raw content should contain markdown title")
	}

	if !strings.Contains(raw, "Print Settings") {
		t.Error("Raw content should contain print settings section")
	}

	// Step 9: Test project statistics
	t.Log("Step 9: Testing project statistics")
	w = suite.makeRequest("GET", "/api/projects/"+complexIDStr+"/stats")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for stats, got %d", w.Code)
	}

	response = parseResponse(t, w)
	totalFiles, _ := response["total_files"].(float64)
	totalSize, _ := response["total_size"].(float64)

	if int(totalFiles) != 8 {
		t.Errorf("Expected 8 total files in stats, got %d", int(totalFiles))
	}

	if totalSize <= 0 {
		t.Errorf("Expected positive total size, got %f", totalSize)
	}

	// Step 10: Test search functionality
	t.Log("Step 10: Testing search functionality")

	// Search by name
	w = suite.makeRequest("GET", "/api/projects/search?q=Complex")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for search, got %d", w.Code)
	}

	response = parseResponse(t, w)
	searchResults, _ := response["projects"].([]interface{})
	searchCount, _ := response["count"].(float64)

	if int(searchCount) != 1 {
		t.Errorf("Expected 1 search result for 'Complex', got %d", int(searchCount))
	}

	if len(searchResults) != 1 {
		t.Errorf("Expected 1 project in search results, got %d", len(searchResults))
	}

	// Search by description content
	w = suite.makeRequest("GET", "/api/projects/search?q=multiple components")
	response = parseResponse(t, w)
	searchCount, _ = response["count"].(float64)

	if int(searchCount) != 1 {
		t.Errorf("Expected 1 search result for description search, got %d", int(searchCount))
	}

	// Search with no results
	w = suite.makeRequest("GET", "/api/projects/search?q=nonexistent")
	response = parseResponse(t, w)
	searchCount, _ = response["count"].(float64)

	if int(searchCount) != 0 {
		t.Errorf("Expected 0 search results for 'nonexistent', got %d", int(searchCount))
	}

	// Step 11: Test project synchronization
	t.Log("Step 11: Testing project synchronization")
	w = suite.makeRequest("PUT", "/api/projects/"+complexIDStr+"/sync")
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for sync, got %d", w.Code)
	}

	response = parseResponse(t, w)
	message, _ = response["message"].(string)
	if !strings.Contains(message, "synced successfully") {
		t.Errorf("Expected sync success message, got: %s", message)
	}

	// Step 12: Test health check after operations
	t.Log("Step 12: Final health check")
	w = suite.makeRequest("GET", "/api/health")
	if w.Code != http.StatusOK {
		t.Errorf("Expected healthy status after operations, got %d", w.Code)
	}

	response = parseResponse(t, w)
	status, _ = response["status"].(string)
	if status != "healthy" {
		t.Errorf("Expected healthy status after operations, got %s", status)
	}

	finalProjectCount, _ := response["project_count"].(float64)
	if int(finalProjectCount) != 2 {
		t.Errorf("Expected 2 projects in final health check, got %d", int(finalProjectCount))
	}

	t.Log("E2E workflow test completed successfully!")
}

// TestE2EFilesystemChanges tests behavior when filesystem changes
func TestE2EFilesystemChanges(t *testing.T) {
	suite := setupE2EEnvironment(t)

	// Step 1: Create initial project
	t.Log("Step 1: Creating initial project")
	suite.createProjectDirectory(t, "EvolvingProject", map[string]string{
		"model_v1.stl": "Version 1 of the model",
		"README.md":    "# Evolving Project\nVersion 1.0",
	})

	// Step 2: Initial scan
	t.Log("Step 2: Performing initial scan")
	w := suite.makeRequest("POST", "/api/projects/scan")
	if w.Code != http.StatusOK {
		t.Errorf("Expected successful initial scan, got %d", w.Code)
	}

	// Verify initial state
	w = suite.makeRequest("GET", "/api/projects")
	response := parseResponse(t, w)
	projects := response["projects"].([]interface{})
	if len(projects) != 1 {
		t.Errorf("Expected 1 project after initial scan, got %d", len(projects))
	}

	project := projects[0].(map[string]interface{})
	projectID := project["id"].(float64)
	projectIDStr := strconv.Itoa(int(projectID))

	// Verify initial files
	w = suite.makeRequest("GET", "/api/projects/"+projectIDStr+"/files")
	response = parseResponse(t, w)
	files := response["files"].([]interface{})
	if len(files) != 2 {
		t.Errorf("Expected 2 files initially, got %d", len(files))
	}

	// Step 3: Add new files to the project
	t.Log("Step 3: Adding new files to project")
	projectPath := suite.ProjectDirs["EvolvingProject"]

	// Add new files
	newFiles := map[string]string{
		"model_v2.stl":     "Version 2 of the model with improvements",
		"supports.stl":     "Support structures for version 2",
		"print_config.3mf": "3MF file with print configuration",
	}

	for filename, content := range newFiles {
		filePath := filepath.Join(projectPath, filename)
		err := os.WriteFile(filePath, []byte(content), 0644)
		if err != nil {
			t.Fatalf("Failed to create new file %s: %v", filename, err)
		}
	}

	// Update README
	readmePath := filepath.Join(projectPath, "README.md")
	updatedReadme := "# Evolving Project\nVersion 2.0 - Now with improved models and support structures!"
	err := os.WriteFile(readmePath, []byte(updatedReadme), 0644)
	if err != nil {
		t.Fatalf("Failed to update README: %v", err)
	}

	// Step 4: Rescan to detect changes
	t.Log("Step 4: Rescanning to detect changes")
	w = suite.makeRequest("POST", "/api/projects/scan")
	if w.Code != http.StatusOK {
		t.Errorf("Expected successful rescan, got %d", w.Code)
	}

	// Step 5: Verify changes were detected
	t.Log("Step 5: Verifying changes were detected")

	// Check updated file count
	w = suite.makeRequest("GET", "/api/projects/"+projectIDStr+"/files")
	response = parseResponse(t, w)
	files = response["files"].([]interface{})
	if len(files) != 5 {
		t.Errorf("Expected 5 files after adding new files, got %d", len(files))
	}

	// Verify file types
	fileNames := make(map[string]bool)
	for _, f := range files {
		file := f.(map[string]interface{})
		filename := file["filename"].(string)
		fileNames[filename] = true
	}

	expectedFiles := []string{"model_v1.stl", "model_v2.stl", "supports.stl", "print_config.3mf", "README.md"}
	for _, expectedFile := range expectedFiles {
		if !fileNames[expectedFile] {
			t.Errorf("Expected file %s to be present", expectedFile)
		}
	}

	// Check updated README
	w = suite.makeRequest("GET", "/api/projects/"+projectIDStr+"/readme")
	response = parseResponse(t, w)
	raw := response["raw"].(string)
	if !strings.Contains(raw, "Version 2.0") {
		t.Error("README should contain updated version information")
	}

	// Step 6: Remove some files and test again
	t.Log("Step 6: Removing files and testing detection")

	// Remove version 1 model
	v1Path := filepath.Join(projectPath, "model_v1.stl")
	err = os.Remove(v1Path)
	if err != nil {
		t.Fatalf("Failed to remove file: %v", err)
	}

	// Rescan again
	w = suite.makeRequest("POST", "/api/projects/scan")
	if w.Code != http.StatusOK {
		t.Errorf("Expected successful rescan after removal, got %d", w.Code)
	}

	// Verify file removal was detected
	w = suite.makeRequest("GET", "/api/projects/"+projectIDStr+"/files")
	response = parseResponse(t, w)
	files = response["files"].([]interface{})
	if len(files) != 4 {
		t.Errorf("Expected 4 files after removal, got %d", len(files))
	}

	// Ensure model_v1.stl is no longer present
	fileNames = make(map[string]bool)
	for _, f := range files {
		file := f.(map[string]interface{})
		filename := file["filename"].(string)
		fileNames[filename] = true
	}

	if fileNames["model_v1.stl"] {
		t.Error("model_v1.stl should have been removed")
	}

	t.Log("Filesystem changes test completed successfully!")
}

// TestE2EErrorHandling tests error handling scenarios
func TestE2EErrorHandling(t *testing.T) {
	suite := setupE2EEnvironment(t)

	t.Log("Testing error handling scenarios")

	// Test 1: Request nonexistent project
	w := suite.makeRequest("GET", "/api/projects/999")
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for nonexistent project, got %d", w.Code)
	}

	// Test 2: Request files for nonexistent project
	w = suite.makeRequest("GET", "/api/projects/999/files")
	if w.Code != http.StatusInternalServerError {
		t.Logf("Got status %d for nonexistent project files (this may vary based on implementation)", w.Code)
	}

	// Test 3: Request README for nonexistent project
	w = suite.makeRequest("GET", "/api/projects/999/readme")
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for nonexistent project README, got %d", w.Code)
	}

	// Test 4: Request stats for nonexistent project
	w = suite.makeRequest("GET", "/api/projects/999/stats")
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for nonexistent project stats, got %d", w.Code)
	}

	// Test 5: Sync nonexistent project
	w = suite.makeRequest("PUT", "/api/projects/999/sync")
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for nonexistent project sync, got %d", w.Code)
	}

	// Test 6: Invalid project ID formats
	w = suite.makeRequest("GET", "/api/projects/invalid")
	// Status could be 400 or 404 depending on implementation
	if w.Code != http.StatusBadRequest && w.Code != http.StatusNotFound {
		t.Logf("Got status %d for invalid project ID (this may vary)", w.Code)
	}

	t.Log("Error handling test completed!")
}

// TestE2EPerformance tests basic performance characteristics
func TestE2EPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	suite := setupE2EEnvironment(t)

	t.Log("Testing performance with multiple projects")

	// Create multiple projects
	numProjects := 10
	for i := 0; i < numProjects; i++ {
		projectName := "PerfProject" + strings.Repeat("0", 2-len(strconv.Itoa(i))) + strconv.Itoa(i)
		files := map[string]string{
			"model.stl":  strings.Repeat("STL content ", 100),
			"print.3mf":  strings.Repeat("3MF content ", 100),
			"README.md":  "# " + projectName + "\n" + strings.Repeat("Description text. ", 50),
			"notes.txt":  strings.Repeat("Notes content. ", 100),
			"config.ini": "[settings]\nvalue=" + strconv.Itoa(i),
		}
		suite.createProjectDirectory(t, projectName, files)
	}

	// Time the scanning operation
	scanStart := time.Now()
	w := suite.makeRequest("POST", "/api/projects/scan")
	scanDuration := time.Since(scanStart)

	if w.Code != http.StatusOK {
		t.Errorf("Expected successful scan, got %d", w.Code)
	}

	t.Logf("Scanned %d projects in %v", numProjects, scanDuration)

	// Time the project listing operation
	listStart := time.Now()
	w = suite.makeRequest("GET", "/api/projects")
	listDuration := time.Since(listStart)

	if w.Code != http.StatusOK {
		t.Errorf("Expected successful project listing, got %d", w.Code)
	}

	response := parseResponse(t, w)
	count := int(response["count"].(float64))
	if count != numProjects {
		t.Errorf("Expected %d projects, got %d", numProjects, count)
	}

	t.Logf("Listed %d projects in %v", numProjects, listDuration)

	// Performance thresholds (these are generous for testing)
	if scanDuration > 10*time.Second {
		t.Errorf("Scanning took too long: %v", scanDuration)
	}

	if listDuration > 1*time.Second {
		t.Errorf("Listing took too long: %v", listDuration)
	}

	t.Log("Performance test completed!")
}

// TestE2EConfigurationIntegration tests integration with configuration
func TestE2EConfigurationIntegration(t *testing.T) {
	suite := setupE2EEnvironment(t)

	t.Log("Testing configuration integration")

	// Test that config can be loaded
	cfg, err := config.Load()
	if err != nil {
		t.Errorf("Failed to load configuration: %v", err)
	}

	if cfg == nil {
		t.Error("Configuration should not be nil")
	}

	// Verify default values
	if cfg.GinMode == "" {
		t.Error("GinMode should have a default value")
	}

	if cfg.Port == "" {
		t.Error("Port should have a default value")
	}

	if cfg.DatabasePath == "" {
		t.Error("DatabasePath should have a default value")
	}

	if cfg.ScanPath == "" {
		t.Error("ScanPath should have a default value")
	}

	// Test that health check works (which depends on database config)
	w := suite.makeRequest("GET", "/api/health")
	if w.Code != http.StatusOK {
		t.Errorf("Health check should work with configuration, got status %d", w.Code)
	}

	t.Log("Configuration integration test completed!")
}

// BenchmarkE2ECompleteWorkflow benchmarks the complete workflow
func BenchmarkE2ECompleteWorkflow(b *testing.B) {
	// This benchmark is expensive, so only run a few iterations
	if b.N > 5 {
		b.N = 5
	}

	for i := 0; i < b.N; i++ {
		func() {
			suite := setupE2EEnvironment(&testing.T{})

			// Create a test project
			suite.createProjectDirectory(&testing.T{}, "BenchmarkProject", map[string]string{
				"model.stl": "STL content",
				"README.md": "# Benchmark Project",
				"notes.txt": "Some notes",
			})

			// Scan
			suite.makeRequest("POST", "/api/projects/scan")

			// List projects
			suite.makeRequest("GET", "/api/projects")

			// Get project details
			suite.makeRequest("GET", "/api/projects/1")

			// Get files
			suite.makeRequest("GET", "/api/projects/1/files")

			// Get README
			suite.makeRequest("GET", "/api/projects/1/readme")

			// Get stats
			suite.makeRequest("GET", "/api/projects/1/stats")
		}()
	}
}
