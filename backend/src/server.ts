import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';

// Import utilities and middleware
import { Logger } from './types';
import errorHandler from './middleware/errorHandler';
import { securityHeaders, apiRateLimit, sanitizeInput } from './middleware/validation';
const logger: Logger = require('./utils/logger');

// Import routes
import authRoutes from './routes/auth';
import customerRequestsRoutes from './routes/customerRequests';
import partnersRoutes from './routes/partners';
import optimizationRoutes from './routes/optimization';

// Import remaining JavaScript routes
const assignmentsRoutes = require('./routes/assignments');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3001');

// Security middleware
app.use(securityHeaders);
app.use(compression());

// CORS configuration with enhanced security
const corsOrigins: string[] = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3002'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Request parsing with size limits
app.use(express.json({ 
  limit: '1mb',
  verify: (req: Request, res: Response, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: false, 
  limit: '1mb',
  parameterLimit: 50
}));

// Input sanitization
app.use(sanitizeInput);

// Global rate limiting
app.use(apiRateLimit);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customer-requests', customerRequestsRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Static files for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Handle React routing
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  });
}

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`GEP Backend API started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT.toString()
  });
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server error:', error);
  }
  process.exit(1);
});

export default app;