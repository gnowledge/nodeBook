#!/bin/bash

echo "🐳 NodeBook SimpleGraph Docker Testing Script"
echo "=============================================="

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

# Check if Docker is running
check_docker() {
    print_status "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Clean up previous containers and images
cleanup() {
    print_status "Cleaning up previous containers and images..."
    
    # Stop and remove containers
    docker compose -f docker-compose.simple.yml down --remove-orphans 2>/dev/null
    
    # Remove old images
    docker rmi nodebook-base_nodebook-simple 2>/dev/null
    
    print_success "Cleanup completed"
}

# Build the Docker image
build_image() {
    print_status "Building SimpleGraph Docker image..."
    
    if docker compose -f docker-compose.simple.yml build --no-cache; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
}

# Start the services
start_services() {
    print_status "Starting SimpleGraph services..."
    
    if docker compose -f docker-compose.simple.yml up -d; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    print_status "Waiting for NodeBook service to be ready..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Service is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Service not ready yet, waiting..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    print_error "Service failed to become ready after $max_attempts attempts"
    return 1
}

# Test the API endpoints
test_endpoints() {
    print_status "Testing API endpoints..."
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if response=$(curl -s http://localhost:3000/api/health); then
        print_success "Health endpoint working"
        echo "Response: $response"
    else
        print_error "Health endpoint failed"
        return 1
    fi
    
    # Test mindmap templates endpoint
    print_status "Testing mindmap templates endpoint..."
    if response=$(curl -s http://localhost:3000/api/mindmap/templates); then
        print_success "Mindmap templates endpoint working"
        echo "Available templates: $(echo "$response" | jq -r 'keys | join(", ")')"
    else
        print_error "Mindmap templates endpoint failed"
        return 1
    fi
    
    print_success "All endpoint tests passed!"
}

# Show service logs
show_logs() {
    print_status "Showing service logs..."
    docker compose -f docker-compose.simple.yml logs -f nodebook-simple
}

# Main execution
main() {
    echo ""
    print_status "Starting NodeBook SimpleGraph Docker testing..."
    echo ""
    
    # Check prerequisites
    check_docker
    
    # Clean up
    cleanup
    
    # Build and start
    build_image
    start_services
    
    # Wait for service
    if wait_for_service; then
        # Test endpoints
        test_endpoints
        
        echo ""
        print_success "🎉 All tests completed successfully!"
        echo ""
        echo "📊 Service Status:"
        docker compose -f docker-compose.simple.yml ps
        echo ""
        echo "🔗 Service URLs:"
        echo "   - Health Check: http://localhost:3000/api/health"
        echo "   - MindMap Templates: http://localhost:3000/api/mindmap/templates"
        echo ""
        echo "📝 To view logs:"
        echo "   docker compose -f docker-compose.simple.yml logs -f nodebook-simple"
        echo ""
        echo "🛑 To stop services:"
        echo "   docker compose -f docker-compose.simple.yml down"
        echo ""
        
        # Ask if user wants to see logs
        read -p "Would you like to see the service logs? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            show_logs
        fi
    else
        print_error "Service failed to start properly"
        echo ""
        echo "📝 Checking logs for errors..."
        docker compose -f docker-compose.simple.yml logs nodebook-simple
        exit 1
    fi
}

# Handle script interruption
trap 'echo ""; print_warning "Script interrupted. Cleaning up..."; docker compose -f docker-compose.simple.yml down --remove-orphans; exit 1' INT

# Run main function
main "$@"
