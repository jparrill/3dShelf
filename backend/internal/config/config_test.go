package config

import (
	"os"
	"testing"
)

// TestLoad tests the Load function with default values
func TestLoad(t *testing.T) {
	// Clear all environment variables first
	clearConfigEnvVars()

	config, err := Load()
	if err != nil {
		t.Errorf("Load() returned error: %v", err)
	}

	if config == nil {
		t.Fatal("Load() returned nil config")
	}

	// Test default values
	if config.ScanPath != "/data/projects" {
		t.Errorf("Expected ScanPath to be '/data/projects', got '%s'", config.ScanPath)
	}

	if config.DatabasePath != "./printvault.db" {
		t.Errorf("Expected DatabasePath to be './printvault.db', got '%s'", config.DatabasePath)
	}

	if config.Port != "8080" {
		t.Errorf("Expected Port to be '8080', got '%s'", config.Port)
	}

	if config.GinMode != "debug" {
		t.Errorf("Expected GinMode to be 'debug', got '%s'", config.GinMode)
	}
}

// TestLoadWithEnvironmentVariables tests Load with custom environment variables
func TestLoadWithEnvironmentVariables(t *testing.T) {
	// Clear environment variables first
	clearConfigEnvVars()

	// Set custom environment variables
	testVars := map[string]string{
		"SCAN_PATH":     "/custom/scan/path",
		"DATABASE_PATH": "/custom/database.db",
		"PORT":          "9090",
		"GIN_MODE":      "release",
	}

	for key, value := range testVars {
		if err := os.Setenv(key, value); err != nil {
			t.Fatalf("Failed to set environment variable %s: %v", key, err)
		}
	}

	// Clean up environment variables after test
	defer func() {
		for key := range testVars {
			os.Unsetenv(key)
		}
	}()

	config, err := Load()
	if err != nil {
		t.Errorf("Load() returned error: %v", err)
	}

	if config.ScanPath != testVars["SCAN_PATH"] {
		t.Errorf("Expected ScanPath to be '%s', got '%s'", testVars["SCAN_PATH"], config.ScanPath)
	}

	if config.DatabasePath != testVars["DATABASE_PATH"] {
		t.Errorf("Expected DatabasePath to be '%s', got '%s'", testVars["DATABASE_PATH"], config.DatabasePath)
	}

	if config.Port != testVars["PORT"] {
		t.Errorf("Expected Port to be '%s', got '%s'", testVars["PORT"], config.Port)
	}

	if config.GinMode != testVars["GIN_MODE"] {
		t.Errorf("Expected GinMode to be '%s', got '%s'", testVars["GIN_MODE"], config.GinMode)
	}
}

// TestGetEnv tests the getEnv function
func TestGetEnv(t *testing.T) {
	testCases := []struct {
		name         string
		envKey       string
		envValue     string
		defaultValue string
		expected     string
		setEnv       bool
	}{
		{
			name:         "Environment variable exists",
			envKey:       "TEST_KEY_1",
			envValue:     "test_value",
			defaultValue: "default_value",
			expected:     "test_value",
			setEnv:       true,
		},
		{
			name:         "Environment variable does not exist",
			envKey:       "TEST_KEY_2",
			defaultValue: "default_value",
			expected:     "default_value",
			setEnv:       false,
		},
		{
			name:         "Environment variable is empty",
			envKey:       "TEST_KEY_3",
			envValue:     "",
			defaultValue: "default_value",
			expected:     "default_value",
			setEnv:       true,
		},
		{
			name:         "Default value is empty",
			envKey:       "TEST_KEY_4",
			envValue:     "non_empty_value",
			defaultValue: "",
			expected:     "non_empty_value",
			setEnv:       true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clean up environment variable first
			os.Unsetenv(tc.envKey)

			if tc.setEnv {
				if err := os.Setenv(tc.envKey, tc.envValue); err != nil {
					t.Fatalf("Failed to set environment variable: %v", err)
				}
				defer os.Unsetenv(tc.envKey)
			}

			result := getEnv(tc.envKey, tc.defaultValue)
			if result != tc.expected {
				t.Errorf("Expected '%s', got '%s'", tc.expected, result)
			}
		})
	}
}

// TestGetEnvAsInt tests the getEnvAsInt function
func TestGetEnvAsInt(t *testing.T) {
	testCases := []struct {
		name         string
		envKey       string
		envValue     string
		defaultValue int
		expected     int
		setEnv       bool
	}{
		{
			name:         "Valid integer environment variable",
			envKey:       "TEST_INT_1",
			envValue:     "42",
			defaultValue: 100,
			expected:     42,
			setEnv:       true,
		},
		{
			name:         "Invalid integer environment variable",
			envKey:       "TEST_INT_2",
			envValue:     "not_an_integer",
			defaultValue: 100,
			expected:     100,
			setEnv:       true,
		},
		{
			name:         "Environment variable not set",
			envKey:       "TEST_INT_3",
			defaultValue: 200,
			expected:     200,
			setEnv:       false,
		},
		{
			name:         "Empty environment variable",
			envKey:       "TEST_INT_4",
			envValue:     "",
			defaultValue: 300,
			expected:     300,
			setEnv:       true,
		},
		{
			name:         "Zero value",
			envKey:       "TEST_INT_5",
			envValue:     "0",
			defaultValue: 400,
			expected:     0,
			setEnv:       true,
		},
		{
			name:         "Negative value",
			envKey:       "TEST_INT_6",
			envValue:     "-123",
			defaultValue: 400,
			expected:     -123,
			setEnv:       true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clean up environment variable first
			os.Unsetenv(tc.envKey)

			if tc.setEnv {
				if err := os.Setenv(tc.envKey, tc.envValue); err != nil {
					t.Fatalf("Failed to set environment variable: %v", err)
				}
				defer os.Unsetenv(tc.envKey)
			}

			result := getEnvAsInt(tc.envKey, tc.defaultValue)
			if result != tc.expected {
				t.Errorf("Expected %d, got %d", tc.expected, result)
			}
		})
	}
}

// TestConfigStruct tests the Config struct initialization
func TestConfigStruct(t *testing.T) {
	config := &Config{
		ScanPath:     "/test/path",
		DatabasePath: "/test/db.sqlite",
		Port:         "3000",
		GinMode:      "release",
	}

	if config.ScanPath != "/test/path" {
		t.Errorf("Expected ScanPath '/test/path', got '%s'", config.ScanPath)
	}

	if config.DatabasePath != "/test/db.sqlite" {
		t.Errorf("Expected DatabasePath '/test/db.sqlite', got '%s'", config.DatabasePath)
	}

	if config.Port != "3000" {
		t.Errorf("Expected Port '3000', got '%s'", config.Port)
	}

	if config.GinMode != "release" {
		t.Errorf("Expected GinMode 'release', got '%s'", config.GinMode)
	}
}

// TestPartialEnvironmentVariables tests scenario with only some env vars set
func TestPartialEnvironmentVariables(t *testing.T) {
	clearConfigEnvVars()

	// Set only some environment variables
	if err := os.Setenv("SCAN_PATH", "/custom/scan"); err != nil {
		t.Fatalf("Failed to set SCAN_PATH: %v", err)
	}
	if err := os.Setenv("PORT", "5000"); err != nil {
		t.Fatalf("Failed to set PORT: %v", err)
	}

	defer func() {
		os.Unsetenv("SCAN_PATH")
		os.Unsetenv("PORT")
	}()

	config, err := Load()
	if err != nil {
		t.Errorf("Load() returned error: %v", err)
	}

	// Check set values
	if config.ScanPath != "/custom/scan" {
		t.Errorf("Expected ScanPath '/custom/scan', got '%s'", config.ScanPath)
	}

	if config.Port != "5000" {
		t.Errorf("Expected Port '5000', got '%s'", config.Port)
	}

	// Check default values for unset variables
	if config.DatabasePath != "./printvault.db" {
		t.Errorf("Expected DatabasePath './printvault.db', got '%s'", config.DatabasePath)
	}

	if config.GinMode != "debug" {
		t.Errorf("Expected GinMode 'debug', got '%s'", config.GinMode)
	}
}

// TestLoadAlwaysSucceeds tests that Load() never returns an error
func TestLoadAlwaysSucceeds(t *testing.T) {
	// Test multiple times to ensure consistency
	for i := 0; i < 5; i++ {
		config, err := Load()
		if err != nil {
			t.Errorf("Iteration %d: Load() returned error: %v", i, err)
		}
		if config == nil {
			t.Errorf("Iteration %d: Load() returned nil config", i)
		}
	}
}

// TestSpecialCharactersInEnvironmentValues tests handling of special characters
func TestSpecialCharactersInEnvironmentValues(t *testing.T) {
	clearConfigEnvVars()

	specialValues := map[string]string{
		"SCAN_PATH":     "/path/with spaces/and-dashes",
		"DATABASE_PATH": "./database_with_underscores.db",
		"PORT":          "8080",
		"GIN_MODE":      "debug-mode",
	}

	for key, value := range specialValues {
		if err := os.Setenv(key, value); err != nil {
			t.Fatalf("Failed to set %s: %v", key, err)
		}
	}

	defer func() {
		for key := range specialValues {
			os.Unsetenv(key)
		}
	}()

	config, err := Load()
	if err != nil {
		t.Errorf("Load() returned error: %v", err)
	}

	if config.ScanPath != specialValues["SCAN_PATH"] {
		t.Errorf("Expected ScanPath '%s', got '%s'", specialValues["SCAN_PATH"], config.ScanPath)
	}

	if config.DatabasePath != specialValues["DATABASE_PATH"] {
		t.Errorf("Expected DatabasePath '%s', got '%s'", specialValues["DATABASE_PATH"], config.DatabasePath)
	}

	if config.GinMode != specialValues["GIN_MODE"] {
		t.Errorf("Expected GinMode '%s', got '%s'", specialValues["GIN_MODE"], config.GinMode)
	}
}

// clearConfigEnvVars clears all configuration-related environment variables
func clearConfigEnvVars() {
	configKeys := []string{"SCAN_PATH", "DATABASE_PATH", "PORT", "GIN_MODE"}
	for _, key := range configKeys {
		os.Unsetenv(key)
	}
}

// BenchmarkLoad benchmarks the Load function
func BenchmarkLoad(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, err := Load()
		if err != nil {
			b.Errorf("Load() returned error: %v", err)
		}
	}
}

// BenchmarkGetEnv benchmarks the getEnv function
func BenchmarkGetEnv(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getEnv("NONEXISTENT_KEY", "default_value")
	}
}

// BenchmarkGetEnvAsInt benchmarks the getEnvAsInt function
func BenchmarkGetEnvAsInt(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getEnvAsInt("NONEXISTENT_KEY", 42)
	}
}