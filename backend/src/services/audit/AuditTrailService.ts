import { Logger, User } from '../../types';
import { supabaseAdmin } from '../../config/supabase';

const logger: Logger = require('../../utils/logger');

export interface AuditEntry {
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

export interface AuditQuery {
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

export interface AuditReport {
  entries: AuditEntry[];
  summary: {
    totalEntries: number;
    actionBreakdown: Record<string, number>;
    entityBreakdown: Record<string, number>;
    userBreakdown: Record<string, number>;
    timeRange: { start: Date; end: Date };
  };
}

export default class AuditTrailService {
    private auditLevels: Record<string, number>;

    constructor() {
        this.auditLevels = {
            'LOW': 1,
            'MEDIUM': 2, 
            'HIGH': 3,
            'CRITICAL': 4
        };
    }

    async logAuditEntry(entry: AuditEntry): Promise<void> {
        try {
            const auditRecord = {
                user_id: entry.userId,
                action: entry.action,
                entity_type: entry.entityType,
                entity_id: entry.entityId,
                old_values: entry.oldValues,
                new_values: entry.newValues,
                metadata: entry.metadata,
                level: entry.level,
                ip_address: entry.ipAddress,
                user_agent: entry.userAgent,
                session_id: entry.sessionId,
                created_at: new Date().toISOString()
            };

            const { error } = await supabaseAdmin
                .from('audit_trail')
                .insert([auditRecord]);

            if (error) {
                throw error;
            }

            logger.info('Audit entry logged', {
                action: entry.action,
                entityType: entry.entityType,
                level: entry.level
            });

        } catch (error) {
            logger.error('Failed to log audit entry:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async queryAuditTrail(query: AuditQuery): Promise<AuditEntry[]> {
        try {
            let dbQuery = supabaseAdmin
                .from('audit_trail')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (query.userId) dbQuery = dbQuery.eq('user_id', query.userId);
            if (query.action) dbQuery = dbQuery.eq('action', query.action);
            if (query.entityType) dbQuery = dbQuery.eq('entity_type', query.entityType);
            if (query.entityId) dbQuery = dbQuery.eq('entity_id', query.entityId);
            if (query.level) dbQuery = dbQuery.gte('level', query.level);
            if (query.startDate) dbQuery = dbQuery.gte('created_at', query.startDate.toISOString());
            if (query.endDate) dbQuery = dbQuery.lte('created_at', query.endDate.toISOString());

            // Apply pagination
            const page = query.page || 1;
            const limit = query.limit || 50;
            const offset = (page - 1) * limit;
            dbQuery = dbQuery.range(offset, offset + limit - 1);

            const { data, error } = await dbQuery;

            if (error) {
                throw error;
            }

            return (data || []).map(record => ({
                userId: record.user_id,
                action: record.action,
                entityType: record.entity_type,
                entityId: record.entity_id,
                oldValues: record.old_values,
                newValues: record.new_values,
                metadata: record.metadata,
                level: record.level,
                ipAddress: record.ip_address,
                userAgent: record.user_agent,
                sessionId: record.session_id
            }));

        } catch (error) {
            logger.error('Failed to query audit trail:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async generateAuditReport(query: AuditQuery): Promise<AuditReport> {
        try {
            const entries = await this.queryAuditTrail(query);
            
            const summary = {
                totalEntries: entries.length,
                actionBreakdown: this.calculateActionBreakdown(entries),
                entityBreakdown: this.calculateEntityBreakdown(entries),
                userBreakdown: this.calculateUserBreakdown(entries),
                timeRange: {
                    start: query.startDate || new Date(0),
                    end: query.endDate || new Date()
                }
            };

            return { entries, summary };

        } catch (error) {
            logger.error('Failed to generate audit report:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private calculateActionBreakdown(entries: AuditEntry[]): Record<string, number> {
        return entries.reduce((breakdown, entry) => {
            breakdown[entry.action] = (breakdown[entry.action] || 0) + 1;
            return breakdown;
        }, {} as Record<string, number>);
    }

    private calculateEntityBreakdown(entries: AuditEntry[]): Record<string, number> {
        return entries.reduce((breakdown, entry) => {
            breakdown[entry.entityType] = (breakdown[entry.entityType] || 0) + 1;
            return breakdown;
        }, {} as Record<string, number>);
    }

    private calculateUserBreakdown(entries: AuditEntry[]): Record<string, number> {
        return entries.reduce((breakdown, entry) => {
            const userId = entry.userId || 'system';
            breakdown[userId] = (breakdown[userId] || 0) + 1;
            return breakdown;
        }, {} as Record<string, number>);
    }
}