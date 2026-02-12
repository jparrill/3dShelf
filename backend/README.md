# 3DShelf Backend

Go backend API for 3DShelf 3D project organizer.

## Features

- RESTful API for project management
- Filesystem scanning and project discovery
- SQLite database with GORM
- Markdown README rendering
- File integrity checking
- Project synchronization

## API Endpoints

### Health Check
- `GET /api/health` - Service health status

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects/scan` - Scan filesystem for new projects
- `GET /api/projects/search?q=query` - Search projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id/sync` - Sync project with filesystem
- `GET /api/projects/:id/files` - Get project files
- `GET /api/projects/:id/readme` - Get rendered README content
- `GET /api/projects/:id/stats` - Get project statistics

## Configuration

Environment variables:

- `SCAN_PATH` - Directory to scan for projects (default: `/data/projects`)
- `DATABASE_PATH` - SQLite database path (default: `./printvault.db`)
- `PORT` - Server port (default: `8080`)
- `GIN_MODE` - Gin mode: `debug`, `release`, `test` (default: `debug`)

## Development

```bash
# Install dependencies
make deps

# Run the server
make run

# Run tests
make test

# Build binary
make build
```

## Project Structure

```
backend/
├── cmd/server/          # Main application
├── internal/
│   ├── config/         # Configuration management
│   ├── handlers/       # HTTP handlers
│   ├── models/         # Data models
│   └── services/       # Business logic
└── pkg/
    ├── database/       # Database connection
    └── scanner/        # Filesystem scanner
```

## Database Schema

### Projects
- `id` - Primary key
- `name` - Project name
- `path` - Filesystem path
- `description` - README content
- `status` - Health status (healthy/inconsistent/error)
- `last_scanned` - Last scan timestamp
- `created_at`, `updated_at` - Timestamps

### Project Files
- `id` - Primary key
- `project_id` - Foreign key to projects
- `filename` - File name
- `filepath` - Full file path
- `file_type` - File type (stl/3mf/gcode/cad/readme/other)
- `size` - File size in bytes
- `hash` - SHA-256 hash for integrity
- `created_at`, `updated_at` - Timestamps