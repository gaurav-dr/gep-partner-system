#!/bin/bash

# CI/CD Health Check Integration Script
# Comprehensive health checks for CI/CD pipeline integration
# Supports various CI/CD platforms (GitHub Actions, GitLab CI, Jenkins, etc.)

set -e

# Configuration from environment variables
CI_FRONTEND_URL="${CI_FRONTEND_URL:-${FRONTEND_URL:-http://localhost:3000}}"
CI_TIMEOUT="${CI_TIMEOUT:-60}"
CI_RETRIES="${CI_RETRIES:-10}"
CI_RETRY_DELAY="${CI_RETRY_DELAY:-6}"
CI_PARALLEL_TESTS="${CI_PARALLEL_TESTS:-true}"
CI_VERBOSE="${CI_VERBOSE:-false}"
CI_OUTPUT_FORMAT="${CI_OUTPUT_FORMAT:-console}" # console, json, junit

# Detect CI environment
detect_ci_environment() {
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo "github-actions"
    elif [ -n "$GITLAB_CI" ]; then
        echo "gitlab-ci"
    elif [ -n "$JENKINS_URL" ]; then
        echo "jenkins"
    elif [ -n "$CIRCLECI" ]; then
        echo "circleci"
    elif [ -n "$TRAVIS" ]; then
        echo "travis"
    elif [ -n "$CI" ]; then
        echo "generic-ci"
    else
        echo "local"
    fi
}

CI_PLATFORM=$(detect_ci_environment)

# Colors (disabled in CI by default)
if [ "$CI_PLATFORM" = "local" ] && [ "$CI_VERBOSE" = "true" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Logging functions with CI annotations
log_info() {
    local message="$1"
    if [ "$CI_PLATFORM" = "github-actions" ]; then
        echo "::notice::$message"
    elif [ "$CI_PLATFORM" = "gitlab-ci" ]; then
        echo "INFO: $message"
    else
        echo -e "${BLUE}ℹ${NC} $message"
    fi
}

log_success() {
    local message="$1"
    echo -e "${GREEN}✓${NC} $message"
}

log_warning() {
    local message="$1"
    if [ "$CI_PLATFORM" = "github-actions" ]; then
        echo "::warning::$message"
    elif [ "$CI_PLATFORM" = "gitlab-ci" ]; then
        echo "WARNING: $message"
    else
        echo -e "${YELLOW}⚠${NC} $message"
    fi
}

log_error() {
    local message="$1"
    if [ "$CI_PLATFORM" = "github-actions" ]; then
        echo "::error::$message"
    elif [ "$CI_PLATFORM" = "gitlab-ci" ]; then
        echo "ERROR: $message"
    else
        echo -e "${RED}✗${NC} $message" >&2
    fi
}

log_group_start() {
    local group_name="$1"
    if [ "$CI_PLATFORM" = "github-actions" ]; then
        echo "::group::$group_name"
    elif [ "$CI_PLATFORM" = "gitlab-ci" ]; then
        echo -e "\e[0Ksection_start:$(date +%s):${group_name}[collapsed=true]\r\e[0K$group_name"
    else
        echo -e "\n${BLUE}=== $group_name ===${NC}"
    fi
}

log_group_end() {
    if [ "$CI_PLATFORM" = "github-actions" ]; then
        echo "::endgroup::"
    elif [ "$CI_PLATFORM" = "gitlab-ci" ]; then
        echo -e "\e[0Ksection_end:$(date +%s):${1}\r\e[0K"
    fi
}

# JSON output helper
json_output=""
json_add_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local duration="$4"
    
    if [ "$CI_OUTPUT_FORMAT" = "json" ]; then
        json_output+="{\"test\":\"$test_name\",\"status\":\"$status\",\"message\":\"$message\",\"duration\":$duration},"
    fi
}

# JUnit XML output helper
junit_xml=""
junit_add_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local duration="$4"
    
    if [ "$CI_OUTPUT_FORMAT" = "junit" ]; then
        if [ "$status" = "passed" ]; then
            junit_xml+="<testcase name=\"$test_name\" time=\"$duration\"/>"
        else
            junit_xml+="<testcase name=\"$test_name\" time=\"$duration\"><failure message=\"$message\"/></testcase>"
        fi
    fi
}

# Test runner with timing and results tracking
run_test() {
    local test_name="$1"
    local test_function="$2"
    local critical="${3:-true}"
    
    log_group_start "$test_name"
    
    local start_time=$(date +%s)
    local status="passed"
    local message="Test completed successfully"
    
    if $test_function; then
        log_success "$test_name passed"
    else
        status="failed"
        message="Test failed"
        log_error "$test_name failed"
        
        if [ "$critical" = "true" ]; then
            log_error "Critical test failed, marking build as failed"
        else
            log_warning "Non-critical test failed, continuing"
            status="skipped"
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    json_add_result "$test_name" "$status" "$message" "$duration"
    junit_add_test "$test_name" "$status" "$message" "$duration"
    
    log_group_end "$test_name"
    
    if [ "$status" = "failed" ] && [ "$critical" = "true" ]; then
        return 1
    fi
    
    return 0
}

# Individual test functions
test_environment_setup() {
    log_info "Checking CI environment setup..."
    log_info "CI Platform: $CI_PLATFORM"
    log_info "Frontend URL: $CI_FRONTEND_URL"
    log_info "Node Version: $(node --version 2>/dev/null || echo 'Not available')"
    log_info "NPM Version: $(npm --version 2>/dev/null || echo 'Not available')"
    
    # Check required environment variables
    if [ -z "$CI_FRONTEND_URL" ]; then
        log_error "Frontend URL not configured"
        return 1
    fi
    
    return 0
}

test_build_artifacts() {
    log_info "Checking build artifacts..."
    
    local build_dir="build"
    if [ -d "$build_dir" ]; then
        local file_count=$(find "$build_dir" -type f | wc -l)
        log_success "Build directory exists with $file_count files"
        
        # Check for critical files
        if [ -f "$build_dir/index.html" ]; then
            log_success "index.html found"
        else
            log_error "index.html not found in build directory"
            return 1
        fi
        
        if [ -d "$build_dir/static" ]; then
            log_success "Static assets directory found"
        else
            log_warning "Static assets directory not found"
        fi
        
        return 0
    else
        log_warning "Build directory not found - may be running in development mode"
        return 0
    fi
}

test_application_health() {
    log_info "Testing application health..."
    
    # Use the JavaScript health check
    if node src/scripts/healthCheck.js; then
        log_success "Application health check passed"
        return 0
    else
        log_error "Application health check failed"
        return 1
    fi
}

test_unit_tests() {
    log_info "Running unit tests..."
    
    if npm run test:health -- --watchAll=false --ci --coverage --testResultsProcessor=jest-junit; then
        log_success "Unit tests passed"
        return 0
    else
        log_error "Unit tests failed"
        return 1
    fi
}

test_integration_tests() {
    log_info "Running integration tests..."
    
    if npm run test:integration -- --watchAll=false --ci; then
        log_success "Integration tests passed"
        return 0
    else
        log_error "Integration tests failed"
        return 1
    fi
}

test_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Set environment variables for Playwright
    export FRONTEND_URL="$CI_FRONTEND_URL"
    
    if npm run test:e2e; then
        log_success "E2E tests passed"
        return 0
    else
        log_error "E2E tests failed"
        return 1
    fi
}

test_docker_deployment() {
    log_info "Testing Docker deployment..."
    
    if [ -n "${DOCKER_CONTAINER_NAME:-}" ]; then
        export FRONTEND_URL="$CI_FRONTEND_URL"
        export DOCKER_CONTAINER_NAME="$DOCKER_CONTAINER_NAME"
        
        if bash src/scripts/docker-health.sh; then
            log_success "Docker deployment test passed"
            return 0
        else
            log_error "Docker deployment test failed"
            return 1
        fi
    else
        log_warning "Docker container name not provided, skipping Docker-specific tests"
        return 0
    fi
}

# Main function
main() {
    local overall_result=0
    local start_time=$(date +%s)
    
    log_info "🚀 Starting CI/CD Health Check Pipeline"
    log_info "Platform: $CI_PLATFORM"
    log_info "URL: $CI_FRONTEND_URL"
    
    # Initialize output formats
    if [ "$CI_OUTPUT_FORMAT" = "json" ]; then
        json_output="{"
    elif [ "$CI_OUTPUT_FORMAT" = "junit" ]; then
        junit_xml="<testsuite name=\"frontend-health-checks\">"
    fi
    
    # Run tests in sequence or parallel
    local tests=(
        "Environment Setup:test_environment_setup:true"
        "Build Artifacts:test_build_artifacts:false"
        "Application Health:test_application_health:true"
        "Unit Tests:test_unit_tests:true"
        "Integration Tests:test_integration_tests:true"
        "E2E Tests:test_e2e_tests:false"
        "Docker Deployment:test_docker_deployment:false"
    )
    
    if [ "$CI_PARALLEL_TESTS" = "true" ] && command -v parallel > /dev/null; then
        log_info "Running tests in parallel..."
        
        for test in "${tests[@]}"; do
            IFS=':' read -ra test_parts <<< "$test"
            run_test "${test_parts[0]}" "${test_parts[1]}" "${test_parts[2]}" &
        done
        
        wait
    else
        log_info "Running tests sequentially..."
        
        for test in "${tests[@]}"; do
            IFS=':' read -ra test_parts <<< "$test"
            if ! run_test "${test_parts[0]}" "${test_parts[1]}" "${test_parts[2]}"; then
                overall_result=1
                if [ "${test_parts[2]}" = "true" ]; then
                    break  # Stop on critical failure
                fi
            fi
        done
    fi
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Generate output files
    if [ "$CI_OUTPUT_FORMAT" = "json" ]; then
        json_output="${json_output%,}}"
        echo "$json_output" > health-check-results.json
        log_info "Results written to health-check-results.json"
    elif [ "$CI_OUTPUT_FORMAT" = "junit" ]; then
        junit_xml+="</testsuite>"
        echo "$junit_xml" > health-check-results.xml
        log_info "Results written to health-check-results.xml"
    fi
    
    # Summary
    log_group_start "Summary"
    log_info "Total duration: ${total_duration}s"
    
    if [ $overall_result -eq 0 ]; then
        log_success "🎉 All critical health checks passed!"
        log_info "Frontend application is ready for deployment"
        
        # Set CI outputs
        if [ "$CI_PLATFORM" = "github-actions" ]; then
            echo "::set-output name=health-status::passed"
            echo "::set-output name=duration::$total_duration"
        fi
        
    else
        log_error "❌ Critical health checks failed"
        log_error "Frontend application is not ready for deployment"
        
        if [ "$CI_PLATFORM" = "github-actions" ]; then
            echo "::set-output name=health-status::failed"
            echo "::set-output name=duration::$total_duration"
        fi
    fi
    
    log_group_end "Summary"
    
    return $overall_result
}

# Cleanup function
cleanup() {
    log_info "Cleaning up CI health check resources..."
    
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Clean up temporary files
    rm -f /tmp/health-check-* 2>/dev/null || true
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi