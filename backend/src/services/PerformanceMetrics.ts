import { Logger } from '../types';
import { supabaseAdmin } from '../config/supabase';

const logger: Logger = require('../utils/logger');

interface AlgorithmMetrics {
  algorithm: string;
  requestId?: number;
  partnerId?: string;
  executionTimeMs: number;
  memoryUsageMb?: number;
  cpuUsage?: number;
  success: boolean;
  errorMessage?: string;
  inputSize: number;
  outputSize: number;
  score?: number;
  optimizationResult?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface PerformanceAnalysis {
  algorithm: string;
  totalRuns: number;
  successRate: number;
  avgExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  avgMemoryUsage?: number;
  avgCpuUsage?: number;
  avgScore?: number;
  lastRun: Date;
  errorPatterns: Record<string, number>;
}

interface ComparisonReport {
  algorithms: string[];
  period: { start: Date; end: Date };
  metrics: {
    [algorithm: string]: PerformanceAnalysis;
  };
  recommendations: string[];
  bestPerformer: {
    overall: string;
    speed: string;
    accuracy: string;
    reliability: string;
  };
}

interface MetricsQuery {
  algorithm?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  minExecutionTime?: number;
  maxExecutionTime?: number;
  limit?: number;
}

/**
 * Performance Metrics Service
 * Tracks and analyzes the performance of different scheduling algorithms
 * Provides insights for algorithm selection and optimization
 */
class PerformanceMetrics {
    private metricsCache: Map<string, any>;
    private cacheExpiryTime: number;
    private batchSize: number;
    private pendingMetrics: AlgorithmMetrics[];
    private flushInterval: number;
    private flushTimer: NodeJS.Timeout | null;

    constructor() {
        this.metricsCache = new Map();
        this.cacheExpiryTime = 15 * 60 * 1000; // 15 minutes
        this.batchSize = 100;
        this.pendingMetrics = [];
        this.flushInterval = 30000; // 30 seconds
        this.flushTimer = null;
        
        // Start batch processing
        this.startBatchProcessing();
    }

    /**
     * Log algorithm performance metrics
     */
    async logAlgorithmPerformance(metricsData: AlgorithmMetrics | AlgorithmMetrics[]): Promise<void> {
        try {
            if (Array.isArray(metricsData)) {
                // Batch logging
                this.pendingMetrics.push(...metricsData);
            } else {
                // Single metric
                this.pendingMetrics.push(metricsData);
            }

            // Flush if batch is full
            if (this.pendingMetrics.length >= this.batchSize) {
                await this.flushPendingMetrics();
            }

        } catch (error) {
            logger.error('Failed to log algorithm performance:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }

    /**
     * Start batch processing of metrics
     */
    private startBatchProcessing(): void {
        this.flushTimer = setInterval(async () => {
            if (this.pendingMetrics.length > 0) {
                await this.flushPendingMetrics();
            }
        }, this.flushInterval);

        logger.info('Performance metrics batch processing started', { 
            batchSize: this.batchSize, 
            flushIntervalMs: this.flushInterval 
        });
    }

    /**
     * Flush pending metrics to database
     */
    private async flushPendingMetrics(): Promise<void> {
        if (this.pendingMetrics.length === 0) {
            return;
        }

        const metricsToFlush = this.pendingMetrics.splice(0, this.batchSize);

        try {
            // Prepare metrics for database insertion
            const dbMetrics = metricsToFlush.map(metric => ({
                algorithm: metric.algorithm,
                request_id: metric.requestId || null,
                partner_id: metric.partnerId || null,
                execution_time_ms: metric.executionTimeMs,
                memory_usage_mb: metric.memoryUsageMb || null,
                cpu_usage_percent: metric.cpuUsage || null,
                success: metric.success,
                error_message: metric.errorMessage || null,
                input_size: metric.inputSize,
                output_size: metric.outputSize,
                score: metric.score || null,
                optimization_result: metric.optimizationResult ? JSON.stringify(metric.optimizationResult) : null,
                metadata: metric.metadata ? JSON.stringify(metric.metadata) : null,
                created_at: metric.timestamp.toISOString()
            }));

            const { error } = await supabaseAdmin
                .from('algorithm_performance_metrics')
                .insert(dbMetrics);

            if (error) {
                throw new Error(`Failed to insert performance metrics: ${error.message}`);
            }

            logger.info('Flushed performance metrics to database', { 
                count: metricsToFlush.length 
            });

            // Clear relevant caches
            this.clearRelatedCaches(metricsToFlush.map(m => m.algorithm));

        } catch (error) {
            logger.error('Failed to flush performance metrics:', { 
                error: error instanceof Error ? error.message : String(error),
                metricsCount: metricsToFlush.length 
            });

            // Put metrics back in queue for retry
            this.pendingMetrics.unshift(...metricsToFlush);
        }
    }

    /**
     * Get performance analysis for a specific algorithm
     */
    async getAlgorithmAnalysis(algorithm: string, days: number = 30): Promise<PerformanceAnalysis | null> {
        try {
            const cacheKey = `analysis_${algorithm}_${days}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) return cached;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabaseAdmin
                .from('algorithm_performance_metrics')
                .select('*')
                .eq('algorithm', algorithm)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to get algorithm analysis: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return null;
            }

            // Calculate analysis
            const successfulRuns = data.filter(d => d.success);
            const totalRuns = data.length;
            const successRate = (successfulRuns.length / totalRuns) * 100;

            const executionTimes = successfulRuns.map(d => d.execution_time_ms);
            const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
            const minExecutionTime = Math.min(...executionTimes);
            const maxExecutionTime = Math.max(...executionTimes);

            const memoryUsages = successfulRuns.filter(d => d.memory_usage_mb).map(d => d.memory_usage_mb);
            const avgMemoryUsage = memoryUsages.length > 0 
                ? memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length 
                : undefined;

            const cpuUsages = successfulRuns.filter(d => d.cpu_usage_percent).map(d => d.cpu_usage_percent);
            const avgCpuUsage = cpuUsages.length > 0 
                ? cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length 
                : undefined;

            const scores = successfulRuns.filter(d => d.score).map(d => d.score);
            const avgScore = scores.length > 0 
                ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
                : undefined;

            // Error patterns
            const errorPatterns: Record<string, number> = {};
            data.filter(d => !d.success && d.error_message).forEach(d => {
                const errorKey = d.error_message.substring(0, 100); // First 100 chars
                errorPatterns[errorKey] = (errorPatterns[errorKey] || 0) + 1;
            });

            const analysis: PerformanceAnalysis = {
                algorithm,
                totalRuns,
                successRate,
                avgExecutionTime,
                minExecutionTime,
                maxExecutionTime,
                avgMemoryUsage,
                avgCpuUsage,
                avgScore,
                lastRun: new Date(data[0].created_at),
                errorPatterns
            };

            this.setCachedData(cacheKey, analysis);
            return analysis;

        } catch (error) {
            logger.error('Failed to get algorithm analysis:', { 
                algorithm,
                error: error instanceof Error ? error.message : String(error) 
            });
            return null;
        }
    }

    /**
     * Compare performance across multiple algorithms
     */
    async compareAlgorithms(algorithms: string[], days: number = 30): Promise<ComparisonReport> {
        try {
            const cacheKey = `comparison_${algorithms.join('_')}_${days}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) return cached;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const endDate = new Date();

            // Get analysis for each algorithm
            const metrics: Record<string, PerformanceAnalysis> = {};
            for (const algorithm of algorithms) {
                const analysis = await this.getAlgorithmAnalysis(algorithm, days);
                if (analysis) {
                    metrics[algorithm] = analysis;
                }
            }

            // Determine best performers
            const algorithmsWithData = Object.keys(metrics);
            const bestPerformer = {
                overall: this.getBestOverall(metrics),
                speed: this.getBestForMetric(metrics, 'avgExecutionTime', 'min'),
                accuracy: this.getBestForMetric(metrics, 'avgScore', 'max'),
                reliability: this.getBestForMetric(metrics, 'successRate', 'max')
            };

            // Generate recommendations
            const recommendations = this.generateRecommendations(metrics);

            const report: ComparisonReport = {
                algorithms: algorithmsWithData,
                period: { start: startDate, end: endDate },
                metrics,
                recommendations,
                bestPerformer
            };

            this.setCachedData(cacheKey, report);
            return report;

        } catch (error) {
            logger.error('Failed to compare algorithms:', { 
                algorithms,
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Get real-time system performance metrics
     */
    async getSystemPerformance(): Promise<any> {
        try {
            // Get current system metrics (last hour)
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            const { data: recentMetrics } = await supabaseAdmin
                .from('algorithm_performance_metrics')
                .select('*')
                .gte('created_at', oneHourAgo.toISOString());

            if (!recentMetrics || recentMetrics.length === 0) {
                return {
                    activeAlgorithms: 0,
                    totalRequests: 0,
                    avgResponseTime: 0,
                    successRate: 0,
                    systemHealth: 'unknown'
                };
            }

            const totalRequests = recentMetrics.length;
            const successfulRequests = recentMetrics.filter(m => m.success).length;
            const successRate = (successfulRequests / totalRequests) * 100;
            const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.execution_time_ms, 0) / totalRequests;
            const activeAlgorithms = new Set(recentMetrics.map(m => m.algorithm)).size;

            // Determine system health
            let systemHealth = 'good';
            if (successRate < 85) systemHealth = 'poor';
            else if (successRate < 95) systemHealth = 'fair';
            if (avgResponseTime > 30000) systemHealth = 'poor'; // 30s threshold

            return {
                activeAlgorithms,
                totalRequests,
                avgResponseTime,
                successRate,
                systemHealth,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to get system performance:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return {
                activeAlgorithms: 0,
                totalRequests: 0,
                avgResponseTime: 0,
                successRate: 0,
                systemHealth: 'error'
            };
        }
    }

    /**
     * Query performance metrics with filters
     */
    async queryMetrics(query: MetricsQuery): Promise<any[]> {
        try {
            let dbQuery = supabaseAdmin
                .from('algorithm_performance_metrics')
                .select('*');

            // Apply filters
            if (query.algorithm) {
                dbQuery = dbQuery.eq('algorithm', query.algorithm);
            }
            if (query.startDate) {
                dbQuery = dbQuery.gte('created_at', query.startDate.toISOString());
            }
            if (query.endDate) {
                dbQuery = dbQuery.lte('created_at', query.endDate.toISOString());
            }
            if (query.success !== undefined) {
                dbQuery = dbQuery.eq('success', query.success);
            }
            if (query.minExecutionTime) {
                dbQuery = dbQuery.gte('execution_time_ms', query.minExecutionTime);
            }
            if (query.maxExecutionTime) {
                dbQuery = dbQuery.lte('execution_time_ms', query.maxExecutionTime);
            }

            // Apply limit and ordering
            dbQuery = dbQuery
                .order('created_at', { ascending: false })
                .limit(query.limit || 100);

            const { data, error } = await dbQuery;

            if (error) {
                throw new Error(`Failed to query metrics: ${error.message}`);
            }

            return data || [];

        } catch (error) {
            logger.error('Failed to query performance metrics:', { 
                error: error instanceof Error ? error.message : String(error),
                query 
            });
            return [];
        }
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(metrics: Record<string, PerformanceAnalysis>): string[] {
        const recommendations: string[] = [];

        Object.entries(metrics).forEach(([algorithm, analysis]) => {
            if (analysis.successRate < 90) {
                recommendations.push(`${algorithm}: Investigate reliability issues (${analysis.successRate.toFixed(1)}% success rate)`);
            }
            
            if (analysis.avgExecutionTime > 30000) {
                recommendations.push(`${algorithm}: Optimize performance (avg. ${(analysis.avgExecutionTime / 1000).toFixed(1)}s execution time)`);
            }

            if (Object.keys(analysis.errorPatterns).length > 0) {
                const topError = Object.entries(analysis.errorPatterns)
                    .sort(([,a], [,b]) => b - a)[0];
                recommendations.push(`${algorithm}: Address frequent error: "${topError[0].substring(0, 50)}..." (${topError[1]} occurrences)`);
            }
        });

        return recommendations;
    }

    /**
     * Get best overall performer
     */
    private getBestOverall(metrics: Record<string, PerformanceAnalysis>): string {
        let bestAlgorithm = '';
        let bestScore = -1;

        Object.entries(metrics).forEach(([algorithm, analysis]) => {
            // Weighted score: 40% success rate, 30% speed, 20% accuracy, 10% total runs
            const speedScore = analysis.maxExecutionTime > 0 
                ? (1 - (analysis.avgExecutionTime / analysis.maxExecutionTime)) * 100 
                : 0;
            const accuracyScore = analysis.avgScore || 0;
            const volumeScore = Math.min(analysis.totalRuns / 100, 1) * 100;

            const overallScore = 
                (analysis.successRate * 0.4) +
                (speedScore * 0.3) +
                (accuracyScore * 0.2) +
                (volumeScore * 0.1);

            if (overallScore > bestScore) {
                bestScore = overallScore;
                bestAlgorithm = algorithm;
            }
        });

        return bestAlgorithm;
    }

    /**
     * Get best performer for specific metric
     */
    private getBestForMetric(
        metrics: Record<string, PerformanceAnalysis>, 
        metric: keyof PerformanceAnalysis, 
        type: 'min' | 'max'
    ): string {
        let bestAlgorithm = '';
        let bestValue = type === 'min' ? Infinity : -Infinity;

        Object.entries(metrics).forEach(([algorithm, analysis]) => {
            const value = analysis[metric] as number;
            if (value !== undefined && value !== null) {
                if ((type === 'min' && value < bestValue) || (type === 'max' && value > bestValue)) {
                    bestValue = value;
                    bestAlgorithm = algorithm;
                }
            }
        });

        return bestAlgorithm;
    }

    /**
     * Cache management
     */
    private getCachedData(key: string): any | null {
        const cached = this.metricsCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryTime) {
            return cached.data;
        }
        return null;
    }

    private setCachedData(key: string, data: any): void {
        this.metricsCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    private clearRelatedCaches(algorithms: string[]): void {
        const keysToDelete: string[] = [];
        this.metricsCache.forEach((value, key) => {
            if (algorithms.some(algo => key.includes(algo))) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.metricsCache.delete(key));
    }

    /**
     * Cleanup and stop processing
     */
    cleanup(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        // Flush any remaining metrics
        if (this.pendingMetrics.length > 0) {
            this.flushPendingMetrics();
        }

        this.metricsCache.clear();
        logger.info('PerformanceMetrics cleanup completed');
    }
}

export default PerformanceMetrics;