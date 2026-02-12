package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	ScanPath     string
	DatabasePath string
	Port         string
	GinMode      string
}

// Load loads configuration from environment variables and .env file
func Load() (*Config, error) {
	// Load .env file if it exists (ignore error if file doesn't exist)
	_ = godotenv.Load()

	config := &Config{
		ScanPath:     getEnv("SCAN_PATH", "/data/projects"),
		DatabasePath: getEnv("DATABASE_PATH", "./printvault.db"),
		Port:         getEnv("PORT", "8080"),
		GinMode:      getEnv("GIN_MODE", "debug"),
	}

	return config, nil
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// Validate checks if the configuration is valid and ready to use
func (c *Config) Validate() error {
	// Check if scan path exists, create if possible
	if _, err := os.Stat(c.ScanPath); os.IsNotExist(err) {
		if err := os.MkdirAll(c.ScanPath, 0755); err != nil {
			return fmt.Errorf("scan path '%s' does not exist and cannot be created: %v", c.ScanPath, err)
		}
	}

	// Check if scan path is writable
	testFile := filepath.Join(c.ScanPath, ".write_test")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		return fmt.Errorf("scan path '%s' is not writable: %v", c.ScanPath, err)
	}
	os.Remove(testFile)

	// Check database directory
	dbDir := filepath.Dir(c.DatabasePath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return fmt.Errorf("cannot create database directory '%s': %v", dbDir, err)
	}

	// Validate port is reasonable
	if portInt := getEnvAsInt("PORT", 8080); portInt < 1 || portInt > 65535 {
		return fmt.Errorf("port %d is not valid (must be between 1 and 65535)", portInt)
	}

	return nil
}
