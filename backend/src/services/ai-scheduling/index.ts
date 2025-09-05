import { Logger } from '../../types';
import PerformanceMetrics from '../PerformanceMetrics';
import AISchedulingAlgorithmManager from './algorithm-manager';
import AISchedulingContextBuilder from './context-builder';
import AISchedulingDataProvider from './data-provider';
import { 
    ScheduleRequest, 
    AlgorithmResult, 
    ScheduleData, 
    PerformanceComparison,
    AlgorithmPerformanceSummary,
    PerformanceMetricData 
} from './types';

const logger: Logger = require('../../utils/logger');

/**
 * AI Scheduling Engine
 * Orchestrates multiple scheduling algorithms to find optimal partner assignments and visit schedules
 * Provides comprehensive performance monitoring, comparison, and adaptive learning capabilities
 */
class AISchedulingEngine {
    private algorithmManager: AISchedulingAlgorithmManager;
    private contextBuilder: AISchedulingContextBuilder;
    private dataProvider: AISchedulingDataProvider;
    private performanceMetrics: PerformanceMetrics;

    constructor() {
        this.algorithmManager = new AISchedulingAlgorithmManager();
        this.contextBuilder = new AISchedulingContextBuilder();
        this.dataProvider = new AISchedulingDataProvider();
        this.performanceMetrics = new PerformanceMetrics();
        
        logger.info('AISchedulingEngine initialized successfully');
    }

    /**
     * Generate optimal schedule using multiple algorithms
     */
    async generateOptimalSchedule(scheduleRequest: ScheduleRequest): Promise<ScheduleData> {
        const startTime = Date.now();
        
        try {
            logger.info('Starting optimal schedule generation', { 
                contractCode: scheduleRequest.contractCode,
                installationCode: scheduleRequest.installationCode 
            });

            // Validate request
            if (!this.contextBuilder.validateScheduleRequest(scheduleRequest)) {
                throw new Error('Invalid schedule request');
            }

            // Prepare scheduling context
            const context = await this.contextBuilder.prepareSchedulingContext(scheduleRequest);

            // Run multiple algorithms
            const algorithmResults = await this.algorithmManager.runMultipleAlgorithms(context);

            // Select best schedule
            const bestResult = await this.algorithmManager.selectBestSchedule(algorithmResults, context);

            // Create schedule record
            const scheduleRecord = await this.createScheduleRecord(bestResult, scheduleRequest);

            // Log performance metrics
            await this.logPerformanceMetrics(algorithmResults, bestResult, context);

            const totalExecutionTime = Date.now() - startTime;

            logger.info('Optimal schedule generated successfully', {
                scheduleId: scheduleRecord.id,
                algorithmUsed: bestResult.algorithmName,
                executionTime: totalExecutionTime,
                optimizationScore: bestResult.score
            });

            return {
                scheduleId: scheduleRecord.id,
                algorithmUsed: bestResult.algorithmName,
                optimizationScore: bestResult.score,
                executionTime: totalExecutionTime,
                feasible: bestResult.feasible,
                partnerId: bestResult.partnerId,
                partnerName: bestResult.partnerName,
                totalVisits: bestResult.visits?.length || 0,
                totalHours: bestResult.totalHours || 0,
                visits: bestResult.visits || [],
                createdAt: new Date(),
                metadata: {
                    algorithmComparison: this.algorithmManager.generatePerformanceComparison(algorithmResults),
                    contextComplexity: this.calculateContextComplexity(context),
                    allResults: algorithmResults.map(r => ({
                        algorithmId: r.algorithmId,
                        algorithmName: r.algorithmName,
                        score: r.score,
                        executionTime: r.executionTime,
                        feasible: r.feasible
                    }))
                }
            };

        } catch (error) {
            const totalExecutionTime = Date.now() - startTime;
            
            logger.error('Failed to generate optimal schedule:', {
                scheduleRequest,
                executionTime: totalExecutionTime,
                error: (error as Error).message
            });
            
            throw error;
        }
    }

    /**
     * Create schedule record in database
     */
    private async createScheduleRecord(bestResult: AlgorithmResult, scheduleRequest: ScheduleRequest): Promise<any> {
        try {
            const scheduleData = {
                contractCode: scheduleRequest.contractCode,
                installationCode: scheduleRequest.installationCode,
                serviceType: scheduleRequest.serviceType,
                partnerId: bestResult.partnerId,
                startDate: scheduleRequest.startDate,
                endDate: scheduleRequest.endDate,
                totalHours: bestResult.totalHours || scheduleRequest.totalHours,
                algorithmUsed: bestResult.algorithmId,
                optimizationScore: bestResult.score,
                executionTime: bestResult.executionTime,
                feasible: bestResult.feasible,
                metadata: bestResult.metadata
            };

            const schedule = await this.dataProvider.createScheduleRecord(scheduleData);

            // Create scheduled visits if available
            if (bestResult.visits && bestResult.visits.length > 0) {
                await this.dataProvider.createScheduledVisits(schedule.id, bestResult.visits);
            }

            return schedule;
        } catch (error) {
            logger.error('Failed to create schedule record:', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Log performance metrics for analysis
     */
    private async logPerformanceMetrics(
        algorithmResults: AlgorithmResult[],
        bestResult: AlgorithmResult,
        context: any
    ): Promise<void> {
        try {
            const metricsData: PerformanceMetricData[] = algorithmResults.map(result => ({
                algorithm: result.algorithmId,
                partnerId: result.partnerId,
                executionTimeMs: result.executionTime,
                optimizationScore: result.score,
                feasible: result.feasible,
                inputSize: context.availablePartners.length,
                contextComplexity: this.calculateContextComplexity(context),
                timestamp: new Date()
            }));

            // Log to performance metrics system
            await this.performanceMetrics.logBatch(metricsData);

            logger.debug('Performance metrics logged', { 
                metricsCount: metricsData.length,
                bestAlgorithm: bestResult.algorithmId
            });
        } catch (error) {
            logger.error('Failed to log performance metrics:', { error: (error as Error).message });
            // Don't throw - this is not critical for the main flow
        }
    }

    /**
     * Calculate context complexity for metrics
     */
    private calculateContextComplexity(context: any): number {
        let complexity = 0;
        
        // Partner count contributes to complexity
        complexity += Math.min(context.availablePartners.length * 0.1, 5);
        
        // Historical data contributes to complexity
        complexity += Math.min(context.historicalData.length * 0.01, 3);
        
        // Constraint complexity
        if (context.constraints.excludeWeekends) complexity += 0.5;
        if (context.constraints.minimumVisitDuration > 2) complexity += 0.5;
        if (context.constraints.maximumVisitDuration < 8) complexity += 0.5;
        
        // Regulatory requirements complexity
        if (context.regulatoryRequirements.minimumHoursPerMonth > 10) complexity += 1;
        if (context.regulatoryRequirements.totalHours > 40) complexity += 1;
        
        return Math.min(complexity, 10); // Cap at 10
    }

    /**
     * Get algorithm performance summary
     */
    async getAlgorithmPerformanceSummary(): Promise<AlgorithmPerformanceSummary[]> {
        try {
            const algorithms = this.algorithmManager.getAvailableAlgorithms();
            const summaries: AlgorithmPerformanceSummary[] = [];

            for (const algorithm of algorithms) {
                const metrics = await this.performanceMetrics.getAlgorithmMetrics(algorithm.id);
                
                summaries.push({
                    algorithmId: algorithm.id,
                    algorithmName: algorithm.name,
                    totalRuns: metrics.totalRuns || 0,
                    successfulRuns: metrics.successfulRuns || 0,
                    averageScore: metrics.averageOptimizationScore || 0,
                    averageExecutionTime: metrics.averageExecutionTime || 0,
                    successRate: metrics.totalRuns > 0 ? (metrics.successfulRuns / metrics.totalRuns) : 0,
                    lastUsed: metrics.lastUsed || new Date()
                });
            }

            return summaries.sort((a, b) => b.successRate - a.successRate);
        } catch (error) {
            logger.error('Failed to get algorithm performance summary:', { error: (error as Error).message });
            return [];
        }
    }

    /**
     * Get performance comparison for recent runs
     */
    async getRecentPerformanceComparison(limit: number = 10): Promise<PerformanceComparison[]> {
        try {
            return await this.performanceMetrics.getRecentComparisons(limit);
        } catch (error) {
            logger.error('Failed to get recent performance comparisons:', { error: (error as Error).message });
            return [];
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        try {
            await this.performanceMetrics.cleanup();
            logger.info('AISchedulingEngine cleanup completed');
        } catch (error) {
            logger.error('Error during AISchedulingEngine cleanup:', { error: (error as Error).message });
        }
    }
}

export default AISchedulingEngine;

// Export types for external use
export * from './types';