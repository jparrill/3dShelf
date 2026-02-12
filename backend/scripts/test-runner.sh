#!/bin/bash

# Test Runner Script for 3DShelf Backend
# This script provides comprehensive testing capabilities with various options

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERBOSE=false
COVERAGE=false
HTML_COVERAGE=false
SHORT=false
RACE=true
TIMEOUT="5m"
TEST_TYPE="all"
CLEAN=false
BENCHMARK=false
PROFILE=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Test Runner for 3DShelf Backend

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    -c, --coverage      Generate coverage report
    -H, --html          Generate HTML coverage report (implies -c)
    -s, --short         Run tests in short mode (skip slow tests)
    -r, --race          Enable race detection (default: true)
    -R, --no-race       Disable race detection
    -t, --timeout TIME  Set test timeout (default: 5m)
    -T, --type TYPE     Test type: all, unit, integration, e2e (default: all)
    -C, --clean         Clean test cache and coverage files before running
    -b, --bench         Run benchmarks
    -p, --profile TYPE  Enable profiling: cpu, mem, trace

EXAMPLES:
    $0                          # Run all tests with default settings
    $0 -c                       # Run all tests with coverage
    $0 -H                       # Run tests and generate HTML coverage
    $0 -s                       # Run tests in short mode
    $0 -T unit                  # Run unit tests only
    $0 -T e2e -v                # Run E2E tests with verbose output
    $0 -b                       # Run benchmarks
    $0 -C -H                    # Clean cache and generate HTML coverage

TEST TYPES:
    all                         # Run all tests (unit, integration, e2e)
    unit                        # Run unit tests only
    integration                 # Run integration tests only
    e2e                         # Run end-to-end tests only

ENVIRONMENT VARIABLES:
    TEST_DB_PATH               # Override test database path
    TEST_SCAN_PATH             # Override test scan path
    SKIP_LINT                  # Skip linting checks
    PARALLEL                   # Number of parallel test executions
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -H|--html)
            HTML_COVERAGE=true
            COVERAGE=true
            shift
            ;;
        -s|--short)
            SHORT=true
            shift
            ;;
        -r|--race)
            RACE=true
            shift
            ;;
        -R|--no-race)
            RACE=false
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -T|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -C|--clean)
            CLEAN=true
            shift
            ;;
        -b|--bench)
            BENCHMARK=true
            shift
            ;;
        -p|--profile)
            PROFILE="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate test type
case $TEST_TYPE in
    all|unit|integration|e2e)
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE. Must be one of: all, unit, integration, e2e"
        exit 1
        ;;
esac

# Validate profile type
if [[ -n "$PROFILE" ]]; then
    case $PROFILE in
        cpu|mem|trace)
            ;;
        *)
            print_error "Invalid profile type: $PROFILE. Must be one of: cpu, mem, trace"
            exit 1
            ;;
    esac
fi

# Print configuration
print_status "Test Runner Configuration:"
echo "  Test Type: $TEST_TYPE"
echo "  Verbose: $VERBOSE"
echo "  Coverage: $COVERAGE"
echo "  HTML Coverage: $HTML_COVERAGE"
echo "  Short Mode: $SHORT"
echo "  Race Detection: $RACE"
echo "  Timeout: $TIMEOUT"
echo "  Clean: $CLEAN"
echo "  Benchmark: $BENCHMARK"
if [[ -n "$PROFILE" ]]; then
    echo "  Profile: $PROFILE"
fi
echo ""

# Clean if requested
if [[ "$CLEAN" == true ]]; then
    print_status "Cleaning test cache and coverage files..."
    rm -rf coverage/
    go clean -testcache
    go clean -cache
    print_success "Cleanup completed"
    echo ""
fi

# Create coverage directory if needed
if [[ "$COVERAGE" == true ]]; then
    mkdir -p coverage
fi

# Build test flags
TEST_FLAGS=""
if [[ "$VERBOSE" == true ]]; then
    TEST_FLAGS="$TEST_FLAGS -v"
fi

if [[ "$RACE" == true ]]; then
    TEST_FLAGS="$TEST_FLAGS -race"
fi

if [[ "$SHORT" == true ]]; then
    TEST_FLAGS="$TEST_FLAGS -short"
fi

TEST_FLAGS="$TEST_FLAGS -timeout $TIMEOUT"

if [[ -n "$PARALLEL" ]]; then
    TEST_FLAGS="$TEST_FLAGS -parallel $PARALLEL"
fi

# Add coverage flags
if [[ "$COVERAGE" == true ]]; then
    TEST_FLAGS="$TEST_FLAGS -coverprofile=coverage/coverage.out -covermode=atomic"
fi

# Add profiling flags
if [[ -n "$PROFILE" ]]; then
    mkdir -p profiles
    case $PROFILE in
        cpu)
            TEST_FLAGS="$TEST_FLAGS -cpuprofile=profiles/cpu.prof"
            ;;
        mem)
            TEST_FLAGS="$TEST_FLAGS -memprofile=profiles/mem.prof"
            ;;
        trace)
            TEST_FLAGS="$TEST_FLAGS -trace=profiles/trace.out"
            ;;
    esac
fi

# Function to run linting
run_linting() {
    if [[ -z "$SKIP_LINT" ]]; then
        print_status "Running code linting..."
        if command -v golangci-lint >/dev/null 2>&1; then
            golangci-lint run
            print_success "Linting completed"
        else
            print_warning "golangci-lint not found, running go vet instead"
            go vet ./...
            print_success "go vet completed"
        fi
        echo ""
    else
        print_warning "Skipping linting (SKIP_LINT set)"
    fi
}

# Function to run specific test type
run_tests() {
    local test_pattern="$1"
    local test_description="$2"
    local test_paths="$3"

    print_status "Running $test_description..."

    local cmd="go test $TEST_FLAGS"
    if [[ -n "$test_pattern" ]]; then
        cmd="$cmd -run \"$test_pattern\""
    fi
    cmd="$cmd $test_paths"

    echo "Command: $cmd"

    if eval $cmd; then
        print_success "$test_description completed successfully"
    else
        print_error "$test_description failed"
        return 1
    fi
}

# Function to run benchmarks
run_benchmarks() {
    print_status "Running benchmarks..."

    local bench_flags="-bench=. -benchmem -run=^$"
    if [[ "$SHORT" == true ]]; then
        bench_flags="$bench_flags -short"
    fi

    local cmd="go test $bench_flags ./..."
    echo "Command: $cmd"

    mkdir -p benchmarks
    if eval $cmd | tee benchmarks/benchmark-$(date +%Y%m%d-%H%M%S).txt; then
        print_success "Benchmarks completed"
    else
        print_error "Benchmarks failed"
        return 1
    fi
}

# Function to generate coverage reports
generate_coverage() {
    if [[ "$COVERAGE" == true && -f coverage/coverage.out ]]; then
        print_status "Generating coverage reports..."

        # Text summary
        go tool cover -func=coverage/coverage.out | tee coverage/coverage-summary.txt

        # Extract total coverage
        local total_coverage=$(go tool cover -func=coverage/coverage.out | grep "total:" | awk '{print $3}')
        print_success "Total coverage: $total_coverage"

        # HTML report if requested
        if [[ "$HTML_COVERAGE" == true ]]; then
            go tool cover -html=coverage/coverage.out -o coverage/coverage.html
            print_success "HTML coverage report generated: coverage/coverage.html"

            # Try to open in browser (optional)
            if command -v open >/dev/null 2>&1; then
                print_status "Opening coverage report in browser..."
                open coverage/coverage.html
            elif command -v xdg-open >/dev/null 2>&1; then
                print_status "Opening coverage report in browser..."
                xdg-open coverage/coverage.html
            fi
        fi

        echo ""
    fi
}

# Main execution
main() {
    print_status "Starting 3DShelf Backend Test Runner"
    echo ""

    # Check if we're in the right directory
    if [[ ! -f "go.mod" ]]; then
        print_error "go.mod not found. Please run this script from the backend directory."
        exit 1
    fi

    # Run linting first
    run_linting

    # Format code
    print_status "Formatting code..."
    gofmt -l -w .
    print_success "Code formatting completed"
    echo ""

    # Download dependencies
    print_status "Downloading dependencies..."
    go mod download
    go mod tidy
    print_success "Dependencies updated"
    echo ""

    # Run tests based on type
    case $TEST_TYPE in
        all)
            run_tests "^Test[^E2E]" "unit and integration tests" "./..." || exit 1
            run_tests "^TestE2E" "E2E tests" "." || exit 1
            ;;
        unit)
            run_tests "^Test[^E2E]" "unit tests" "./internal/... ./pkg/..." || exit 1
            ;;
        integration)
            run_tests "" "integration tests" "./internal/handlers/..." || exit 1
            ;;
        e2e)
            run_tests "^TestE2E" "E2E tests" "." || exit 1
            ;;
    esac

    # Run benchmarks if requested
    if [[ "$BENCHMARK" == true ]]; then
        echo ""
        run_benchmarks || exit 1
    fi

    # Generate coverage reports
    echo ""
    generate_coverage

    # Profile analysis
    if [[ -n "$PROFILE" && -d "profiles" ]]; then
        print_status "Profile files generated in profiles/ directory"
        echo "To analyze profiles, use:"
        case $PROFILE in
            cpu)
                echo "  go tool pprof profiles/cpu.prof"
                ;;
            mem)
                echo "  go tool pprof profiles/mem.prof"
                ;;
            trace)
                echo "  go tool trace profiles/trace.out"
                ;;
        esac
        echo ""
    fi

    print_success "All tests completed successfully!"
}

# Run main function
main "$@"