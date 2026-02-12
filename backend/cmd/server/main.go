package main

import (
	"3dshelf/internal/config"
	"3dshelf/internal/handlers"
	"3dshelf/pkg/database"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize database
	if err := database.Initialize(cfg.DatabasePath); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Create handlers
	projectsHandler := handlers.NewProjectsHandler(cfg.ScanPath)

	// Setup router
	router := gin.Default()

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(corsConfig))

	// Health check endpoint
	router.GET("/api/health", projectsHandler.HealthCheck)

	// API routes
	api := router.Group("/api")
	{
		// Project routes
		projects := api.Group("/projects")
		{
			projects.GET("", projectsHandler.GetProjects)
			projects.POST("", projectsHandler.CreateProject)
			projects.POST("/scan", projectsHandler.ScanProjects)
			projects.GET("/search", projectsHandler.SearchProjects)
			projects.GET("/:id", projectsHandler.GetProject)
			projects.PUT("/:id/sync", projectsHandler.SyncProject)
			projects.GET("/:id/files", projectsHandler.GetProjectFiles)
			projects.POST("/:id/files", projectsHandler.UploadProjectFiles)
			projects.GET("/:id/readme", projectsHandler.GetProjectREADME)
			projects.GET("/:id/stats", projectsHandler.GetProjectStats)
		}
	}

	// Start server
	log.Printf("Starting 3DShelf server on port %s", cfg.Port)
	log.Printf("Scanning path: %s", cfg.ScanPath)
	log.Printf("Database path: %s", cfg.DatabasePath)

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
