# 3DShelf

A web application to organize and manage 3D printing projects with filesystem integration.

## Features

- 📁 **Filesystem Integration** - Automatically scan and import 3D printing projects from your filesystem
- 🔍 **Project Discovery** - Automatically group related files (STL, 3MF, CAD, G-code) into projects
- 📖 **README Rendering** - Display project descriptions from markdown files
- 🔄 **Sync Management** - Keep database and filesystem in sync with integrity checking
- ⚠️ **Consistency Alerts** - Visual warnings for filesystem-database inconsistencies
- 🐳 **Docker Support** - Easy deployment with Docker containers
- 🎨 **Modern UI** - Clean, responsive interface built with React and Next.js

## Tech Stack

- **Backend**: Go with Gin framework
- **Frontend**: React, Next.js, TypeScript, Chakra UI
- **Database**: SQLite with GORM
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Make (optional, for convenience commands)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd printvault

# Build and run with Docker Compose
make docker-up

# Or manually:
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Local Development

```bash
# Quick start - automatic setup and parallel execution
make dev

# Manual approach:
# 1. Setup dependencies
make dev-setup

# 2. Run both servers (Ctrl+C stops both)
make dev

# Individual servers for debugging:
make dev-backend    # Backend only (port 8080)
make dev-frontend   # Frontend only (port 3000)
```

## Configuration

Set the following environment variables or update the `.env` file:

- `SCAN_PATH`: Directory to scan for 3D printing projects (default: `/data/projects`)
- `DATABASE_PATH`: Path to SQLite database (default: `./printvault.db`)
- `PORT`: Backend server port (default: `8080`)

## Project Structure

```
printvault/
├── backend/           # Go backend API
├── frontend/          # React frontend
├── docker-compose.yml # Docker orchestration
├── Makefile          # Build and run commands
└── README.md         # This file
```

## API Documentation

See [backend/README.md](backend/README.md) for detailed API documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `make test`
5. Submit a pull request

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License.

**Key Terms:**
- ✅ You can share and adapt this project
- ✅ Attribution is required
- ❌ Commercial use is prohibited

See the [LICENSE](LICENSE) file for full details.