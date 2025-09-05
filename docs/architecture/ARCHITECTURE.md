# GEP Partner System - Technical Architecture

## System Architecture Overview

The GEP Partner System follows a modern full-stack architecture with clear separation of concerns and scalable design patterns.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│  React Admin Portal (3000)         │    Partner Mobile Dashboard             │
│  - TypeScript + TailwindCSS        │    - Role-based UI                       │
│  - TanStack Query v5               │    - PWA + Offline capability           │
│  - React Hook Form + Zod           │    - Real-time WebSocket updates        │
│  - Socket.io-client                │    - Healthcare-optimized mobile UX     │
└───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY LAYER                                  │
├───────────────────────────────────────────────────────────────────────────────┤
│  Node.js + Express Main Backend (3001/4001)                                  │
│  - Rate limiting (100 req/15min per user role)                               │
│  - Enhanced CORS + Helmet security                                           │
│  - JWT + MFA Authentication                                                  │
│  - Healthcare audit logging (GDPR compliant)                                 │
│  - Request/Response sanitization                                             │
└───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                       HYBRID SERVICE LAYER                                    │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                       NODE.JS SERVICES                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Auth Service │  │ WebSocket    │  │ CRUD APIs    │                 │  │
│  │  │   - JWT      │  │   Manager    │  │ - Partners   │                 │  │
│  │  │   - RBAC     │  │ - Real-time  │  │ - Requests   │                 │  │
│  │  │   - MFA      │  │ - Pub/Sub    │  │ - Clients    │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │Email Service │  │ SEPE Export  │  │ Audit Trail  │                 │  │
│  │  │ - SendGrid   │  │   Service    │  │   Service    │                 │  │
│  │  │ - Templates  │  │ - Compliance │  │ - Healthcare │                 │  │
│  │  │ - Fallbacks  │  │ - Excel Gen  │  │ - GDPR logs  │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    PYTHON OPTIMIZATION SERVICES                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Linear Prog  │  │ Machine      │  │ Genetic      │                 │  │
│  │  │ Optimizer    │  │ Learning     │  │ Algorithm    │                 │  │
│  │  │ - OR-Tools   │  │ - scikit     │  │ - DEAP       │                 │  │
│  │  │ - SCIP       │  │ - pandas     │  │ - NumPy      │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ AI Predictor │  │ Pattern      │  │ Healthcare   │                 │  │
│  │  │ - TensorFlow │  │ Recognition  │  │ Analytics    │                 │  │
│  │  │ - Forecasting│  │ - Learning   │  │ - KPI Calc   │                 │  │
│  │  │ - Demand     │  │ - Feedback   │  │ - Reports    │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      AI ORCHESTRATION LAYER                            │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │  │
│  │  │                AI Scheduling Engine (Node.js)                   │   │  │
│  │  │  • Routes requests to appropriate Python services              │   │  │
│  │  │  • Combines results from multiple optimizers                   │   │  │
│  │  │  • Handles timeouts and fallbacks                              │   │  │
│  │  │  • Integrates external AI (Anthropic Claude, OpenAI)          │   │  │
│  │  │  • Learning from manager feedback                              │   │  │
│  │  └──────────────────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           CACHING & QUEUE LAYER                               │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ Redis Cache      │  │ Job Queue        │  │ Session Store    │           │
│  │ - Algorithm      │  │ - Bull/Agenda    │  │ - User sessions  │           │
│  │   results        │  │ - Background     │  │ - Rate limiting  │           │
│  │ - Partner data   │  │   optimization   │  │ - Cache keys     │           │
│  │ - Schedule cache │  │ - ML training    │  │                  │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
└───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Supabase (PostgreSQL + Real-time)                   │  │
│  │  • Row Level Security (RLS) for healthcare data                        │  │
│  │  • Real-time subscriptions for partner updates                         │  │
│  │  • Automated backups with point-in-time recovery                       │  │
│  │  • Connection pooling with pgBouncer                                   │  │
│  │  • SEPE compliance schema with audit triggers                          │  │
│  │  • Optimized indexes for scheduling queries                            │  │
│  │  • Vector storage for ML embeddings                                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture (React + TypeScript)

### Current Technology Stack (TypeScript Migration Complete - September 2025)
- **React 18.2**: Component-based UI with hooks and full TypeScript integration
- **TypeScript 4.9+**: Strict type checking with comprehensive interface definitions
- **TailwindCSS 3.2+**: Utility-first CSS framework with healthcare-optimized components
- **React Query 3.39**: Server state management and caching (currently stable version)
- **React Hook Form 7.43 + Zod**: Form state management with runtime validation
- **Socket.io-client**: WebSocket client for real-time updates
- **React Router 6.8**: Client-side routing
- **Recharts 2.5**: Data visualization and analytics
- **Axios 1.3.4**: HTTP client with TypeScript type definitions
- **ESLint 8.57 + Prettier 3.6**: Enhanced code quality and formatting
- **Jest + Testing Library**: Unit testing with TypeScript support
- **Playwright 1.40**: End-to-end testing framework

### Frontend Structure (TypeScript Complete)

```typescript
src/
├── components/                  # React components with TypeScript
│   ├── AddPartnerModal.tsx      # Partner onboarding with typed props
│   ├── AISchedulingModal.tsx    # AI-powered scheduling interface
│   ├── Calendar.tsx             # Availability management
│   ├── Layout.tsx               # Main application shell
│   ├── LoadingSpinner.tsx       # Loading state component
│   ├── PartnerCalendar.tsx      # Partner-specific scheduling
│   ├── PartnerDetailModal.tsx   # Comprehensive partner profiles
│   ├── PartnerProfile.tsx       # Partner self-management
│   ├── PartnerReports.tsx       # Partner analytics
│   └── ErrorBoundary.tsx        # Error handling component
├── pages/                       # Page components with TypeScript
│   ├── Dashboard.tsx            # Admin overview with KPIs
│   ├── CustomerRequests.tsx     # Request management interface
│   ├── Partners.tsx             # Partner directory and management
│   ├── Assignments.tsx          # Assignment tracking
│   ├── Analytics.tsx            # Business intelligence dashboard
│   ├── PartnerDashboard.tsx     # Partner-specific interface
│   ├── TraceabilityDashboard.tsx # Audit and compliance tracking
│   ├── Login.tsx                # Authentication page
│   └── NewRequest.tsx           # Request creation
├── types/
│   └── index.ts                 # Comprehensive TypeScript interfaces
├── contexts/
│   └── AuthContext.tsx          # Authentication state with types
├── services/
│   ├── api.ts                   # Typed API client with Axios
│   ├── supabaseApi.ts          # Supabase service with types
│   └── aiScheduler.ts          # AI scheduling service
├── hooks/                       # Custom React hooks (TypeScript)
└── utils/                       # Utility functions with types
```

### State Management Strategy (TypeScript)
- **React Query 3.39**: Server state management with TypeScript generics
- **React Context**: Authentication and global app state with typed contexts
- **Local State**: Component-specific state with TypeScript hooks
- **Form State**: React Hook Form 7.43 with Zod validation schemas
- **Type Safety**: Comprehensive interfaces for all state objects
- **API Integration**: Fully typed API responses and request payloads

## Hybrid Backend Architecture (Node.js + Python)

### Node.js Backend Stack (TypeScript Complete)
- **Node.js 18+**: TypeScript runtime with ts-node for development
- **Express 4.18.2**: Web application framework with typed middleware
- **TypeScript 5.2+**: Strict configuration with comprehensive type system
- **Supabase Client 2.38.4**: Database client with TypeScript types
- **Winston 3.11**: Structured logging system (currently implemented)
- **JWT + Helmet**: Authentication and enhanced security headers
- **Express Rate Limit 7.1**: Role-based rate limiting
- **Joi 17.11**: Input validation and sanitization
- **SendGrid Mail 8.1**: Email service with TypeScript support
- **Anthropic AI SDK 0.24**: Claude integration with types
- **CORS 2.8.5**: Cross-origin resource sharing configuration
- **Compression 1.7**: Response compression middleware

### Python Optimization Services Stack
- **FastAPI 0.104**: High-performance API framework for optimization services
- **OR-Tools 9.8**: Google's optimization library for linear programming
- **scikit-learn 1.3**: Machine learning algorithms and model training
- **pandas 2.1**: Data processing and SEPE compliance calculations
- **NumPy 1.25**: Numerical computing foundation
- **TensorFlow 2.14**: Deep learning for demand forecasting
- **DEAP 1.4**: Genetic algorithm framework
- **Redis-py 5.0**: Python Redis client for result caching

### Hybrid API Structure

#### Node.js Main Backend
```typescript
backend/src/                     # All TypeScript source files
├── server.ts                    # Application entry point with TypeScript
├── types/
│   └── index.ts                 # Comprehensive type definitions
├── routes/                      # All routes converted to TypeScript
│   ├── auth.ts                  # Authentication endpoints with types
│   ├── customerRequests.ts      # Request CRUD operations
│   ├── partners.ts              # Partner management
│   ├── assignments.ts           # Assignment operations
│   └── analytics.ts             # Reporting and metrics
├── services/                    # Business logic services (TypeScript)
│   ├── AISchedulingEngine.ts    # AI scheduling with typed interfaces
│   ├── WorkflowManager.ts       # Workflow orchestration
│   ├── EmailService.ts          # SendGrid integration with types
│   ├── OptimizationEngine.ts    # Partner optimization logic
│   └── NotificationService.ts   # Notification management
├── middleware/                  # Express middleware (TypeScript)
│   ├── auth.ts                  # JWT authentication middleware
│   ├── validation.ts            # Joi request validation
│   └── errorHandler.ts          # Global error handling
├── utils/
│   ├── logger.ts                # Winston logging configuration
│   └── database.ts              # Supabase client setup
└── config/
    └── database.ts              # Database configuration
```

#### Python Optimization Services
```python
python-services/
├── optimization_service/
│   ├── main.py                  # FastAPI application entry
│   ├── routers/
│   │   ├── linear_programming.py # OR-Tools linear optimization
│   │   ├── machine_learning.py   # scikit-learn ML models
│   │   ├── genetic_algorithm.py  # DEAP genetic optimization
│   │   └── analytics.py          # Advanced healthcare analytics
│   ├── models/
│   │   ├── partner_selection.py  # ML models for partner matching
│   │   ├── demand_forecast.py    # TensorFlow demand prediction
│   │   └── sepe_compliance.py    # Regulatory calculation models
│   ├── services/
│   │   ├── optimization_engine.py # Core optimization logic
│   │   ├── ml_trainer.py         # Model training and validation
│   │   └── cache_client.py       # Redis caching for Python
│   └── utils/
│       ├── healthcare_math.py    # Domain-specific calculations
│       └── performance_monitor.py # Optimization metrics
├── requirements.txt             # Python dependencies
└── Dockerfile                   # Container configuration
```

### Hybrid Service Architecture Details

#### HybridSchedulingEngine.js (Node.js Orchestrator)
```javascript
class HybridSchedulingEngine {
    constructor() {
        this.pythonClient = new PythonServiceClient();
        this.cacheManager = new CacheManager();
        this.fallbackScheduler = new RuleBasedScheduler();
    }
    
    async generateOptimalSchedule(request) {
        // Try cached result first
        const cached = await this.cacheManager.get(`schedule_${request.id}`);
        if (cached) return cached;
        
        try {
            // Route to appropriate Python optimizer based on complexity
            const optimizer = this.selectOptimizer(request);
            const result = await this.pythonClient.optimize(optimizer, request, {
                timeout: 10000 // 10 second timeout
            });
            
            // Cache successful results
            await this.cacheManager.set(`schedule_${request.id}`, result, 3600);
            return result;
            
        } catch (error) {
            // Fallback to Node.js rule-based scheduler
            logger.warn('Python optimizer failed, using fallback', { error });
            return await this.fallbackScheduler.schedule(request);
        }
    }
    
    selectOptimizer(request) {
        if (request.complexity > 0.8) return 'genetic_algorithm';
        if (request.partners.length > 100) return 'linear_programming'; 
        if (request.type === 'ml_prediction') return 'machine_learning';
        return 'linear_programming'; // Default
    }
}
```

#### Python Optimization Services Architecture

##### Linear Programming Service (`linear_programming.py`)
```python
from ortools.linear_solver import pywraplp
from fastapi import APIRouter
import numpy as np

class LinearProgrammingOptimizer:
    def __init__(self):
        self.solver = pywraplp.Solver.CreateSolver('SCIP')
    
    async def optimize_partner_assignment(self, partners, constraints, objectives):
        """
        Solve healthcare scheduling as linear programming problem
        - Variables: partner[i] assigned to request[j]
        - Constraints: SEPE compliance, availability, travel distance
        - Objective: minimize cost + travel time + maximize satisfaction
        """
        # Decision variables
        x = {}
        for i, partner in enumerate(partners):
            for j, request in enumerate(constraints.requests):
                x[i,j] = self.solver.BoolVar(f'assign_{partner.id}_{request.id}')
        
        # SEPE compliance constraints
        for j, request in enumerate(constraints.requests):
            self.solver.Add(sum(x[i,j] for i in range(len(partners))) == 1)
        
        # Partner availability constraints  
        for i, partner in enumerate(partners):
            total_hours = sum(
                constraints.requests[j].estimated_hours * x[i,j] 
                for j in range(len(constraints.requests))
            )
            self.solver.Add(total_hours <= partner.max_hours_per_week)
        
        # Objective function: minimize total cost and travel time
        objective = self.solver.Objective()
        for i, partner in enumerate(partners):
            for j, request in enumerate(constraints.requests):
                cost = partner.hourly_rate * request.estimated_hours
                travel_cost = self.calculate_travel_cost(partner, request)
                objective.SetCoefficient(x[i,j], cost + travel_cost)
        
        objective.SetMinimization()
        
        # Solve and return result
        status = self.solver.Solve()
        if status == pywraplp.Solver.OPTIMAL:
            return self.format_solution(x, partners, constraints.requests)
        else:
            raise OptimizationError("No optimal solution found")
```

##### Machine Learning Service (`machine_learning.py`)
```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import pandas as pd

class HealthcareSchedulingML:
    def __init__(self):
        self.partner_model = RandomForestRegressor(n_estimators=100)
        self.demand_model = None # TensorFlow model for forecasting
        
    async def train_partner_selection_model(self, historical_data):
        """Train ML model on historical partner assignments"""
        # Feature engineering for healthcare scheduling
        features = self.extract_features(historical_data)
        X = features[['partner_experience', 'travel_distance', 'availability_score', 
                     'sepe_compliance_score', 'client_satisfaction_history']]
        y = features['assignment_success_score']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        self.partner_model.fit(X_train, y_train)
        
        # Validation and performance metrics
        score = self.partner_model.score(X_test, y_test)
        return {'model_accuracy': score, 'feature_importance': self.get_feature_importance()}
    
    async def predict_optimal_partners(self, request, available_partners):
        """Predict best partners for a scheduling request"""
        partner_scores = []
        for partner in available_partners:
            features = self.create_prediction_features(request, partner)
            score = self.partner_model.predict([features])[0]
            partner_scores.append({
                'partner_id': partner.id,
                'predicted_success_score': score,
                'confidence': self.calculate_confidence(features)
            })
        
        return sorted(partner_scores, key=lambda x: x['predicted_success_score'], reverse=True)
```

#### Communication Between Services

##### PythonServiceClient.js (Node.js → Python)
```javascript
class PythonServiceClient {
    constructor() {
        this.baseURL = process.env.PYTHON_OPTIMIZER_URL || 'http://localhost:8000';
        this.timeout = 10000;
        this.retryAttempts = 2;
    }
    
    async optimize(service, data, options = {}) {
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.baseURL}/${service}/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                timeout: options.timeout || this.timeout
            });
            
            if (!response.ok) {
                throw new Error(`Python service error: ${response.status}`);
            }
            
            const result = await response.json();
            const executionTime = Date.now() - startTime;
            
            // Log performance metrics
            logger.info('Python optimization completed', {
                service,
                executionTime,
                optimizationScore: result.score
            });
            
            return result;
            
        } catch (error) {
            logger.error('Python service call failed', {
                service,
                error: error.message,
                executionTime: Date.now() - startTime
            });
            throw error;
        }
    }
}
```

#### Performance and Reliability Features

##### Caching Strategy
- **L1 (Node.js Memory)**: Hot partner data, session information
- **L2 (Redis)**: Optimization results, computed schedules  
- **L3 (Database)**: Master data, historical patterns

##### Fault Tolerance
- **Circuit Breaker**: Automatic fallback when Python services fail
- **Graceful Degradation**: Node.js rule-based scheduler as backup
- **Health Monitoring**: Continuous service health checks
- **Auto-scaling**: Docker containers scale based on optimization load

#### Optimization Engine (`OptimizationEngine.js`)
- **Geographic Optimization**: Distance-based partner selection
- **Cost Minimization**: Travel and operational cost factors
- **Availability Matching**: Real-time schedule coordination
- **Specialization Matching**: Skills and certification alignment

#### Notification Service (`NotificationService.js`)
- **WebSocket Integration**: Real-time browser notifications
- **Email Notifications**: SendGrid with template management
- **SMS Capabilities**: Multi-channel communication
- **Escalation Logic**: 24-hour response time enforcement

## Database Architecture (Supabase/PostgreSQL)

### Database Schema Design

```sql
-- Core Entities
customers
├── id (UUID, PK)
├── company_name
├── contact_info
├── installations[]
└── contract_details

partners
├── id (UUID, PK)
├── name, email, phone
├── specializations[]
├── geographic_coverage
├── hourly_rates
└── availability_calendar

customer_requests
├── id (UUID, PK)
├── customer_id (FK)
├── installation_details
├── service_type
├── urgency_level
├── sepe_requirements
└── status_tracking

assignments
├── id (UUID, PK)
├── request_id (FK)
├── partner_id (FK)
├── assignment_date
├── completion_status
└── performance_metrics

-- Supporting Tables
partner_availability
audit_trails
notification_logs
sepe_export_records
```

### Supabase Features Utilized
- **Row Level Security (RLS)**: Role-based data access
- **Real-time Subscriptions**: Live data updates
- **Database Functions**: Complex business logic
- **Triggers**: Automated workflows and audit logging
- **Connection Pooling**: Scalable database access

## Security Architecture

### Authentication & Authorization
```javascript
// JWT-based authentication
const authMiddleware = {
  verifyToken: (req, res, next) => {
    // JWT verification logic
  },
  checkRole: (requiredRoles) => {
    // Role-based access control
  }
}

// Role hierarchy
Roles: {
  ADMIN: ['all_permissions'],
  MANAGER: ['read_all', 'write_own'],
  PARTNER: ['read_own', 'update_availability']
}
```

### Security Measures
- **Rate Limiting**: 100 requests per 15-minute window
- **CORS Configuration**: Restricted origin policy
- **Helmet Integration**: Security headers
- **Input Validation**: Joi schema validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy

## Performance & Scalability

### Caching Strategy
- **React Query**: 5-minute stale time for client-side caching
- **Database Indexes**: Optimized query performance
- **CDN Integration**: Static asset delivery
- **Connection Pooling**: Database connection optimization

### Monitoring & Observability
- **Winston Logging**: Structured logging with levels
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Comprehensive error reporting
- **Health Checks**: System status monitoring

### Scalability Considerations
- **Horizontal Scaling**: Load balancer ready
- **Database Sharding**: Geographic distribution capability
- **Microservices Migration**: Service separation ready
- **Container Deployment**: Docker and Kubernetes ready

## Integration Points

### External Services
- **Anthropic AI**: Claude API for intelligent scheduling
- **SendGrid**: Email delivery and template management
- **SEPE Authority**: Regulatory data exchange
- **Geographic APIs**: Distance and routing calculations

### API Design Patterns
- **RESTful Endpoints**: Standard HTTP methods and status codes
- **JSON API**: Consistent request/response format
- **Error Handling**: Standardized error responses
- **Versioning**: API version management ready

## Development Workflow

### Environment Management
- **Development**: Local Docker Compose setup
- **Staging**: Cloud deployment with test data
- **Production**: Optimized build with monitoring

### Quality Assurance
- **TypeScript**: Compile-time type checking
- **ESLint**: Code quality enforcement
- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing
- **Code Reviews**: Pull request workflow

---

*This architecture provides a solid foundation for scalable, maintainable, and secure healthcare service management with complete TypeScript integration, ensuring type safety and enhanced developer experience across the entire stack.*

---

## TypeScript Migration Details

### Migration Status: COMPLETE ✅
- **Backend**: Full TypeScript implementation with strict configuration
- **Frontend**: Complete React TypeScript integration with comprehensive types
- **Type Coverage**: 100% type coverage across all components and services
- **Development Experience**: Enhanced IDE support with IntelliSense and error checking
- **Build Process**: Zero TypeScript compilation errors
- **Testing**: TypeScript support in Jest and Playwright test suites

### Key TypeScript Features Implemented
- **Strict Type Checking**: Enabled across both frontend and backend
- **Interface Definitions**: Comprehensive type definitions for all data structures
- **Generic Types**: Utilized for API responses and reusable components
- **Path Aliases**: Configured for clean imports (@/* patterns)
- **Declaration Files**: Generated for better IDE support
- **Runtime Validation**: Zod schemas for request validation with TypeScript integration