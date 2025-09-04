import BaseScheduler from './BaseScheduler';
import { Logger, Partner } from '../../types';

const logger: Logger = require('../../utils/logger');

interface Rule {
  id: string;
  name: string;
  category: 'business' | 'regulatory' | 'preference';
  condition: (context: any, partner: Partner) => boolean;
  action: (context: any, partner: Partner) => number | void;
  weight: number;
  priority: number;
  description: string;
}

interface RuleEngineResult {
  partnerId: string;
  score: number;
  appliedRules: string[];
  violations: string[];
  confidence: number;
}

interface SchedulingContext {
  installation: {
    installation_code: string;
    address: string;
    service_type: string;
    work_hours: string;
    special_requirements?: string;
  };
  contract: {
    contract_value: number;
  };
  regulatoryRequirements: {
    totalHours: number;
    minimumHoursPerMonth: number;
  };
  constraints: {
    excludeWeekends?: boolean;
  };
  historicalData?: any[];
  availablePartners: Partner[];
}

/**
 * Rule-Based Expert System Scheduler
 * Uses domain-specific rules and heuristics for partner assignment and scheduling
 * Implements business logic and regulatory compliance rules
 */
class RuleBasedScheduler extends BaseScheduler {
    private priorityRules: string[];
    private strictRules: boolean;
    private ruleWeights: Record<string, number>;
    private flexibilityLevel: 'low' | 'medium' | 'high';
    private complianceMode: 'strict' | 'flexible';
    private rules: Rule[];

    constructor(config: any) {
        super(config);
        this.priorityRules = this.parameters.priority_rules || ['historical_preference', 'cost_efficiency', 'location_proximity'];
        this.strictRules = this.parameters.strict_rules || true;
        this.ruleWeights = this.parameters.rule_weights || {};
        this.flexibilityLevel = this.parameters.flexibility_level || 'medium';
        this.complianceMode = this.parameters.compliance_mode || 'strict';
        
        // Rule engine
        this.rules = [];
    }

    /**
     * Initialize the rule-based scheduler
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing RuleBasedScheduler');
            
            // Load business rules
            this.loadBusinessRules();
            
            // Load regulatory rules
            this.loadRegulatoryRules();
            
            // Load preference rules
            this.loadPreferenceRules();
            
            this.isInitialized = true;
            logger.info('RuleBasedScheduler initialized', { ruleCount: this.rules.length });

        } catch (error) {
            logger.error('Failed to initialize RuleBasedScheduler:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Generate schedule using rule-based approach
     */
    async generateSchedule(context: SchedulingContext): Promise<any> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            logger.info('Generating rule-based schedule', { 
                installationCode: context.installation.installation_code 
            });

            const startTime = Date.now();

            // Apply rules to evaluate partners
            const partnerEvaluations = await this.evaluatePartners(context);
            
            // Select best partner based on rule evaluation
            const selectedPartner = this.selectBestPartner(partnerEvaluations, context);
            
            if (!selectedPartner) {
                return {
                    feasible: false,
                    optimizationScore: 0,
                    partnerId: null,
                    totalHours: 0,
                    violations: ['No suitable partner found based on rules'],
                    executionTime: Date.now() - startTime
                };
            }

            // Generate visit schedule
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() + 1); // Start next month
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 12); // 12-month contract

            const schedule = this.generateVisitSchedule(
                selectedPartner.partner, 
                context, 
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            // Validate schedule against rules
            const validation = this.validateSchedule(schedule, context);
            
            const result = {
                feasible: validation.valid,
                optimizationScore: selectedPartner.score,
                partnerId: selectedPartner.partner.id,
                partnerName: selectedPartner.partner.name,
                totalHours: schedule.totalHours,
                visits: schedule.visits,
                appliedRules: selectedPartner.appliedRules,
                violations: validation.violations,
                confidence: selectedPartner.confidence,
                executionTime: Date.now() - startTime,
                algorithm: this.name,
                ruleBreakdown: selectedPartner.ruleBreakdown
            };

            this.logMetrics(result.executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Rule-based scheduling failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Evaluate all partners against rules
     */
    private async evaluatePartners(context: SchedulingContext): Promise<RuleEngineResult[]> {
        const evaluations: RuleEngineResult[] = [];

        for (const partner of context.availablePartners) {
            const evaluation = await this.evaluatePartner(partner, context);
            evaluations.push(evaluation);
        }

        return evaluations.sort((a, b) => b.score - a.score);
    }

    /**
     * Evaluate single partner against all rules
     */
    private async evaluatePartner(partner: Partner, context: SchedulingContext): Promise<RuleEngineResult> {
        const appliedRules: string[] = [];
        const violations: string[] = [];
        let totalScore = 0;
        let totalWeight = 0;
        const ruleBreakdown: Record<string, number> = {};

        // Apply each rule
        for (const rule of this.rules) {
            try {
                const ruleApplies = rule.condition(context, partner);
                
                if (ruleApplies) {
                    const ruleResult = rule.action(context, partner);
                    
                    if (typeof ruleResult === 'number') {
                        const weightedScore = ruleResult * rule.weight;
                        totalScore += weightedScore;
                        totalWeight += rule.weight;
                        appliedRules.push(rule.name);
                        ruleBreakdown[rule.name] = ruleResult;

                        // Check for violations (negative scores)
                        if (ruleResult < 0 && this.strictRules) {
                            violations.push(`Rule violation: ${rule.name} (score: ${ruleResult})`);
                        }
                    }
                }
            } catch (error) {
                logger.warn('Rule evaluation failed', { 
                    rule: rule.name, 
                    partner: partner.id,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        const confidence = Math.min(1.0, appliedRules.length / Math.max(5, this.rules.length * 0.3));

        return {
            partnerId: partner.id,
            score: Math.max(0, normalizedScore),
            appliedRules,
            violations,
            confidence,
            ruleBreakdown
        } as any;
    }

    /**
     * Select best partner from evaluations
     */
    private selectBestPartner(evaluations: RuleEngineResult[], context: SchedulingContext): any | null {
        if (evaluations.length === 0) {
            return null;
        }

        // Filter out partners with critical violations in strict mode
        let candidates = evaluations;
        if (this.strictRules) {
            candidates = evaluations.filter(evaluation => evaluation.violations.length === 0);
        }

        if (candidates.length === 0) {
            // No candidates without violations, use all if in flexible mode
            if (this.complianceMode === 'flexible') {
                candidates = evaluations;
            } else {
                return null;
            }
        }

        // Return highest scoring candidate
        const bestCandidate = candidates[0];
        const partner = context.availablePartners?.find((p: Partner) => p.id === bestCandidate.partnerId);
        
        return {
            partner,
            score: bestCandidate.score,
            appliedRules: bestCandidate.appliedRules,
            violations: bestCandidate.violations,
            confidence: bestCandidate.confidence,
            ruleBreakdown: (bestCandidate as any).ruleBreakdown
        };
    }

    /**
     * Load business rules
     */
    private loadBusinessRules(): void {
        // Cost efficiency rule
        this.rules.push({
            id: 'cost_efficiency',
            name: 'Cost Efficiency',
            category: 'business',
            condition: (context, partner) => context.contract?.contract_value > 0,
            action: (context, partner) => {
                const budget = context.contract.contract_value;
                const estimatedCost = partner.hourly_rate * context.regulatoryRequirements.totalHours;
                const efficiency = Math.min(1.0, budget / estimatedCost);
                return efficiency;
            },
            weight: this.ruleWeights.cost_efficiency || 0.3,
            priority: 1,
            description: 'Evaluates partner cost efficiency against budget'
        });

        // Location proximity rule
        this.rules.push({
            id: 'location_proximity',
            name: 'Location Proximity',
            category: 'business',
            condition: (context, partner) => context.installation?.address && partner.city,
            action: (context, partner) => {
                return this.calculateLocationScore(partner.city, context.installation.address);
            },
            weight: this.ruleWeights.location_proximity || 0.25,
            priority: 2,
            description: 'Evaluates partner proximity to installation'
        });

        // Specialty match rule
        this.rules.push({
            id: 'specialty_match',
            name: 'Specialty Match',
            category: 'business',
            condition: (context, partner) => context.installation?.service_type && partner.specialty,
            action: (context, partner) => {
                return this.calculateSpecialtyScore(partner, context.installation.service_type);
            },
            weight: this.ruleWeights.specialty_match || 0.35,
            priority: 1,
            description: 'Evaluates partner specialty match with service requirements'
        });

        // Availability rule
        this.rules.push({
            id: 'availability_check',
            name: 'Availability Check',
            category: 'business',
            condition: (context, partner) => true,
            action: (context, partner) => {
                return this.calculateAvailabilityScore(partner, context.regulatoryRequirements);
            },
            weight: this.ruleWeights.availability_check || 0.3,
            priority: 1,
            description: 'Evaluates partner availability against requirements'
        });

        // Partner rating rule
        this.rules.push({
            id: 'partner_rating',
            name: 'Partner Rating',
            category: 'business',
            condition: (context, partner) => (partner as any).rating !== undefined,
            action: (context, partner) => {
                const rating = (partner as any).rating || 3.5;
                return Math.min(1.0, rating / 5.0);
            },
            weight: this.ruleWeights.partner_rating || 0.2,
            priority: 3,
            description: 'Evaluates partner based on historical ratings'
        });
    }

    /**
     * Load regulatory compliance rules
     */
    private loadRegulatoryRules(): void {
        // Minimum qualification rule
        this.rules.push({
            id: 'minimum_qualification',
            name: 'Minimum Qualification',
            category: 'regulatory',
            condition: (context, partner) => context.installation?.service_type,
            action: (context, partner) => {
                const serviceType = context.installation.service_type;
                const qualificationMatch = this.calculateSpecialtyScore(partner, serviceType);
                
                // Regulatory requirement: must have at least 0.8 qualification match
                return qualificationMatch >= 0.8 ? 1.0 : -1.0;
            },
            weight: this.ruleWeights.minimum_qualification || 1.0,
            priority: 0,
            description: 'Ensures partner meets minimum qualification requirements'
        });

        // License validity rule
        this.rules.push({
            id: 'license_validity',
            name: 'License Validity',
            category: 'regulatory',
            condition: (context, partner) => (partner as any).license_expiry,
            action: (context, partner) => {
                const expiryDate = new Date((partner as any).license_expiry);
                const sixMonthsFromNow = new Date();
                sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                
                return expiryDate > sixMonthsFromNow ? 1.0 : -1.0;
            },
            weight: this.ruleWeights.license_validity || 1.0,
            priority: 0,
            description: 'Ensures partner license is valid for contract duration'
        });

        // Active status rule
        this.rules.push({
            id: 'active_status',
            name: 'Active Status',
            category: 'regulatory',
            condition: (context, partner) => partner.is_active !== undefined,
            action: (context, partner) => {
                return partner.is_active ? 1.0 : -1.0;
            },
            weight: this.ruleWeights.active_status || 1.0,
            priority: 0,
            description: 'Ensures partner is currently active'
        });
    }

    /**
     * Load preference-based rules
     */
    private loadPreferenceRules(): void {
        // Historical performance rule
        this.rules.push({
            id: 'historical_performance',
            name: 'Historical Performance',
            category: 'preference',
            condition: (context, partner) => context.historicalData?.length > 0,
            action: (context, partner) => {
                return this.calculateHistoricalScore(partner, context.installation, context.historicalData || []);
            },
            weight: this.ruleWeights.historical_performance || 0.15,
            priority: 2,
            description: 'Evaluates partner based on historical performance'
        });

        // Client preference rule
        this.rules.push({
            id: 'client_preference',
            name: 'Client Preference',
            category: 'preference',
            condition: (context, partner) => (context as any).clientPreferences?.preferredPartners,
            action: (context, partner) => {
                const preferences = (context as any).clientPreferences?.preferredPartners || [];
                return preferences.includes(partner.id) ? 1.2 : 1.0;
            },
            weight: this.ruleWeights.client_preference || 0.1,
            priority: 3,
            description: 'Applies bonus for client-preferred partners'
        });

        // Peak time availability rule
        this.rules.push({
            id: 'peak_availability',
            name: 'Peak Time Availability',
            category: 'preference',
            condition: (context, partner) => context.installation?.work_hours,
            action: (context, partner) => {
                const workHours = context.installation.work_hours;
                const isPeakTime = workHours.includes('08:00') || workHours.includes('09:00');
                const partnerAvailableInPeak = true; // Would check partner's preferred hours
                
                return isPeakTime && partnerAvailableInPeak ? 1.1 : 1.0;
            },
            weight: this.ruleWeights.peak_availability || 0.1,
            priority: 3,
            description: 'Bonus for partners available during peak hours'
        });
    }

    /**
     * Get rule statistics
     */
    getRuleStatistics(): any {
        const categoryCount = this.rules.reduce((acc: Record<string, number>, rule) => {
            acc[rule.category] = (acc[rule.category] || 0) + 1;
            return acc;
        }, {});

        return {
            totalRules: this.rules.length,
            categoryBreakdown: categoryCount,
            strictMode: this.strictRules,
            flexibilityLevel: this.flexibilityLevel,
            complianceMode: this.complianceMode
        };
    }

    /**
     * Add custom rule
     */
    addRule(rule: Rule): void {
        this.rules.push(rule);
        logger.info('Custom rule added', { ruleName: rule.name });
    }

    /**
     * Remove rule by ID
     */
    removeRule(ruleId: string): boolean {
        const initialLength = this.rules.length;
        this.rules = this.rules.filter(rule => rule.id !== ruleId);
        const removed = this.rules.length < initialLength;
        
        if (removed) {
            logger.info('Rule removed', { ruleId });
        }
        
        return removed;
    }

    /**
     * Update rule weight
     */
    updateRuleWeight(ruleId: string, newWeight: number): boolean {
        const rule = this.rules.find(r => r.id === ruleId);
        
        if (rule) {
            rule.weight = newWeight;
            logger.info('Rule weight updated', { ruleId, newWeight });
            return true;
        }
        
        return false;
    }
}

export default RuleBasedScheduler;