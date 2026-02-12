# Build stage
FROM golang:1.25 AS builder

WORKDIR /app

# Install dependencies for CGO (needed for SQLite)
RUN apt-get update && apt-get install -y gcc libc6-dev sqlite3 libsqlite3-dev && rm -rf /var/lib/apt/lists/*

# Copy go mod file first
COPY go.mod ./

# Copy source code
COPY . .

# Download dependencies and regenerate go.sum
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=1 go build -o 3dshelf-backend ./cmd/server

# Final stage
FROM debian:bullseye-slim

# Install ca-certificates and curl for health checks
RUN apt-get update && apt-get install -y ca-certificates curl sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/3dshelf-backend .

# Create directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./3dshelf-backend"]