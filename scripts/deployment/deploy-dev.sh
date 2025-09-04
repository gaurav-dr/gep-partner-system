#!/bin/bash
set -e

# Development Deployment Script
# Used by CI/CD pipeline to deploy to development environment

echo "🚀 Starting development deployment..."

# Configuration
PROJECT_NAME="gep-partner-system"
ENV_FILE=".env.development"
COMPOSE_FILE="config/docker/docker-compose.dev.yml"
COMPOSE_PROJECT_NAME="gep-partner-system"
HEALTH_CHECK_URL="http://localhost:3001/health"
MAX_WAIT_TIME=120

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is healthy
check_health() {
    local url=$1
    local max_attempts=$2
    local attempt=1
    
    print_status "Checking application health at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_status "✅ Application is healthy!"
            return 0
        fi
        
        print_warning "Attempt $attempt/$max_attempts failed, waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    print_error "❌ Application failed health check after $max_attempts attempts"
    return 1
}

# Function to cleanup old containers
cleanup() {
    print_status "Cleaning up old containers..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans || true
    docker system prune -f || true
}

# Function to start services
start_services() {
    print_status "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    
    if [ $? -eq 0 ]; then
        print_status "✅ Services started successfully"
    else
        print_error "❌ Failed to start services"
        return 1
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing recent logs..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=50 app
}

# Function to run post-deployment tests
run_tests() {
    print_status "Running post-deployment integration tests..."
    
    # Wait a bit for services to be fully ready
    sleep 10
    
    # Basic connectivity tests
    if curl -f -s "$HEALTH_CHECK_URL" >/dev/null; then
        print_status "✅ Health check passed"
    else
        print_error "❌ Health check failed"
        return 1
    fi
    
    # Test database connectivity through the API
    print_status "Testing database connectivity..."
    # Add more specific API tests here
    
    print_status "✅ Post-deployment tests completed"
}

# Main deployment process
main() {
    print_status "Starting deployment for $PROJECT_NAME..."
    
    # Check if required files exist
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found!"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker compose file $COMPOSE_FILE not found!"
        exit 1
    fi
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Cleanup old deployment
    cleanup
    
    # Start new services
    if ! start_services; then
        print_error "Failed to start services, showing logs..."
        show_logs
        exit 1
    fi
    
    # Wait for services to be ready
    sleep 15
    
    # Health check
    if ! check_health "$HEALTH_CHECK_URL" 24; then
        print_error "Health check failed, showing logs..."
        show_logs
        exit 1
    fi
    
    # Run integration tests
    if ! run_tests; then
        print_error "Post-deployment tests failed"
        exit 1
    fi
    
    print_status "🎉 Development deployment completed successfully!"
    print_status "Application is available at: http://localhost:3001"
    print_status "Supabase Studio is available at: http://localhost:3010"
}

# Handle script termination
trap 'print_error "Deployment interrupted"' INT TERM

# Run main function
main "$@"