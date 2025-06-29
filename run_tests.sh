#!/bin/bash

# NDF Studio Complete Testing Pipeline
# This script runs all tests locally before committing

set -e  # Exit on any error

echo "🧪 NDF Studio Testing Pipeline"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "frontend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    print_warning "Python virtual environment not detected. Please activate it first."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    # Check if pytest is installed
    if ! python -c "import pytest" 2>/dev/null; then
        print_status "Installing pytest and dependencies..."
        pip install pytest pytest-cov pytest-asyncio httpx
    fi
    
    # Run tests from the root directory
    if python -m pytest tests/ -v; then
        print_success "Backend tests passed!"
    else
        print_error "Backend tests failed!"
        return 1
    fi
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "Running frontend tests..."
    
    cd frontend
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Run linting
    print_status "Running linting..."
    if npm run lint; then
        print_success "Linting passed!"
    else
        print_warning "Linting issues found. Run 'npm run lint:fix' to auto-fix."
    fi
    
    # Run type checking
    print_status "Running type checking..."
    if npm run type-check; then
        print_success "Type checking passed!"
    else
        print_error "Type checking failed!"
        return 1
    fi
    
    # Run unit tests
    print_status "Running unit tests..."
    if npm run test:coverage; then
        print_success "Unit tests passed!"
    else
        print_error "Unit tests failed!"
        return 1
    fi
    
    cd ..
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    cd frontend
    
    # Check if Playwright is installed
    if ! npx playwright --version >/dev/null 2>&1; then
        print_status "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi
    
    # Start backend server in background
    print_status "Starting backend server..."
    cd ../backend
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ../frontend
    
    # Wait for backend to start
    sleep 5
    
    # Start frontend dev server in background
    print_status "Starting frontend dev server..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    sleep 10
    
    # Run E2E tests
    if npx playwright test; then
        print_success "E2E tests passed!"
    else
        print_error "E2E tests failed!"
        # Clean up processes
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Clean up processes
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    
    cd ..
}

# Function to run security scans
run_security_scans() {
    print_status "Running security scans..."
    
    # Backend security scan
    if command -v bandit >/dev/null 2>&1; then
        print_status "Running Bandit security scan..."
        if bandit -r backend/ -f json -o bandit-report.json; then
            print_success "Backend security scan completed!"
        else
            print_warning "Backend security scan found issues. Check bandit-report.json"
        fi
    else
        print_warning "Bandit not installed. Install with: pip install bandit"
    fi
    
    # Frontend security scan
    cd frontend
    print_status "Running npm audit..."
    if npm audit --audit-level=moderate; then
        print_success "Frontend security scan passed!"
    else
        print_warning "Frontend security scan found issues."
    fi
    cd ..
}

# Function to run build check
run_build_check() {
    print_status "Running build check..."
    
    cd frontend
    
    if npm run build; then
        print_success "Build check passed!"
    else
        print_error "Build check failed!"
        return 1
    fi
    
    cd ..
}

# Main execution
main() {
    local exit_code=0
    
    # Parse command line arguments
    RUN_BACKEND=true
    RUN_FRONTEND=true
    RUN_E2E=false
    RUN_SECURITY=false
    RUN_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                RUN_FRONTEND=false
                RUN_E2E=false
                RUN_SECURITY=false
                RUN_BUILD=false
                shift
                ;;
            --frontend-only)
                RUN_BACKEND=false
                RUN_E2E=false
                RUN_SECURITY=false
                RUN_BUILD=false
                shift
                ;;
            --e2e)
                RUN_E2E=true
                shift
                ;;
            --security)
                RUN_SECURITY=true
                shift
                ;;
            --build)
                RUN_BUILD=true
                shift
                ;;
            --all)
                RUN_E2E=true
                RUN_SECURITY=true
                RUN_BUILD=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --backend-only    Run only backend tests"
                echo "  --frontend-only   Run only frontend tests"
                echo "  --e2e            Run E2E tests (requires servers running)"
                echo "  --security       Run security scans"
                echo "  --build          Run build check"
                echo "  --all            Run all tests including E2E, security, and build"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run selected tests
    if [ "$RUN_BACKEND" = true ]; then
        if ! run_backend_tests; then
            exit_code=1
        fi
    fi
    
    if [ "$RUN_FRONTEND" = true ]; then
        if ! run_frontend_tests; then
            exit_code=1
        fi
    fi
    
    if [ "$RUN_E2E" = true ]; then
        if ! run_e2e_tests; then
            exit_code=1
        fi
    fi
    
    if [ "$RUN_SECURITY" = true ]; then
        run_security_scans
    fi
    
    if [ "$RUN_BUILD" = true ]; then
        if ! run_build_check; then
            exit_code=1
        fi
    fi
    
    # Final summary
    echo ""
    echo "================================"
    if [ $exit_code -eq 0 ]; then
        print_success "All tests completed successfully! 🎉"
    else
        print_error "Some tests failed. Please fix the issues before committing. ❌"
    fi
    echo "================================"
    
    exit $exit_code
}

# Run main function with all arguments
main "$@" 