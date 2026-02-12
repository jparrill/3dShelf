.PHONY: help build run test clean deps

# Default target
help:
	@echo "3DShelf Backend"
	@echo ""
	@echo "Available commands:"
	@echo "  deps         - Download Go dependencies"
	@echo "  build        - Build the backend binary"
	@echo "  run          - Run the backend server"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"

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

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -f dshelf-backend
	go clean