# GEP Partner System - Technical Architecture

## System Architecture Overview

The GEP Partner System follows a modern full-stack architecture with clear separation of concerns and scalable design patterns.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  React Admin Portal (3000)    │    Partner Dashboard         │
│  - TypeScript + TailwindCSS   │    - Role-based UI           │
│  - React Query for state      │    - Real-time updates       │
│  - React Hook Form            │    - Mobile responsive        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                       API GATEWAY                            │
├─────────────────────────────────────────────────────────────┤
│  Node.js + Express API Server (3001/4001)                   │
│  - Rate limiting (100 req/15min)                            │
│  - CORS + Helmet security                                   │
│  - JWT Authentication                                       │
│  - Request/Response logging                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │ AI Scheduling│  │ Optimization │      │
│  │   - JWT      │  │    Engine    │  │   Engine     │      │
│  │   - RBAC     │  │ - Anthropic  │  │ - Linear Prog│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Email Service │  │ Notification │  │ SEPE Export  │      │
│  │ - SendGrid   │  │   Service    │  │   Service    │      │
│  │ - Fallbacks  │  │ - WebSocket  │  │ - Excel Gen  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL + Real-time)                         │
│  - Row Level Security (RLS)                                │
│  - Real-time subscriptions                                 │
│  - Automated backups                                       │
│  - Connection pooling                                      │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture (React + TypeScript)

### Technology Stack
- **React 18.2**: Component-based UI with hooks
- **TypeScript 4.9**: Type safety and enhanced developer experience
- **TailwindCSS 3.2**: Utility-first CSS framework
- **React Query 3.39**: Server state management and caching
- **React Hook Form 7.43**: Form state management with validation
- **React Router 6.8**: Client-side routing
- **Recharts 2.5**: Data visualization and analytics

### Key Frontend Components

```typescript
src/
├── components/
│   ├── AddPartnerModal.tsx      # Partner onboarding
│   ├── AISchedulingModal.tsx    # AI-powered scheduling interface
│   ├── Calendar.tsx             # Availability management
│   ├── Layout.tsx               # Main application shell
│   ├── PartnerCalendar.tsx      # Partner-specific scheduling
│   ├── PartnerDetailModal.tsx   # Comprehensive partner profiles
│   └── PartnerProfile.tsx       # Partner self-management
├── pages/
│   ├── Dashboard.tsx            # Admin overview with KPIs
│   ├── CustomerRequests.tsx     # Request management interface
│   ├── Partners.tsx             # Partner directory and management
│   ├── Assignments.tsx          # Assignment tracking and optimization
│   ├── Analytics.tsx            # Business intelligence dashboard
│   ├── PartnerDashboard.tsx     # Partner-specific interface
│   └── TraceabilityDashboard.tsx # Audit and compliance tracking
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
└── services/
    └── api.ts                   # API client with Axios
```

### State Management Strategy
- **React Query**: Server state, caching, and synchronization
- **React Context**: Authentication and global app state
- **Local State**: Component-specific state with hooks
- **Form State**: React Hook Form for complex forms

## Backend Architecture (Node.js + Express)

### Technology Stack
- **Node.js 18+**: JavaScript runtime
- **Express 4.18**: Web application framework
- **Supabase Client 2.38**: Database client with real-time features
- **Winston 3.11**: Logging and monitoring
- **JWT**: Authentication and authorization
- **Node-cron 3.0**: Scheduled tasks and background jobs

### API Structure

```javascript
src/
├── server.js                    # Application entry point
├── routes/
│   ├── auth.js                  # Authentication endpoints
│   ├── customerRequests.js      # Request CRUD operations
│   ├── partners.js              # Partner management
│   ├── assignments.js           # Assignment operations
│   ├── optimization.js          # AI scheduling endpoints
│   ├── analytics.js             # Reporting and metrics
│   └── admin.js                 # Administrative functions
├── services/
│   ├── AISchedulingEngine.js    # Anthropic AI integration
│   ├── AnthropicIntegration.js  # Claude API wrapper
│   ├── AuthService.js           # Authentication logic
│   ├── EmailService.js          # SendGrid email integration
│   ├── NotificationService.js   # Real-time notifications
│   ├── OptimizationEngine.js    # Partner assignment algorithms
│   ├── SEPEExportService.js     # Regulatory reporting
│   └── WorkflowManager.js       # Business process orchestration
├── middleware/
│   └── errorHandler.js          # Global error handling
└── utils/
    └── logger.js                # Winston logging configuration
```

### Service Layer Details

#### AI Scheduling Engine (`AISchedulingEngine.js`)
- **Anthropic Claude Integration**: Natural language processing for scheduling
- **Constraint Resolution**: Handles complex scheduling conflicts
- **Optimization Algorithms**: Multi-factor partner assignment
- **Performance Metrics**: Response time optimization

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

*This architecture provides a solid foundation for scalable, maintainable, and secure healthcare service management while maintaining flexibility for future enhancements.*