import { Request, Response, NextFunction } from 'express';
import { Logger, User } from '../types';

const logger: Logger = require('../utils/logger');
import AuthService from '../services/AuthService';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ 
                error: 'Access denied. No valid token provided.',
                code: 'NO_TOKEN'
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token and get user data
        const user = await AuthService.verifyToken(token);
        
        // Add user to request object for use in route handlers
        req.user = user;
        
        // Set user context for audit logging
        req.headers['x-user-id'] = user.id;
        req.headers['x-user-email'] = user.email;
        req.headers['x-user-role'] = user.role;

        next();

    } catch (error) {
        logger.error('Authentication error:', { error: error instanceof Error ? error.message : String(error) });
        
        res.status(401).json({ 
            error: 'Access denied. Invalid or expired token.',
            code: 'INVALID_TOKEN'
        });
        return;
    }
};

/**
 * Authorization middleware factory - checks if user has required role(s)
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }

            // Admin role has access to everything
            if (req.user.role === 'admin') {
                return next();
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(req.user.role)) {
                logger.warn('Access denied for user', {
                email: req.user.email,
                role: req.user.role,
                requiredRoles: allowedRoles.join(', ')
            });
                
                res.status(403).json({ 
                    error: 'Access denied. Insufficient permissions.',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required_roles: allowedRoles,
                    user_role: req.user.role
                });
                return;
            }

            next();

        } catch (error) {
            logger.error('Authorization error:', { error: error instanceof Error ? error.message : String(error) });
            res.status(500).json({ 
                error: 'Authorization check failed',
                code: 'AUTHORIZATION_ERROR'
            });
            return;
        }
    };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string, resourceType: string | null = null) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }

            // Extract resource ID from request parameters
            const resourceId = req.params.id || req.params.partnerId || req.params.scheduleId;

            // Check if user has the required permission
            const hasPermission = await AuthService.hasPermission(
                req.user.id, 
                permission, 
                resourceType, 
                resourceId
            );

            if (!hasPermission) {
                logger.warn('Permission denied for user', {
                    email: req.user.email,
                    requiredPermission: permission
                });
                
                res.status(403).json({ 
                    error: 'Access denied. Required permission not found.',
                    code: 'PERMISSION_DENIED',
                    required_permission: permission
                });
                return;
            }

            next();

        } catch (error) {
            logger.error('Permission check error:', { error: error instanceof Error ? error.message : String(error) });
            res.status(500).json({ 
                error: 'Permission check failed',
                code: 'PERMISSION_CHECK_ERROR'
            });
            return;
        }
    };
};

/**
 * Resource ownership middleware - ensures user can only access their own resources
 */
export const requireOwnership = (resourceType: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }

            // Admin can access any resource
            if (req.user.role === 'admin') {
                return next();
            }

            // Manager can access resources within their scope
            if (req.user.role === 'manager') {
                return next();
            }

            // Check resource ownership based on type
            switch (resourceType) {
                case 'partner':
                    if (req.user.role !== 'partner' || req.user.partner_id !== req.params.partnerId) {
                        res.status(403).json({ 
                            error: 'Access denied. You can only access your own partner resources.',
                            code: 'OWNERSHIP_VIOLATION'
                        });
                        return;
                    }
                    break;

                case 'schedule':
                    // Additional check needed - will be implemented in schedule routes
                    break;

                case 'client':
                    if (req.user.role !== 'client' || req.user.client_company_code !== req.params.clientCode) {
                        res.status(403).json({ 
                            error: 'Access denied. You can only access your own client resources.',
                            code: 'OWNERSHIP_VIOLATION'
                        });
                        return;
                    }
                    break;

                default:
                    res.status(400).json({ 
                        error: 'Invalid resource type for ownership check',
                        code: 'INVALID_RESOURCE_TYPE'
                    });
                    return;
            }

            next();

        } catch (error) {
            logger.error('Ownership check error:', { error: error instanceof Error ? error.message : String(error) });
            res.status(500).json({ 
                error: 'Ownership check failed',
                code: 'OWNERSHIP_CHECK_ERROR'
            });
            return;
        }
    };
};

/**
 * Schedule access middleware - complex authorization for schedule resources
 */
export const requireScheduleAccess = (accessType: 'read' | 'write' = 'read') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
                return;
            }

            // Admin has full access
            if (req.user.role === 'admin') {
                return next();
            }

            // Manager has read/write access to all schedules
            if (req.user.role === 'manager') {
                return next();
            }

            const scheduleId = req.params.scheduleId || req.params.id;
            
            if (req.user.role === 'partner') {
                // Partners can only access their own schedules
                const { supabaseAdmin } = require('../config/supabase');
                const { data: schedule } = await supabaseAdmin
                    .from('schedules')
                    .select('partner_id, status')
                    .eq('id', scheduleId)
                    .single();

                if (!schedule || schedule.partner_id !== req.user.partner_id) {
                    res.status(403).json({ 
                        error: 'Access denied. You can only access your own schedules.',
                        code: 'SCHEDULE_ACCESS_DENIED'
                    });
                    return;
                }

                // Check access type restrictions for partners
                if (accessType === 'write' && schedule.status === 'locked') {
                    res.status(403).json({ 
                        error: 'Access denied. Cannot modify locked schedules.',
                        code: 'SCHEDULE_LOCKED'
                    });
                    return;
                }
            }

            if (req.user.role === 'client') {
                // Clients can only view schedules for their installations
                const { supabaseAdmin } = require('../config/supabase');
                const { data: schedule } = await supabaseAdmin
                    .from('schedules')
                    .select(`
                        installations!inner(company_code)
                    `)
                    .eq('id', scheduleId)
                    .single();

                if (!schedule || schedule.installations.company_code !== req.user.client_company_code) {
                    res.status(403).json({ 
                        error: 'Access denied. You can only view schedules for your installations.',
                        code: 'SCHEDULE_ACCESS_DENIED'
                    });
                    return;
                }

                // Clients have read-only access
                if (accessType === 'write') {
                    res.status(403).json({ 
                        error: 'Access denied. Clients have read-only access to schedules.',
                        code: 'READ_ONLY_ACCESS'
                    });
                    return;
                }
            }

            next();

        } catch (error) {
            logger.error('Schedule access check error:', { error: error instanceof Error ? error.message : String(error) });
            res.status(500).json({ 
                error: 'Schedule access check failed',
                code: 'SCHEDULE_ACCESS_ERROR'
            });
            return;
        }
    };
};

/**
 * Rate limiting middleware per user
 */
export const userRateLimit = (maxRequests: number = 100, windowMs: number = 900000) => { // 15 minutes default
    const userRequestCounts = new Map<string, number[]>();

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (userRequestCounts.has(userId)) {
            const userRequests = userRequestCounts.get(userId)!;
            userRequestCounts.set(userId, userRequests.filter(time => time > windowStart));
        }

        // Get current request count
        const currentRequests = userRequestCounts.get(userId) || [];
        
        if (currentRequests.length >= maxRequests) {
            logger.warn('Rate limit exceeded for user', {
                email: req.user.email
            });
            res.status(429).json({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(windowMs / 1000)
            });
            return;
        }

        // Add current request
        currentRequests.push(now);
        userRequestCounts.set(userId, currentRequests);

        next();
    };
};

/**
 * Audit logging middleware
 */
export const auditLog = (action: string, entityType: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Store original res.json to capture response data
        const originalJson = res.json.bind(res);
        
        res.json = function(data: any): Response {
            // Log the action after successful response
            if (res.statusCode < 400) {
                const auditData = {
                    action,
                    entityType,
                    entityId: req.params.id || req.body.id,
                    userId: req.user?.id,
                    userEmail: req.user?.email,
                    userRole: req.user?.role,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    requestId: (req as any).id, // If using request ID middleware
                    oldValues: req.originalBody, // Set by route handlers when updating
                    newValues: req.body
                };

                // Log to audit system (implement as needed)
                logger.info('Audit log entry', auditData);
            }

            // Call original json method and return its result
            return originalJson(data);
        };

        next();
    };
};

/**
 * Development mode bypass (for testing only)
 */
export const devBypass = (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
        // Create mock admin user for development
        req.user = {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'dev@gep.com',
            role: 'admin',
            first_name: 'Dev',
            last_name: 'User',
            is_active: true,
            email_verified: true,
            created_at: new Date().toISOString()
        };
        
        logger.warn('DEVELOPMENT MODE: Authentication bypassed');
    }
    
    next();
};