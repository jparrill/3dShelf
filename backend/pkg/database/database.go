package database

import (
	"3dshelf/internal/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// DB holds the database connection
var DB *gorm.DB

// Initialize initializes the database connection and runs migrations
func Initialize(databasePath string) error {
	var err error

	DB, err = gorm.Open(sqlite.Open(databasePath), &gorm.Config{})
	if err != nil {
		return err
	}

	// Run auto migrations
	err = DB.AutoMigrate(
		&models.Project{},
		&models.ProjectFile{},
	)
	if err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
