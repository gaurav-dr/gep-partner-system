# GEP Partner Assignment System

A comprehensive AI-powered solution for optimal assignment of healthcare consultants and partners to customer inspection requests, with advanced optimization algorithms and Greek SEPE regulatory compliance.

## 📚 Complete Documentation

**👉 [View Complete Documentation](./docs/)** - Comprehensive guides covering all aspects of the system

### Quick Navigation
- **[Project Overview](./docs/PROJECT_OVERVIEW.md)** - Business domain, features, and system overview
- **[Development Guide](./docs/DEVELOPMENT.md)** - Local setup, testing, and development workflow  
- **[API Documentation](./docs/API.md)** - Complete API reference with examples
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Technical architecture and design patterns
- **[Security Guide](./docs/SECURITY.md)** - Security implementation and best practices
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment strategies
- **[Technical Features](./docs/TECHNICAL_FEATURES.md)** - Advanced capabilities and AI integration

## ⚡ Quick Start

### 🐳 Docker Development (MANDATORY)
**All development, testing, and deployment must use Docker.**

```bash
git clone https://github.com/gaurav-dr/gep-partner-system.git
cd gep-partner-system

# Start all services
docker-compose -f config/docker/docker-compose.yml up -d

# Access points:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001  
# Database: http://localhost:8000
# Supabase Studio: http://localhost:3010

# Run tests
docker-compose -f config/docker/docker-compose.yml --profile test up backend-test
```

### Production Deployment
```bash
# Automated deployment
./scripts/deployment/deploy-production.sh YOUR_SERVER_IP

# Access: http://your-server (port configured in deployment)
```

## 🏗️ System Architecture

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Backend**: Node.js/Express with AI integration
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **AI Engine**: Anthropic Claude for intelligent scheduling
- **Optimization**: Multi-factor assignment algorithms
- **Communication**: SendGrid email + WebSocket real-time updates

## 🎯 Key Features

### Core Operations
- ✅ **Customer Request Management** - Complete CRUD with status tracking
- ✅ **AI-Powered Partner Assignment** - Anthropic Claude integration
- ✅ **Multi-Factor Optimization** - Location, cost, availability, specialty matching
- ✅ **Real-Time Dashboard** - Live updates with comprehensive analytics
- ✅ **24/7 Response Tracking** - Automated escalation and fallback mechanisms

### Advanced Capabilities  
- 🤖 **AI Scheduling Recommendations** - Natural language processing for optimal assignments
- 📊 **Business Intelligence** - Performance metrics, cost analysis, and forecasting
- 🔒 **Enterprise Security** - JWT auth, role-based access, comprehensive audit trails
- 📋 **SEPE Compliance** - Greek regulatory reporting and export functionality
- 🔄 **Real-Time Communication** - WebSocket updates and multi-channel notifications

## 🚀 Project Structure

```
├── frontend/              # React TypeScript application
│   ├── src/components/    # Reusable UI components  
│   ├── src/pages/         # Route components
│   ├── src/contexts/      # React contexts
│   └── src/services/      # API clients
├── backend/               # Node.js Express API
│   ├── src/routes/        # API endpoints
│   ├── src/services/      # Business logic & AI integration
│   ├── src/middleware/    # Express middleware
│   └── src/utils/         # Utility functions
├── supabase/              # Database schema and functions
│   ├── migrations/        # Database migrations
│   └── seed.sql          # Initial data
├── tests/                 # Playwright E2E tests
├── docs/                  # Comprehensive documentation
└── docker-compose.yml     # Development environment
```

## 🛠️ Development Environment

### Prerequisites
- Docker & Docker Compose (recommended)
- Node.js 18+ & npm (for native development)
- Git and project repository access

### Local Setup Options

#### Option 1: Docker (Fastest)
```bash
# Complete stack with one command
docker-compose up -d
```

#### Option 2: Native Development  
```bash
# 1. Database
cd supabase && supabase start

# 2. Backend  
cd backend && npm install && npm run dev

# 3. Frontend
cd frontend && npm install && npm start
```

## 🎛️ Technology Highlights

### AI & Optimization
- **Anthropic Claude**: Advanced natural language processing for scheduling
- **Multi-Factor Algorithms**: Geographic, cost, availability, and expertise optimization
- **Predictive Analytics**: Demand forecasting and capacity planning

### Real-Time Features
- **WebSocket Integration**: Live notifications and status updates
- **Supabase Real-Time**: Database change subscriptions
- **24/7 Monitoring**: Automated escalation and response tracking

### Enterprise Features
- **Role-Based Access**: Admin, Manager, Partner permission levels
- **Comprehensive Audit**: Complete activity and change logging
- **SEPE Compliance**: Greek regulatory authority integration
- **Advanced Analytics**: Performance metrics and business intelligence

## 📦 Production Deployment

### Automated Deployment (Recommended)
```bash
# Quick production setup
git clone https://github.com/gaurav-dr/gep-partner-system.git
cd gep-partner-system

# Configure environment
cp .env.production.port4000 .env
cp frontend/.env.production.port4000 frontend/.env
# Edit with your credentials

# Deploy to server
./scripts/deploy-port-4000.sh YOUR_SERVER_IP
```

### Service Architecture
- **Port 4000**: Nginx (frontend + API proxy)
- **Port 4001**: Node.js backend (internal)
- **Database**: Supabase (cloud managed)

**📋 [Complete Deployment Guide](./docs/DEPLOYMENT.md)** - Detailed deployment instructions, Docker options, and troubleshooting

## 🔧 Configuration

### Environment Setup
```bash
# Backend configuration
cd backend && cp .env.example .env

# Frontend configuration  
cd frontend && cp .env.example .env

# Required: Supabase URL/Keys, JWT Secret, SendGrid API Key, Anthropic API Key
```

**⚙️ [Full Configuration Guide](./docs/DEVELOPMENT.md#environment-configuration)** - Complete environment variable reference

**🔒 [Security Guidelines](./docs/SECURITY.md)** - Security implementation, credential management, and compliance

## 📊 System Status & Monitoring

### Health Checks
```bash
# Application health
curl http://localhost:3001/api/health

# System monitoring
pm2 status
pm2 monit
```

### Key Metrics
- **Response Time**: <2 seconds average
- **Availability**: 99.9% uptime target
- **Concurrent Users**: 100+ supported
- **Assignment Processing**: 1000+ per day

## 🤝 Contributing & Support

### Development Contribution
1. Fork repository and create feature branch
2. Follow [Development Guide](./docs/DEVELOPMENT.md) coding standards
3. Include tests for new functionality
4. Submit pull request with detailed description

### Issues & Support
- **Bug Reports**: Use GitHub Issues with logs and environment details
- **Feature Requests**: Describe use case and expected behavior
- **Documentation**: Improvements welcome via pull requests

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Greek SEPE Authority](https://www.sepe.gov.gr/)

---

## 📋 License & Information

- **License**: MIT
- **Version**: 1.0.0  
- **Node.js**: 18+ Required
- **Database**: PostgreSQL 12+ via Supabase
- **Browser Support**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

---

*For comprehensive documentation including business requirements, technical architecture, API reference, and deployment strategies, see the **[/docs directory](./docs/)**.*# CI/CD Pipeline Demonstration Wed Sep  3 15:40:54 IST 2025
