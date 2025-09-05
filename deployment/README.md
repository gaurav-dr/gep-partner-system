# GEP Partner System Deployment

This directory contains all Docker deployment configurations for the GEP Partner System.

## Files Overview

- `docker-compose.yml` - Full production deployment with Supabase
- `docker-compose.dev.yml` - Development deployment (simplified)
- `Dockerfile.dev` - Development container definition
- `supabase/` - Supabase Docker configuration and data
- `logs/` - Container logs directory

## Quick Start

### Option 1: Full Stack with Supabase (Recommended)
```bash
cd deployment
docker-compose up -d
```

This starts:
- Frontend (React) on http://localhost:3000
- Backend (Node.js API) on http://localhost:3001  
- Supabase on http://localhost:8000
- PostgreSQL database with seed data

### Option 2: Development Mode
```bash
cd deployment
docker-compose -f docker-compose.dev.yml up -d
```

## Login Credentials

Once running, use these demo credentials:
- **Admin**: admin@gephellas.com / GEPAdmin2024!
- **Manager**: manager@gephellas.com / Manager2024!
- **Partner**: partner.danezis@gephellas.com / Partner2024!

## Services Overview

### Frontend (Port 3000)
- React TypeScript application
- Material-UI components
- Authentication with demo mode
- Real-time partner dashboard

### Backend (Port 3001)
- Node.js Express API
- TypeScript
- Supabase integration
- RESTful endpoints for partners, requests, assignments

### Supabase (Port 8000)
- PostgreSQL database
- Auth services
- Real-time subscriptions
- Admin dashboard at http://localhost:8000

## Environment Variables

All environment variables are pre-configured in the docker-compose files. For production deployment, update:
- JWT secrets
- Supabase keys
- SendGrid configuration (optional)

## Logs

Container logs are available in the `logs/` directory or via:
```bash
docker-compose logs -f [service-name]
```

## Data Persistence

- Database data persists in Docker volumes
- Supabase configuration in `supabase/` directory
- Seed data automatically loaded on first start

## Troubleshooting

1. **Port conflicts**: Ensure ports 3000, 3001, and 8000 are available
2. **Build issues**: Run `docker-compose down -v` and `docker-compose up --build -d`
3. **Database issues**: Check logs with `docker-compose logs supabase-db`

## Development

For local development without Docker:
1. Start Supabase: `docker-compose up supabase-db supabase-kong supabase-auth supabase-rest supabase-realtime supabase-storage supabase-meta -d`
2. Run backend: `cd ../backend && npm run dev`
3. Run frontend: `cd ../frontend && npm start`