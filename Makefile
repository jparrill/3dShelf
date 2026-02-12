.PHONY: help build run test test-unit test-integration test-e2e test-coverage test-frontend test-backend test-watch test-setup verify verify-backend verify-frontend clean update docker-build docker-up docker-down dev dev-setup dev-backend dev-frontend

# Default target
help:
	@echo "3DShelf - 3D Project Organizer"
	@echo ""
	@echo "Available commands:"
	@echo "  build        - Build backend and frontend"
	@echo "  run          - Run backend and frontend locally"
	@echo "  clean        - Clean build artifacts"
	@echo "  update       - Update all dependencies to latest versions"
	@echo "  docker-build - Build Docker images"
	@echo "  docker-up    - Start application with Docker Compose"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  dev          - Start local development servers (backend + frontend)"
	@echo "  dev-setup    - Install dependencies for local development"
	@echo ""
	@echo "Testing commands:"
	@echo "  verify       - Run comprehensive test suite (all backend + frontend tests)"
	@echo "  test         - Run all tests (backend + frontend)"
	@echo "  test-unit    - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  test-e2e     - Run end-to-end tests only"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  test-frontend - Run all frontend tests"
	@echo "  test-backend - Run backend tests only"
	@echo "  test-watch   - Run frontend tests in watch mode"
	@echo "  test-setup   - Install test dependencies (Playwright browsers)"

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

# Run comprehensive test verification (all tests + linting + type checking)
verify:
	@echo "🚀 Running comprehensive test verification..."
	@echo ""
	@echo "📋 Test Plan:"
	@echo "   1. 🔍 Backend: Formatting, linting & static analysis"
	@echo "   2. 🧪 Backend: Unit tests"
	@echo "   3. 🔗 Backend: Integration tests"
	@echo "   4. 🌐 Backend: End-to-end tests"
	@echo "   5. 📊 Backend: Test coverage analysis"
	@echo "   6. 🔍 Frontend: Type checking & linting"
	@echo "   7. 🧪 Frontend: Unit tests"
	@echo "   8. 🔗 Frontend: Integration tests"
	@echo "   9. 🌐 Frontend: End-to-end tests"
	@echo "   10. 📊 Frontend: Coverage verification"
	@echo ""
	@echo "🔧 Starting backend verification..."
	@$(MAKE) verify-backend
	@echo ""
	@echo "📱 Starting frontend verification..."
	@$(MAKE) verify-frontend
	@echo ""
	@echo "✅ ALL TESTS PASSED! 🎉"
	@echo ""
	@echo "📊 Summary:"
	@echo "   ✅ Backend: Unit, Integration, E2E tests passed"
	@echo "   ✅ Frontend: Unit, Integration, E2E tests passed"
	@echo "   ✅ Code quality: Linting and formatting verified"
	@echo "   ✅ Type safety: TypeScript validation passed"
	@echo ""
	@echo "🚀 Ready for deployment!"

# Run all tests (backend + frontend) - lighter version
test: test-backend test-frontend
	@echo "✅ All tests completed successfully!"

# Run comprehensive backend verification
verify-backend:
	@echo "🔧 Backend: Formatting and linting..."
	@$(MAKE) -C backend fmt vet lint
	@echo "🧪 Backend: Running unit tests..."
	@$(MAKE) -C backend test-unit
	@echo "🔗 Backend: Running integration tests..."
	@$(MAKE) -C backend test-integration
	@echo "🌐 Backend: Running E2E tests..."
	@$(MAKE) -C backend test-e2e
	@echo "📊 Backend: Generating coverage report..."
	@$(MAKE) -C backend test-coverage
	@echo "✅ Backend verification completed successfully!"

# Run backend tests only
test-backend:
	@echo "🧪 Running backend tests..."
	ZDOTDIR= go test -C backend ./...

# Run comprehensive frontend verification
verify-frontend:
	@echo "🔍 Frontend: Type checking..."
	ZDOTDIR= cd frontend && npm run type-check
	@echo "🔍 Frontend: Linting..."
	ZDOTDIR= cd frontend && npm run lint
	@echo "🧪 Frontend: Running unit tests..."
	ZDOTDIR= cd frontend && npm run test:unit
	@echo "🔗 Frontend: Running integration tests..."
	ZDOTDIR= cd frontend && npm run test:integration
	@echo "🌐 Frontend: Setting up E2E environment..."
	ZDOTDIR= cd frontend && npx playwright install --with-deps
	@echo "🌐 Frontend: Running E2E tests..."
	ZDOTDIR= cd frontend && npm run test:e2e
	@echo "📊 Frontend: Generating coverage report..."
	ZDOTDIR= cd frontend && npm run test:coverage
	@echo "✅ Frontend verification completed successfully!"

# Run frontend tests only
test-frontend:
	@echo "🧪 Running frontend tests..."
	ZDOTDIR= cd frontend && npm run test:ci

# Run unit tests only
test-unit:
	@echo "🧪 Running unit tests..."
	@echo "Backend unit tests:"
	ZDOTDIR= go test -C backend ./...
	@echo "Frontend unit tests:"
	ZDOTDIR= cd frontend && npm run test:unit

# Run integration tests only
test-integration:
	@echo "🧪 Running integration tests..."
	ZDOTDIR= cd frontend && npm run test:integration

# Run end-to-end tests only
test-e2e:
	@echo "🧪 Running end-to-end tests..."
	@echo "Installing Playwright browsers..."
	ZDOTDIR= cd frontend && npx playwright install --with-deps
	@echo "Starting development server for E2E tests..."
	ZDOTDIR= cd frontend && npm run test:e2e

# Run tests with coverage report
test-coverage:
	@echo "🧪 Running tests with coverage..."
	@echo "Backend coverage:"
	ZDOTDIR= go test -C backend -coverprofile=coverage.out ./...
	ZDOTDIR= go tool cover -html=backend/coverage.out -o backend/coverage.html
	@echo "Frontend coverage:"
	ZDOTDIR= cd frontend && npm run test:coverage
	@echo ""
	@echo "📊 Coverage reports generated:"
	@echo "   Backend: backend/coverage.html"
	@echo "   Frontend: frontend/coverage/lcov-report/index.html"

# Run frontend tests in watch mode (for development)
test-watch:
	@echo "🧪 Running frontend tests in watch mode..."
	@echo "Press 'q' to quit, 'a' to run all tests"
	ZDOTDIR= cd frontend && npm run test:watch

# Setup test dependencies
test-setup:
	@echo "🛠️  Setting up test dependencies..."
	@echo "Installing Playwright browsers..."
	ZDOTDIR= cd frontend && npx playwright install --with-deps
	@echo "✅ Test setup completed!"

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
	ZDOTDIR= cd frontend && npm install --legacy-peer-deps
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