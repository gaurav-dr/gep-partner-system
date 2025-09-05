# GEP Partner System - Development Guide (TypeScript)

## Local Development Setup - TypeScript Migration Complete

### Prerequisites

Before setting up the development environment, ensure you have:

#### Required for TypeScript Development
- **Node.js 18+** and **npm** (required for TypeScript compilation)
- **Git** for version control
- **TypeScript** globally installed (`npm install -g typescript`)
- **IDE with TypeScript support** (VS Code recommended)

#### Optional Tools  
- **Supabase CLI** (for advanced database management)
- **Docker** and **Docker Compose** (for containerized development)
- **ESLint and Prettier extensions** for your IDE

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

### TypeScript Development Setup (Recommended)

Native development with full TypeScript support:

#### 1. Backend Setup (TypeScript)

```bash
cd backend
npm install

# Copy and configure environment
cp .env.development.example .env
# Edit .env with your Supabase credentials

# TypeScript development with hot reload
npm run dev
# Backend runs on http://localhost:3001 with ts-node

# Type checking
npm run type-check

# Build TypeScript to JavaScript
npm run build
```

#### 2. Frontend Setup (React + TypeScript)

```bash
cd frontend
npm install

# Copy and configure environment
cp .env.development.example .env
# Edit .env with your backend API URL

# Start development server with TypeScript
PORT=3002 ESLINT_NO_DEV_ERRORS=true npm start
# Frontend runs on http://localhost:3002

# Type checking (separate terminal)
npx tsc --noEmit --watch
```

#### 3. Development Workflow

```bash
# Terminal 1: Backend TypeScript
cd backend && npm run dev

# Terminal 2: Frontend React + TypeScript
cd frontend && PORT=3002 ESLINT_NO_DEV_ERRORS=true npm start

# Terminal 3: Type checking (optional)
cd frontend && npx tsc --noEmit --watch
```

## Environment Configuration

### Backend Environment (`.env`) - TypeScript

```bash
# Database Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# API Configuration
PORT=3001
CORS_ORIGIN=http://localhost:3002
NODE_ENV=development

# Email Service (SendGrid) - Optional
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# AI Integration - Optional
ANTHROPIC_API_KEY=your_anthropic_api_key

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=debug

# TypeScript Development
TS_NODE_PROJECT=tsconfig.json
TS_NODE_TRANSPILE_ONLY=true
```

### Frontend Environment (`.env`) - React TypeScript

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development Configuration
PORT=3002
ESLINT_NO_DEV_ERRORS=true
TSC_COMPILE_ON_ERROR=true
GENERATE_SOURCEMAP=true

# TypeScript Development
REACT_APP_ENV=development
```

## Development Workflow

### Project Structure

```
gep-partner-system/
├── backend/                 # Node.js API server (TypeScript)
│   ├── src/                 # TypeScript source files
│   │   ├── types/           # TypeScript type definitions
│   │   ├── routes/          # API endpoints (*.ts)
│   │   ├── services/        # Business logic (*.ts)
│   │   ├── middleware/      # Express middleware (*.ts)
│   │   ├── utils/           # Utility functions (*.ts)
│   │   └── config/          # Configuration (*.ts)
│   ├── dist/                # Compiled JavaScript output
│   ├── package.json
│   ├── tsconfig.json       # TypeScript configuration
│   └── nodemon.json        # Development configuration
├── frontend/               # React application (TypeScript)
│   ├── src/
│   │   ├── components/      # UI components (*.tsx)
│   │   ├── pages/           # Route components (*.tsx)
│   │   ├── contexts/        # React contexts (*.tsx)
│   │   ├── services/        # API clients (*.ts)
│   │   ├── types/           # TypeScript interfaces (*.ts)
│   │   ├── hooks/           # Custom React hooks (*.ts)
│   │   └── utils/           # Utility functions (*.ts)
│   ├── package.json
│   ├── tsconfig.json       # TypeScript configuration
│   ├── .eslintrc.js        # ESLint configuration
│   └── .prettierrc         # Prettier configuration
├── supabase/              # Database schema and functions
│   ├── migrations/        # Database migrations
│   ├── config.toml        # Supabase configuration
│   └── seed.sql           # Initial data
├── tests/                 # E2E tests (Playwright + TypeScript)
├── docs/                  # Documentation
└── docker-compose.yml     # Local development setup
```

### Development Scripts

#### Backend Scripts (TypeScript)

```bash
# Development with hot reload (ts-node)
npm run dev

# TypeScript compilation
npm run build

# Start production build
npm start

# Type checking only
npm run type-check

# Run tests (Jest with TypeScript)
npm test
npm run test:watch
```

#### Frontend Scripts (React + TypeScript)

```bash
# Development server with TypeScript (port 3002)
PORT=3002 ESLINT_NO_DEV_ERRORS=true npm start

# Production build with TypeScript
npm run build

# Run tests (Jest + Testing Library + TypeScript)
npm test
npm run test:coverage

# ESLint with TypeScript rules
npm run lint
npm run lint:fix

# Prettier formatting
npm run format
npm run format:check

# Type checking only
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

#### Backend TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@types/*": ["types/*"]
    },
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

#### Frontend TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "es2015",
    "strict": false,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/types/*": ["types/*"]
    }
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

### Backend Debugging (TypeScript)

```bash
# Enable debug logging with TypeScript
LOG_LEVEL=debug npm run dev

# Type checking during development
npm run type-check

# View TypeScript compilation errors
npx tsc --noEmit

# Test TypeScript database connection
ts-node -e "import { supabase } from './src/config/database'; supabase.from('customers').select('count').then(console.log)"

# Debug with VS Code TypeScript support
# Use "Debug: Start Debugging" with Node.js + TypeScript configuration
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

#### Port Already in Use (Updated ports)
```bash
# Kill process on backend port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on frontend port 3002
lsof -ti:3002 | xargs kill -9

# Alternative: Use different ports
PORT=3011 npm run dev  # Backend
PORT=3012 npm start    # Frontend
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

## Useful Development Commands (TypeScript)

```bash
# Quick TypeScript development setup
echo "Starting TypeScript development environment:"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3002"

# Terminal 1 - Backend with TypeScript
cd backend && npm run dev

# Terminal 2 - Frontend with TypeScript
cd frontend && PORT=3002 ESLINT_NO_DEV_ERRORS=true npm start

# Type checking across the project
cd backend && npm run type-check
cd frontend && npx tsc --noEmit

# Build TypeScript projects
cd backend && npm run build
cd frontend && npm run build

# Run full test suite with TypeScript
cd backend && npm test && cd ../frontend && npm test && cd .. && npx playwright test

# ESLint and Prettier formatting
cd frontend && npm run lint:fix && npm run format
```

## Contributing Guidelines

1. **Feature Development**: Create feature branches from `dev`
2. **Code Review**: All PRs require review
3. **Testing**: Ensure tests pass before merging
4. **Documentation**: Update docs for new features
5. **Commit Messages**: Use conventional commit format

---

*This development setup provides a comprehensive environment for building and testing the GEP Partner System efficiently.*