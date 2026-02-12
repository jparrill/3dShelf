.PHONY: help build run test clean update docker-build docker-up docker-down dev dev-setup dev-backend dev-frontend

# Default target
help:
	@echo "3DShelf - 3D Project Organizer"
	@echo ""
	@echo "Available commands:"
	@echo "  build        - Build backend and frontend"
	@echo "  run          - Run backend and frontend locally"
	@echo "  test         - Run all tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  update       - Update all dependencies to latest versions"
	@echo "  docker-build - Build Docker images"
	@echo "  docker-up    - Start application with Docker Compose"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  dev          - Start local development servers (backend + frontend)"
	@echo "  dev-setup    - Install dependencies for local development"

# Build both backend and frontend
build:
	@echo "Building backend..."
	ZDOTDIR= go build -C backend -o dshelf-backend ./cmd/server
	@echo "Building frontend..."
	ZDOTDIR= cd frontend && npm run build

# Run locally (requires Go and Node.js)
run:
	@echo "Starting backend..."
	ZDOTDIR= go run -C backend ./cmd/server &
	@echo "Starting frontend..."
	ZDOTDIR= cd frontend && npm run dev

# Run tests
test:
	@echo "Running backend tests..."
	ZDOTDIR= go test -C backend ./...
	@echo "Running frontend tests..."
	ZDOTDIR= cd frontend && npm test

# Clean build artifacts
clean:
	@echo "Cleaning backend build..."
	rm -f backend/dshelf-backend
	@echo "Cleaning frontend build..."
	rm -rf frontend/.next frontend/out
	@echo "Cleaning Docker images..."
	docker image prune -f

# Update dependencies
update:
	@echo "Updating backend dependencies..."
	ZDOTDIR= go get -u -C backend ./...
	ZDOTDIR= go mod tidy -C backend
	@echo "Updating frontend dependencies..."
	ZDOTDIR= cd frontend && npm update
	ZDOTDIR= cd frontend && npm audit fix --force || true
	@echo "✅ All dependencies updated!"
	@echo "💡 Run 'make build' to test the updated dependencies"

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
	ZDOTDIR= go mod tidy -C backend && go mod download -C backend
	@echo "Installing frontend dependencies..."
	ZDOTDIR= cd frontend && npm install
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
	ZDOTDIR= go run -C backend ./cmd/server

# Frontend development server
dev-frontend:
	@echo "📱 Starting frontend development server..."
	ZDOTDIR= cd frontend && npm run dev

# Initialize project (for first time setup)
init: dev-setup
	@echo "Initializing 3DShelf..."
	@echo "Creating necessary directories..."
	mkdir -p data/projects
	@echo "✅ 3DShelf initialized successfully!"
	@echo "Run 'make dev' to start development servers"