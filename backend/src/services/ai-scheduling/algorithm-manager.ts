import { Logger } from '../../types';
import LinearProgrammingScheduler from '../schedulers/LinearProgrammingScheduler';
import GeneticAlgorithmScheduler from '../schedulers/GeneticAlgorithmScheduler';
import MachineLearningScheduler from '../schedulers/MachineLearningScheduler';
import RuleBasedScheduler from '../schedulers/RuleBasedScheduler';
import AnthropicScheduler from '../schedulers/AnthropicScheduler';
import { AlgorithmConfig, AlgorithmData, AlgorithmResult, SchedulingContext, PerformanceComparison } from './types';
import AISchedulingDataProvider from './data-provider';

const logger: Logger = require('../../utils/logger');

export class AISchedulingAlgorithmManager {
    private algorithms: Map<string, AlgorithmData>;
    private dataProvider: AISchedulingDataProvider;

    constructor() {
        this.algorithms = new Map();
        this.dataProvider = new AISchedulingDataProvider();
        this.initializeDefaultAlgorithms();
    }

    /**
     * Initialize default scheduling algorithms
     */
    private initializeDefaultAlgorithms(): void {
        const defaultConfigs: AlgorithmConfig[] = [
            {
                id: 'linear_programming_v1',
                name: 'Linear Programming Optimizer',
                algorithm_type: 'linear_programming',
                version: '1.0.0',
                parameters: {
                    maxIterations: 1000,
                    tolerance: 0.001,
                    timeLimit: 300
                },
                weights: {
                    location: 0.3,
                    availability: 0.3,
                    cost: 0.25,
                    specialty: 0.15
                },
                is_production: true,
                is_active: true
            },
            {
                id: 'genetic_algorithm_v1',
                name: 'Genetic Algorithm Scheduler',
                algorithm_type: 'genetic',
                version: '1.0.0',
                parameters: {
                    populationSize: 50,
                    generations: 100,
                    mutationRate: 0.1,
                    crossoverRate: 0.7
                },
                weights: {
                    location: 0.25,
                    availability: 0.35,
                    cost: 0.2,
                    specialty: 0.2
                },
                is_production: true,
                is_active: true
            },
            {
                id: 'ml_based_v1',
                name: 'Machine Learning Scheduler',
                algorithm_type: 'ml_based',
                version: '1.0.0',
                parameters: {
                    modelType: 'neural_network',
                    learningRate: 0.001,
                    epochs: 100,
                    batchSize: 32
                },
                weights: {
                    location: 0.2,
                    availability: 0.3,
                    cost: 0.2,
                    specialty: 0.3
                },
                is_production: true,
                is_active: true
            },
            {
                id: 'rule_based_v1',
                name: 'Rule-Based Scheduler',
                algorithm_type: 'rule_based',
                version: '1.0.0',
                parameters: {
                    strictMode: true,
                    complianceLevel: 'high',
                    priorityWeighting: 'balanced'
                },
                weights: {
                    location: 0.3,
                    availability: 0.4,
                    cost: 0.15,
                    specialty: 0.15
                },
                is_production: true,
                is_active: true
            },
            {
                id: 'anthropic_v1',
                name: 'AI-Powered Scheduler',
                algorithm_type: 'anthropic',
                version: '1.0.0',
                parameters: {
                    model: 'claude-3-sonnet',
                    temperature: 0.3,
                    maxTokens: 4000
                },
                weights: {
                    location: 0.25,
                    availability: 0.25,
                    cost: 0.25,
                    specialty: 0.25
                },
                is_production: false,
                is_active: true
            }
        ];

        // Initialize each algorithm with its scheduler instance
        defaultConfigs.forEach(config => {
            try {
                let scheduler;
                
                switch (config.algorithm_type) {
                    case 'linear_programming':
                        scheduler = new LinearProgrammingScheduler();
                        break;
                    case 'genetic':
                        scheduler = new GeneticAlgorithmScheduler();
                        break;
                    case 'ml_based':
                        scheduler = new MachineLearningScheduler();
                        break;
                    case 'rule_based':
                        scheduler = new RuleBasedScheduler();
                        break;
                    case 'anthropic':
                        scheduler = new AnthropicScheduler();
                        break;
                    default:
                        throw new Error(`Unknown algorithm type: ${config.algorithm_type}`);
                }

                const algorithmData: AlgorithmData = {
                    scheduler,
                    config,
                    stats: {
                        totalRuns: 0,
                        successfulRuns: 0,
                        averageExecutionTime: 0,
                        averageOptimizationScore: 0
                    }
                };

                this.algorithms.set(config.id, algorithmData);
                logger.info(`Initialized algorithm: ${config.name}`, { algorithmId: config.id });
            } catch (error) {
                logger.error(`Failed to initialize algorithm: ${config.name}`, { 
                    algorithmId: config.id, 
                    error: (error as Error).message 
                });
            }
        });

        logger.info('Algorithm initialization completed', { 
            totalAlgorithms: this.algorithms.size 
        });
    }

    /**
     * Run multiple algorithms in parallel and return results
     */
    async runMultipleAlgorithms(context: SchedulingContext): Promise<AlgorithmResult[]> {
        const activeAlgorithms = Array.from(this.algorithms.values())
            .filter(algo => algo.config.is_active);

        if (activeAlgorithms.length === 0) {
            throw new Error('No active algorithms available');
        }

        logger.info('Running multiple algorithms', { 
            algorithmCount: activeAlgorithms.length,
            algorithms: activeAlgorithms.map(a => a.config.name)
        });

        const algorithmPromises = activeAlgorithms.map(algorithmData =>
            this.runSingleAlgorithmWithTimeout(algorithmData, context, 30000) // 30 second timeout
        );

        try {
            const results = await Promise.allSettled(algorithmPromises);
            const successfulResults: AlgorithmResult[] = [];

            results.forEach((result, index) => {
                const algorithmData = activeAlgorithms[index];
                
                if (result.status === 'fulfilled' && result.value) {
                    successfulResults.push(result.value);
                    logger.info('Algorithm completed successfully', { 
                        algorithmId: algorithmData.config.id,
                        score: result.value.score,
                        executionTime: result.value.executionTime
                    });
                } else {
                    logger.error('Algorithm failed', { 
                        algorithmId: algorithmData.config.id,
                        error: result.status === 'rejected' ? result.reason?.message : 'Unknown error'
                    });
                }
            });

            if (successfulResults.length === 0) {
                throw new Error('All algorithms failed to generate schedules');
            }

            logger.info('Multiple algorithm execution completed', { 
                successful: successfulResults.length,
                failed: activeAlgorithms.length - successfulResults.length
            });

            return successfulResults;
        } catch (error) {
            logger.error('Failed to run multiple algorithms:', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Run a single algorithm with timeout protection
     */
    private async runSingleAlgorithmWithTimeout(
        algorithmData: AlgorithmData,
        context: SchedulingContext,
        timeoutMs: number = 30000
    ): Promise<AlgorithmResult | null> {
        const startTime = Date.now();

        return new Promise(async (resolve, reject) => {
            // Set timeout
            const timeout = setTimeout(() => {
                reject(new Error(`Algorithm ${algorithmData.config.name} timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            try {
                const result = await algorithmData.scheduler.generateSchedule(context);
                clearTimeout(timeout);

                const executionTime = Date.now() - startTime;

                // Update algorithm statistics
                await this.dataProvider.updateAlgorithmStats(
                    algorithmData.config.id,
                    result,
                    executionTime
                );

                const algorithmResult: AlgorithmResult = {
                    algorithmId: algorithmData.config.id,
                    algorithmName: algorithmData.config.name,
                    algorithmType: algorithmData.config.algorithm_type,
                    result: result,
                    score: result.optimizationScore || 0,
                    executionTime,
                    feasible: result.feasible,
                    confidence: result.confidence || 0.5,
                    partnerId: result.partnerId,
                    partnerName: result.partnerName,
                    visits: result.visits,
                    totalHours: result.totalHours,
                    metadata: {
                        algorithmVersion: algorithmData.config.version,
                        parameters: algorithmData.config.parameters,
                        weights: algorithmData.config.weights
                    }
                };

                resolve(algorithmResult);
            } catch (error) {
                clearTimeout(timeout);
                logger.error('Algorithm execution failed:', { 
                    algorithmId: algorithmData.config.id,
                    error: (error as Error).message
                });
                reject(error);
            }
        });
    }

    /**
     * Select the best schedule from multiple algorithm results
     */
    async selectBestSchedule(algorithmResults: AlgorithmResult[], context: SchedulingContext): Promise<AlgorithmResult> {
        if (algorithmResults.length === 0) {
            throw new Error('No algorithm results available for selection');
        }

        // Filter feasible results
        const feasibleResults = algorithmResults.filter(result => result.feasible);
        
        if (feasibleResults.length === 0) {
            // If no feasible results, select the best unfeasible one
            logger.warn('No feasible schedules found, selecting best unfeasible result');
            return algorithmResults.reduce((best, current) => 
                current.score > best.score ? current : best
            );
        }

        // Score feasible results using weighted criteria
        const scoredResults = feasibleResults.map(result => {
            let totalScore = result.score * 0.4; // Base optimization score (40%)
            
            // Execution time bonus (faster is better) (20%)
            const maxExecutionTime = Math.max(...feasibleResults.map(r => r.executionTime));
            const executionBonus = maxExecutionTime > 0 ? 
                (1 - (result.executionTime / maxExecutionTime)) * 20 : 0;
            totalScore += executionBonus;
            
            // Confidence bonus (30%)
            totalScore += result.confidence * 30;
            
            // Algorithm type preference (10%)
            const typeBonus = this.getAlgorithmTypeBonus(result.algorithmType, context);
            totalScore += typeBonus;

            return {
                ...result,
                finalScore: totalScore
            };
        });

        // Select the best result
        const bestResult = scoredResults.reduce((best, current) => 
            current.finalScore > best.finalScore ? current : best
        );

        logger.info('Best schedule selected', { 
            algorithmId: bestResult.algorithmId,
            algorithmName: bestResult.algorithmName,
            finalScore: bestResult.finalScore,
            originalScore: bestResult.score
        });

        return bestResult;
    }

    /**
     * Get algorithm type bonus based on context
     */
    private getAlgorithmTypeBonus(algorithmType: string, context: SchedulingContext): number {
        // Add context-specific bonuses for algorithm types
        if (context.constraints.minimumVisitDuration > 4 && algorithmType === 'linear_programming') {
            return 5; // Linear programming is good for long duration constraints
        }
        
        if (context.availablePartners.length > 10 && algorithmType === 'genetic') {
            return 5; // Genetic algorithms handle large partner pools well
        }
        
        if (context.historicalData.length > 100 && algorithmType === 'ml_based') {
            return 5; // ML benefits from historical data
        }
        
        return 0;
    }

    /**
     * Generate performance comparison report
     */
    generatePerformanceComparison(algorithmResults: AlgorithmResult[]): PerformanceComparison | null {
        if (algorithmResults.length === 0) return null;

        const successfulResults = algorithmResults.filter(r => r.feasible);
        
        if (successfulResults.length === 0) return null;

        const bestResult = successfulResults.reduce((best, current) => 
            current.score > best.score ? current : best
        );

        const averageScore = successfulResults.reduce((sum, r) => sum + r.score, 0) / successfulResults.length;
        const averageExecutionTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length;
        
        const scores = successfulResults.map(r => r.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const performanceSpread = maxScore - minScore;

        const algorithmRankings = successfulResults
            .map((result, index) => ({
                rank: 0, // Will be set below
                algorithmId: result.algorithmId,
                algorithmName: result.algorithmName,
                score: result.score,
                executionTime: result.executionTime,
                feasible: result.feasible
            }))
            .sort((a, b) => b.score - a.score)
            .map((item, index) => ({ ...item, rank: index + 1 }));

        return {
            totalAlgorithms: algorithmResults.length,
            successfulAlgorithms: successfulResults.length,
            bestPerformer: {
                algorithmId: bestResult.algorithmId,
                algorithmName: bestResult.algorithmName,
                score: bestResult.score,
                executionTime: bestResult.executionTime
            },
            averageScore,
            averageExecutionTime,
            performanceSpread,
            algorithmRankings
        };
    }

    /**
     * Get all available algorithms
     */
    getAvailableAlgorithms(): AlgorithmConfig[] {
        return Array.from(this.algorithms.values()).map(data => data.config);
    }

    /**
     * Get algorithm by ID
     */
    getAlgorithm(algorithmId: string): AlgorithmData | undefined {
        return this.algorithms.get(algorithmId);
    }
}

export default AISchedulingAlgorithmManager;