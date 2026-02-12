.PHONY: help build run test clean docker-build docker-up docker-down dev dev-setup dev-backend dev-frontend

# Default target
help:
	@echo "3DShelf - 3D Project Organizer"
	@echo ""
	@echo "Available commands:"
	@echo "  build        - Build backend and frontend"
	@echo "  run          - Run backend and frontend locally"
	@echo "  test         - Run all tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker images"
	@echo "  docker-up    - Start application with Docker Compose"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  dev          - Start local development servers (backend + frontend)"
	@echo "  dev-setup    - Install dependencies for local development"

# Build both backend and frontend
build:
	@echo "Building backend..."
	cd backend && go build -o dshelf-backend ./cmd/server
	@echo "Building frontend..."
	cd frontend && npm run build

# Run locally (requires Go and Node.js)
run:
	@echo "Starting backend..."
	cd backend && go run ./cmd/server &
	@echo "Starting frontend..."
	cd frontend && npm run dev

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && go test ./...
	@echo "Running frontend tests..."
	cd frontend && npm test

# Clean build artifacts
clean:
	@echo "Cleaning backend build..."
	cd backend && rm -f dshelf-backend
	@echo "Cleaning frontend build..."
	cd frontend && rm -rf .next out
	@echo "Cleaning Docker images..."
	docker image prune -f

# Docker commands
docker-build:
	docker-compose build

docker-up:
	@echo "Starting 3DShelf with Docker Compose..."
	docker-compose up --build -d
	@echo ""
	@echo "🚀 3DShelf is starting up!"
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔧 Backend API: http://localhost:8080"
	@echo ""
	@echo "Run 'make docker-down' to stop the application"

docker-down:
	docker-compose down

# Development environment setup
dev-setup:
	@echo "Setting up development environment..."
	@echo "Installing backend dependencies..."
	cd backend && go mod tidy && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ Development environment ready!"
	@echo "Run 'make dev' to start the development servers"

# Start local development servers
dev: dev-setup
	@echo ""
	@echo "🚀 Starting 3DShelf development servers..."
	@echo ""
	@echo "📋 This will start both backend and frontend in parallel:"
	@echo "   🔧 Backend API: http://localhost:8080"
	@echo "   📱 Frontend: http://localhost:3000"
	@echo ""
	@echo "💡 Press Ctrl+C to stop both servers"
	@echo ""
	@make -j2 dev-backend dev-frontend

# Backend development server
dev-backend:
	@echo "🔧 Starting backend development server..."
	cd backend && go run ./cmd/server

# Frontend development server
dev-frontend:
	@echo "📱 Starting frontend development server..."
	cd frontend && npm run dev

# Initialize project (for first time setup)
init: dev-setup
	@echo "Initializing 3DShelf..."
	@echo "Creating necessary directories..."
	mkdir -p data/projects
	@echo "✅ 3DShelf initialized successfully!"
	@echo "Run 'make dev' to start development servers"