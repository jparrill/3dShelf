# 🚀 Getting Started with 3DShelf

Welcome to **3DShelf** - your 3D printing project organizer! This guide will help you get the application running quickly.

## 📋 Quick Start Options

### Option 1: Docker (Recommended) 🐳

The fastest way to get started:

```bash
# Clone or navigate to your project directory
cd printvault

# Start the application
make docker-up
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

### Option 2: Local Development 💻

For development or if you prefer running locally:

```bash
# Quick start - runs both servers in parallel
make dev

# Or manually step by step:
# Install dependencies
make dev-setup

# Start both servers (Ctrl+C to stop both)
make dev

# Or start servers individually:
make dev-backend    # Backend only (port 8080)
make dev-frontend   # Frontend only (port 3000)
```

## 🔧 Configuration

### Required Setup

1. **Create your projects directory**:
   ```bash
   mkdir -p data/projects
   ```

2. **Copy sample environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit the .env file** to point to your 3D printing projects:
   ```bash
   # Edit this path to your actual 3D printing files location
   SCAN_PATH=/path/to/your/3d/printing/projects
   ```

### Project Directory Structure

3DShelf expects your 3D printing projects to be organized in folders like this:

```
your-projects-directory/
├── miniature-house/
│   ├── README.md
│   ├── house_walls.stl
│   ├── house_roof.stl
│   └── complete_model.3mf
├── drone-parts/
│   ├── README.md
│   ├── camera_mount.stl
│   └── propeller_guards.stl
└── phone-holder/
    ├── README.md
    ├── base.stl
    └── arm.stl
```

## 📁 Sample Data

We've included sample projects in `data/projects/` to get you started:
- **miniature-house**: Detailed tabletop gaming house
- **drone-parts**: FPV drone replacement parts
- **phone-holder**: Universal adjustable phone stand

## 🎯 First Steps

1. **Start the application** using one of the methods above

2. **Visit** http://localhost:3000 in your browser

3. **Click "Scan Projects"** to import your 3D printing files

4. **Browse your projects** - click on any project card to see details

5. **View file lists** and rendered README files for each project

## 🔍 Features to Try

- **🔎 Search**: Use the search bar to find projects by name or description
- **📄 README Support**: Add README.md files to your project folders for rich descriptions
- **🔄 Live Sync**: Click "Sync Project" to update when files change
- **📊 File Statistics**: See file counts, types, and sizes for each project
- **⚠️ Health Status**: Visual indicators show project consistency

## 🛠 Makefile Commands

We've included convenient commands:

```bash
make help           # Show all available commands
make docker-up      # Start with Docker
make docker-down    # Stop Docker containers
make build          # Build both frontend and backend
make test           # Run all tests
make clean          # Clean build artifacts
```

## 🐛 Troubleshooting

### Backend won't start
- Ensure Go 1.21+ is installed
- Run `cd backend && go mod download`
- Check that port 8080 is available

### Frontend won't start
- Ensure Node.js 18+ is installed
- Run `cd frontend && npm install`
- Check that port 3000 is available

### No projects found
- Verify your `SCAN_PATH` in `.env` points to the correct directory
- Ensure your project folders contain `.stl`, `.3mf`, or `.gcode` files
- Click "Scan Projects" to refresh

### Docker issues
- Ensure Docker and Docker Compose are installed
- Run `docker-compose down` then `make docker-up` to restart fresh

## 📚 Next Steps

- Read the full [README.md](./README.md) for detailed information
- Check out the [backend documentation](./backend/README.md) for API details
- Explore the [frontend documentation](./frontend/README.md) for UI customization
- Organize your existing 3D printing projects into the expected folder structure

## 🆘 Need Help?

- Check the logs: `docker-compose logs` (for Docker) or terminal output (for local)
- Verify your project structure matches the expected format
- Ensure all required files are present and readable

Happy 3D printing organization! 🎯