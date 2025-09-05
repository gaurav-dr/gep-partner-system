import { Logger } from '../../types';
import { 
    OptimizationContext, 
    OptimizationResult, 
    OptimizationFactors, 
    DurationOption,
    OptimizationConfig 
} from '../types';
import { OptimizationConfigManager } from '../config/optimization-config';
import { InstallationFactorCalculator } from '../factors/installation-factor';
import { PartnerFactorCalculator } from '../factors/partner-factor';
import { CostFactorCalculator } from '../factors/cost-factor';
import { ProximityFactorCalculator } from '../factors/proximity-factor';
import { HistoricalFactorCalculator } from '../factors/historical-factor';
import { RegulatoryFactorCalculator } from '../factors/regulatory-factor';
import { DurationOptionsGenerator } from '../analysis/duration-options';
import { ReasoningGenerator } from '../analysis/reasoning-generator';

const logger: Logger = require('../../utils/logger');

export class OptimizationEngine {
    private config: OptimizationConfig;
    private installationCalculator: InstallationFactorCalculator;
    private partnerCalculator: PartnerFactorCalculator;
    private costCalculator: CostFactorCalculator;
    private proximityCalculator: ProximityFactorCalculator;
    private historicalCalculator: HistoricalFactorCalculator;
    private regulatoryCalculator: RegulatoryFactorCalculator;
    private durationGenerator: DurationOptionsGenerator;
    private reasoningGenerator: ReasoningGenerator;

    constructor() {
        this.config = OptimizationConfigManager.getInstance().getConfig();
        
        // Initialize factor calculators
        this.installationCalculator = new InstallationFactorCalculator();
        this.partnerCalculator = new PartnerFactorCalculator();
        this.costCalculator = new CostFactorCalculator();
        this.proximityCalculator = new ProximityFactorCalculator();
        this.historicalCalculator = new HistoricalFactorCalculator();
        this.regulatoryCalculator = new RegulatoryFactorCalculator();
        
        // Initialize analysis components
        this.durationGenerator = new DurationOptionsGenerator(this.config);
        this.reasoningGenerator = new ReasoningGenerator();
    }

    async optimizeVisitDuration(context: OptimizationContext): Promise<OptimizationResult> {
        try {
            logger.info('Starting visit duration optimization', {
                installationCode: context.installation?.installation_code,
                partnerId: context.selectedPartner?.id
            });

            // Calculate individual factors
            const factors = await this.calculateOptimizationFactors(context);

            // Generate duration options
            const durationOptions = await this.durationGenerator.generateDurationOptions(context, factors);

            // Select the best option
            const bestOption = this.selectBestOption(durationOptions);

            // Generate reasoning
            const reasoning = this.reasoningGenerator.generateReasoningText(factors, bestOption, context);

            // Calculate cost estimate
            const costEstimate = await this.calculateCostEstimate(bestOption.duration, context);

            const result: OptimizationResult = {
                recommendedDuration: bestOption.duration,
                confidence: bestOption.confidence,
                alternatives: durationOptions.filter(option => option !== bestOption),
                factors,
                reasoning,
                costEstimate
            };

            logger.info('Visit duration optimization completed', {
                installationCode: context.installation?.installation_code,
                recommendedDuration: result.recommendedDuration,
                confidence: result.confidence
            });

            return result;

        } catch (error) {
            logger.error('Visit duration optimization failed:', {
                error: error instanceof Error ? error.message : String(error),
                context: context.installation?.installation_code
            });
            throw error;
        }
    }

    private async calculateOptimizationFactors(context: OptimizationContext): Promise<OptimizationFactors> {
        try {
            const [
                installationFactor,
                partnerFactor,
                costFactor,
                proximityFactor,
                historicalFactor,
                regulatoryFactor
            ] = await Promise.all([
                this.installationCalculator.calculate(context),
                this.partnerCalculator.calculate(context),
                this.costCalculator.calculate(context),
                this.proximityCalculator.calculate(context),
                this.historicalCalculator.calculate(context),
                this.regulatoryCalculator.calculate(context)
            ]);

            // Calculate weighted overall score
            const weights = this.config.weights;
            const overallScore = 
                (installationFactor * weights.installationSize) +
                (partnerFactor * weights.partnerExpertise) +
                (costFactor * weights.costEfficiency) +
                (proximityFactor * weights.proximity) +
                (historicalFactor * weights.historicalData) +
                (regulatoryFactor * weights.regulatoryCompliance);

            return {
                installationFactor,
                partnerFactor,
                costFactor,
                proximityFactor,
                historicalFactor,
                regulatoryFactor,
                overallScore: Math.min(1.0, Math.max(0.0, overallScore))
            };

        } catch (error) {
            logger.error('Factor calculation failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private selectBestOption(options: DurationOption[]): DurationOption {
        if (options.length === 0) {
            throw new Error('No duration options available');
        }

        // Sort by confidence score, then by overall score
        const sortedOptions = options.sort((a, b) => {
            const confidenceDiff = b.confidence - a.confidence;
            if (Math.abs(confidenceDiff) > 0.05) {
                return confidenceDiff;
            }
            return b.factors.overallScore - a.factors.overallScore;
        });

        return sortedOptions[0];
    }

    private async calculateCostEstimate(duration: number, context: OptimizationContext): Promise<number> {
        try {
            const hourlyRate = context.selectedPartner?.hourly_rate || 100; // Default rate
            const baseCost = duration * hourlyRate;
            
            // Add travel and overhead costs
            const travelCost = await this.proximityCalculator.calculateTravelCost(context);
            const overheadMultiplier = 1.3; // 30% overhead
            
            return Math.round((baseCost + travelCost) * overheadMultiplier * 100) / 100;

        } catch (error) {
            logger.error('Cost estimation failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            return duration * 100; // Fallback estimate
        }
    }

    public updateConfig(newConfig: Partial<OptimizationConfig>): void {
        const configManager = OptimizationConfigManager.getInstance();
        
        if (newConfig.weights) {
            configManager.updateWeights(newConfig.weights);
        }
        
        this.config = configManager.getConfig();
        
        // Update duration generator config
        this.durationGenerator = new DurationOptionsGenerator(this.config);
    }

    public async validateOptimization(context: OptimizationContext): Promise<{ valid: boolean; warnings: string[] }> {
        const warnings: string[] = [];

        // Validate context completeness
        if (!context.installation) {
            warnings.push('Installation data is missing');
        }
        
        if (!context.selectedPartner) {
            warnings.push('Selected partner data is missing');
        }

        // Validate partner specialty match
        if (context.installation?.service_type && context.selectedPartner?.specialty) {
            const specialtyMatch = await this.partnerCalculator.validateSpecialtyMatch(
                context.installation.service_type,
                context.selectedPartner.specialty
            );
            
            if (!specialtyMatch) {
                warnings.push('Partner specialty may not match service requirements');
            }
        }

        // Validate regulatory requirements
        if (context.installation?.category) {
            const regulatoryCheck = await this.regulatoryCalculator.validateRequirements(context);
            if (!regulatoryCheck.valid) {
                warnings.push(...regulatoryCheck.warnings);
            }
        }

        return {
            valid: warnings.length === 0,
            warnings
        };
    }

    public getFactorBreakdown(factors: OptimizationFactors): Record<string, { value: number; weight: number; contribution: number }> {
        const weights = this.config.weights;
        
        return {
            installation: {
                value: factors.installationFactor,
                weight: weights.installationSize,
                contribution: factors.installationFactor * weights.installationSize
            },
            partner: {
                value: factors.partnerFactor,
                weight: weights.partnerExpertise,
                contribution: factors.partnerFactor * weights.partnerExpertise
            },
            cost: {
                value: factors.costFactor,
                weight: weights.costEfficiency,
                contribution: factors.costFactor * weights.costEfficiency
            },
            proximity: {
                value: factors.proximityFactor,
                weight: weights.proximity,
                contribution: factors.proximityFactor * weights.proximity
            },
            historical: {
                value: factors.historicalFactor,
                weight: weights.historicalData,
                contribution: factors.historicalFactor * weights.historicalData
            },
            regulatory: {
                value: factors.regulatoryFactor,
                weight: weights.regulatoryCompliance,
                contribution: factors.regulatoryFactor * weights.regulatoryCompliance
            }
        };
    }
}