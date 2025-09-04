# GEP Partner System - Development Guide

## Local Development Setup

### Prerequisites

Before setting up the development environment, ensure you have:

#### Required (Docker-Only Setup)
- **Docker** and **Docker Compose** installed
- **Git** for version control

#### Optional Tools  
- **Supabase CLI** (for advanced database management)
- **Node.js 18+** and **npm** (ONLY for IDE support - application runs in Docker)

### 🐳 Docker-First Development (MANDATORY)

**IMPORTANT**: This project uses Docker for ALL development, testing, and production deployments. Native development is not supported.

```bash
# Clone the repository
git clone https://github.com/gaurav-dr/gep-partner-system.git
cd gep-partner-system

# Start all services with Docker Compose
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - Supabase Studio: http://localhost:8000
```

### Manual Setup (Native Development)

If you prefer to run services natively for development:

#### 1. Supabase Setup

```bash
cd supabase
supabase start
# Note the API URL and anon key for environment setup
```

#### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# Backend runs on http://localhost:3001
```

#### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your backend API URL

# Start development server
npm start
# Frontend runs on http://localhost:3000
```

## Environment Configuration

### Backend Environment (`.env`)

```bash
# Database Configuration
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# API Configuration
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development

# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# AI Integration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=debug
```

### Frontend Environment (`.env`)

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development

# Supabase Configuration
REACT_APP_SUPABASE_URL=http://localhost:8000
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Workflow

### Project Structure

```
gep-partner-system/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── Dockerfile
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API clients
│   ├── package.json
│   └── Dockerfile
├── supabase/              # Database schema and functions
│   ├── migrations/        # Database migrations
│   ├── config.toml        # Supabase configuration
│   └── seed.sql           # Initial data
├── tests/                 # E2E tests
├── docs/                  # Documentation
└── docker-compose.yml     # Local development setup
```

### Development Scripts

#### Backend Scripts

```bash
# Development with hot reload
npm run dev

# Start production build
npm start

# Run tests
npm test
npm run test:watch

# Linting and formatting
npm run lint
npm run lint:fix
```

#### Frontend Scripts

```bash
# Development server with hot reload
npm start

# Production build
npm run build

# Run tests
npm test
npm run test:coverage

# Type checking
npx tsc --noEmit
```

## Database Development

### Supabase Local Development

```bash
# Start Supabase services
supabase start

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts

# Reset database
supabase db reset

# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Database Schema Management

The database schema is managed through Supabase migrations in `supabase/migrations/`. Key tables:

- `customers` - Client company information
- `partners` - Healthcare professionals
- `customer_requests` - Service requests
- `assignments` - Partner-request assignments
- `partner_availability` - Schedule management
- `audit_trails` - System activity logging

### Sample Data

```bash
# Load sample data for development
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

## Testing Strategy

### Unit Testing (Backend)

```bash
cd backend
npm test

# Test specific service
npm test -- AuthService.test.js

# Coverage report
npm run test:coverage
```

### Component Testing (Frontend)

```bash
cd frontend
npm test

# Interactive test runner
npm test -- --watch

# Coverage report
npm test -- --coverage --watchAll=false
```

### End-to-End Testing (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm test

# Run tests in UI mode
npm run test:ui

# Run headed tests (see browser)
npm run test:headed

# Generate test report
npm run show-report
```

#### E2E Test Configuration

Tests are configured to run against the local development environment:

```javascript
// playwright.config.js
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
}
```

## Code Quality & Standards

### TypeScript Configuration

Both frontend and backend use TypeScript with strict settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Linting Rules

ESLint configuration enforces:
- React best practices
- TypeScript type safety
- Accessibility standards
- Performance optimizations

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push and create pull request
git push origin feature/your-feature-name
```

## Debugging & Troubleshooting

### Backend Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View logs in real-time
tail -f logs/backend.log

# Database connection test
node -e "const { supabase } = require('./src/config/database'); supabase.from('customers').select('count').then(console.log)"
```

### Frontend Debugging

```bash
# Enable React Developer Tools
# Install React DevTools browser extension

# View network requests
# Use browser dev tools Network tab

# Component performance
# Use React Profiler in DevTools
```

### Common Issues & Solutions

#### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

#### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Restart Supabase
supabase stop
supabase start
```

#### Docker Issues
```bash
# Clean up containers
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache

# View container logs
docker-compose logs backend
docker-compose logs frontend
```

## Development Best Practices

### Code Organization
- **Single Responsibility**: Each function/component has one purpose
- **Separation of Concerns**: Business logic separated from UI
- **Consistent Naming**: Clear, descriptive names for variables and functions
- **Error Handling**: Comprehensive error catching and logging

### Performance Optimization
- **React Query**: Efficient server state management
- **Component Memoization**: Prevent unnecessary re-renders
- **Bundle Analysis**: Regular bundle size monitoring
- **Database Indexing**: Optimize query performance

### Security Considerations
- **Environment Variables**: Never commit secrets to git
- **Input Validation**: Validate all user inputs
- **Authentication**: Proper JWT handling and refresh
- **CORS Configuration**: Restrict origins appropriately

## Useful Development Commands

```bash
# Quick development setup
docker-compose up -d && echo "Services started on:"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "Supabase: http://localhost:8000"

# Full system restart
docker-compose down && docker-compose up -d

# View all logs
docker-compose logs -f

# Reset development database
supabase db reset && supabase db push

# Run full test suite
cd backend && npm test && cd ../frontend && npm test && cd .. && npx playwright test
```

## Contributing Guidelines

1. **Feature Development**: Create feature branches from `dev`
2. **Code Review**: All PRs require review
3. **Testing**: Ensure tests pass before merging
4. **Documentation**: Update docs for new features
5. **Commit Messages**: Use conventional commit format

---

*This development setup provides a comprehensive environment for building and testing the GEP Partner System efficiently.*