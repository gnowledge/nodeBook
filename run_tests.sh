#!/bin/bash

# NodeBook Test Script

set -e  # Exit on any error

echo "🧪 NodeBook Testing Pipeline"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Function to run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    cd nodebook-base
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    # Run tests
    if npm test -- registry.test.js cnl-parser-water.test.js; then
        print_success "Backend tests passed!"
    else
        print_error "Backend tests failed!"
        return 1
    fi
    
    cd ..
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "Running frontend tests..."
    
    cd nodebook-base/frontend
    
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
    
    cd ../..
}

# Main execution
main() {
    local exit_code=0
    
    # Parse command line arguments
    RUN_BACKEND=true
    RUN_FRONTEND=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                RUN_FRONTEND=false
                shift
                ;;
            --frontend-only)
                RUN_BACKEND=false
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --backend-only    Run only backend tests"
                echo "  --frontend-only   Run only frontend tests"
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