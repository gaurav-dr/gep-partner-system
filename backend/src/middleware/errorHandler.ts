import { Request, Response, NextFunction } from 'express';
import { Logger } from '../types';

const logger: Logger = require('../utils/logger');

interface CustomError extends Error {
  status?: number;
  code?: string;
  isJoi?: boolean;
  details?: Array<{ message: string }>;
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Supabase errors
  if (err.code && err.message) {
    res.status(400).json({
      error: 'Database operation failed',
      details: err.message,
      code: err.code
    });
    return;
  }

  // Validation errors (Joi)
  if (err.isJoi && err.details) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.details.map(detail => detail.message)
    });
    return;
  }

  // Default error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

export default errorHandler;