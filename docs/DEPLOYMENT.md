# GEP Partner System - Deployment Guide

## Deployment Overview

The GEP Partner System supports multiple deployment strategies, from local development to production cloud deployments. This guide consolidates all deployment information and best practices.

## Deployment Architectures

### Local Development
- **Docker Compose**: Complete stack with Supabase local instance
- **Native Setup**: Individual service startup for development

### Production Deployment
- **Single Server**: Ubuntu 20.04+ with PM2 process management
- **Cloud Native**: Docker containers with orchestration
- **Hybrid**: Managed database (Supabase) + self-hosted application

## Quick Deployment (Recommended)

### Prerequisites Checklist

Before deployment, ensure you have:

- [ ] **Server Environment**
  - Ubuntu Server 20.04+ or similar Linux distribution
  - Minimum 2GB RAM, 20GB disk space
  - Root or sudo access
  - Static IP address or domain name

- [ ] **External Services**
  - Supabase project with database configured
  - SendGrid account for email services (optional)
  - Anthropic API key for AI features

- [ ] **Local Setup**
  - Git installed and repository access
  - SSH access to target server
  - Environment files configured

### Automated Deployment Script

The fastest production deployment method:

```bash
# 1. Clone repository locally
git clone https://github.com/mikedrai/gep-partner-system.git
cd gep-partner-system

# 2. Configure production environment
cp .env.production.port4000 .env
cp frontend/.env.production.port4000 frontend/.env

# Edit environment files with your credentials:
# - Supabase URL and keys
# - JWT secret (generate secure random string)
# - SendGrid API key
# - Domain/IP address

# 3. Make deploy script executable and run
chmod +x deploy-port-4000.sh
./deploy-port-4000.sh YOUR_SERVER_IP
```

This script handles:
- System dependencies installation (Node.js, PM2, Nginx)
- Application deployment and build
- Service configuration and startup
- Nginx proxy setup
- Basic security configuration

## Manual Production Deployment

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies
sudo apt install -y nginx git python3 python3-pip certbot python3-certbot-nginx

# Install PM2 process manager globally
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/gep
sudo chown -R $USER:$USER /var/www/gep
```

### Step 2: Application Deployment

```bash
# Clone and setup application
cd /var/www
git clone https://github.com/mikedrai/gep-partner-system.git gep
cd gep

# Configure environment variables
cp .env.production.port4000 .env
cp frontend/.env.production.port4000 frontend/.env

# IMPORTANT: Edit .env files with your actual credentials
nano .env
nano frontend/.env
```

### Step 3: Backend Setup

```bash
# Install backend dependencies
cd /var/www/gep/backend
npm ci --production

# Create logs directory
mkdir -p logs

# Test backend startup
npm start
# Verify it starts without errors, then stop (Ctrl+C)
```

### Step 4: Frontend Build

```bash
# Build frontend for production
cd /var/www/gep/frontend
npm ci
npm run build

# Verify build completed successfully
ls -la build/
```

### Step 5: Process Management with PM2

```bash
# Configure PM2 ecosystem
cd /var/www/gep

# Create PM2 configuration (ecosystem.port4000.config.js)
cat > ecosystem.port4000.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gep-backend',
    script: './backend/src/server.js',
    cwd: '/var/www/gep',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4001
    },
    error_file: './logs/backend-err.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.port4000.config.js --env production

# Save PM2 process list and configure startup
pm2 save
pm2 startup systemd
# Follow the instructions to run the generated command

# Verify application is running
pm2 status
pm2 logs gep-backend
```

### Step 6: Nginx Configuration

```bash
# Create Nginx site configuration
sudo tee /etc/nginx/sites-available/gep << 'EOF'
server {
    listen 4000;
    server_name _;
    
    # Serve React frontend
    location / {
        root /var/www/gep/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/gep /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Security Configuration

```bash
# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 4000  # Application port
sudo ufw allow 80    # HTTP (for SSL verification)
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Optional: Setup SSL with Let's Encrypt (if using domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Secure SSH (optional but recommended)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

## Docker Deployment

### Docker Compose Production Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    environment:
      - REACT_APP_API_URL=http://localhost:4001
      # Add other production env vars

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=4001
      # Add production env vars from .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "4000:4000"
    volumes:
      - ./nginx-prod.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/build:/usr/share/nginx/html
    depends_on:
      - backend
    restart: unless-stopped
```

### Deploy with Docker

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

## Environment Variables Reference

### Production Environment Template

```bash
# .env (Backend)
NODE_ENV=production
PORT=4001

# Database (Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=your_super_secure_random_string_here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://your-domain.com:4000

# Email Service
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# AI Integration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Logging
LOG_LEVEL=info
```

```bash
# frontend/.env (React)
REACT_APP_API_URL=http://your-domain.com:4000/api
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_ENVIRONMENT=production
```

## Monitoring & Maintenance

### Health Checks

```bash
# Application health endpoint
curl http://localhost:4000/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}

# PM2 monitoring
pm2 status
pm2 monit
```

### Log Management

```bash
# View application logs
pm2 logs gep-backend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Rotate logs
pm2 flush  # Clear PM2 logs
sudo logrotate -f /etc/logrotate.conf  # Rotate system logs
```

### Performance Monitoring

```bash
# System resources
htop
df -h
free -m

# Application metrics
curl http://localhost:4001/api/analytics/dashboard

# Database performance (if using local PostgreSQL)
# Connect to Supabase dashboard for cloud monitoring
```

### Backup Strategies

```bash
# Application backup
tar -czf gep-backup-$(date +%Y%m%d).tar.gz /var/www/gep

# Database backup (Supabase handles this automatically)
# Use Supabase dashboard for manual backups
```

## Troubleshooting

### Common Issues & Solutions

#### Application Won't Start

```bash
# Check PM2 status
pm2 status
pm2 logs gep-backend

# Common fixes:
# 1. Check environment variables
# 2. Verify database connectivity
# 3. Check port availability
sudo lsof -i :4001
```

#### 502 Bad Gateway (Nginx)

```bash
# Check backend service
pm2 status
curl http://localhost:4001/api/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

#### Database Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" "YOUR_SUPABASE_URL/rest/v1/customers?select=count"

# Check environment variables
grep SUPABASE /var/www/gep/.env
```

#### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Update Deployment

```bash
# Pull latest changes
cd /var/www/gep
git pull origin main

# Update backend
cd backend
npm ci --production

# Rebuild frontend
cd ../frontend
npm ci
npm run build

# Restart services
pm2 restart gep-backend
sudo systemctl reload nginx
```

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] SSL certificates ready (if using HTTPS)
- [ ] Database migrations applied
- [ ] External services configured (SendGrid, Anthropic)

### Post-deployment
- [ ] Health checks passing
- [ ] PM2 processes running
- [ ] Nginx serving correctly
- [ ] SSL redirect working (if applicable)
- [ ] Logs are being written
- [ ] Backup strategy implemented

### Performance Optimization
- [ ] Gzip compression enabled
- [ ] Static assets cached
- [ ] Database queries optimized
- [ ] CDN configured (if applicable)

---

*This deployment guide ensures reliable, secure, and scalable deployment of the GEP Partner System in production environments.*