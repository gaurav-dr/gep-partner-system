import { Logger } from '../types';
import { OptimizationEngine } from './core/optimization-engine';
import { BatchOptimizer } from './features/batch-optimizer';
import { WorkloadBalancer } from './features/workload-balancer';
import { SeasonalAdjuster } from './features/seasonal-adjuster';
import { 
    OptimizationContext, 
    OptimizationResult, 
    BatchOptimizationResult,
    WorkloadBalanceResult,
    SeasonalAdjustmentResult,
    OptimizationConfig
} from './types';

const logger: Logger = require('../utils/logger');

export default class VisitDurationOptimizer {
    private optimizationEngine: OptimizationEngine;
    private batchOptimizer: BatchOptimizer;
    private workloadBalancer: WorkloadBalancer;
    private seasonalAdjuster: SeasonalAdjuster;

    constructor() {
        this.optimizationEngine = new OptimizationEngine();
        this.batchOptimizer = new BatchOptimizer(this.optimizationEngine);
        this.workloadBalancer = new WorkloadBalancer();
        this.seasonalAdjuster = new SeasonalAdjuster(this.optimizationEngine);
    }

    async optimizeVisitDuration(context: OptimizationContext): Promise<OptimizationResult> {
        try {
            logger.info('Optimizing visit duration', {
                installationCode: context.installation?.installation_code,
                serviceType: context.installation?.service_type
            });

            // Validate context
            const validation = await this.optimizationEngine.validateOptimization(context);
            if (!validation.valid) {
                logger.warn('Optimization context has warnings:', validation.warnings);
            }

            // Perform optimization
            const result = await this.optimizationEngine.optimizeVisitDuration(context);

            logger.info('Visit duration optimization completed', {
                recommendedDuration: result.recommendedDuration,
                confidence: result.confidence
            });

            return result;

        } catch (error) {
            logger.error('Visit duration optimization failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async optimizeBatch(contexts: OptimizationContext[]): Promise<BatchOptimizationResult> {
        try {
            logger.info('Starting batch optimization', { count: contexts.length });
            
            const result = await this.batchOptimizer.optimizeBatch(contexts);
            
            logger.info('Batch optimization completed', {
                processed: result.summary.totalProcessed,
                averageDuration: result.summary.averageDuration
            });
            
            return result;

        } catch (error) {
            logger.error('Batch optimization failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async balanceWorkload(partnerIds: string[], contexts: OptimizationContext[]): Promise<WorkloadBalanceResult> {
        try {
            logger.info('Balancing workload', { 
                partners: partnerIds.length, 
                visits: contexts.length 
            });
            
            const result = await this.workloadBalancer.balanceWorkload(partnerIds, contexts);
            
            logger.info('Workload balancing completed', {
                balanceScore: result.balanceScore,
                recommendations: result.recommendations.length
            });
            
            return result;

        } catch (error) {
            logger.error('Workload balancing failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async adjustForSeason(context: OptimizationContext, season: string): Promise<SeasonalAdjustmentResult> {
        try {
            logger.info('Applying seasonal adjustments', { season });
            
            const result = await this.seasonalAdjuster.adjustForSeason(context, season);
            
            logger.info('Seasonal adjustment completed', {
                baseRecommendation: result.baseOptimization.recommendedDuration,
                seasonalRecommendation: result.seasonalOptimization.recommendedDuration,
                adjustmentFactor: result.adjustmentFactor
            });
            
            return result;

        } catch (error) {
            logger.error('Seasonal adjustment failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    updateConfiguration(config: Partial<OptimizationConfig>): void {
        try {
            logger.info('Updating optimization configuration');
            this.optimizationEngine.updateConfig(config);
            logger.info('Configuration updated successfully');
        } catch (error) {
            logger.error('Configuration update failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async analyzeOptimizationPerformance(period: string = '30d'): Promise<{
        totalOptimizations: number;
        averageAccuracy: number;
        costSavings: number;
        topFactors: Array<{ factor: string; impact: number }>;
    }> {
        try {
            logger.info('Analyzing optimization performance', { period });
            
            // This would integrate with performance tracking data
            // For now, return a structured placeholder
            return {
                totalOptimizations: 0,
                averageAccuracy: 0,
                costSavings: 0,
                topFactors: []
            };

        } catch (error) {
            logger.error('Performance analysis failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
}