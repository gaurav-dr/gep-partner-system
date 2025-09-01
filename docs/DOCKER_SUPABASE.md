# Docker Setup with Local Supabase

This guide shows how to run the GEP Partner Assignment System with a local Supabase instance using Docker.

## Quick Start

1. **Start all services:**
```bash
docker-compose --env-file .env.docker up -d
```

2. **Access the applications:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Supabase Studio**: http://localhost:3010
- **Supabase API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

## Service Architecture

### Supabase Stack:
- **supabase-db**: PostgreSQL database (port 5432)
- **supabase-kong**: API Gateway (port 8000)
- **supabase-auth**: Authentication service (GoTrue)
- **supabase-rest**: REST API (PostgREST)
- **supabase-realtime**: Real-time subscriptions
- **supabase-storage**: File storage with image transformation
- **supabase-studio**: Admin dashboard (port 3010)
- **supabase-meta**: Database metadata API

### Application Stack:
- **frontend**: React app (port 3000)
- **backend**: Node.js API (port 3001)
- **redis**: Cache and sessions (port 6379)

## Database Setup

The database will automatically initialize with:
- **Migrations**: `./supabase/migrations/*.sql`
- **Seed data**: `./supabase/seed.sql`

### Manual Database Access:
```bash
# Connect to PostgreSQL
docker-compose exec supabase-db psql -U postgres -d postgres

# View tables
\dt

# Run custom SQL
docker-compose exec supabase-db psql -U postgres -d postgres -f /path/to/your/script.sql
```

## Configuration

### Environment Variables (.env.docker):
- Local Supabase URL: `http://localhost:8000`
- Anonymous JWT key (for frontend)
- Service role JWT key (for backend admin operations)
- Consistent JWT secret across all services

### Default Credentials:
- **Database**: postgres/your_postgres_password
- **JWT Secret**: super-secret-jwt-token-with-at-least-32-characters-long

## Development Workflow

### 1. Start Services:
```bash
docker-compose --env-file .env.docker up -d
```

### 2. View Logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f supabase-db
docker-compose logs -f backend
```

### 3. Restart Services:
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### 4. Stop Services:
```bash
docker-compose down

# Stop and remove volumes (data will be lost)
docker-compose down -v
```

## Accessing Supabase Studio

1. Open http://localhost:3010
2. Connect with:
   - **URL**: http://localhost:8000
   - **Anon Key**: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

## Troubleshooting

### Service Won't Start:
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Rebuild containers
docker-compose build --no-cache
```

### Database Connection Issues:
- Ensure all Supabase services are running
- Check Kong gateway logs: `docker-compose logs supabase-kong`
- Verify database is accessible: `docker-compose exec supabase-db pg_isready`

### Reset Everything:
```bash
# Stop all containers and remove volumes
docker-compose down -v

# Remove all images (optional)
docker-compose down --rmi all

# Restart fresh
docker-compose --env-file .env.docker up -d
```

## Production Notes

For production deployment:
- Use strong, unique passwords
- Generate new JWT secrets
- Configure proper CORS origins
- Set up SSL/TLS termination
- Use Docker secrets for sensitive data

## Switching Between Local and Cloud Supabase

### Use Local (Docker):
```bash
docker-compose --env-file .env.docker up
```

### Use Cloud Supabase:
```bash
# Copy your cloud credentials to .env
cp .env.example .env
# Edit .env with your cloud Supabase credentials

# Start without Supabase services
docker-compose up frontend backend redis
```