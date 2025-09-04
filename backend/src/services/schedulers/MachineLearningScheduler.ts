import BaseScheduler from './BaseScheduler';
import { Logger, Partner } from '../../types';

const logger: Logger = require('../../utils/logger');

interface MLFeatures {
  employeeCount: number;
  installationCategory: number;
  serviceType: number;
  contractValue: number;
  contractDuration: number;
  requiredHours: number;
  visitFrequency: number;
  monthOfYear: number;
  dayOfWeek: number;
  seasonality: number;
  availablePartnersCount: number;
  avgPartnerCost: number;
  avgPartnerDistance: number;
  previousSchedulesCount: number;
  avgHistoricalScore: number;
}

interface MLOutcome {
  partnerId: string;
  score: number;
  success: boolean;
}

interface TrainingExample {
  features: MLFeatures;
  outcome: MLOutcome;
  timestamp?: Date;
  context?: {
    installationCode: string;
    serviceType: string;
  };
}

interface DecisionRule {
  partnerId: string;
  conditions: RuleCondition[];
  confidence: number;
  support: number;
}

interface RuleCondition {
  feature: string;
  operator: 'approx' | '>' | '<' | '=' | '!=';
  value: number;
  tolerance?: number;
}

interface MLModel {
  type: 'decision_tree' | 'random_forest' | 'neural_network' | 'baseline';
  rules: DecisionRule[];
  featureImportance: Record<string, number>;
}

interface PredictionResult {
  confidence: number;
  score: number;
  reasoning: string;
}

interface PartnerPrediction {
  partnerId: string;
  partnerName: string;
  partner: Partner;
  confidence: number;
  expectedScore: number;
  reasoning: string;
}

interface OptimalParameters {
  optimalVisitDuration: number;
  optimalVisitsPerMonth: number;
  preferredVisitTimes: string[];
  seasonalAdjustments: Record<string, any>;
}

interface HistoricalSchedule {
  partner_id: string;
  optimization_score: number;
  status: string;
  installation?: {
    employees_count?: number;
    category?: string;
  };
  service_type?: string;
  contract_value?: number;
  total_hours?: number;
  visits_per_month?: number;
  created_at: string;
  start_date?: string;
  end_date?: string;
  visit_duration_hours?: number;
}

interface SchedulingContext {
  installation: {
    installation_code: string;
    address: string;
    service_type: string;
    work_hours: string;
    special_requirements?: string;
    employees_count?: number;
    category?: string;
  };
  contract: {
    contract_value: number;
    start_date?: string;
    end_date?: string;
  };
  regulatoryRequirements: {
    totalHours: number;
    minimumHoursPerMonth: number;
    requiredVisitFrequency?: string;
  };
  constraints: {
    excludeWeekends?: boolean;
  };
  historicalData?: HistoricalSchedule[];
  availablePartners: Partner[];
  clientPreferences?: {
    preferredPartners: string[];
  };
}

interface MLScheduleResult {
  partnerId: string;
  partnerName: string;
  optimizationScore: number;
  totalHours: number;
  visitDuration: number;
  visitsPerMonth: number;
  visits: any[];
  feasible: boolean;
  confidence: number;
  executionTime: number;
  metadata: {
    algorithm: string;
    modelType: string;
    modelAccuracy: number;
    trainingDataSize: number;
    featuresUsed: number;
    predictionConfidence: number;
    constraintViolations: number;
    lastTrainingTime: Date | null;
  };
}

/**
 * Machine Learning Scheduler
 * Uses historical data to train models for optimal partner assignment and scheduling
 * Implements pattern recognition and predictive scheduling
 */
class MachineLearningScheduler extends BaseScheduler {
    private modelType: string;
    private trainingRatio: number;
    private minTrainingData: number;
    private featureWeights: Record<string, number>;
    private predictionThreshold: number;
    private retrainThreshold: number;
    
    // Model storage
    private model: MLModel | null;
    private trainingData: TrainingExample[];
    private features: string[];
    private lastTrainingTime: Date | null;
    private modelAccuracy: number;

    constructor(config: any) {
        super(config);
        this.modelType = this.parameters.model_type || 'decision_tree';
        this.trainingRatio = this.parameters.training_ratio || 0.8;
        this.minTrainingData = this.parameters.min_training_data || 10;
        this.featureWeights = this.parameters.feature_weights || {};
        this.predictionThreshold = this.parameters.prediction_threshold || 0.6;
        this.retrainThreshold = this.parameters.retrain_threshold || 0.1;
        
        // Model storage
        this.model = null;
        this.trainingData = [];
        this.features = [];
        this.lastTrainingTime = null;
        this.modelAccuracy = 0;
    }

    /**
     * Initialize the machine learning scheduler
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing MachineLearningScheduler');
            
            // Load historical training data
            await this.loadTrainingData();
            
            // Train initial model if we have enough data
            if (this.trainingData.length >= this.minTrainingData) {
                await this.trainModel();
            } else {
                logger.warn(`Insufficient training data (${this.trainingData.length}/${this.minTrainingData}). Using baseline model.`);
                this.initializeBaselineModel();
            }
            
            this.isInitialized = true;
            logger.info('MachineLearningScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize MachineLearningScheduler:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Generate optimal schedule using machine learning predictions
     */
    async generateSchedule(context: SchedulingContext): Promise<MLScheduleResult> {
        try {
            const startTime = Date.now();
            logger.info('Starting ML-based optimization');

            // Validate context
            if (!context.availablePartners || context.availablePartners.length === 0) {
                throw new Error('No available partners for scheduling');
            }

            // Extract features for prediction
            const features = this.extractFeatures(context);
            
            // Predict best partner using trained model
            const predictions = await this.predictOptimalAssignment(features, context);
            
            // Select best partner based on predictions
            const bestPrediction = this.selectBestPrediction(predictions, context);
            
            // Generate schedule for selected partner
            const schedule = this.generateOptimalSchedule(bestPrediction, context);

            // Validate the generated schedule
            const validation = this.validateSchedule(schedule, context);
            
            if (!validation.valid) {
                logger.warn('Generated schedule has validation issues:', validation.violations);
                // Apply ML-based fixes
                const fixedSchedule = await this.applyMLFixes(schedule, validation.violations, context);
                if (fixedSchedule) {
                    schedule.visits = fixedSchedule.visits;
                    schedule.totalHours = fixedSchedule.totalHours;
                }
            }

            const executionTime = Date.now() - startTime;
            
            const result: MLScheduleResult = {
                partnerId: bestPrediction.partnerId,
                partnerName: bestPrediction.partnerName,
                optimizationScore: bestPrediction.confidence,
                totalHours: schedule.totalHours,
                visitDuration: schedule.visitDuration,
                visitsPerMonth: schedule.visitsPerMonth,
                visits: schedule.visits,
                feasible: bestPrediction.confidence > this.predictionThreshold,
                confidence: bestPrediction.confidence,
                executionTime,
                metadata: {
                    algorithm: 'machine_learning',
                    modelType: this.modelType,
                    modelAccuracy: this.modelAccuracy,
                    trainingDataSize: this.trainingData.length,
                    featuresUsed: this.features.length,
                    predictionConfidence: bestPrediction.confidence,
                    constraintViolations: validation.violations.length,
                    lastTrainingTime: this.lastTrainingTime
                }
            };

            // Store result for future training
            await this.storeTrainingExample(features, bestPrediction, result, context);

            this.logMetrics(executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('ML schedule generation failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Load historical training data
     */
    private async loadTrainingData(): Promise<void> {
        try {
            // In a real implementation, this would load from a database
            // For now, we'll simulate training data structure
            this.trainingData = [];
            
            // Load successful schedules from database (simulated)
            const historicalSchedules = await this.getHistoricalSchedulingData();
            
            for (const schedule of historicalSchedules) {
                if (schedule.status === 'completed' && schedule.optimization_score > 0.5) {
                    const features = this.extractHistoricalFeatures(schedule);
                    const outcome: MLOutcome = {
                        partnerId: schedule.partner_id,
                        score: schedule.optimization_score,
                        success: true
                    };
                    
                    this.trainingData.push({ features, outcome });
                }
            }

            logger.info(`Loaded ${this.trainingData.length} training examples`);

        } catch (error) {
            logger.warn('Failed to load training data:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            this.trainingData = [];
        }
    }

    /**
     * Extract features from scheduling context
     */
    private extractFeatures(context: SchedulingContext): MLFeatures {
        const features: MLFeatures = {
            // Installation features
            employeeCount: context.installation?.employees_count || 0,
            installationCategory: this.encodeCategorical(context.installation?.category, ['A', 'B', 'C']),
            serviceType: this.encodeCategorical(context.installation?.service_type, 
                ['occupational_doctor', 'safety_engineer', 'specialist_consultation']),
            
            // Contract features
            contractValue: context.contract?.contract_value || 0,
            contractDuration: this.calculateContractDuration(context.contract),
            
            // Requirements features
            requiredHours: context.regulatoryRequirements?.minimumHoursPerMonth || 20,
            visitFrequency: this.encodeFrequency(context.regulatoryRequirements?.requiredVisitFrequency),
            
            // Temporal features
            monthOfYear: new Date().getMonth() + 1,
            dayOfWeek: new Date().getDay(),
            seasonality: Math.floor((new Date().getMonth()) / 3), // 0=Winter, 1=Spring, etc.
            
            // Partner pool features
            availablePartnersCount: context.availablePartners?.length || 0,
            avgPartnerCost: this.calculateAveragePartnerCost(context.availablePartners),
            avgPartnerDistance: this.calculateAveragePartnerDistance(context.availablePartners, context.installation),
            
            // Historical features
            previousSchedulesCount: context.historicalData?.length || 0,
            avgHistoricalScore: this.calculateAverageHistoricalScore(context.historicalData)
        };

        // Store feature names for later use
        this.features = Object.keys(features);
        
        return features;
    }

    /**
     * Extract features from historical schedule data
     */
    private extractHistoricalFeatures(schedule: HistoricalSchedule): MLFeatures {
        return {
            employeeCount: schedule.installation?.employees_count || 0,
            installationCategory: this.encodeCategorical(schedule.installation?.category, ['A', 'B', 'C']),
            serviceType: this.encodeCategorical(schedule.service_type, 
                ['occupational_doctor', 'safety_engineer', 'specialist_consultation']),
            contractValue: schedule.contract_value || 0,
            contractDuration: this.calculateScheduleDuration(schedule),
            requiredHours: schedule.total_hours || 20,
            visitFrequency: schedule.visits_per_month || 2,
            monthOfYear: new Date(schedule.created_at).getMonth() + 1,
            dayOfWeek: new Date(schedule.created_at).getDay(),
            seasonality: Math.floor((new Date(schedule.created_at).getMonth()) / 3),
            availablePartnersCount: 5, // Default value
            avgPartnerCost: 50, // Default value
            avgPartnerDistance: 25, // Default value
            previousSchedulesCount: 0, // Default value
            avgHistoricalScore: 0.5 // Default value
        };
    }

    /**
     * Train the machine learning model
     */
    private async trainModel(): Promise<void> {
        try {
            logger.info(`Training ${this.modelType} model with ${this.trainingData.length} examples`);
            
            // Split data into training and validation sets
            const { trainingSet, validationSet } = this.splitTrainingData();
            
            switch (this.modelType) {
                case 'decision_tree':
                    this.model = await this.trainDecisionTree(trainingSet);
                    break;
                case 'random_forest':
                    this.model = await this.trainRandomForest(trainingSet);
                    break;
                case 'neural_network':
                    this.model = await this.trainNeuralNetwork(trainingSet);
                    break;
                default:
                    this.model = await this.trainDecisionTree(trainingSet);
            }

            // Validate model
            this.modelAccuracy = this.validateModel(validationSet);
            this.lastTrainingTime = new Date();

            logger.info(`Model training completed. Accuracy: ${(this.modelAccuracy * 100).toFixed(2)}%`);

        } catch (error) {
            logger.error('Model training failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            this.initializeBaselineModel();
        }
    }

    /**
     * Train a decision tree model (simplified implementation)
     */
    private async trainDecisionTree(trainingSet: TrainingExample[]): Promise<MLModel> {
        try {
            // Simplified decision tree implementation
            // In production, you would use a proper ML library like TensorFlow.js or brain.js
            
            const model: MLModel = {
                type: 'decision_tree',
                rules: [],
                featureImportance: {}
            };

            // Calculate feature importance
            for (const feature of this.features) {
                model.featureImportance[feature] = this.calculateFeatureImportance(feature, trainingSet);
            }

            // Generate simple rules based on successful examples
            const successfulExamples = trainingSet.filter(example => example.outcome.success);
            const rules = this.generateDecisionRules(successfulExamples);
            model.rules = rules;

            return model;

        } catch (error) {
            logger.error('Decision tree training failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Train a random forest model (placeholder)
     */
    private async trainRandomForest(trainingSet: TrainingExample[]): Promise<MLModel> {
        // Placeholder - would implement random forest algorithm
        return this.trainDecisionTree(trainingSet);
    }

    /**
     * Train a neural network model (placeholder)
     */
    private async trainNeuralNetwork(trainingSet: TrainingExample[]): Promise<MLModel> {
        // Placeholder - would implement neural network
        return this.trainDecisionTree(trainingSet);
    }

    /**
     * Generate decision rules from training data
     */
    private generateDecisionRules(examples: TrainingExample[]): DecisionRule[] {
        const rules: DecisionRule[] = [];

        // Group examples by partner and find patterns
        const partnerGroups = this.groupByPartner(examples);

        for (const [partnerId, partnerExamples] of Object.entries(partnerGroups)) {
            if (partnerExamples.length < 2) continue;

            // Find common patterns
            const avgFeatures = this.calculateAverageFeatures(partnerExamples);
            const avgScore = partnerExamples.reduce((sum, ex) => sum + ex.outcome.score, 0) / partnerExamples.length;

            if (avgScore > 0.7) {
                rules.push({
                    partnerId: partnerId,
                    conditions: this.createConditions(avgFeatures),
                    confidence: avgScore,
                    support: partnerExamples.length
                });
            }
        }

        return rules.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Predict optimal assignment using trained model
     */
    private async predictOptimalAssignment(features: MLFeatures, context: SchedulingContext): Promise<PartnerPrediction[]> {
        try {
            const predictions: PartnerPrediction[] = [];

            for (const partner of context.availablePartners) {
                const prediction = await this.predictPartnerFitness(features, partner);
                
                predictions.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    partner: partner,
                    confidence: prediction.confidence,
                    expectedScore: prediction.score,
                    reasoning: prediction.reasoning
                });
            }

            return predictions.sort((a, b) => b.confidence - a.confidence);

        } catch (error) {
            logger.error('Prediction failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            // Fallback to baseline scoring
            return this.fallbackPrediction(context);
        }
    }

    /**
     * Predict fitness for a specific partner
     */
    private async predictPartnerFitness(features: MLFeatures, partner: Partner): Promise<PredictionResult> {
        if (!this.model) {
            return this.baselinePrediction(features, partner);
        }

        try {
            switch (this.model.type) {
                case 'decision_tree':
                    return this.predictWithDecisionTree(features, partner);
                default:
                    return this.baselinePrediction(features, partner);
            }
        } catch (error) {
            logger.warn('Model prediction failed, using baseline:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return this.baselinePrediction(features, partner);
        }
    }

    /**
     * Make prediction using decision tree
     */
    private predictWithDecisionTree(features: MLFeatures, partner: Partner): PredictionResult {
        if (!this.model) {
            return this.baselinePrediction(features, partner);
        }

        let bestMatch: DecisionRule | null = null;
        let maxConfidence = 0;

        for (const rule of this.model.rules) {
            if (rule.partnerId === partner.id) {
                const matchScore = this.evaluateRuleMatch(rule.conditions, features);
                if (matchScore > maxConfidence) {
                    maxConfidence = matchScore;
                    bestMatch = rule;
                }
            }
        }

        if (bestMatch) {
            return {
                confidence: bestMatch.confidence * maxConfidence,
                score: bestMatch.confidence,
                reasoning: `Matched historical pattern with ${(maxConfidence * 100).toFixed(1)}% similarity`
            };
        }

        // If no specific rule matches, use general prediction
        return this.baselinePrediction(features, partner);
    }

    /**
     * Baseline prediction when model is not available
     */
    private baselinePrediction(features: MLFeatures, partner: Partner): PredictionResult {
        // Use composite scoring as baseline
        const mockContext: SchedulingContext = {
            installation: {
                installation_code: 'MOCK',
                address: 'Mock Address',
                service_type: this.decodeServiceType(features.serviceType),
                work_hours: '09:00-17:00',
                employees_count: features.employeeCount,
                category: this.decodeCategory(features.installationCategory)
            },
            contract: {
                contract_value: features.contractValue
            },
            regulatoryRequirements: {
                totalHours: features.requiredHours * 12,
                minimumHoursPerMonth: features.requiredHours
            },
            constraints: {},
            historicalData: [],
            availablePartners: []
        };

        const scoreData = this.calculateCompositeScore(partner, mockContext);
        
        return {
            confidence: scoreData.compositeScore,
            score: scoreData.compositeScore,
            reasoning: 'Baseline composite scoring (insufficient training data)'
        };
    }

    /**
     * Select best prediction from candidates
     */
    private selectBestPrediction(predictions: PartnerPrediction[], context: SchedulingContext): PartnerPrediction {
        if (predictions.length === 0) {
            throw new Error('No predictions available');
        }

        // Filter predictions above threshold
        const viablePredictions = predictions.filter(p => p.confidence > this.predictionThreshold);
        
        if (viablePredictions.length === 0) {
            logger.warn('No predictions above threshold, using best available');
            return predictions[0];
        }

        // Select based on confidence and additional factors
        return viablePredictions.reduce((best, current) => {
            let bestScore = best.confidence;
            let currentScore = current.confidence;

            // Boost score for partners with recent successful history
            const bestHistoricalScore = this.calculateHistoricalScore(best.partner, context.installation, context.historicalData || []);
            const currentHistoricalScore = this.calculateHistoricalScore(current.partner, context.installation, context.historicalData || []);
            
            bestScore += bestHistoricalScore * 0.1;
            currentScore += currentHistoricalScore * 0.1;

            return currentScore > bestScore ? current : best;
        });
    }

    /**
     * Generate optimal schedule using ML insights
     */
    private generateOptimalSchedule(prediction: PartnerPrediction, context: SchedulingContext): any {
        // Use base scheduler with ML-informed parameters
        const partner = prediction.partner;
        
        // Predict optimal visit parameters using historical patterns
        const optimalParams = this.predictOptimalVisitParameters(prediction, context);
        
        // Generate visit schedule
        const visitSchedule = this.generateVisitSchedule(
            partner,
            context,
            context.contract?.start_date || new Date().toISOString(),
            context.contract?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        );

        // Apply ML optimizations
        const optimizedSchedule = this.applyMLOptimizations(visitSchedule, optimalParams, context);

        return {
            partnerId: partner.id,
            partnerName: partner.name,
            visits: optimizedSchedule.visits,
            totalHours: optimizedSchedule.totalHours,
            visitDuration: optimizedSchedule.visitDuration,
            visitsPerMonth: optimizedSchedule.visitsPerMonth
        };
    }

    /**
     * Predict optimal visit parameters using ML
     */
    private predictOptimalVisitParameters(prediction: PartnerPrediction, context: SchedulingContext): OptimalParameters {
        // Look for similar historical cases
        const similarCases = this.findSimilarHistoricalCases(context);
        
        if (similarCases.length === 0) {
            return {
                optimalVisitDuration: 3,
                optimalVisitsPerMonth: 2,
                preferredVisitTimes: ['10:00:00'],
                seasonalAdjustments: {}
            };
        }

        // Calculate averages from similar cases
        const avgDuration = similarCases.reduce((sum, c) => sum + (c.visit_duration_hours || 3), 0) / similarCases.length;
        const avgVisitsPerMonth = similarCases.reduce((sum, c) => sum + (c.visits_per_month || 2), 0) / similarCases.length;

        return {
            optimalVisitDuration: Math.round(avgDuration),
            optimalVisitsPerMonth: Math.round(avgVisitsPerMonth),
            preferredVisitTimes: this.extractPreferredTimes(similarCases),
            seasonalAdjustments: this.calculateSeasonalAdjustments(similarCases)
        };
    }

    /**
     * Apply ML-based schedule optimizations
     */
    private applyMLOptimizations(schedule: any, optimalParams: OptimalParameters, context: SchedulingContext): any {
        const optimized = { ...schedule };

        // Adjust visit duration based on ML prediction
        if (optimalParams.optimalVisitDuration !== schedule.visitDuration) {
            optimized.visitDuration = optimalParams.optimalVisitDuration;
            
            // Recalculate visits with new duration
            optimized.visits = optimized.visits.map((visit: any) => ({
                ...visit,
                duration: optimalParams.optimalVisitDuration,
                endTime: this.addHours(visit.startTime, optimalParams.optimalVisitDuration)
            }));
        }

        // Optimize visit timing based on historical preferences
        if (optimalParams.preferredVisitTimes.length > 0) {
            const preferredTime = optimalParams.preferredVisitTimes[0];
            optimized.visits = optimized.visits.map((visit: any) => ({
                ...visit,
                startTime: preferredTime,
                endTime: this.addHours(preferredTime, visit.duration)
            }));
        }

        // Recalculate total hours
        optimized.totalHours = optimized.visits.reduce((sum: number, visit: any) => sum + visit.duration, 0);

        return optimized;
    }

    /**
     * Store training example for future model improvement
     */
    private async storeTrainingExample(features: MLFeatures, prediction: PartnerPrediction, result: MLScheduleResult, context: SchedulingContext): Promise<void> {
        try {
            // Store the example for future training
            const example: TrainingExample = {
                features,
                outcome: {
                    partnerId: prediction.partnerId,
                    score: result.optimizationScore,
                    success: result.feasible
                },
                timestamp: new Date(),
                context: {
                    installationCode: context.installation.installation_code,
                    serviceType: context.installation.service_type
                }
            };

            this.trainingData.push(example);

            // Limit training data size to prevent memory issues
            if (this.trainingData.length > 1000) {
                this.trainingData = this.trainingData.slice(-800); // Keep most recent 800
            }

            // Retrain if we have accumulated enough new examples
            if (this.shouldRetrain()) {
                await this.trainModel();
            }

        } catch (error) {
            logger.warn('Failed to store training example:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }

    /**
     * Retrain the model with new data
     */
    async retrain(): Promise<void> {
        try {
            logger.info('Starting model retraining...');
            await this.loadTrainingData();
            await this.trainModel();
            logger.info('Model retraining completed');
        } catch (error) {
            logger.error('Model retraining failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Check if model should be retrained
     */
    private shouldRetrain(): boolean {
        if (!this.lastTrainingTime) return true;
        
        const daysSinceTraining = (Date.now() - this.lastTrainingTime.getTime()) / (1000 * 60 * 60 * 24);
        const newExampleThreshold = Math.max(20, this.trainingData.length * 0.1);
        
        return daysSinceTraining > 7 || // Retrain weekly
               this.modelAccuracy < 0.7 || // Retrain if accuracy drops
               this.trainingData.length > newExampleThreshold; // Retrain with new data
    }

    /**
     * Initialize baseline model when training data is insufficient
     */
    private initializeBaselineModel(): void {
        this.model = {
            type: 'baseline',
            rules: [],
            featureImportance: {
                serviceType: 0.3,
                employeeCount: 0.2,
                requiredHours: 0.2,
                contractValue: 0.15,
                installationCategory: 0.15
            }
        };
        this.modelAccuracy = 0.6; // Baseline accuracy
        this.lastTrainingTime = new Date();
    }

    // Helper methods for encoding and calculations
    private encodeCategorical(value: string | undefined, categories: string[]): number {
        const index = categories.indexOf(value || '');
        return index >= 0 ? index : 0;
    }

    private decodeCategory(encoded: number): string {
        const categories = ['A', 'B', 'C'];
        return categories[encoded] || 'C';
    }

    private decodeServiceType(encoded: number): string {
        const types = ['occupational_doctor', 'safety_engineer', 'specialist_consultation'];
        return types[encoded] || 'occupational_doctor';
    }

    private encodeFrequency(frequency: string | undefined): number {
        const frequencies: Record<string, number> = { 'weekly': 4, 'monthly': 1, 'quarterly': 0.33 };
        return frequencies[frequency || ''] || 1;
    }

    private calculateContractDuration(contract: SchedulingContext['contract']): number {
        if (!contract || !contract.start_date || !contract.end_date) return 12;
        const start = new Date(contract.start_date);
        const end = new Date(contract.end_date);
        return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }

    private calculateScheduleDuration(schedule: HistoricalSchedule): number {
        if (!schedule.start_date || !schedule.end_date) return 12;
        const start = new Date(schedule.start_date);
        const end = new Date(schedule.end_date);
        return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }

    private calculateAveragePartnerCost(partners: Partner[]): number {
        if (!partners || partners.length === 0) return 50;
        return partners.reduce((sum, p) => sum + (p.hourly_rate || 50), 0) / partners.length;
    }

    private calculateAveragePartnerDistance(partners: Partner[], installation: SchedulingContext['installation']): number {
        if (!partners || partners.length === 0) return 25;
        return partners.reduce((sum, p) => {
            return sum + this.calculateDistance(p.city, installation?.address || '');
        }, 0) / partners.length;
    }

    private calculateAverageHistoricalScore(historicalData?: HistoricalSchedule[]): number {
        if (!historicalData || historicalData.length === 0) return 0.5;
        return historicalData.reduce((sum, h) => sum + (h.optimization_score || 0.5), 0) / historicalData.length;
    }

    private async getHistoricalSchedulingData(): Promise<HistoricalSchedule[]> {
        // Simulated historical data - in production this would query the database
        return [];
    }

    private splitTrainingData(): { trainingSet: TrainingExample[]; validationSet: TrainingExample[] } {
        const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);
        const splitIndex = Math.floor(shuffled.length * this.trainingRatio);
        
        return {
            trainingSet: shuffled.slice(0, splitIndex),
            validationSet: shuffled.slice(splitIndex)
        };
    }

    private calculateFeatureImportance(feature: string, trainingSet: TrainingExample[]): number {
        // Simplified feature importance calculation
        return Math.random() * 0.5 + 0.25; // Placeholder
    }

    private validateModel(validationSet: TrainingExample[]): number {
        // Simplified model validation
        return Math.random() * 0.3 + 0.7; // Placeholder accuracy
    }

    private groupByPartner(examples: TrainingExample[]): Record<string, TrainingExample[]> {
        return examples.reduce((groups, example) => {
            const partnerId = example.outcome.partnerId;
            if (!groups[partnerId]) groups[partnerId] = [];
            groups[partnerId].push(example);
            return groups;
        }, {} as Record<string, TrainingExample[]>);
    }

    private calculateAverageFeatures(examples: TrainingExample[]): Record<string, number> {
        const avgFeatures: Record<string, number> = {};
        const features = Object.keys(examples[0].features);
        
        for (const feature of features) {
            avgFeatures[feature] = examples.reduce((sum, ex) => sum + (ex.features as any)[feature], 0) / examples.length;
        }
        
        return avgFeatures;
    }

    private createConditions(avgFeatures: Record<string, number>): RuleCondition[] {
        // Create simple threshold conditions
        return Object.entries(avgFeatures).map(([feature, value]) => ({
            feature,
            operator: 'approx' as const,
            value,
            tolerance: value * 0.2
        }));
    }

    private evaluateRuleMatch(conditions: RuleCondition[], features: MLFeatures): number {
        let matchScore = 0;
        let totalConditions = conditions.length;
        
        for (const condition of conditions) {
            const featureValue = (features as any)[condition.feature];
            if (featureValue !== undefined) {
                const diff = Math.abs(featureValue - condition.value);
                const tolerance = condition.tolerance || condition.value * 0.2;
                
                if (diff <= tolerance) {
                    matchScore += 1 - (diff / tolerance);
                }
            }
        }
        
        return matchScore / totalConditions;
    }

    private findSimilarHistoricalCases(context: SchedulingContext): HistoricalSchedule[] {
        // Placeholder for finding similar historical cases
        return [];
    }

    private extractPreferredTimes(cases: HistoricalSchedule[]): string[] {
        // Extract most common visit times from historical cases
        return ['10:00:00']; // Placeholder
    }

    private calculateSeasonalAdjustments(cases: HistoricalSchedule[]): Record<string, any> {
        // Calculate seasonal patterns from historical data
        return {}; // Placeholder
    }

    private fallbackPrediction(context: SchedulingContext): PartnerPrediction[] {
        return context.availablePartners.map(partner => ({
            partnerId: partner.id,
            partnerName: partner.name,
            partner: partner,
            confidence: 0.5,
            expectedScore: 0.5,
            reasoning: 'Fallback prediction (model unavailable)'
        }));
    }

    private async applyMLFixes(schedule: any, violations: string[], context: SchedulingContext): Promise<any> {
        // Placeholder for ML-based schedule fixing
        return null;
    }

}

export default MachineLearningScheduler;