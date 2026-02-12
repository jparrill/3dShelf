package models

import (
	"testing"
	"time"
)

// TestGetFileTypeFromExtension tests the file type detection logic
func TestGetFileTypeFromExtension(t *testing.T) {
	testCases := []struct {
		name         string
		filename     string
		expectedType FileType
	}{
		// STL files
		{
			name:         "STL file lowercase",
			filename:     "model.stl",
			expectedType: FileTypeSTL,
		},
		{
			name:         "STL file uppercase",
			filename:     "MODEL.STL",
			expectedType: FileTypeSTL,
		},
		{
			name:         "STL file with path",
			filename:     "/path/to/model.stl",
			expectedType: FileTypeSTL,
		},

		// 3MF files
		{
			name:         "3MF file lowercase",
			filename:     "print.3mf",
			expectedType: FileType3MF,
		},
		{
			name:         "3MF file uppercase",
			filename:     "PRINT.3MF",
			expectedType: FileType3MF,
		},

		// G-code files
		{
			name:         "G-code file lowercase",
			filename:     "sliced.gco",
			expectedType: FileTypeGCode,
		},
		{
			name:         "G-code file uppercase",
			filename:     "SLICED.GCO",
			expectedType: FileTypeGCode,
		},

		// CAD files
		{
			name:         "DWG file lowercase",
			filename:     "drawing.dwg",
			expectedType: FileTypeCAD,
		},
		{
			name:         "DWG file uppercase",
			filename:     "DRAWING.DWG",
			expectedType: FileTypeCAD,
		},
		{
			name:         "STEP file",
			filename:     "model.step",
			expectedType: FileTypeCAD,
		},
		{
			name:         "IGES file",
			filename:     "model.iges",
			expectedType: FileTypeCAD,
		},
		{
			name:         "STP file",
			filename:     "model.stp",
			expectedType: FileTypeCAD,
		},
		{
			name:         "IGS file",
			filename:     "model.igs",
			expectedType: FileTypeCAD,
		},

		// README files
		{
			name:         "README.md lowercase",
			filename:     "README.md",
			expectedType: FileTypeREADME,
		},
		{
			name:         "readme.md lowercase",
			filename:     "readme.md",
			expectedType: FileTypeREADME,
		},
		{
			name:         "README.MD uppercase",
			filename:     "README.MD",
			expectedType: FileTypeREADME,
		},

		// Other files
		{
			name:         "Text file",
			filename:     "notes.txt",
			expectedType: FileTypeOther,
		},
		{
			name:         "Image file",
			filename:     "photo.jpg",
			expectedType: FileTypeOther,
		},
		{
			name:         "Unknown extension",
			filename:     "file.xyz",
			expectedType: FileTypeOther,
		},

		// Edge cases
		{
			name:         "Short filename",
			filename:     "a.b",
			expectedType: FileTypeOther,
		},
		{
			name:         "Empty filename",
			filename:     "",
			expectedType: FileTypeOther,
		},
		{
			name:         "Very short filename",
			filename:     "abc",
			expectedType: FileTypeOther,
		},
		{
			name:         "Filename with no extension",
			filename:     "filename",
			expectedType: FileTypeOther,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := GetFileTypeFromExtension(tc.filename)
			if result != tc.expectedType {
				t.Errorf("Expected %s for filename %s, got %s", tc.expectedType, tc.filename, result)
			}
		})
	}
}

// TestProjectStatusConstants ensures status constants are properly defined
func TestProjectStatusConstants(t *testing.T) {
	if StatusHealthy != ProjectStatus("healthy") {
		t.Errorf("Expected StatusHealthy to be 'healthy', got %s", StatusHealthy)
	}
	if StatusInconsistent != ProjectStatus("inconsistent") {
		t.Errorf("Expected StatusInconsistent to be 'inconsistent', got %s", StatusInconsistent)
	}
	if StatusError != ProjectStatus("error") {
		t.Errorf("Expected StatusError to be 'error', got %s", StatusError)
	}

	// Ensure they are different values
	if StatusHealthy == StatusInconsistent {
		t.Error("StatusHealthy and StatusInconsistent should be different")
	}
	if StatusHealthy == StatusError {
		t.Error("StatusHealthy and StatusError should be different")
	}
	if StatusInconsistent == StatusError {
		t.Error("StatusInconsistent and StatusError should be different")
	}
}

// TestFileTypeConstants ensures file type constants are properly defined
func TestFileTypeConstants(t *testing.T) {
	expectedTypes := map[FileType]string{
		FileTypeSTL:    "stl",
		FileType3MF:    "3mf",
		FileTypeGCode:  "gcode",
		FileTypeCAD:    "cad",
		FileTypeREADME: "readme",
		FileTypeOther:  "other",
	}

	for fileType, expectedValue := range expectedTypes {
		if fileType != FileType(expectedValue) {
			t.Errorf("Expected %s to equal FileType('%s')", fileType, expectedValue)
		}
	}

	// Ensure all constants are unique
	allTypes := []FileType{FileTypeSTL, FileType3MF, FileTypeGCode, FileTypeCAD, FileTypeREADME, FileTypeOther}
	typeMap := make(map[FileType]bool)
	for _, ft := range allTypes {
		if typeMap[ft] {
			t.Errorf("Duplicate file type constant: %s", ft)
		}
		typeMap[ft] = true
	}
}

// TestProjectStruct tests the Project struct basic functionality
func TestProjectStruct(t *testing.T) {
	now := time.Now()

	project := Project{
		ID:          1,
		Name:        "Test Project",
		Path:        "/path/to/project",
		Description: "A test 3D printing project",
		Status:      StatusHealthy,
		LastScanned: now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Test basic field assignments
	if project.ID != uint(1) {
		t.Errorf("Expected ID to be 1, got %d", project.ID)
	}
	if project.Name != "Test Project" {
		t.Errorf("Expected Name to be 'Test Project', got '%s'", project.Name)
	}
	if project.Path != "/path/to/project" {
		t.Errorf("Expected Path to be '/path/to/project', got '%s'", project.Path)
	}
	if project.Description != "A test 3D printing project" {
		t.Errorf("Expected Description to be 'A test 3D printing project', got '%s'", project.Description)
	}
	if project.Status != StatusHealthy {
		t.Errorf("Expected Status to be %s, got %s", StatusHealthy, project.Status)
	}
	if !project.LastScanned.Equal(now) {
		t.Errorf("Expected LastScanned to be %v, got %v", now, project.LastScanned)
	}
	if !project.CreatedAt.Equal(now) {
		t.Errorf("Expected CreatedAt to be %v, got %v", now, project.CreatedAt)
	}
	if !project.UpdatedAt.Equal(now) {
		t.Errorf("Expected UpdatedAt to be %v, got %v", now, project.UpdatedAt)
	}

	// Test that Files slice is initialized empty
	if project.Files == nil {
		t.Error("Files slice should not be nil")
	}
	if len(project.Files) != 0 {
		t.Errorf("Expected Files length to be 0, got %d", len(project.Files))
	}
}

// TestProjectFileStruct tests the ProjectFile struct basic functionality
func TestProjectFileStruct(t *testing.T) {
	now := time.Now()

	projectFile := ProjectFile{
		ID:        1,
		ProjectID: 5,
		Filename:  "model.stl",
		Filepath:  "/path/to/project/model.stl",
		FileType:  FileTypeSTL,
		Size:      1024,
		Hash:      "abc123def456",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Test basic field assignments
	if projectFile.ID != uint(1) {
		t.Errorf("Expected ID to be 1, got %d", projectFile.ID)
	}
	if projectFile.ProjectID != uint(5) {
		t.Errorf("Expected ProjectID to be 5, got %d", projectFile.ProjectID)
	}
	if projectFile.Filename != "model.stl" {
		t.Errorf("Expected Filename to be 'model.stl', got '%s'", projectFile.Filename)
	}
	if projectFile.Filepath != "/path/to/project/model.stl" {
		t.Errorf("Expected Filepath to be '/path/to/project/model.stl', got '%s'", projectFile.Filepath)
	}
	if projectFile.FileType != FileTypeSTL {
		t.Errorf("Expected FileType to be %s, got %s", FileTypeSTL, projectFile.FileType)
	}
	if projectFile.Size != int64(1024) {
		t.Errorf("Expected Size to be 1024, got %d", projectFile.Size)
	}
	if projectFile.Hash != "abc123def456" {
		t.Errorf("Expected Hash to be 'abc123def456', got '%s'", projectFile.Hash)
	}
	if !projectFile.CreatedAt.Equal(now) {
		t.Errorf("Expected CreatedAt to be %v, got %v", now, projectFile.CreatedAt)
	}
	if !projectFile.UpdatedAt.Equal(now) {
		t.Errorf("Expected UpdatedAt to be %v, got %v", now, projectFile.UpdatedAt)
	}
}

// TestProjectWithFiles tests the relationship between Project and ProjectFile
func TestProjectWithFiles(t *testing.T) {
	now := time.Now()

	project := Project{
		ID:          1,
		Name:        "Multi-file Project",
		Path:        "/path/to/project",
		Description: "A project with multiple files",
		Status:      StatusHealthy,
		LastScanned: now,
		CreatedAt:   now,
		UpdatedAt:   now,
		Files: []ProjectFile{
			{
				ID:        1,
				ProjectID: 1,
				Filename:  "model.stl",
				Filepath:  "/path/to/project/model.stl",
				FileType:  FileTypeSTL,
				Size:      2048,
				Hash:      "hash1",
				CreatedAt: now,
				UpdatedAt: now,
			},
			{
				ID:        2,
				ProjectID: 1,
				Filename:  "README.md",
				Filepath:  "/path/to/project/README.md",
				FileType:  FileTypeREADME,
				Size:      512,
				Hash:      "hash2",
				CreatedAt: now,
				UpdatedAt: now,
			},
		},
	}

	// Test that project has files
	if len(project.Files) != 2 {
		t.Errorf("Expected 2 files, got %d", len(project.Files))
	}

	// Test first file
	if project.Files[0].Filename != "model.stl" {
		t.Errorf("Expected first file name to be 'model.stl', got '%s'", project.Files[0].Filename)
	}
	if project.Files[0].FileType != FileTypeSTL {
		t.Errorf("Expected first file type to be %s, got %s", FileTypeSTL, project.Files[0].FileType)
	}
	if project.Files[0].Size != int64(2048) {
		t.Errorf("Expected first file size to be 2048, got %d", project.Files[0].Size)
	}

	// Test second file
	if project.Files[1].Filename != "README.md" {
		t.Errorf("Expected second file name to be 'README.md', got '%s'", project.Files[1].Filename)
	}
	if project.Files[1].FileType != FileTypeREADME {
		t.Errorf("Expected second file type to be %s, got %s", FileTypeREADME, project.Files[1].FileType)
	}
	if project.Files[1].Size != int64(512) {
		t.Errorf("Expected second file size to be 512, got %d", project.Files[1].Size)
	}

	// Ensure both files reference the same project
	if project.Files[0].ProjectID != project.ID {
		t.Errorf("Expected first file ProjectID to be %d, got %d", project.ID, project.Files[0].ProjectID)
	}
	if project.Files[1].ProjectID != project.ID {
		t.Errorf("Expected second file ProjectID to be %d, got %d", project.ID, project.Files[1].ProjectID)
	}
}

// TestProjectStatusValidation tests that project status values are valid
func TestProjectStatusValidation(t *testing.T) {
	validStatuses := []ProjectStatus{StatusHealthy, StatusInconsistent, StatusError}

	for _, status := range validStatuses {
		project := Project{Status: status}
		found := false
		for _, validStatus := range validStatuses {
			if project.Status == validStatus {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Status %s not found in valid statuses", project.Status)
		}
	}
}

// TestFileTypeValidation tests that file type values are valid
func TestFileTypeValidation(t *testing.T) {
	validTypes := []FileType{FileTypeSTL, FileType3MF, FileTypeGCode, FileTypeCAD, FileTypeREADME, FileTypeOther}

	for _, fileType := range validTypes {
		file := ProjectFile{FileType: fileType}
		found := false
		for _, validType := range validTypes {
			if file.FileType == validType {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("FileType %s not found in valid types", file.FileType)
		}
	}
}

// TestGetFileTypeFromExtensionBoundaryConditions tests edge cases for GetFileTypeFromExtension
func TestGetFileTypeFromExtensionBoundaryConditions(t *testing.T) {
	t.Run("panic protection for short filenames", func(t *testing.T) {
		// These should not panic and should return FileTypeOther
		if GetFileTypeFromExtension("") != FileTypeOther {
			t.Error("Empty string should return FileTypeOther")
		}
		if GetFileTypeFromExtension("a") != FileTypeOther {
			t.Error("Single character should return FileTypeOther")
		}
		if GetFileTypeFromExtension("ab") != FileTypeOther {
			t.Error("Two characters should return FileTypeOther")
		}
		if GetFileTypeFromExtension("abc") != FileTypeOther {
			t.Error("Three characters should return FileTypeOther")
		}
	})

	t.Run("case sensitivity", func(t *testing.T) {
		// Test mixed case scenarios
		if GetFileTypeFromExtension("model.Stl") != FileTypeOther {
			t.Error("model.Stl should not match STL (case sensitive)")
		}
		if GetFileTypeFromExtension("model.StL") != FileTypeOther {
			t.Error("model.StL should not match STL (case sensitive)")
		}
		if GetFileTypeFromExtension("model.stl") != FileTypeSTL {
			t.Error("model.stl should match STL")
		}
		if GetFileTypeFromExtension("model.STL") != FileTypeSTL {
			t.Error("model.STL should match STL")
		}
	})

	t.Run("exact length matching", func(t *testing.T) {
		// Test exactly 4-character filenames
		if GetFileTypeFromExtension(".stl") != FileTypeOther {
			t.Error(".stl should return FileTypeOther (too short)")
		}
		if GetFileTypeFromExtension("m.stl") != FileTypeSTL {
			t.Error("m.stl should return FileTypeSTL (minimum valid)")
		}
	})
}