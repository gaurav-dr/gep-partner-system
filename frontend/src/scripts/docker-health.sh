#!/bin/bash

# Docker Deployment Health Check Script
# Comprehensive health checks for React app deployed in Docker containers
# Verifies the application is accessible at the expected port (3002 as mentioned in the issue)

set -e

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3002}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
RETRY_COUNT="${RETRY_COUNT:-5}"
RETRY_DELAY="${RETRY_DELAY:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Wait for service to be available
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=$3
    local delay=$4
    
    log_info "Waiting for $service_name at $url..."
    
    for i in $(seq 1 $max_attempts); do
        if curl -f -s --max-time 10 --connect-timeout 5 "$url" > /dev/null 2>&1; then
            log_success "$service_name is available (attempt $i/$max_attempts)"
            return 0
        else
            if [ $i -lt $max_attempts ]; then
                log_warning "$service_name not yet available (attempt $i/$max_attempts), retrying in ${delay}s..."
                sleep $delay
            else
                log_error "$service_name is not available after $max_attempts attempts"
                return 1
            fi
        fi
    done
}

# Check if port is open
check_port() {
    local host=$1
    local port=$2
    
    log_info "Checking if port $port is open on $host..."
    
    if nc -z -w5 $host $port 2>/dev/null; then
        log_success "Port $port is open"
        return 0
    else
        log_error "Port $port is not open or not reachable"
        return 1
    fi
}

# Check HTTP response
check_http_response() {
    local url=$1
    
    log_info "Checking HTTP response from $url..."
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$response_code" = "200" ]; then
        log_success "Received HTTP 200 response"
        return 0
    elif [ "$response_code" = "000" ]; then
        log_error "No response received (connection failed)"
        return 1
    else
        log_error "Received HTTP $response_code response"
        return 1
    fi
}

# Check HTML content
check_html_content() {
    local url=$1
    
    log_info "Checking HTML content from $url..."
    
    local content=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "")
    
    if echo "$content" | grep -q "<!DOCTYPE html>" || echo "$content" | grep -q "<html"; then
        log_success "Valid HTML content received"
        
        # Check for React-specific content
        if echo "$content" | grep -qi "react" || echo "$content" | grep -q "static/js/" || echo "$content" | grep -q "root"; then
            log_success "React application content detected"
        else
            log_warning "HTML received but no React indicators found"
        fi
        
        return 0
    else
        log_error "No valid HTML content received"
        log_info "Content preview: ${content:0:200}..."
        return 1
    fi
}

# Check static assets
check_static_assets() {
    local base_url=$1
    
    log_info "Checking static assets availability..."
    
    local assets=("static/css/" "static/js/" "favicon.ico" "manifest.json")
    local success_count=0
    
    for asset in "${assets[@]}"; do
        local asset_url="$base_url/$asset"
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$asset_url" 2>/dev/null || echo "000")
        
        if [ "$response_code" = "200" ] || [ "$response_code" = "304" ]; then
            log_success "Asset $asset is available (HTTP $response_code)"
            success_count=$((success_count + 1))
        else
            log_warning "Asset $asset not available (HTTP $response_code)"
        fi
    done
    
    if [ $success_count -gt 0 ]; then
        log_success "$success_count out of ${#assets[@]} assets are available"
        return 0
    else
        log_error "No static assets are available"
        return 1
    fi
}

# Check Docker container health
check_docker_container() {
    local container_name=$1
    
    if [ -n "$container_name" ]; then
        log_info "Checking Docker container: $container_name"
        
        if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
            log_success "Docker container $container_name is running"
            
            # Get container logs (last 10 lines)
            log_info "Recent container logs:"
            docker logs --tail 10 "$container_name" 2>/dev/null || log_warning "Could not retrieve container logs"
            
            return 0
        else
            log_error "Docker container $container_name is not running"
            
            # Try to find the container in any state
            if docker ps -a --filter "name=$container_name" | grep -q "$container_name"; then
                local status=$(docker ps -a --filter "name=$container_name" --format "table {{.Status}}" | tail -n +2)
                log_error "Container status: $status"
                
                # Show recent logs if container exists
                log_info "Recent container logs:"
                docker logs --tail 20 "$container_name" 2>/dev/null || log_warning "Could not retrieve container logs"
            else
                log_error "Docker container $container_name not found"
            fi
            
            return 1
        fi
    else
        log_info "No container name provided, skipping Docker container check"
        return 0
    fi
}

# Main health check function
run_health_checks() {
    local overall_result=0
    
    log_header "🐳 Docker Deployment Health Check"
    
    log_info "Frontend URL: $FRONTEND_URL"
    log_info "Timeout: ${HEALTH_CHECK_TIMEOUT}s"
    log_info "Retry count: $RETRY_COUNT"
    log_info "Retry delay: ${RETRY_DELAY}s"
    
    # Extract host and port from URL
    local url_regex='https?://([^:]+):?([0-9]+)?'
    if [[ $FRONTEND_URL =~ $url_regex ]]; then
        local host="${BASH_REMATCH[1]}"
        local port="${BASH_REMATCH[2]:-80}"
        if [[ $FRONTEND_URL == https://* ]]; then
            port="${BASH_REMATCH[2]:-443}"
        fi
        
        log_info "Extracted host: $host, port: $port"
        
        # Check if port is open first
        if ! check_port "$host" "$port"; then
            log_error "Port check failed - application may not be running"
            overall_result=1
        fi
    fi
    
    # Check Docker container if name is provided
    if [ -n "${DOCKER_CONTAINER_NAME:-}" ]; then
        if ! check_docker_container "$DOCKER_CONTAINER_NAME"; then
            overall_result=1
        fi
    fi
    
    # Wait for service to be available
    if ! wait_for_service "$FRONTEND_URL" "Frontend application" "$RETRY_COUNT" "$RETRY_DELAY"; then
        log_error "Frontend application is not available"
        overall_result=1
    else
        # Check HTTP response
        if ! check_http_response "$FRONTEND_URL"; then
            overall_result=1
        fi
        
        # Check HTML content
        if ! check_html_content "$FRONTEND_URL"; then
            overall_result=1
        fi
        
        # Check static assets
        if ! check_static_assets "$FRONTEND_URL"; then
            log_warning "Static assets check failed, but this may not be critical"
        fi
    fi
    
    # Performance check
    log_info "Checking response time..."
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "timeout")
    
    if [ "$response_time" = "timeout" ]; then
        log_warning "Response time check timed out"
    else
        local response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "$response_time")
        log_info "Response time: ${response_ms}ms"
        
        if (( $(echo "$response_time > 5" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "Slow response time: ${response_time}s"
        fi
    fi
    
    # Summary
    log_header "📊 Health Check Summary"
    
    if [ $overall_result -eq 0 ]; then
        log_success "✅ All critical health checks passed!"
        log_info "Frontend application is healthy and accessible at $FRONTEND_URL"
        
        # Additional info for debugging
        log_info "You can access the application at: $FRONTEND_URL"
        
        return 0
    else
        log_error "❌ Some critical health checks failed!"
        log_error "Frontend application may not be properly deployed or accessible"
        
        # Provide troubleshooting info
        log_info "Troubleshooting steps:"
        log_info "1. Check if Docker container is running: docker ps"
        log_info "2. Check container logs: docker logs <container-name>"
        log_info "3. Verify port mapping: docker port <container-name>"
        log_info "4. Check if port $port is available: netstat -tulpn | grep :$port"
        log_info "5. Test direct connection: curl -v $FRONTEND_URL"
        
        return 1
    fi
}

# Script execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Check dependencies
    for cmd in curl nc docker bc; do
        if ! command -v $cmd &> /dev/null; then
            log_warning "Command $cmd not found, some checks may be limited"
        fi
    done
    
    # Run health checks
    if run_health_checks; then
        exit 0
    else
        exit 1
    fi
fi