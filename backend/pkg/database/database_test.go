package database

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"3dshelf/internal/models"
)

// TestInitialize tests successful database initialization
func TestInitialize(t *testing.T) {
	// Create a temporary file for testing
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_database.db")

	// Initialize database
	err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Check that global DB variable is set
	if DB == nil {
		t.Error("Global DB variable should not be nil after initialization")
	}

	// Verify the database file was created
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Errorf("Database file was not created at path: %s", dbPath)
	}

	// Test that we can perform basic operations
	if err := testDatabaseOperations(); err != nil {
		t.Errorf("Basic database operations failed: %v", err)
	}
}

// TestInitializeInvalidPath tests database initialization with invalid path
func TestInitializeInvalidPath(t *testing.T) {
	// Try to initialize with an invalid path (non-existent directory)
	invalidPath := "/nonexistent/directory/database.db"

	err := Initialize(invalidPath)
	if err == nil {
		t.Error("Expected error when initializing database with invalid path, but got nil")
	}
}

// TestInitializeEmptyPath tests database initialization with empty path
func TestInitializeEmptyPath(t *testing.T) {
	// Try to initialize with empty path (should create in-memory database)
	err := Initialize("")
	if err != nil {
		t.Errorf("Failed to initialize database with empty path: %v", err)
	}

	// Check that global DB variable is set
	if DB == nil {
		t.Error("Global DB variable should not be nil after initialization with empty path")
	}
}

// TestInitializeInMemoryDatabase tests initialization with in-memory database
func TestInitializeInMemoryDatabase(t *testing.T) {
	err := Initialize(":memory:")
	if err != nil {
		t.Fatalf("Failed to initialize in-memory database: %v", err)
	}

	if DB == nil {
		t.Error("Global DB variable should not be nil after in-memory database initialization")
	}

	// Test that we can perform operations on in-memory database
	if err := testDatabaseOperations(); err != nil {
		t.Errorf("Basic operations failed on in-memory database: %v", err)
	}
}

// TestGetDB tests the GetDB function
func TestGetDB(t *testing.T) {
	// First initialize a database
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_get_db.db")

	err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database for GetDB test: %v", err)
	}

	// Test GetDB function
	db := GetDB()
	if db == nil {
		t.Error("GetDB() returned nil")
	}

	if db != DB {
		t.Error("GetDB() returned different instance than global DB variable")
	}
}

// TestGetDBBeforeInitialize tests GetDB when database is not initialized
func TestGetDBBeforeInitialize(t *testing.T) {
	// Clear the global DB variable
	originalDB := DB
	DB = nil
	defer func() {
		DB = originalDB
	}()

	db := GetDB()
	if db != nil {
		t.Error("GetDB() should return nil when database is not initialized")
	}
}

// TestMultipleInitialize tests calling Initialize multiple times
func TestMultipleInitialize(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath1 := filepath.Join(tmpDir, "test_db1.db")
	dbPath2 := filepath.Join(tmpDir, "test_db2.db")

	// First initialization
	err := Initialize(dbPath1)
	if err != nil {
		t.Fatalf("First initialization failed: %v", err)
	}

	firstDB := DB

	// Second initialization (should replace the first one)
	err = Initialize(dbPath2)
	if err != nil {
		t.Fatalf("Second initialization failed: %v", err)
	}

	if DB == firstDB {
		t.Error("Second initialization should create a new database instance")
	}
}

// TestDatabaseMigrations tests that models are properly migrated
func TestDatabaseMigrations(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_migrations.db")

	err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Test that we can create and query Project table
	project := &models.Project{
		Name:        "Test Migration Project",
		Path:        "/test/migration/path",
		Description: "Testing migrations",
		Status:      models.StatusHealthy,
		LastScanned: time.Now(),
	}

	result := DB.Create(project)
	if result.Error != nil {
		t.Errorf("Failed to create project: %v", result.Error)
	}

	// Test that we can create and query ProjectFile table
	projectFile := &models.ProjectFile{
		ProjectID: project.ID,
		Filename:  "test.stl",
		Filepath:  "/test/migration/path/test.stl",
		FileType:  models.FileTypeSTL,
		Size:      1024,
		Hash:      "abcd1234",
	}

	result = DB.Create(projectFile)
	if result.Error != nil {
		t.Errorf("Failed to create project file: %v", result.Error)
	}

	// Test relationships
	var retrievedProject models.Project
	result = DB.Preload("Files").First(&retrievedProject, project.ID)
	if result.Error != nil {
		t.Errorf("Failed to retrieve project with files: %v", result.Error)
	}

	if len(retrievedProject.Files) != 1 {
		t.Errorf("Expected 1 file in project, got %d", len(retrievedProject.Files))
	}

	if retrievedProject.Files[0].Filename != "test.stl" {
		t.Errorf("Expected filename 'test.stl', got '%s'", retrievedProject.Files[0].Filename)
	}
}

// TestDatabaseConstraints tests database constraints and validations
func TestDatabaseConstraints(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_constraints.db")

	err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Test unique constraint on project path
	project1 := &models.Project{
		Name: "Project 1",
		Path: "/unique/path",
	}

	result := DB.Create(project1)
	if result.Error != nil {
		t.Errorf("Failed to create first project: %v", result.Error)
	}

	project2 := &models.Project{
		Name: "Project 2",
		Path: "/unique/path", // Same path should violate unique constraint
	}

	result = DB.Create(project2)
	if result.Error == nil {
		t.Error("Expected error when creating project with duplicate path, but got none")
	}
}

// TestDatabasePerformance tests basic performance characteristics
func TestDatabasePerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_performance.db")

	err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Create multiple projects and measure time
	startTime := time.Now()
	numProjects := 100

	for i := 0; i < numProjects; i++ {
		project := &models.Project{
			Name: "Performance Test Project",
			Path: "/test/performance/path" + string(rune(i)),
		}

		result := DB.Create(project)
		if result.Error != nil {
			t.Errorf("Failed to create project %d: %v", i, result.Error)
		}
	}

	duration := time.Since(startTime)
	t.Logf("Created %d projects in %v (%.2f projects/second)",
		numProjects, duration, float64(numProjects)/duration.Seconds())

	// Verify all projects were created
	var count int64
	DB.Model(&models.Project{}).Count(&count)
	if count != int64(numProjects) {
		t.Errorf("Expected %d projects in database, got %d", numProjects, count)
	}
}

// testDatabaseOperations performs basic database operations for testing
func testDatabaseOperations() error {
	// Create a project
	project := &models.Project{
		Name:        "Test Project",
		Path:        "/test/path",
		Description: "A test project",
		Status:      models.StatusHealthy,
		LastScanned: time.Now(),
	}

	result := DB.Create(project)
	if result.Error != nil {
		return result.Error
	}

	// Read the project back
	var retrievedProject models.Project
	result = DB.First(&retrievedProject, project.ID)
	if result.Error != nil {
		return result.Error
	}

	// Update the project
	retrievedProject.Description = "Updated description"
	result = DB.Save(&retrievedProject)
	if result.Error != nil {
		return result.Error
	}

	// Delete the project
	result = DB.Delete(&retrievedProject)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// BenchmarkInitialize benchmarks database initialization
func BenchmarkInitialize(b *testing.B) {
	for i := 0; i < b.N; i++ {
		tmpDir := b.TempDir()
		dbPath := filepath.Join(tmpDir, "benchmark.db")

		if err := Initialize(dbPath); err != nil {
			b.Fatalf("Initialize failed: %v", err)
		}
	}
}

// BenchmarkGetDB benchmarks the GetDB function
func BenchmarkGetDB(b *testing.B) {
	// Initialize once for the benchmark
	tmpDir := b.TempDir()
	dbPath := filepath.Join(tmpDir, "benchmark.db")
	if err := Initialize(dbPath); err != nil {
		b.Fatalf("Initialize failed: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = GetDB()
	}
}

// TestDatabaseTransaction tests transaction support
func TestDatabaseTransaction(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_transaction.db")

	err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Start a transaction
	tx := DB.Begin()

	project := &models.Project{
		Name: "Transaction Test",
		Path: "/transaction/test",
	}

	// Create project within transaction
	result := tx.Create(project)
	if result.Error != nil {
		t.Errorf("Failed to create project in transaction: %v", result.Error)
	}

	// Check that project exists within transaction
	var count int64
	tx.Model(&models.Project{}).Count(&count)
	if count != 1 {
		t.Errorf("Expected 1 project in transaction, got %d", count)
	}

	// Rollback transaction
	tx.Rollback()

	// Check that project does not exist after rollback
	DB.Model(&models.Project{}).Count(&count)
	if count != 0 {
		t.Errorf("Expected 0 projects after rollback, got %d", count)
	}
}
