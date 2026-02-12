package scanner

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"dshelf/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates a test database for scanner tests
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Run migrations
	err = db.AutoMigrate(&models.Project{}, &models.ProjectFile{})
	if err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	return db
}

// createTestProject creates a test project directory with files
func createTestProject(t *testing.T, basePath, projectName string, files map[string]string) string {
	projectPath := filepath.Join(basePath, projectName)
	err := os.MkdirAll(projectPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create project directory: %v", err)
	}

	for filename, content := range files {
		filePath := filepath.Join(projectPath, filename)
		err := os.WriteFile(filePath, []byte(content), 0644)
		if err != nil {
			t.Fatalf("Failed to create test file %s: %v", filename, err)
		}
	}

	return projectPath
}

// TestNew tests the Scanner constructor
func TestNew(t *testing.T) {
	db := setupTestDB(t)
	scanPath := "/test/scan/path"

	scanner := New(db, scanPath)

	if scanner == nil {
		t.Fatal("New() returned nil scanner")
	}

	if scanner.db != db {
		t.Error("Scanner database instance not set correctly")
	}

	if scanner.scanPath != scanPath {
		t.Errorf("Expected scan path '%s', got '%s'", scanPath, scanner.scanPath)
	}
}

// TestContainsProjectFiles tests the containsProjectFiles method
func TestContainsProjectFiles(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	testCases := []struct {
		name     string
		files    map[string]string
		expected bool
	}{
		{
			name: "Directory with STL file",
			files: map[string]string{
				"model.stl": "STL content",
				"notes.txt": "Some notes",
				"README.md": "Project description",
			},
			expected: true,
		},
		{
			name: "Directory with 3MF file",
			files: map[string]string{
				"print.3mf":  "3MF content",
				"config.ini": "Configuration",
			},
			expected: true,
		},
		{
			name: "Directory with G-code file",
			files: map[string]string{
				"sliced.gco":   "G-code content",
				"settings.txt": "Settings",
			},
			expected: true,
		},
		{
			name: "Directory without 3D files",
			files: map[string]string{
				"document.pdf": "PDF content",
				"image.jpg":    "Image data",
				"README.md":    "Just documentation",
			},
			expected: false,
		},
		{
			name:     "Empty directory",
			files:    map[string]string{},
			expected: false,
		},
		{
			name: "Directory with mixed case extensions",
			files: map[string]string{
				"model.STL": "STL content",
				"notes.txt": "Notes",
			},
			expected: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			projectPath := createTestProject(t, tmpDir, tc.name, tc.files)
			result := scanner.containsProjectFiles(projectPath)
			if result != tc.expected {
				t.Errorf("Expected %v for %s, got %v", tc.expected, tc.name, result)
			}
		})
	}
}

// TestContainsProjectFilesError tests containsProjectFiles with invalid directory
func TestContainsProjectFilesError(t *testing.T) {
	db := setupTestDB(t)
	scanner := New(db, "/nonexistent")

	result := scanner.containsProjectFiles("/nonexistent/directory")
	if result {
		t.Error("Expected false for nonexistent directory, got true")
	}
}

// TestCreateProject tests the createProject method
func TestCreateProject(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	projectName := "TestProject"
	files := map[string]string{
		"model.stl": "STL content",
		"README.md": "# Test Project\nThis is a test project for 3D printing.",
		"notes.txt": "Some additional notes",
	}

	projectPath := createTestProject(t, tmpDir, projectName, files)

	// Create project
	err := scanner.createProject(projectName, projectPath)
	if err != nil {
		t.Errorf("createProject failed: %v", err)
	}

	// Verify project was created in database
	var project models.Project
	result := db.Where("path = ?", projectPath).Preload("Files").First(&project)
	if result.Error != nil {
		t.Errorf("Failed to find created project: %v", result.Error)
	}

	if project.Name != projectName {
		t.Errorf("Expected project name '%s', got '%s'", projectName, project.Name)
	}

	if project.Path != projectPath {
		t.Errorf("Expected project path '%s', got '%s'", projectPath, project.Path)
	}

	if project.Status != models.StatusHealthy {
		t.Errorf("Expected project status '%s', got '%s'", models.StatusHealthy, project.Status)
	}

	if !strings.Contains(project.Description, "Test Project") {
		t.Errorf("Expected description to contain 'Test Project', got '%s'", project.Description)
	}

	// Verify files were created
	if len(project.Files) != 3 {
		t.Errorf("Expected 3 files, got %d", len(project.Files))
	}

	// Check that STL file was detected correctly
	stlFound := false
	for _, file := range project.Files {
		if file.Filename == "model.stl" && file.FileType == models.FileTypeSTL {
			stlFound = true
			break
		}
	}
	if !stlFound {
		t.Error("STL file not found or not correctly typed")
	}
}

// TestUpdateProject tests the updateProject method
func TestUpdateProject(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	// Create initial project
	projectName := "UpdateTestProject"
	initialFiles := map[string]string{
		"model.stl": "STL content",
		"README.md": "# Initial Description",
	}

	projectPath := createTestProject(t, tmpDir, projectName, initialFiles)

	// Create project first
	err := scanner.createProject(projectName, projectPath)
	if err != nil {
		t.Fatalf("Failed to create initial project: %v", err)
	}

	// Get the created project
	var project models.Project
	db.Where("path = ?", projectPath).First(&project)

	// Update the README file
	newReadmeContent := "# Updated Description\nThis has been updated."
	readmePath := filepath.Join(projectPath, "README.md")
	err = os.WriteFile(readmePath, []byte(newReadmeContent), 0644)
	if err != nil {
		t.Fatalf("Failed to update README: %v", err)
	}

	// Add a new file
	newFilePath := filepath.Join(projectPath, "new_model.3mf")
	err = os.WriteFile(newFilePath, []byte("3MF content"), 0644)
	if err != nil {
		t.Fatalf("Failed to add new file: %v", err)
	}

	// Update project
	err = scanner.updateProject(&project, projectPath)
	if err != nil {
		t.Errorf("updateProject failed: %v", err)
	}

	// Verify project was updated
	var updatedProject models.Project
	db.Where("path = ?", projectPath).Preload("Files").First(&updatedProject)

	if !strings.Contains(updatedProject.Description, "Updated Description") {
		t.Errorf("Expected updated description, got '%s'", updatedProject.Description)
	}

	// Verify new file was added
	if len(updatedProject.Files) != 3 {
		t.Errorf("Expected 3 files after update, got %d", len(updatedProject.Files))
	}

	// Check that new 3MF file was detected
	threeMFFound := false
	for _, file := range updatedProject.Files {
		if file.Filename == "new_model.3mf" && file.FileType == models.FileType3MF {
			threeMFFound = true
			break
		}
	}
	if !threeMFFound {
		t.Error("New 3MF file not found or not correctly typed")
	}
}

// TestScanProjectFiles tests the scanProjectFiles method
func TestScanProjectFiles(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	// Create a project in the database
	project := &models.Project{
		Name:        "FileScanTest",
		Path:        filepath.Join(tmpDir, "filescantest"),
		Status:      models.StatusHealthy,
		LastScanned: time.Now(),
	}
	db.Create(project)

	// Create test files
	files := map[string]string{
		"model.stl":  "STL file content",
		"print.3mf":  "3MF file content",
		"sliced.gco": "G-code content",
		"design.dwg": "CAD file content",
		"README.md":  "Documentation",
		"photo.jpg":  "Image data",
	}

	projectPath := createTestProject(t, tmpDir, "filescantest", files)
	project.Path = projectPath

	// Scan project files
	err := scanner.scanProjectFiles(project, projectPath)
	if err != nil {
		t.Errorf("scanProjectFiles failed: %v", err)
	}

	// Verify files were added to database
	var projectFiles []models.ProjectFile
	db.Where("project_id = ?", project.ID).Find(&projectFiles)

	if len(projectFiles) != 6 {
		t.Errorf("Expected 6 files, got %d", len(projectFiles))
	}

	// Verify file types are correct
	expectedTypes := map[string]models.FileType{
		"model.stl":  models.FileTypeSTL,
		"print.3mf":  models.FileType3MF,
		"sliced.gco": models.FileTypeGCode,
		"design.dwg": models.FileTypeCAD,
		"README.md":  models.FileTypeREADME,
		"photo.jpg":  models.FileTypeOther,
	}

	for _, file := range projectFiles {
		expectedType, exists := expectedTypes[file.Filename]
		if !exists {
			t.Errorf("Unexpected file: %s", file.Filename)
			continue
		}

		if file.FileType != expectedType {
			t.Errorf("Expected type %s for file %s, got %s", expectedType, file.Filename, file.FileType)
		}

		if file.Size <= 0 {
			t.Errorf("File %s should have size > 0, got %d", file.Filename, file.Size)
		}

		if file.Hash == "" {
			t.Errorf("File %s should have a hash", file.Filename)
		}
	}
}

// TestReadREADME tests the readREADME method
func TestReadREADME(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	testCases := []struct {
		name     string
		content  string
		expected string
	}{
		{
			name:     "Short README",
			content:  "# Simple Project\nThis is a simple project.",
			expected: "# Simple Project\nThis is a simple project.",
		},
		{
			name:     "Long README",
			content:  strings.Repeat("This is a long line of text. ", 50), // Over 1000 chars
			expected: strings.Repeat("This is a long line of text. ", 50)[:1000],
		},
		{
			name:     "Empty README",
			content:  "",
			expected: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			readmePath := filepath.Join(tmpDir, "README_"+tc.name+".md")
			err := os.WriteFile(readmePath, []byte(tc.content), 0644)
			if err != nil {
				t.Fatalf("Failed to create README file: %v", err)
			}

			result, err := scanner.readREADME(readmePath)
			if err != nil {
				t.Errorf("readREADME failed: %v", err)
			}

			if result != tc.expected {
				t.Errorf("Expected '%s', got '%s'", tc.expected, result)
			}
		})
	}
}

// TestReadREADMEError tests readREADME with nonexistent file
func TestReadREADMEError(t *testing.T) {
	db := setupTestDB(t)
	scanner := New(db, "/tmp")

	_, err := scanner.readREADME("/nonexistent/README.md")
	if err == nil {
		t.Error("Expected error for nonexistent README file")
	}
}

// TestCalculateFileHash tests the calculateFileHash method
func TestCalculateFileHash(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	// Create test file
	testContent := "Test file content for hash calculation"
	testFile := filepath.Join(tmpDir, "test_hash.txt")
	err := os.WriteFile(testFile, []byte(testContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	// Calculate hash using scanner
	hash, err := scanner.calculateFileHash(testFile)
	if err != nil {
		t.Errorf("calculateFileHash failed: %v", err)
	}

	// Calculate expected hash manually
	hasher := sha256.New()
	hasher.Write([]byte(testContent))
	expectedHash := fmt.Sprintf("%x", hasher.Sum(nil))

	if hash != expectedHash {
		t.Errorf("Expected hash '%s', got '%s'", expectedHash, hash)
	}

	// Test with nonexistent file
	_, err = scanner.calculateFileHash("/nonexistent/file.txt")
	if err == nil {
		t.Error("Expected error for nonexistent file")
	}
}

// TestProcessProject tests the processProject method
func TestProcessProject(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	files := map[string]string{
		"model.stl": "STL content",
		"README.md": "# Process Test\nTesting project processing.",
	}

	projectPath := createTestProject(t, tmpDir, "ProcessTest", files)

	// Process new project
	err := scanner.processProject(projectPath)
	if err != nil {
		t.Errorf("processProject failed: %v", err)
	}

	// Verify project was created
	var project models.Project
	db.Where("path = ?", projectPath).Preload("Files").First(&project)

	if project.ID == 0 {
		t.Error("Project was not created")
	}

	if project.Name != "ProcessTest" {
		t.Errorf("Expected project name 'ProcessTest', got '%s'", project.Name)
	}

	// Process existing project (update scenario)
	err = scanner.processProject(projectPath)
	if err != nil {
		t.Errorf("processProject failed on update: %v", err)
	}

	// Verify project still exists and LastScanned is updated
	var updatedProject models.Project
	db.Where("path = ?", projectPath).First(&updatedProject)

	if updatedProject.ID != project.ID {
		t.Error("Project ID should remain the same on update")
	}

	if !updatedProject.LastScanned.After(project.LastScanned) {
		t.Error("LastScanned should be updated")
	}
}

// TestScanForProjects tests the main ScanForProjects method
func TestScanForProjects(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	// Create multiple test projects
	projects := map[string]map[string]string{
		"Project1": {
			"model.stl": "STL content 1",
			"README.md": "# Project 1",
		},
		"Project2": {
			"print.3mf":  "3MF content",
			"config.ini": "Configuration",
		},
		"NotAProject": {
			"document.pdf": "PDF content",
			"image.jpg":    "Image data",
		},
		".HiddenProject": {
			"model.stl": "Hidden STL",
		},
	}

	for projectName, files := range projects {
		createTestProject(t, tmpDir, projectName, files)
	}

	// Run scan
	err := scanner.ScanForProjects()
	if err != nil {
		t.Errorf("ScanForProjects failed: %v", err)
	}

	// Verify results
	var dbProjects []models.Project
	db.Find(&dbProjects)

	// Should find 2 projects (Project1 and Project2, but not NotAProject or .HiddenProject)
	if len(dbProjects) != 2 {
		t.Errorf("Expected 2 projects, got %d", len(dbProjects))
	}

	projectNames := make(map[string]bool)
	for _, project := range dbProjects {
		projectNames[project.Name] = true
	}

	if !projectNames["Project1"] {
		t.Error("Project1 should be found")
	}

	if !projectNames["Project2"] {
		t.Error("Project2 should be found")
	}

	if projectNames["NotAProject"] {
		t.Error("NotAProject should not be found")
	}

	if projectNames[".HiddenProject"] {
		t.Error("Hidden project should not be found")
	}
}

// TestScanForProjectsError tests ScanForProjects with invalid path
func TestScanForProjectsError(t *testing.T) {
	db := setupTestDB(t)
	scanner := New(db, "/nonexistent/path")

	err := scanner.ScanForProjects()
	if err == nil {
		t.Error("Expected error when scanning nonexistent path")
	}
}

// TestWalkFunction tests the walkFunction method directly
func TestWalkFunction(t *testing.T) {
	db := setupTestDB(t)
	tmpDir := t.TempDir()
	scanner := New(db, tmpDir)

	// Create a test project
	projectPath := createTestProject(t, tmpDir, "WalkTest", map[string]string{
		"model.stl": "STL content",
	})

	// Create a DirEntry-like struct for testing
	dirInfo, err := os.Stat(projectPath)
	if err != nil {
		t.Fatalf("Failed to stat project directory: %v", err)
	}

	// Convert to fs.DirEntry
	dirEntry := &testDirEntry{
		name:  dirInfo.Name(),
		isDir: dirInfo.IsDir(),
	}

	// Call walkFunction directly
	err = scanner.walkFunction(projectPath, dirEntry, nil)
	if err != nil {
		t.Errorf("walkFunction failed: %v", err)
	}

	// Verify project was processed
	var project models.Project
	result := db.Where("path = ?", projectPath).First(&project)
	if result.Error != nil {
		t.Error("Project should have been created by walkFunction")
	}
}

// testDirEntry implements fs.DirEntry for testing
type testDirEntry struct {
	name  string
	isDir bool
}

func (d *testDirEntry) Name() string               { return d.name }
func (d *testDirEntry) IsDir() bool                { return d.isDir }
func (d *testDirEntry) Type() os.FileMode          { return 0 }
func (d *testDirEntry) Info() (os.FileInfo, error) { return nil, nil }

// BenchmarkScanForProjects benchmarks the scanning performance
func BenchmarkScanForProjects(b *testing.B) {
	if testing.Short() {
		b.Skip("Skipping benchmark in short mode")
	}

	db := setupTestDB(&testing.T{})
	tmpDir := b.TempDir()

	// Create multiple projects for benchmarking
	for i := 0; i < 10; i++ {
		projectName := fmt.Sprintf("BenchProject%d", i)
		files := map[string]string{
			"model.stl": fmt.Sprintf("STL content %d", i),
			"README.md": fmt.Sprintf("# Project %d", i),
			"notes.txt": fmt.Sprintf("Notes for project %d", i),
		}
		createTestProject(&testing.T{}, tmpDir, projectName, files)
	}

	scanner := New(db, tmpDir)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Clear database between runs
		db.Exec("DELETE FROM project_files")
		db.Exec("DELETE FROM projects")

		err := scanner.ScanForProjects()
		if err != nil {
			b.Errorf("ScanForProjects failed: %v", err)
		}
	}
}

// BenchmarkCalculateFileHash benchmarks hash calculation
func BenchmarkCalculateFileHash(b *testing.B) {
	db := setupTestDB(&testing.T{})
	tmpDir := b.TempDir()
	scanner := New(db, tmpDir)

	// Create a test file
	testContent := strings.Repeat("test content ", 1000) // Roughly 13KB
	testFile := filepath.Join(tmpDir, "benchmark.txt")
	err := os.WriteFile(testFile, []byte(testContent), 0644)
	if err != nil {
		b.Fatalf("Failed to create test file: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := scanner.calculateFileHash(testFile)
		if err != nil {
			b.Errorf("calculateFileHash failed: %v", err)
		}
	}
}
