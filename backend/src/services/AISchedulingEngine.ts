import { Logger } from '../types';
import { supabaseAdmin } from '../config/supabase';
import LinearProgrammingScheduler from './schedulers/LinearProgrammingScheduler';
import GeneticAlgorithmScheduler from './schedulers/GeneticAlgorithmScheduler';
import MachineLearningScheduler from './schedulers/MachineLearningScheduler';
import RuleBasedScheduler from './schedulers/RuleBasedScheduler';
import AnthropicScheduler from './schedulers/AnthropicScheduler';
import PerformanceMetrics from './PerformanceMetrics';

const logger: Logger = require('../utils/logger');

interface AlgorithmConfig {
  id: string;
  name: string;
  algorithm_type: 'linear_programming' | 'genetic' | 'ml_based' | 'rule_based' | 'anthropic';
  version: string;
  parameters: Record<string, any>;
  weights: {
    location: number;
    availability: number;
    cost: number;
    specialty: number;
  };
  is_production: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  total_runs?: number;
  successful_runs?: number;
  average_execution_time_ms?: number;
  average_optimization_score?: number;
}

interface AlgorithmData {
  scheduler: any;
  config: AlgorithmConfig;
  stats: {
    totalRuns: number;
    successfulRuns: number;
    averageExecutionTime: number;
    averageOptimizationScore: number;
  };
}

interface ScheduleRequest {
  contractCode: string;
  installationCode: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  createdBy: string;
}

interface SchedulingContext {
  contract: any;
  installation: any;
  availablePartners: any[];
  historicalData: any[];
  regulatoryRequirements: RegulatoryRequirements;
  partnerPatterns: any[];
  constraints: SchedulingConstraints;
  objectives: SchedulingObjectives;
}

interface RegulatoryRequirements {
  minimumHoursPerMonth: number;
  maximumHoursPerMonth: number;
  requiredVisitFrequency: 'weekly' | 'monthly' | 'quarterly';
  specialRequirements: string[];
}

interface SchedulingConstraints {
  workingHours: string;
  maxHoursPerWeek: number;
  minTimeBetweenVisits: number;
  maxTravelDistance: number;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  partnerAvailability: boolean;
}

interface SchedulingObjectives {
  minimizeCost: boolean;
  minimizeTravelTime: boolean;
  maximizePartnerSatisfaction: boolean;
  maximizeClientSatisfaction: boolean;
  maximizeScheduleStability: boolean;
}

interface AlgorithmResult {
  algorithmId: string;
  algorithmName: string;
  algorithmType: string;
  result: any;
  score: number;
  executionTime: number;
  feasible: boolean;
  confidence: number;
  metadata: Record<string, any>;
  error?: string;
  compositeScore?: number;
}

interface ScheduleData {
  contract_code: string;
  installation_code: string;
  partner_id: string;
  service_type: string;
  schedule_name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  visit_duration_hours: number;
  visits_per_month: number;
  optimization_score: number;
  algorithm_used: string;
  confidence_level: number;
  created_by: string;
}

interface Visit {
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string;
  specialRequirements?: string;
}

interface VisitRecord {
  schedule_id: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  visit_type: string;
  notes?: string;
  special_requirements?: string;
}

interface PerformanceComparison {
  totalAlgorithms: number;
  bestScore: number;
  averageScore: number;
  fastestTime: number;
  averageTime: number;
  algorithms: {
    name: string;
    type: string;
    score: number;
    executionTime: number;
    confidence: number;
    rank: number;
  }[];
}

interface AlgorithmPerformanceSummary {
  id: string;
  name: string;
  type: string;
  version: string;
  isProduction: boolean;
  stats: AlgorithmData['stats'];
  lastUpdated?: string;
}

interface PerformanceMetricData {
  algorithm_id: string;
  schedule_id: string | null;
  execution_time_ms: number;
  optimization_score: number;
  confidence_level: number;
  feasibility_score: number;
  constraint_violations: number;
}

/**
 * Advanced AI Scheduling Engine
 * Orchestrates multiple scheduling algorithms and compares their performance
 */
class AISchedulingEngine {
    private algorithms: Map<string, AlgorithmData>;
    private performanceMetrics: PerformanceMetrics;

    constructor() {
        this.algorithms = new Map();
        this.performanceMetrics = new PerformanceMetrics();
        this.initializeAlgorithms();
    }

    /**
     * Initialize all available scheduling algorithms
     */
    async initializeAlgorithms(): Promise<void> {
        try {
            // Load algorithm configurations from database
            const { data: algorithmConfigs, error } = await supabaseAdmin
                .from('ai_algorithms')
                .select('*')
                .eq('is_active', true)
                .order('created_at');

            if (error) {
                logger.error('Failed to load algorithm configurations:', { 
                    error: error.message 
                });
                // Use default configurations
                this.initializeDefaultAlgorithms();
                return;
            }

            // Initialize each algorithm
            for (const config of algorithmConfigs) {
                await this.initializeAlgorithm(config);
            }

            logger.info(`Initialized ${this.algorithms.size} scheduling algorithms`);

        } catch (error) {
            logger.error('Failed to initialize AI scheduling algorithms:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            this.initializeDefaultAlgorithms();
        }
    }

    /**
     * Initialize a specific algorithm from configuration
     */
    async initializeAlgorithm(config: AlgorithmConfig): Promise<void> {
        try {
            let scheduler: any;

            switch (config.algorithm_type) {
                case 'linear_programming':
                    scheduler = new LinearProgrammingScheduler(config);
                    break;
                case 'genetic':
                    scheduler = new GeneticAlgorithmScheduler(config);
                    break;
                case 'ml_based':
                    scheduler = new MachineLearningScheduler(config);
                    break;
                case 'rule_based':
                    scheduler = new RuleBasedScheduler(config);
                    break;
                case 'anthropic':
                    scheduler = new AnthropicScheduler(config);
                    break;
                default:
                    logger.warn(`Unknown algorithm type: ${config.algorithm_type}`);
                    return;
            }

            // Initialize the scheduler
            await scheduler.initialize();
            
            this.algorithms.set(config.id, {
                scheduler,
                config,
                stats: {
                    totalRuns: config.total_runs || 0,
                    successfulRuns: config.successful_runs || 0,
                    averageExecutionTime: config.average_execution_time_ms || 0,
                    averageOptimizationScore: config.average_optimization_score || 0
                }
            });

            logger.info(`Initialized ${config.name} (${config.algorithm_type})`);

        } catch (error) {
            logger.error(`Failed to initialize algorithm ${config.name}:`, { 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }

    /**
     * Initialize default algorithms if database loading fails
     */
    private initializeDefaultAlgorithms(): void {
        const defaultConfigs: AlgorithmConfig[] = [
            {
                id: 'default-lp',
                name: 'Linear Programming Optimizer',
                algorithm_type: 'linear_programming',
                version: '1.0',
                parameters: { solver: 'SCIP', time_limit_seconds: 300 },
                weights: { location: 0.4, availability: 0.3, cost: 0.2, specialty: 0.1 },
                is_production: true
            },
            {
                id: 'default-rule',
                name: 'Rule-Based Expert System',
                algorithm_type: 'rule_based',
                version: '1.0',
                parameters: { priority_rules: ['historical_preference', 'cost_efficiency'] },
                weights: { location: 0.3, availability: 0.3, cost: 0.2, specialty: 0.2 },
                is_production: true
            }
        ];

        defaultConfigs.forEach(config => {
            this.initializeAlgorithm(config);
        });
    }

    /**
     * Generate optimal schedule using multiple algorithms and compare results
     */
    async generateOptimalSchedule(scheduleRequest: ScheduleRequest): Promise<{
        schedule: any;
        bestResult: AlgorithmResult;
        alternativeResults: AlgorithmResult[];
        performanceComparison: PerformanceComparison | null;
    }> {
        try {
            logger.info(`Generating schedule for contract ${scheduleRequest.contractCode}`);

            // Validate input
            if (!this.validateScheduleRequest(scheduleRequest)) {
                throw new Error('Invalid schedule request parameters');
            }

            // Prepare scheduling context
            const context = await this.prepareSchedulingContext(scheduleRequest);

            // Run multiple algorithms in parallel
            const algorithmResults = await this.runMultipleAlgorithms(context);

            // Compare and select best result
            const bestResult = await this.selectBestSchedule(algorithmResults, context);

            // Log performance metrics
            await this.logPerformanceMetrics(algorithmResults, bestResult, context);

            // Create schedule record
            const schedule = await this.createScheduleRecord(bestResult, scheduleRequest);

            logger.info(`Schedule generated successfully using ${bestResult.algorithmName}`, {
                scheduleId: schedule.id,
                optimizationScore: bestResult.score,
                executionTime: bestResult.executionTime
            });

            return {
                schedule,
                bestResult,
                alternativeResults: algorithmResults.filter(r => r.algorithmId !== bestResult.algorithmId),
                performanceComparison: this.generatePerformanceComparison(algorithmResults)
            };

        } catch (error) {
            logger.error('Schedule generation failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Prepare comprehensive scheduling context
     */
    private async prepareSchedulingContext(scheduleRequest: ScheduleRequest): Promise<SchedulingContext> {
        try {
            // Get contract details
            const contract = await this.getContractDetails(scheduleRequest.contractCode);
            
            // Get installation information
            const installation = await this.getInstallationDetails(scheduleRequest.installationCode);
            
            // Get available partners
            const availablePartners = await this.getAvailablePartners(scheduleRequest);
            
            // Get historical data
            const historicalData = await this.getHistoricalData(scheduleRequest);
            
            // Calculate regulatory requirements (SEPE)
            const regulatoryRequirements = await this.calculateRegulatoryRequirements(installation);
            
            // Get partner preferences and patterns
            const partnerPatterns = await this.getPartnerPatterns(availablePartners.map(p => p.id));

            return {
                contract,
                installation,
                availablePartners,
                historicalData,
                regulatoryRequirements,
                partnerPatterns,
                constraints: this.buildConstraints(scheduleRequest, installation),
                objectives: this.buildObjectives(scheduleRequest)
            };

        } catch (error) {
            logger.error('Failed to prepare scheduling context:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Run multiple algorithms in parallel and collect results
     */
    private async runMultipleAlgorithms(context: SchedulingContext): Promise<AlgorithmResult[]> {
        const algorithmPromises: Promise<AlgorithmResult>[] = [];

        // Get production algorithms first, then experimental ones
        const productionAlgorithms = Array.from(this.algorithms.values())
            .filter(alg => alg.config.is_production)
            .sort((a, b) => (b.stats.averageOptimizationScore || 0) - (a.stats.averageOptimizationScore || 0));

        const experimentalAlgorithms = Array.from(this.algorithms.values())
            .filter(alg => !alg.config.is_production)
            .slice(0, 2); // Limit experimental algorithms to avoid excessive computation

        const algorithmsToRun = [...productionAlgorithms, ...experimentalAlgorithms];

        // Run algorithms with timeout and error handling
        for (const algorithmData of algorithmsToRun) {
            const promise = this.runSingleAlgorithmWithTimeout(algorithmData, context)
                .catch(error => {
                    logger.error(`Algorithm ${algorithmData.config.name} failed:`, { 
                        error: error instanceof Error ? error.message : String(error) 
                    });
                    return {
                        algorithmId: algorithmData.config.id,
                        algorithmName: algorithmData.config.name,
                        algorithmType: algorithmData.config.algorithm_type,
                        error: error instanceof Error ? error.message : String(error),
                        result: null,
                        score: 0,
                        executionTime: 0,
                        feasible: false,
                        confidence: 0,
                        metadata: {}
                    };
                });
            
            algorithmPromises.push(promise);
        }

        // Wait for all algorithms to complete
        const algorithmResults = await Promise.all(algorithmPromises);

        // Filter out failed results and sort by score
        return algorithmResults
            .filter(result => result.feasible && !result.error)
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Run a single algorithm with timeout protection
     */
    private async runSingleAlgorithmWithTimeout(
        algorithmData: AlgorithmData, 
        context: SchedulingContext, 
        timeoutMs: number = 300000
    ): Promise<AlgorithmResult> {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Algorithm ${algorithmData.config.name} timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            try {
                const startTime = Date.now();
                
                const result = await algorithmData.scheduler.generateSchedule(context);
                
                const executionTime = Date.now() - startTime;
                
                clearTimeout(timeoutId);
                
                // Update algorithm statistics
                await this.updateAlgorithmStats(algorithmData.config.id, result, executionTime);

                resolve({
                    algorithmId: algorithmData.config.id,
                    algorithmName: algorithmData.config.name,
                    algorithmType: algorithmData.config.algorithm_type,
                    result,
                    score: result.optimizationScore || 0,
                    executionTime,
                    feasible: result.feasible !== false,
                    confidence: result.confidence || 0.5,
                    metadata: result.metadata || {}
                });

            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Select the best schedule from multiple algorithm results
     */
    private async selectBestSchedule(algorithmResults: AlgorithmResult[], context: SchedulingContext): Promise<AlgorithmResult> {
        if (algorithmResults.length === 0) {
            throw new Error('No feasible schedule found by any algorithm');
        }

        // If only one result, return it
        if (algorithmResults.length === 1) {
            return algorithmResults[0];
        }

        // Multi-criteria decision making
        const scoredResults = algorithmResults.map(result => {
            let compositeScore = result.score;

            // Adjust score based on algorithm reliability
            const algorithm = this.algorithms.get(result.algorithmId);
            if (algorithm) {
                const reliability = algorithm.stats.successfulRuns / Math.max(algorithm.stats.totalRuns, 1);
                compositeScore *= (0.7 + 0.3 * reliability); // Weight by reliability
            }

            // Adjust score based on execution time (favor faster algorithms if scores are close)
            if (result.score > 0.8 * algorithmResults[0].score) { // Within 20% of best score
                const timeBonus = Math.max(0, 1 - result.executionTime / 60000); // Bonus for < 1 minute
                compositeScore += timeBonus * 0.1;
            }

            // Adjust score based on confidence level
            compositeScore *= (0.8 + 0.2 * result.confidence);

            return {
                ...result,
                compositeScore
            };
        });

        // Sort by composite score and return the best
        scoredResults.sort((a, b) => b.compositeScore! - a.compositeScore!);
        
        const bestResult = scoredResults[0];
        
        logger.info(`Selected ${bestResult.algorithmName} as best algorithm`, {
            originalScore: bestResult.score,
            compositeScore: bestResult.compositeScore,
            executionTime: bestResult.executionTime,
            confidence: bestResult.confidence
        });

        return bestResult;
    }

    /**
     * Create schedule record in database
     */
    private async createScheduleRecord(bestResult: AlgorithmResult, scheduleRequest: ScheduleRequest): Promise<any> {
        try {
            const scheduleData: ScheduleData = {
                contract_code: scheduleRequest.contractCode,
                installation_code: scheduleRequest.installationCode,
                partner_id: bestResult.result.partnerId,
                service_type: scheduleRequest.serviceType,
                schedule_name: `${scheduleRequest.serviceType} - ${scheduleRequest.installationCode}`,
                description: `AI-generated schedule using ${bestResult.algorithmName}`,
                status: 'draft',
                start_date: scheduleRequest.startDate,
                end_date: scheduleRequest.endDate,
                total_hours: bestResult.result.totalHours,
                visit_duration_hours: bestResult.result.visitDuration,
                visits_per_month: bestResult.result.visitsPerMonth,
                optimization_score: bestResult.score,
                algorithm_used: bestResult.algorithmName,
                confidence_level: bestResult.confidence,
                created_by: scheduleRequest.createdBy
            };

            const { data: schedule, error } = await supabaseAdmin
                .from('schedules')
                .insert([scheduleData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Create individual scheduled visits
            if (bestResult.result.visits && bestResult.result.visits.length > 0) {
                await this.createScheduledVisits(schedule.id, bestResult.result.visits);
            }

            return schedule;

        } catch (error) {
            logger.error('Failed to create schedule record:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Create individual scheduled visits
     */
    private async createScheduledVisits(scheduleId: string, visits: Visit[]): Promise<void> {
        try {
            const visitRecords: VisitRecord[] = visits.map(visit => ({
                schedule_id: scheduleId,
                visit_date: visit.date,
                start_time: visit.startTime,
                end_time: visit.endTime,
                visit_type: visit.type,
                notes: visit.notes,
                special_requirements: visit.specialRequirements
            }));

            const { error } = await supabaseAdmin
                .from('scheduled_visits')
                .insert(visitRecords);

            if (error) {
                throw error;
            }

            logger.info(`Created ${visitRecords.length} scheduled visits for schedule ${scheduleId}`);

        } catch (error) {
            logger.error('Failed to create scheduled visits:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Get contract details
     */
    private async getContractDetails(contractCode: string): Promise<any> {
        const { data: contract, error } = await supabaseAdmin
            .from('contracts')
            .select(`
                *,
                contract_services(*)
            `)
            .eq('contract_code', contractCode)
            .single();

        if (error) {
            throw new Error(`Failed to fetch contract details: ${error.message}`);
        }

        return contract;
    }

    /**
     * Get installation details
     */
    private async getInstallationDetails(installationCode: string): Promise<any> {
        const { data: installation, error } = await supabaseAdmin
            .from('installations')
            .select(`
                *,
                clients(*)
            `)
            .eq('installation_code', installationCode)
            .single();

        if (error) {
            throw new Error(`Failed to fetch installation details: ${error.message}`);
        }

        return installation;
    }

    /**
     * Get available partners based on criteria
     */
    private async getAvailablePartners(scheduleRequest: ScheduleRequest): Promise<any[]> {
        const { data: partners, error } = await supabaseAdmin
            .from('partners')
            .select(`
                *,
                partner_availability!left(*)
            `)
            .eq('is_active', true);

        if (error) {
            throw new Error(`Failed to fetch available partners: ${error.message}`);
        }

        // Filter partners based on specialty and availability
        return (partners || []).filter(partner => {
            // Add filtering logic based on service type, availability, etc.
            return true; // Placeholder
        });
    }

    /**
     * Get historical scheduling data for learning
     */
    private async getHistoricalData(scheduleRequest: ScheduleRequest): Promise<any[]> {
        const { data: historicalSchedules, error } = await supabaseAdmin
            .from('schedules')
            .select(`
                *,
                scheduled_visits(*),
                algorithm_performance(*)
            `)
            .eq('installation_code', scheduleRequest.installationCode)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            logger.warn('Failed to fetch historical data:', { 
                error: error.message 
            });
            return [];
        }

        return historicalSchedules || [];
    }

    /**
     * Calculate SEPE regulatory requirements
     */
    private async calculateRegulatoryRequirements(installation: any): Promise<RegulatoryRequirements> {
        // Implement SEPE hour calculation logic
        const baseHours = installation.employees_count * 0.5; // Simplified calculation
        const categoryMultiplier = installation.category === 'A' ? 1.5 : installation.category === 'B' ? 1.2 : 1.0;
        
        return {
            minimumHoursPerMonth: Math.ceil(baseHours * categoryMultiplier),
            maximumHoursPerMonth: Math.ceil(baseHours * categoryMultiplier * 1.5),
            requiredVisitFrequency: installation.category === 'A' ? 'weekly' : 'monthly',
            specialRequirements: []
        };
    }

    /**
     * Get partner patterns and preferences
     */
    private async getPartnerPatterns(partnerIds: string[]): Promise<any[]> {
        const { data: patterns, error } = await supabaseAdmin
            .from('historical_patterns')
            .select('*')
            .in('partner_id', partnerIds)
            .gte('confidence_level', 0.6);

        if (error) {
            logger.warn('Failed to fetch partner patterns:', { 
                error: error.message 
            });
            return [];
        }

        return patterns || [];
    }

    /**
     * Build scheduling constraints
     */
    private buildConstraints(scheduleRequest: ScheduleRequest, installation: any): SchedulingConstraints {
        return {
            workingHours: installation.work_hours,
            maxHoursPerWeek: 40,
            minTimeBetweenVisits: 24, // hours
            maxTravelDistance: 50, // km
            excludeWeekends: true,
            excludeHolidays: true,
            partnerAvailability: true
        };
    }

    /**
     * Build optimization objectives
     */
    private buildObjectives(scheduleRequest: ScheduleRequest): SchedulingObjectives {
        return {
            minimizeCost: true,
            minimizeTravelTime: true,
            maximizePartnerSatisfaction: true,
            maximizeClientSatisfaction: true,
            maximizeScheduleStability: true
        };
    }

    /**
     * Update algorithm performance statistics
     */
    private async updateAlgorithmStats(algorithmId: string, result: any, executionTime: number): Promise<void> {
        try {
            const { data: algorithm, error: fetchError } = await supabaseAdmin
                .from('ai_algorithms')
                .select('total_runs, successful_runs, average_execution_time_ms, average_optimization_score')
                .eq('id', algorithmId)
                .single();

            if (fetchError) {
                logger.warn(`Failed to fetch algorithm stats for ${algorithmId}:`, { 
                    error: fetchError.message 
                });
                return;
            }

            const totalRuns = (algorithm.total_runs || 0) + 1;
            const successfulRuns = (algorithm.successful_runs || 0) + (result.feasible !== false ? 1 : 0);
            const avgExecutionTime = ((algorithm.average_execution_time_ms || 0) * (totalRuns - 1) + executionTime) / totalRuns;
            const avgOptimizationScore = ((algorithm.average_optimization_score || 0) * (totalRuns - 1) + (result.optimizationScore || 0)) / totalRuns;

            const { error: updateError } = await supabaseAdmin
                .from('ai_algorithms')
                .update({
                    total_runs: totalRuns,
                    successful_runs: successfulRuns,
                    average_execution_time_ms: Math.round(avgExecutionTime),
                    average_optimization_score: avgOptimizationScore
                })
                .eq('id', algorithmId);

            if (updateError) {
                logger.warn(`Failed to update algorithm stats for ${algorithmId}:`, { 
                    error: updateError.message 
                });
            }

        } catch (error) {
            logger.warn('Failed to update algorithm statistics:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }

    /**
     * Log performance metrics for analysis
     */
    private async logPerformanceMetrics(algorithmResults: AlgorithmResult[], bestResult: AlgorithmResult, context: SchedulingContext): Promise<void> {
        try {
            const metricsData: PerformanceMetricData[] = algorithmResults.map(result => ({
                algorithm_id: result.algorithmId,
                schedule_id: null, // Will be updated after schedule creation
                execution_time_ms: result.executionTime,
                optimization_score: result.score,
                confidence_level: result.confidence,
                feasibility_score: result.feasible ? 1.0 : 0.0,
                constraint_violations: result.metadata?.constraintViolations || 0
            }));

            // Log to performance tracking
            await this.performanceMetrics.logAlgorithmPerformance(metricsData);

        } catch (error) {
            logger.warn('Failed to log performance metrics:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }

    /**
     * Generate performance comparison report
     */
    private generatePerformanceComparison(algorithmResults: AlgorithmResult[]): PerformanceComparison | null {
        if (algorithmResults.length <= 1) {
            return null;
        }

        const comparison: PerformanceComparison = {
            totalAlgorithms: algorithmResults.length,
            bestScore: Math.max(...algorithmResults.map(r => r.score)),
            averageScore: algorithmResults.reduce((sum, r) => sum + r.score, 0) / algorithmResults.length,
            fastestTime: Math.min(...algorithmResults.map(r => r.executionTime)),
            averageTime: algorithmResults.reduce((sum, r) => sum + r.executionTime, 0) / algorithmResults.length,
            algorithms: algorithmResults.map(r => ({
                name: r.algorithmName,
                type: r.algorithmType,
                score: r.score,
                executionTime: r.executionTime,
                confidence: r.confidence,
                rank: 0 // Will be calculated
            }))
        };

        // Calculate ranks
        comparison.algorithms
            .sort((a, b) => b.score - a.score)
            .forEach((alg, index) => alg.rank = index + 1);

        return comparison;
    }

    /**
     * Validate schedule request parameters
     */
    private validateScheduleRequest(request: ScheduleRequest): boolean {
        const required: (keyof ScheduleRequest)[] = ['contractCode', 'installationCode', 'serviceType', 'startDate', 'endDate'];
        return required.every(field => request[field] != null);
    }

    /**
     * Get algorithm performance summary
     */
    async getAlgorithmPerformanceSummary(): Promise<AlgorithmPerformanceSummary[]> {
        try {
            const algorithms = Array.from(this.algorithms.values());
            
            const summary: AlgorithmPerformanceSummary[] = algorithms.map(alg => ({
                id: alg.config.id,
                name: alg.config.name,
                type: alg.config.algorithm_type,
                version: alg.config.version,
                isProduction: alg.config.is_production,
                stats: alg.stats,
                lastUpdated: alg.config.updated_at
            }));

            return summary.sort((a, b) => (b.stats.averageOptimizationScore || 0) - (a.stats.averageOptimizationScore || 0));

        } catch (error) {
            logger.error('Failed to get algorithm performance summary:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return [];
        }
    }

    /**
     * Retrain machine learning models with new data
     */
    async retrainModels(): Promise<void> {
        try {
            logger.info('Starting ML model retraining...');

            const mlAlgorithms = Array.from(this.algorithms.values())
                .filter(alg => alg.config.algorithm_type === 'ml_based');

            const retrainingPromises = mlAlgorithms.map(async (algorithmData) => {
                try {
                    if (algorithmData.scheduler.retrain) {
                        await algorithmData.scheduler.retrain();
                        logger.info(`Retrained ML model: ${algorithmData.config.name}`);
                    }
                } catch (error) {
                    logger.error(`Failed to retrain ${algorithmData.config.name}:`, { 
                        error: error instanceof Error ? error.message : String(error) 
                    });
                }
            });

            await Promise.all(retrainingPromises);
            
            logger.info('ML model retraining completed');

        } catch (error) {
            logger.error('ML model retraining failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }
}

export default AISchedulingEngine;