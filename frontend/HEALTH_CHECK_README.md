# Frontend Health Check System

Comprehensive health check system for the GEP Partner System React frontend, designed to verify deployment success and catch issues when the application isn't properly accessible.

## Overview

This health check system addresses the specific issue where deployment appears successful but the application isn't actually accessible at the expected URL (e.g., http://localhost:3002). It provides multiple layers of verification to ensure the React application is properly built, deployed, and accessible.

## Components

### 1. Unit Health Tests (`src/__tests__/health/`)

**Location**: `frontend/src/__tests__/health/`

- **`app.health.test.tsx`**: Tests React app rendering, crash detection, and core functionality
- **`supabase.health.test.tsx`**: Verifies Supabase client configuration and connectivity
- **`routing.health.test.tsx`**: Tests React Router functionality and navigation

**Run with**: `npm run test:health`

### 2. Integration Tests (`src/__tests__/integration/`)

**Location**: `frontend/src/__tests__/integration/`

- **`api.integration.test.tsx`**: Tests API endpoint reachability and network configuration

**Run with**: `npm run test:integration`

### 3. End-to-End Tests (`src/__tests__/e2e/`)

**Location**: `frontend/src/__tests__/e2e/`

- **`deployment.health.spec.ts`**: Comprehensive E2E tests simulating real user interactions
- **`global-setup.ts`**: E2E test environment setup
- **`global-teardown.ts`**: E2E test cleanup

**Configuration**: `playwright.config.ts`

**Run with**: `npm run test:e2e`

### 4. Standalone Health Check Script

**Location**: `frontend/src/scripts/healthCheck.js`

Standalone Node.js script that can be run independently or integrated into deployment pipelines.

**Features**:
- Frontend availability verification
- Static asset serving checks
- React bundle validation
- API connectivity tests
- Supabase connection verification
- Environment configuration validation
- Build artifact verification

**Run with**: `npm run health:check` or `node src/scripts/healthCheck.js`

### 5. Docker Health Check Script

**Location**: `frontend/src/scripts/docker-health.sh`

Bash script specifically designed for Docker deployment verification.

**Features**:
- Port accessibility checks
- Docker container status verification
- HTTP response validation
- HTML content verification
- Performance monitoring
- Container log analysis

**Run with**: `bash src/scripts/docker-health.sh`

**Environment Variables**:
- `FRONTEND_URL`: URL to test (default: http://localhost:3002)
- `DOCKER_CONTAINER_NAME`: Docker container name to check
- `HEALTH_CHECK_TIMEOUT`: Request timeout in seconds
- `HEALTH_CHECK_RETRIES`: Number of retry attempts

### 6. CI/CD Integration Script

**Location**: `frontend/src/scripts/ci-health-check.sh`

Comprehensive CI/CD integration script with support for multiple platforms.

**Supported CI Platforms**:
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Travis CI
- Generic CI systems

**Features**:
- Platform-specific logging and annotations
- Parallel test execution
- Multiple output formats (console, JSON, JUnit XML)
- Comprehensive test suite execution
- Result aggregation and reporting

**Run with**: `bash src/scripts/ci-health-check.sh`

### 7. GitHub Actions Workflow

**Location**: `.github/workflows/frontend-health-check.yml`

Complete CI/CD workflow demonstrating health check integration.

**Workflow Steps**:
1. Environment setup and dependency installation
2. Application build verification
3. Service orchestration (Supabase, Backend)
4. Frontend deployment simulation
5. Comprehensive health check execution
6. Test result aggregation and reporting
7. PR commenting with results

## Usage

### Quick Start

```bash
# Install additional dependencies
cd frontend
npm install

# Run all health checks
npm run test:all

# Run specific test suites
npm run test:health        # Unit health tests
npm run test:integration   # API integration tests
npm run test:e2e          # End-to-end tests

# Run standalone health check
npm run health:check

# Test Docker deployment (requires container to be running)
FRONTEND_URL=http://localhost:3002 bash src/scripts/docker-health.sh
```

### Docker Integration

```bash
# Start the application with Docker Compose
docker-compose up -d frontend

# Wait for startup
sleep 30

# Run Docker health check
FRONTEND_URL=http://localhost:3002 \
DOCKER_CONTAINER_NAME=gep-partner-system-frontend-1 \
bash frontend/src/scripts/docker-health.sh
```

### CI/CD Integration

```bash
# In your CI/CD pipeline
cd frontend

# Set environment variables
export CI_FRONTEND_URL=http://localhost:3002
export CI_OUTPUT_FORMAT=json
export CI_PARALLEL_TESTS=true

# Run comprehensive health checks
bash src/scripts/ci-health-check.sh
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_URL` | URL where frontend is deployed | http://localhost:3000 |
| `REACT_APP_API_URL` | Backend API URL | http://localhost:3001 |
| `REACT_APP_SUPABASE_URL` | Supabase URL | http://localhost:8000 |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | (required) |
| `HEALTH_CHECK_TIMEOUT` | Request timeout in seconds | 10 |
| `HEALTH_CHECK_RETRIES` | Number of retry attempts | 3 |
| `CI_PARALLEL_TESTS` | Run tests in parallel in CI | true |
| `CI_OUTPUT_FORMAT` | CI output format (console/json/junit) | console |

### Test Configuration

Tests are configured in `package.json` under the `jest` section:

```json
{
  "jest": {
    "testMatch": [
      "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "<rootDir>/src/**/?(*.)(spec|test).{js,jsx,ts,tsx}"
    ],
    "collectCoverageFrom": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      "!src/index.tsx"
    ],
    "coverageReporters": ["lcov", "text", "html"],
    "testTimeout": 10000
  }
}
```

## Test Coverage

The health check system provides comprehensive coverage across multiple dimensions:

### Functional Coverage
- ✅ Application rendering and crash detection
- ✅ Component mounting and unmounting
- ✅ Router functionality and navigation
- ✅ Authentication flow initialization
- ✅ Error boundary handling
- ✅ Static asset serving
- ✅ API connectivity
- ✅ Database connectivity (Supabase)

### Technical Coverage
- ✅ Build artifact verification
- ✅ Environment configuration validation
- ✅ Network connectivity testing
- ✅ Docker container health
- ✅ Performance monitoring
- ✅ Cross-browser compatibility (via Playwright)
- ✅ Responsive design verification
- ✅ Offline handling

### Deployment Coverage
- ✅ Port accessibility
- ✅ HTTP response validation
- ✅ HTML content verification
- ✅ JavaScript bundle loading
- ✅ CSS styling application
- ✅ Asset caching and serving
- ✅ Container orchestration

## Troubleshooting

### Common Issues

1. **Port 3002 not accessible**
   - Check Docker port mapping: `docker port <container-name>`
   - Verify container is running: `docker ps`
   - Check firewall settings
   - Validate nginx configuration

2. **Tests failing in CI**
   - Ensure all environment variables are set
   - Check service startup order in docker-compose
   - Verify network connectivity between services
   - Review container logs: `docker-compose logs frontend`

3. **Supabase connection issues**
   - Validate JWT token format and expiration
   - Check Supabase service availability
   - Verify environment variable configuration
   - Test database connectivity

4. **Static assets not loading**
   - Check build directory contents
   - Verify nginx configuration for static files
   - Test asset URLs directly
   - Check CORS configuration

### Debug Commands

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs frontend

# Test direct connectivity
curl -v http://localhost:3002

# Check port binding
netstat -tulpn | grep :3002

# Inspect container
docker inspect <container-name>

# Test with verbose health check
CI_VERBOSE=true bash src/scripts/ci-health-check.sh
```

## Integration Examples

### GitHub Actions

```yaml
- name: Run Frontend Health Check
  working-directory: frontend
  env:
    FRONTEND_URL: http://localhost:3002
    CI_OUTPUT_FORMAT: json
  run: bash src/scripts/ci-health-check.sh
```

### GitLab CI

```yaml
frontend-health:
  script:
    - cd frontend
    - export CI_FRONTEND_URL=http://localhost:3002
    - bash src/scripts/ci-health-check.sh
  artifacts:
    reports:
      junit: frontend/health-check-results.xml
```

### Jenkins

```groovy
stage('Frontend Health Check') {
    steps {
        dir('frontend') {
            sh '''
                export CI_FRONTEND_URL=http://localhost:3002
                export CI_OUTPUT_FORMAT=junit
                bash src/scripts/ci-health-check.sh
            '''
        }
    }
    post {
        always {
            junit 'frontend/health-check-results.xml'
        }
    }
}
```

## Monitoring and Alerting

The health check system can be integrated with monitoring solutions:

### Prometheus Metrics
Export health check results as Prometheus metrics for ongoing monitoring.

### Alerting
Set up alerts based on health check failures to notify teams of deployment issues.

### Dashboard Integration
Integrate health check results into deployment dashboards for visibility.

## Contributing

When adding new health checks:

1. Place unit tests in `src/__tests__/health/`
2. Place integration tests in `src/__tests__/integration/`
3. Place E2E tests in `src/__tests__/e2e/`
4. Update test scripts in `package.json`
5. Add environment variable documentation
6. Update this README with new features

## Support

For issues with the health check system:

1. Check the troubleshooting section above
2. Review container and application logs
3. Verify environment configuration
4. Test individual components separately
5. Create an issue with detailed error information