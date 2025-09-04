#!/usr/bin/env node

/**
 * Frontend Health Check Script
 * Standalone script to verify the React application is properly deployed and accessible
 * Can be run independently or as part of CI/CD pipeline
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || 'http://localhost:8000',
  TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 10000,
  RETRY_COUNT: parseInt(process.env.HEALTH_CHECK_RETRIES) || 3,
  RETRY_DELAY: parseInt(process.env.HEALTH_CHECK_RETRY_DELAY) || 2000,
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: CONFIG.TIMEOUT,
      headers: {
        'User-Agent': 'GEP-Health-Check/1.0',
        'Accept': 'text/html,application/json,*/*',
        ...options.headers,
      },
    };

    const req = requestModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${CONFIG.TIMEOUT}ms`));
    });

    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

// Retry mechanism
async function withRetry(operation, description) {
  for (let attempt = 1; attempt <= CONFIG.RETRY_COUNT; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      if (attempt === CONFIG.RETRY_COUNT) {
        log.error(`${description} failed after ${CONFIG.RETRY_COUNT} attempts: ${error.message}`);
        throw error;
      } else {
        log.warning(`${description} attempt ${attempt}/${CONFIG.RETRY_COUNT} failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      }
    }
  }
}

// Health check tests
const healthChecks = {
  async checkFrontendAvailability() {
    log.info(`Checking frontend availability at ${CONFIG.FRONTEND_URL}`);
    
    const response = await makeRequest(CONFIG.FRONTEND_URL);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data.includes('<!DOCTYPE html>') && !response.data.includes('<html')) {
      throw new Error('Response does not appear to be HTML');
    }
    
    log.success('Frontend is accessible and serving HTML content');
    return true;
  },

  async checkStaticAssets() {
    log.info('Checking static assets are served');
    
    const assetPaths = [
      '/static/css/',
      '/static/js/',
      '/favicon.ico',
      '/manifest.json',
    ];
    
    let assetsFound = 0;
    
    for (const assetPath of assetPaths) {
      try {
        const response = await makeRequest(`${CONFIG.FRONTEND_URL}${assetPath}`);
        if (response.statusCode === 200 || response.statusCode === 304) {
          assetsFound++;
          log.success(`Asset ${assetPath} is accessible`);
        }
      } catch (error) {
        // Some assets may not exist depending on build, that's okay
        log.warning(`Asset ${assetPath} not accessible: ${error.message}`);
      }
    }
    
    if (assetsFound === 0) {
      throw new Error('No static assets are accessible');
    }
    
    log.success(`${assetsFound}/${assetPaths.length} static assets are accessible`);
    return true;
  },

  async checkReactAppBundle() {
    log.info('Checking React app bundle');
    
    try {
      const response = await makeRequest(CONFIG.FRONTEND_URL);
      
      // Check for React indicators in the HTML
      const reactIndicators = [
        'react',
        'ReactDOM',
        'root',
        'App',
        'static/js/',
      ];
      
      const foundIndicators = reactIndicators.filter(indicator => 
        response.data.toLowerCase().includes(indicator.toLowerCase())
      );
      
      if (foundIndicators.length === 0) {
        log.warning('No React indicators found in HTML - may be loading dynamically');
      } else {
        log.success(`React app bundle loaded (found indicators: ${foundIndicators.join(', ')})`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to check React bundle: ${error.message}`);
    }
  },

  async checkAPIConnectivity() {
    log.info(`Checking backend API connectivity at ${CONFIG.API_URL}`);
    
    try {
      const response = await makeRequest(`${CONFIG.API_URL}/health`);
      
      if (response.statusCode === 200) {
        log.success('Backend API is accessible');
        return true;
      } else if (response.statusCode === 404) {
        log.warning('Backend API health endpoint not found, trying root');
        const rootResponse = await makeRequest(CONFIG.API_URL);
        if (rootResponse.statusCode < 500) {
          log.success('Backend API root is accessible');
          return true;
        }
      }
      
      throw new Error(`API returned status ${response.statusCode}`);
    } catch (error) {
      log.warning(`Backend API not accessible: ${error.message}`);
      log.info('This may be expected if backend is not deployed or configured differently');
      return false; // Non-critical for frontend health
    }
  },

  async checkSupabaseConnectivity() {
    log.info(`Checking Supabase connectivity at ${CONFIG.SUPABASE_URL}`);
    
    try {
      const response = await makeRequest(`${CONFIG.SUPABASE_URL}/health`);
      
      if (response.statusCode === 200) {
        log.success('Supabase is accessible');
        return true;
      } else {
        log.warning('Supabase health endpoint returned non-200, trying REST API');
        const restResponse = await makeRequest(`${CONFIG.SUPABASE_URL}/rest/v1/`);
        if (restResponse.statusCode < 500) {
          log.success('Supabase REST API is accessible');
          return true;
        }
      }
      
      throw new Error(`Supabase returned status ${response.statusCode}`);
    } catch (error) {
      log.warning(`Supabase not accessible: ${error.message}`);
      log.info('This may be expected if Supabase is not deployed or configured differently');
      return false; // Non-critical for basic frontend health
    }
  },

  async checkEnvironmentConfig() {
    log.info('Checking environment configuration');
    
    const requiredEnvVars = [
      'REACT_APP_SUPABASE_URL',
      'REACT_APP_SUPABASE_ANON_KEY',
    ];
    
    const optionalEnvVars = [
      'REACT_APP_API_URL',
      'REACT_APP_ENVIRONMENT',
    ];
    
    let configValid = true;
    
    // Check required variables
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        log.success(`${envVar} is configured`);
      } else {
        log.error(`${envVar} is missing`);
        configValid = false;
      }
    }
    
    // Check optional variables
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        log.success(`${envVar} is configured`);
      } else {
        log.warning(`${envVar} is not set (optional)`);
      }
    }
    
    if (!configValid) {
      throw new Error('Required environment variables are missing');
    }
    
    log.success('Environment configuration is valid');
    return true;
  },

  async checkBuildArtifacts() {
    log.info('Checking build artifacts');
    
    const buildDir = path.join(__dirname, '../../build');
    
    if (!fs.existsSync(buildDir)) {
      log.warning('Build directory not found - may be running in development mode');
      return true; // Not critical in development
    }
    
    const criticalFiles = [
      'index.html',
      'static/css',
      'static/js',
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(buildDir, file);
      if (fs.existsSync(filePath)) {
        log.success(`Build artifact ${file} exists`);
      } else {
        log.error(`Build artifact ${file} missing`);
        throw new Error(`Critical build artifact ${file} is missing`);
      }
    }
    
    log.success('All critical build artifacts are present');
    return true;
  },
};

// Main health check runner
async function runHealthChecks() {
  log.header('🏥 GEP Frontend Health Check');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    total: 0,
  };
  
  const checks = [
    { name: 'Environment Configuration', fn: healthChecks.checkEnvironmentConfig, critical: true },
    { name: 'Build Artifacts', fn: healthChecks.checkBuildArtifacts, critical: false },
    { name: 'Frontend Availability', fn: healthChecks.checkFrontendAvailability, critical: true },
    { name: 'Static Assets', fn: healthChecks.checkStaticAssets, critical: true },
    { name: 'React App Bundle', fn: healthChecks.checkReactAppBundle, critical: true },
    { name: 'API Connectivity', fn: healthChecks.checkAPIConnectivity, critical: false },
    { name: 'Supabase Connectivity', fn: healthChecks.checkSupabaseConnectivity, critical: false },
  ];
  
  for (const check of checks) {
    results.total++;
    log.info(`Running: ${check.name}`);
    
    try {
      const result = await withRetry(check.fn, check.name);
      if (result === false) {
        results.warnings++;
        log.warning(`${check.name} completed with warnings`);
      } else {
        results.passed++;
        log.success(`${check.name} passed`);
      }
    } catch (error) {
      results.failed++;
      log.error(`${check.name} failed: ${error.message}`);
      
      if (check.critical) {
        log.error(`Critical check failed: ${check.name}`);
        throw error;
      }
    }
    
    console.log(''); // Add spacing between checks
  }
  
  return results;
}

// Summary and exit
async function main() {
  const startTime = Date.now();
  
  try {
    const results = await runHealthChecks();
    const duration = Date.now() - startTime;
    
    log.header('📊 Health Check Summary');
    log.info(`Total checks: ${results.total}`);
    log.success(`Passed: ${results.passed}`);
    
    if (results.warnings > 0) {
      log.warning(`Warnings: ${results.warnings}`);
    }
    
    if (results.failed > 0) {
      log.error(`Failed: ${results.failed}`);
    }
    
    log.info(`Duration: ${duration}ms`);
    
    if (results.failed === 0) {
      log.success('🎉 All critical health checks passed!');
      log.info('Frontend application appears to be healthy and ready for use.');
      process.exit(0);
    } else {
      log.error('❌ Some critical health checks failed.');
      log.info('Frontend application may not be functioning correctly.');
      process.exit(1);
    }
    
  } catch (error) {
    log.error('💥 Health check failed with critical error:');
    log.error(error.message);
    log.info('Frontend application is not healthy.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runHealthChecks,
  healthChecks,
  CONFIG,
};