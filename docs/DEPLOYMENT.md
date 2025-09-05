# GEP Partner System - Deployment Guide

## Deployment Decision Tree

Choose your deployment method:

```
🤔 What's your setup?
├── 🏠 Local Development
│   ├── Docker (Recommended) → Use Docker Compose Setup
│   └── Native Development → Use Manual Development Setup
├── 🌐 Production Server
│   ├── Fresh Server → Use Automated Production Deployment
│   ├── Existing Server (Port Conflicts) → Use Custom Port Deployment
│   └── Docker Production → Use Docker Production Setup
└── ☁️ Cloud Platforms
    ├── AWS/GCP/Azure → Use Docker Production Setup
    └── VPS/Dedicated → Use Automated Production Deployment
```

## Prerequisites Validation

Before deployment, verify these requirements:

### For All Deployments

- [ ] **Git Repository Access**: Clone access to the project repository
- [ ] **Node.js Environment**: Version 18.x or higher
- [ ] **Environment Variables**: Supabase credentials and API keys ready

### For Production Deployments

- [ ] **Server Access**: Ubuntu 20.04+ server with sudo privileges
- [ ] **Network Access**: Open ports (80/443 for web, custom ports as needed)
- [ ] **Domain/IP**: Static IP address or configured domain name
- [ ] **External Services**:
  - Supabase project with database configured
  - SMTP service for email notifications (optional)
  - Anthropic API key for AI features (optional)

### Validation Commands

```bash
# Check Node.js version
node --version  # Should be v18.x or higher

# Check available ports
sudo netstat -tlnp | grep -E ":(80|443|3000|4000|4001)"

# Test server connectivity (for remote deployments)
ssh user@your-server-ip "echo 'Connection successful'"
```

## Port Configuration (Updated - TypeScript Migration)

The system uses the following port configuration for different environments:

- **Local Development (Current)**: 
  - Frontend: **3002** (PORT=3002)
  - Backend: **3001** (default Express port)
  - Supabase Local: 54321 (if using local instance)
- **Production**: 
  - Frontend: 4000 (default), Backend: 4001 (default)
  - Or custom ports as configured during deployment
- **Custom**: Ports can be configured during deployment

**Note**: The frontend now runs on port 3002 by default to avoid conflicts with other development services.

**Production Port Configuration:**
- Modify `config/nginx/nginx-production.conf` to change the frontend port
- Update environment variables for backend port configuration
- Use deployment script parameters: `./scripts/deployment/deploy-production.sh SERVER_IP USERNAME FRONTEND_PORT BACKEND_PORT`

## Deployment Methods

### 🐳 Docker Compose Setup (Recommended for Development)

**Use Case**: Local development with full stack including database

```bash
# 1. Clone repository
git clone <repository-url>
cd gep-partner-system

# 2. Set up environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Configure environment variables
# Edit .env and frontend/.env with your settings

# 4. Start full stack
docker-compose up -d

# 5. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Supabase Studio: http://localhost:54323
```

### 🚀 Automated Production Deployment

**Use Case**: Fresh production server, standard ports (80/443)

```bash
# 1. Prepare environment files locally
cp .env.production.example .env.production
cp frontend/.env.production.example frontend/.env.production

# 2. Edit environment files with your production values:
# - SUPABASE_URL=https://your-project-id.supabase.co
# - SUPABASE_ANON_KEY=your_anon_key
# - JWT_SECRET=generate_secure_random_string_here
# - CORS_ORIGIN=https://your-domain.com
# - SMTP credentials (if using email features)

# 3. Run deployment script
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh user@your-server-ip
```

**What the script does:**

- Installs system dependencies (Node.js, PM2, Nginx)
- Clones repository to `/var/www/gep`
- Sets up environment configuration
- Builds frontend and installs backend dependencies
- Configures PM2 for process management
- Sets up Nginx as reverse proxy
- Configures firewall and basic security

### ⚙️ Custom Port Deployment

**Use Case**: Server with existing services, need to use custom ports

```bash
# 1. Prepare environment files
cp .env.port4000.example .env
cp frontend/.env.port4000.example frontend/.env

# 2. Configure for custom port (example: port 4000)
# Edit .env:
# - PORT=4001 (backend internal port)
# - CORS_ORIGIN=http://your-domain.com:4000
# - FRONTEND_URL=http://your-domain.com:4000

# Edit frontend/.env:
# - REACT_APP_API_URL=http://your-domain.com:4000/api

# 3. Run custom port deployment
chmod +x scripts/deploy-port-4000.sh
./scripts/deploy-port-4000.sh user@your-server-ip
```

**Port Configuration:**

- Port 4000: Nginx (serves frontend + API proxy)
- Port 4001: Node.js backend (internal only)
- Existing services on ports 80, 443, 3000 remain untouched

### 🐳 Docker Production Setup

**Use Case**: Container-based production deployment

```bash
# 1. Configure production environment
cp docker-compose.prod.yml.example docker-compose.prod.yml
cp .env.docker.example .env

# 2. Edit environment variables in .env file

# 3. Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# 4. Set up SSL (if using domain)
./scripts/setup-ssl.sh your-domain.com
```

### 💻 Manual Development Setup (TypeScript)

**Use Case**: Local development with TypeScript support

```bash
# 1. Install dependencies (TypeScript included)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Set up local environment files
cp .env.development.example .env
cp frontend/.env.development.example frontend/.env

# 3. Start services separately with TypeScript
# Terminal 1: Backend (TypeScript with ts-node)
cd backend && npm run dev

# Terminal 2: Frontend (React with TypeScript)
cd frontend && PORT=3002 ESLINT_NO_DEV_ERRORS=true npm start

# Access: 
# - Frontend: http://localhost:3002
# - Backend API: http://localhost:3001
```

## Environment Configuration

### Environment File Templates

Create these files based on your deployment method:

**.env (Backend)**

```bash
# Database
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security
JWT_SECRET=your_super_secure_random_string_here
JWT_EXPIRES_IN=7d

# CORS (adjust based on your domain/port)
CORS_ORIGIN=https://your-domain.com

# Email (Optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_FROM_NAME=GEP Assignment System

# AI Features (Optional)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Logging
LOG_LEVEL=info
```

**frontend/.env (React + TypeScript)**

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api

# Database (same as backend)
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here

# Development Configuration
REACT_APP_ENV=development
PORT=3002
ESLINT_NO_DEV_ERRORS=true

# Production overrides
# REACT_APP_API_URL=https://your-domain.com/api
# REACT_APP_ENV=production
```

### Security Considerations

**🔒 JWT Secret Generation**

```bash
# Generate secure JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**🛡️ Environment Variables Security**

- Never commit `.env` files to version control
- Use `.env.example` templates without real credentials
- Rotate secrets regularly in production
- Use different secrets for development/staging/production

## Post-Deployment Configuration

### SSL Certificate Setup (Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (certbot sets this up automatically)
sudo systemctl enable certbot.timer
```

### Firewall Configuration

```bash
# Standard deployment (ports 80, 443)
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable

# Custom port deployment (add your custom port)
sudo ufw allow 4000    # Custom application port
```

### Monitoring Setup

```bash
# Check application status
pm2 status
pm2 logs gep-backend

# Monitor system resources
htop
df -h
free -m

# Set up log rotation
pm2 install pm2-logrotate
```

## Health Checks & Verification

### Application Health Endpoints

```bash
# Backend health check
curl http://localhost:3001/api/health
# Expected: {"status":"healthy","timestamp":"..."}

# Frontend accessibility
curl -I http://localhost:3000
# Expected: HTTP 200 status

# Database connectivity test
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/customers
# Expected: JSON response or authentication prompt
```

### Common Verification Steps (TypeScript Environment)

```bash
# 1. Check TypeScript compilation
cd backend && npm run type-check     # Backend TypeScript check
cd frontend && npx tsc --noEmit     # Frontend TypeScript check

# 2. Check all services are running
pm2 status                          # PM2 processes
sudo systemctl status nginx         # Nginx web server
docker-compose ps                   # Docker services (if using Docker)

# 3. Test port accessibility (updated ports)
netstat -tlnp | grep -E ":(3001|3002|4000|4001|80|443)"

# 4. Check logs for errors
pm2 logs gep-backend
tail -f /var/log/nginx/error.log

# 5. Test API endpoints
curl http://localhost:3001/api/health     # Local development
curl http://your-domain.com/api/health    # Production
curl http://localhost:3001/api/customers  # Test with auth

# 6. Verify TypeScript build
cd backend && npm run build              # Should compile without errors
cd frontend && npm run build             # Should build successfully
```

## Troubleshooting

### Common Issues & Solutions

#### 🔧 Port Conflicts (Updated for new ports)

```bash
# Find process using backend port
sudo lsof -i :3001

# Find process using frontend port
sudo lsof -i :3002

# Kill process if needed
sudo kill -9 [PID]

# Alternative: Change ports in environment files
# Backend: edit .env -> PORT=3011
# Frontend: edit package.json scripts or use PORT=3012 npm start
```

#### 🔧 PM2 Issues

```bash
# Restart application
pm2 restart gep-backend

# Reload PM2 configuration
pm2 reload ecosystem.config.js

# PM2 not starting on boot
pm2 startup systemd
pm2 save
```

#### 🔧 Nginx 502 Bad Gateway

```bash
# Check backend is running
pm2 status
curl http://localhost:3001/api/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx
```

#### 🔧 Database Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     "YOUR_SUPABASE_URL/rest/v1/customers?select=count"

# Verify environment variables
grep SUPABASE .env
```

#### 🔧 Build Failures

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check Node.js version compatibility
node --version  # Should be 18.x+
```

## Maintenance & Updates

### Application Updates

```bash
# 1. Pull latest changes
cd /var/www/gep
git pull origin main

# 2. Update backend dependencies (if package.json changed)
cd backend && npm ci --production

# 3. Rebuild frontend
cd ../frontend && npm ci && npm run build

# 4. Restart services
pm2 restart gep-backend
sudo systemctl reload nginx
```

### Backup Procedures

```bash
# Application backup
sudo tar -czf gep-backup-$(date +%Y%m%d).tar.gz /var/www/gep

# Environment backup (be careful with credentials)
cp .env .env.backup-$(date +%Y%m%d)

# Database backup (use Supabase dashboard for cloud database)
# For local PostgreSQL:
pg_dump your_database > gep-db-backup-$(date +%Y%m%d).sql
```

### Performance Optimization

```bash
# Enable Nginx gzip compression (already in configs)
# Monitor PM2 processes
pm2 monit

# Optimize database queries (check slow query logs in Supabase)
# Set up CDN for static assets (Cloudflare recommended)
```

## Deployment Checklists

### ✅ Pre-Deployment Checklist

- [ ] Environment variables configured and secure
- [ ] External services (Supabase, SMTP) set up and tested
- [ ] SSL certificates ready (for production)
- [ ] Firewall rules configured
- [ ] Server resources adequate (2GB+ RAM, 20GB+ disk)
- [ ] Domain DNS configured (if applicable)

### ✅ Post-Deployment Checklist

- [ ] Application accessible via web browser
- [ ] API endpoints responding correctly
- [ ] Database connectivity working
- [ ] PM2 processes running and auto-starting
- [ ] Nginx serving files and proxying API
- [ ] SSL certificate installed and redirects working
- [ ] Email notifications working (if configured)
- [ ] Logs being written correctly
- [ ] Backup procedures documented and tested

---

## Need Help?

**Quick Commands Reference:**

```bash
# Application Status
pm2 status && sudo systemctl status nginx

# View Logs
pm2 logs gep-backend
tail -f /var/log/nginx/error.log

# Restart Everything
pm2 restart all && sudo systemctl reload nginx

# Emergency Stop
pm2 stop all && sudo systemctl stop nginx
```

**Support Resources:**

1. Check application logs first: `pm2 logs gep-backend`
2. Verify environment configuration: `grep -v '^#' .env`
3. Test database connectivity: `curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"`
4. Monitor server resources: `htop` and `df -h`

*This deployment guide provides comprehensive coverage for all deployment scenarios while maintaining security best practices.*
