# Self-Hosted GitHub Actions Runner Setup

This guide will help you set up a self-hosted GitHub Actions runner on your local machine to enable automatic deployments when code is pushed to the `dev` branch.

## Prerequisites

- Docker and Docker Compose installed on your local machine
- Node.js 18+ installed
- Git configured with access to the repository

## Setup Steps

### 1. Create Self-Hosted Runner

1. Go to your GitHub repository: `https://github.com/gaurav-dr/gep-partner-system`
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **"New self-hosted runner"**
4. Select your operating system (macOS, Linux, or Windows)
5. Follow the download and configuration instructions provided by GitHub

### 2. Configure Runner for macOS/Linux

```bash
# Download the runner (replace with the actual download link from GitHub)
mkdir actions-runner && cd actions-runner
curl -o actions-runner-osx-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-osx-x64-2.311.0.tar.gz
tar xzf ./actions-runner-osx-x64-2.311.0.tar.gz

# Configure the runner (use the token provided by GitHub)
./config.sh --url https://github.com/gaurav-dr/gep-partner-system --token YOUR_GITHUB_TOKEN

# Optional: Install as a service (recommended)
sudo ./svc.sh install
sudo ./svc.sh start
```

### 3. Configure Runner for Windows

```powershell
# Download and extract the runner
# Configure using the instructions provided by GitHub
.\config.cmd --url https://github.com/gaurav-dr/gep-partner-system --token YOUR_GITHUB_TOKEN

# Install as service
.\svc.sh install
.\svc.sh start
```

### 4. Verify Runner Setup

1. Go back to **Settings** → **Actions** → **Runners** in your GitHub repository
2. You should see your runner listed with a green "Idle" status
3. The runner should show as "Active" and ready to accept jobs

## How the CI/CD Works

Once the self-hosted runner is set up, here's what happens when you push to the `dev` branch:

### 1. Automated Testing
- **Frontend tests**: Runs Jest tests with coverage
- **Backend tests**: Runs all backend unit and integration tests
- **Linting**: Checks code quality and formatting

### 2. Local Deployment
- **Stops existing containers**: Cleans up any running development containers
- **Builds new images**: Uses `docker-compose.dev.yml` for optimized development build
- **Health checks**: Verifies all services are running correctly
- **Integration tests**: Tests API endpoints and database connectivity

### 3. Service URLs
After successful deployment, your application will be available at:
- **Application**: http://localhost:3001
- **Supabase Studio**: http://localhost:3010  
- **Database**: localhost:5433
- **Redis**: localhost:6380

## Troubleshooting

### Runner Not Starting
```bash
# Check runner status
./run.sh

# Check logs
tail -f _diag/Runner_*.log
```

### Port Conflicts
If you get port conflicts, you can modify the ports in `docker-compose.dev.yml`:
```yaml
# Change these ports if needed
ports:
  - "3002:3001"  # Change frontend port
  - "5434:5432"  # Change database port
  - "6381:6379"  # Change Redis port
```

### Permission Issues
```bash
# Give execute permissions to scripts
chmod +x scripts/deploy-dev.sh

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

### Cleanup Failed Deployments
```bash
# Clean up manually if deployment fails
docker-compose -f docker-compose.dev.yml --env-file .env.dev down --remove-orphans
docker system prune -f

# Restart the deployment
./scripts/deploy-dev.sh
```

## Manual Deployment

If you want to deploy manually without waiting for a push:

```bash
# Run the deployment script directly
./scripts/deploy-dev.sh

# Or use docker-compose directly
docker-compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
```

## Security Considerations

### Runner Security
- The self-hosted runner runs on your local machine
- Only enable it for trusted repositories
- Consider using a dedicated development machine or VM
- Regularly update the runner software

### Environment Variables
- Sensitive environment variables are stored in `.env.dev`
- Never commit real API keys or passwords to the repository
- Use GitHub Secrets for sensitive data if needed

## Monitoring Deployments

### View Deployment Status
- Go to **Actions** tab in your GitHub repository
- Click on the latest workflow run to see detailed logs
- Monitor the deployment progress in real-time

### Local Monitoring
```bash
# View running containers
docker-compose -f docker-compose.dev.yml --env-file .env.dev ps

# View logs
docker-compose -f docker-compose.dev.yml --env-file .env.dev logs -f app

# Check health
curl http://localhost:3001/health
```

## Next Steps

1. Set up the self-hosted runner using the steps above
2. Push a commit to the `dev` branch to test the deployment
3. Monitor the Actions tab to see the deployment progress
4. Access your application at http://localhost:3001

The CI/CD pipeline will now automatically deploy your application whenever you push changes to the `dev` branch!