.PHONY: help build run test test-unit test-integration test-e2e test-coverage test-coverage-html test-short test-verbose clean deps lint fmt vet

# Default target
help:
	@echo "3DShelf Backend"
	@echo ""
	@echo "Available commands:"
	@echo "  deps                - Download Go dependencies"
	@echo "  build               - Build the backend binary"
	@echo "  run                 - Run the backend server"
	@echo "  test                - Run all tests"
	@echo "  test-unit           - Run unit tests only"
	@echo "  test-integration    - Run integration tests only"
	@echo "  test-e2e            - Run end-to-end tests only"
	@echo "  test-coverage       - Run tests with coverage report"
	@echo "  test-coverage-html  - Generate HTML coverage report"
	@echo "  test-short          - Run tests in short mode (skip slow tests)"
	@echo "  test-verbose        - Run tests with verbose output"
	@echo "  lint                - Run golangci-lint"
	@echo "  fmt                 - Format Go code"
	@echo "  vet                 - Run go vet"
	@echo "  clean               - Clean build artifacts and test coverage files"

# Download dependencies
deps:
	go mod download
	go mod tidy

# Build the application
build: deps
	CGO_ENABLED=1 go build -o dshelf-backend ./cmd/server

# Run the application
run: build
	./dshelf-backend

# Run all tests
test: fmt vet
	go test -race -timeout 5m ./...

# Run unit tests only (exclude integration and e2e tests)
test-unit: fmt vet
	go test -race -timeout 2m -run "^Test[^E2E]" ./internal/... ./pkg/...

# Run integration tests (handler tests)
test-integration: fmt vet
	go test -race -timeout 3m ./internal/handlers/...

# Run end-to-end tests
test-e2e: fmt vet
	go test -race -timeout 5m -run "^TestE2E" .

# Run tests with coverage
test-coverage: fmt vet
	mkdir -p coverage
	go test -race -timeout 5m -coverprofile=coverage/coverage.out -covermode=atomic ./...
	go tool cover -func=coverage/coverage.out
	@echo ""
	@echo "Coverage summary:"
	@go tool cover -func=coverage/coverage.out | grep "total:" | awk '{print "Total coverage: " $$3}'

# Generate HTML coverage report
test-coverage-html: test-coverage
	go tool cover -html=coverage/coverage.out -o coverage/coverage.html
	@echo "HTML coverage report generated: coverage/coverage.html"

# Run tests in short mode (skip slow tests)
test-short: fmt vet
	go test -short -race -timeout 1m ./...

# Run tests with verbose output
test-verbose: fmt vet
	go test -v -race -timeout 5m ./...

# Format Go code
fmt:
	@echo "Formatting Go code..."
	@gofmt -l -w .
	@echo "Code formatted successfully"

# Run go vet
vet:
	@echo "Running go vet..."
	@go vet ./...
	@echo "go vet completed successfully"

# Run linter (if golangci-lint is available)
lint:
	@echo "Running golangci-lint..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
		echo "Linting completed successfully"; \
	else \
		echo "golangci-lint not installed. Install it with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
		echo "Falling back to go vet..."; \
		make vet; \
	fi

# Clean build artifacts and coverage files
clean:
	rm -f dshelf-backend
	rm -rf coverage/
	go clean -testcache
	go clean -cache