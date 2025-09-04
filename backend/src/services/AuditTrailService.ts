import { Logger, User } from '../types';
import { supabaseAdmin } from '../config/supabase';

const logger: Logger = require('../utils/logger');

interface AuditEntry {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  level: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

interface AuditQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  level?: number;
  page?: number;
  limit?: number;
}

interface AuditReport {
  entries: AuditEntry[];
  summary: {
    totalEntries: number;
    actionBreakdown: Record<string, number>;
    entityBreakdown: Record<string, number>;
    userBreakdown: Record<string, number>;
    timeRange: { start: Date; end: Date };
  };
}

/**
 * Audit Trail Service
 * Comprehensive change management and audit logging system
 * Tracks all system changes, user actions, and data modifications
 * Provides compliance reporting and forensic analysis capabilities
 */
class AuditTrailService {
    private auditLevels: Record<string, number>;
    private actionTypes: Record<string, string>;
    private entityTypes: Record<string, string>;

    constructor() {
        this.auditLevels = {
            LOW: 1,
            MEDIUM: 2,
            HIGH: 3,
            CRITICAL: 4
        };

        this.actionTypes = {
            CREATE: 'create',
            READ: 'read',
            UPDATE: 'update',
            DELETE: 'delete',
            LOGIN: 'login',
            LOGOUT: 'logout',
            APPROVE: 'approve',
            REJECT: 'reject',
            ASSIGN: 'assign',
            EXPORT: 'export',
            IMPORT: 'import',
            SYSTEM: 'system'
        };

        this.entityTypes = {
            USER: 'user',
            PARTNER: 'partner',
            INSTALLATION: 'installation',
            CONTRACT: 'contract',
            SCHEDULE: 'schedule',
            VISIT: 'visit',
            CUSTOMER_REQUEST: 'customer_request',
            ASSIGNMENT: 'assignment',
            OPTIMIZATION: 'optimization',
            SYSTEM_SETTING: 'system_setting',
            NOTIFICATION: 'notification'
        };
    }

    /**
     * Log audit entry
     */
    async logAudit(entry: AuditEntry): Promise<void> {
        try {
            // Set default level if not specified
            if (!entry.level) {
                entry.level = this.determineAuditLevel(entry.action, entry.entityType);
            }

            // Prepare audit entry for database
            const auditData = {
                user_id: entry.userId || null,
                action: entry.action,
                entity_type: entry.entityType,
                entity_id: entry.entityId || null,
                old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
                new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
                metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
                level: entry.level,
                ip_address: entry.ipAddress || null,
                user_agent: entry.userAgent || null,
                session_id: entry.sessionId || null,
                created_at: new Date().toISOString()
            };

            // Insert audit entry
            const { error } = await supabaseAdmin
                .from('audit_trail')
                .insert([auditData]);

            if (error) {
                throw new Error(`Failed to log audit entry: ${error.message}`);
            }

            // Log to application logger for critical entries
            if (entry.level >= this.auditLevels.HIGH) {
                logger.warn('Critical audit event', {
                    action: entry.action,
                    entityType: entry.entityType,
                    entityId: entry.entityId,
                    userId: entry.userId
                });
            }

        } catch (error) {
            logger.error('Failed to log audit entry:', { 
                error: error instanceof Error ? error.message : String(error),
                entry: JSON.stringify(entry)
            });
            // Don't throw - audit failures shouldn't break business operations
        }
    }

    /**
     * Log user login
     */
    async logLogin(userId: string, ipAddress?: string, userAgent?: string, sessionId?: string): Promise<void> {
        await this.logAudit({
            userId,
            action: this.actionTypes.LOGIN,
            entityType: this.entityTypes.USER,
            entityId: userId,
            level: this.auditLevels.MEDIUM,
            ipAddress,
            userAgent,
            sessionId,
            metadata: { timestamp: new Date().toISOString() }
        });
    }

    /**
     * Log user logout
     */
    async logLogout(userId: string, sessionId?: string): Promise<void> {
        await this.logAudit({
            userId,
            action: this.actionTypes.LOGOUT,
            entityType: this.entityTypes.USER,
            entityId: userId,
            level: this.auditLevels.LOW,
            sessionId,
            metadata: { timestamp: new Date().toISOString() }
        });
    }

    /**
     * Log data creation
     */
    async logCreate(
        userId: string,
        entityType: string,
        entityId: string,
        newValues: Record<string, any>,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.logAudit({
            userId,
            action: this.actionTypes.CREATE,
            entityType,
            entityId,
            newValues,
            level: this.auditLevels.MEDIUM,
            metadata
        });
    }

    /**
     * Log data update
     */
    async logUpdate(
        userId: string,
        entityType: string,
        entityId: string,
        oldValues: Record<string, any>,
        newValues: Record<string, any>,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.logAudit({
            userId,
            action: this.actionTypes.UPDATE,
            entityType,
            entityId,
            oldValues,
            newValues,
            level: this.auditLevels.HIGH,
            metadata
        });
    }

    /**
     * Log data deletion
     */
    async logDelete(
        userId: string,
        entityType: string,
        entityId: string,
        oldValues: Record<string, any>,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.logAudit({
            userId,
            action: this.actionTypes.DELETE,
            entityType,
            entityId,
            oldValues,
            level: this.auditLevels.CRITICAL,
            metadata
        });
    }

    /**
     * Log data export
     */
    async logExport(
        userId: string,
        entityType: string,
        criteria: Record<string, any>,
        recordCount: number,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.logAudit({
            userId,
            action: this.actionTypes.EXPORT,
            entityType,
            level: this.auditLevels.HIGH,
            metadata: {
                ...metadata,
                exportCriteria: criteria,
                recordCount
            }
        });
    }

    /**
     * Log assignment operations
     */
    async logAssignment(
        userId: string,
        action: 'assign' | 'approve' | 'reject',
        assignmentId: string,
        partnerId: string,
        requestId: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const actionMap: Record<string, string> = {
            assign: this.actionTypes.ASSIGN,
            approve: this.actionTypes.APPROVE,
            reject: this.actionTypes.REJECT
        };

        await this.logAudit({
            userId,
            action: actionMap[action],
            entityType: this.entityTypes.ASSIGNMENT,
            entityId: assignmentId,
            level: this.auditLevels.HIGH,
            metadata: {
                ...metadata,
                partnerId,
                requestId
            }
        });
    }

    /**
     * Log system events
     */
    async logSystemEvent(
        event: string,
        details: Record<string, any>,
        level: number = this.auditLevels.MEDIUM
    ): Promise<void> {
        await this.logAudit({
            action: this.actionTypes.SYSTEM,
            entityType: this.entityTypes.SYSTEM_SETTING,
            level,
            metadata: {
                event,
                details,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Query audit trail
     */
    async queryAuditTrail(query: AuditQuery): Promise<{ entries: any[]; total: number }> {
        try {
            let dbQuery = supabaseAdmin
                .from('audit_trail')
                .select(`
                    *,
                    users (
                        id,
                        email,
                        first_name,
                        last_name
                    )
                `, { count: 'exact' });

            // Apply filters
            if (query.userId) {
                dbQuery = dbQuery.eq('user_id', query.userId);
            }
            if (query.action) {
                dbQuery = dbQuery.eq('action', query.action);
            }
            if (query.entityType) {
                dbQuery = dbQuery.eq('entity_type', query.entityType);
            }
            if (query.entityId) {
                dbQuery = dbQuery.eq('entity_id', query.entityId);
            }
            if (query.level) {
                dbQuery = dbQuery.gte('level', query.level);
            }
            if (query.startDate) {
                dbQuery = dbQuery.gte('created_at', query.startDate.toISOString());
            }
            if (query.endDate) {
                dbQuery = dbQuery.lte('created_at', query.endDate.toISOString());
            }

            // Apply pagination
            const page = query.page || 1;
            const limit = query.limit || 50;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            dbQuery = dbQuery
                .range(from, to)
                .order('created_at', { ascending: false });

            const { data, error, count } = await dbQuery;

            if (error) {
                throw new Error(`Failed to query audit trail: ${error.message}`);
            }

            return {
                entries: data || [],
                total: count || 0
            };

        } catch (error) {
            logger.error('Failed to query audit trail:', { 
                error: error instanceof Error ? error.message : String(error),
                query 
            });
            throw error;
        }
    }

    /**
     * Generate audit report
     */
    async generateAuditReport(
        startDate: Date,
        endDate: Date,
        filters?: Partial<AuditQuery>
    ): Promise<AuditReport> {
        try {
            const query: AuditQuery = {
                ...filters,
                startDate,
                endDate,
                limit: 10000 // Large limit for reporting
            };

            const { entries } = await this.queryAuditTrail(query);

            // Generate summary statistics
            const actionBreakdown: Record<string, number> = {};
            const entityBreakdown: Record<string, number> = {};
            const userBreakdown: Record<string, number> = {};

            entries.forEach((entry: any) => {
                // Action breakdown
                actionBreakdown[entry.action] = (actionBreakdown[entry.action] || 0) + 1;

                // Entity breakdown
                entityBreakdown[entry.entity_type] = (entityBreakdown[entry.entity_type] || 0) + 1;

                // User breakdown
                if (entry.user_id) {
                    const userKey = entry.users?.email || entry.user_id;
                    userBreakdown[userKey] = (userBreakdown[userKey] || 0) + 1;
                }
            });

            return {
                entries,
                summary: {
                    totalEntries: entries.length,
                    actionBreakdown,
                    entityBreakdown,
                    userBreakdown,
                    timeRange: { start: startDate, end: endDate }
                }
            };

        } catch (error) {
            logger.error('Failed to generate audit report:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Get audit statistics
     */
    async getAuditStatistics(): Promise<any> {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: stats } = await supabaseAdmin
                .from('audit_trail')
                .select('action, entity_type, level, created_at')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (!stats) return null;

            // Calculate statistics
            const totalEntries = stats.length;
            const criticalEntries = stats.filter(s => s.level >= this.auditLevels.CRITICAL).length;
            const highEntries = stats.filter(s => s.level >= this.auditLevels.HIGH).length;

            const actionCounts = stats.reduce((acc: Record<string, number>, stat) => {
                acc[stat.action] = (acc[stat.action] || 0) + 1;
                return acc;
            }, {});

            const entityCounts = stats.reduce((acc: Record<string, number>, stat) => {
                acc[stat.entity_type] = (acc[stat.entity_type] || 0) + 1;
                return acc;
            }, {});

            // Daily activity
            const dailyActivity = stats.reduce((acc: Record<string, number>, stat) => {
                const date = new Date(stat.created_at).toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});

            return {
                totalEntries,
                criticalEntries,
                highEntries,
                actionCounts,
                entityCounts,
                dailyActivity,
                period: {
                    start: thirtyDaysAgo.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                }
            };

        } catch (error) {
            logger.error('Failed to get audit statistics:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return null;
        }
    }

    /**
     * Clean old audit entries
     */
    async cleanOldEntries(retentionDays: number = 365): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const { data, error } = await supabaseAdmin
                .from('audit_trail')
                .delete()
                .lt('created_at', cutoffDate.toISOString());

            if (error) {
                throw new Error(`Failed to clean old audit entries: ${error.message}`);
            }

            const deletedCount = data ? data.length : 0;

            logger.info('Cleaned old audit entries', { 
                deletedCount, 
                retentionDays, 
                cutoffDate: cutoffDate.toISOString() 
            });

            return deletedCount;

        } catch (error) {
            logger.error('Failed to clean old audit entries:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Determine appropriate audit level based on action and entity
     */
    private determineAuditLevel(action: string, entityType: string): number {
        // Critical operations
        if (action === this.actionTypes.DELETE) {
            return this.auditLevels.CRITICAL;
        }

        // High-level operations
        if ([this.actionTypes.CREATE, this.actionTypes.UPDATE, this.actionTypes.APPROVE, this.actionTypes.REJECT].includes(action)) {
            return this.auditLevels.HIGH;
        }

        // Medium-level operations
        if ([this.actionTypes.LOGIN, this.actionTypes.ASSIGN, this.actionTypes.EXPORT].includes(action)) {
            return this.auditLevels.MEDIUM;
        }

        // Default to low level
        return this.auditLevels.LOW;
    }

    /**
     * Export audit trail to CSV
     */
    async exportToCSV(query: AuditQuery): Promise<string> {
        try {
            const { entries } = await this.queryAuditTrail(query);

            // CSV headers
            const headers = [
                'Timestamp',
                'User',
                'Action',
                'Entity Type',
                'Entity ID',
                'Level',
                'IP Address',
                'Details'
            ];

            // Convert entries to CSV rows
            const rows = entries.map((entry: any) => {
                const user = entry.users ? `${entry.users.first_name} ${entry.users.last_name} (${entry.users.email})` : entry.user_id || 'System';
                const details = entry.metadata ? JSON.stringify(entry.metadata) : '';

                return [
                    entry.created_at,
                    user,
                    entry.action,
                    entry.entity_type,
                    entry.entity_id || '',
                    entry.level,
                    entry.ip_address || '',
                    details
                ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            });

            // Combine headers and rows
            const csv = [headers.join(','), ...rows].join('\n');

            return csv;

        } catch (error) {
            logger.error('Failed to export audit trail to CSV:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }
}

export default AuditTrailService;