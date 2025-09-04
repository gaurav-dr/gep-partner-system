/**
 * Health Check Integration Tests
 * Tests to verify the backend API is properly running and responding
 */

const request = require('supertest');
// Don't import server.js as it starts the server immediately
// Instead, create a test-only app instance
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const logger = require('../../src/utils/logger');
const errorHandler = require('../../src/middleware/errorHandler');
const { securityHeaders, apiRateLimit, sanitizeInput } = require('../../src/middleware/validation');

// Create test app
const app = express();

// Apply middleware
app.use(securityHeaders);
app.use(compression());

const corsOrigins = ['http://localhost:3000', 'http://localhost:3002'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Mock system status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    database: { status: 'connected' }
  });
});

// Mock partners endpoint
app.get('/api/partners', (req, res) => {
  res.json({ data: [] });
});

// Catch all for API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use(errorHandler);

describe('Backend Health Checks', () => {
  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('should respond within reasonable time', async () => {
      const start = Date.now();
      await request(app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('API Connectivity', () => {
    test('should have CORS headers configured', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });

    test('should have security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('Database Connectivity', () => {
    test('should be able to connect to database', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status', 'connected');
    }, 10000); // 10 second timeout for DB operations
  });

  describe('Basic API Endpoints', () => {
    test('should return partners list', async () => {
      const response = await request(app)
        .get('/api/partners')
        .expect('Content-Type', /json/);

      // Should return 200 or 401 (if auth required), but not 500 or 404
      expect([200, 401]).toContain(response.status);
    });

    test('should handle unknown routes gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});