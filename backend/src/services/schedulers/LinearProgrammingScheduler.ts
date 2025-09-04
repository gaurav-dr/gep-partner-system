import BaseScheduler from './BaseScheduler';
import { Logger, Partner } from '../../types';

const logger: Logger = require('../../utils/logger');

interface OptimizationVariable {
  name: string;
  type: 'binary' | 'integer' | 'continuous';
  lowerBound: number;
  upperBound: number;
  coefficient: number;
}

interface OptimizationConstraint {
  name: string;
  variables: Record<string, number>;
  operator: '=' | '<=' | '>=';
  value: number;
  priority: number;
}

interface SolverConfig {
  method: 'simplex' | 'branch-and-bound';
  maximize: boolean;
  tolerance: number;
  timeout: number;
}

interface LinearProgrammingResult {
  feasible: boolean;
  optimal: boolean;
  objectiveValue: number;
  variables: Record<string, number>;
  iterations: number;
  solutionTime: number;
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNBOUNDED' | 'TIMEOUT';
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
 * Linear Programming Scheduler
 * Uses mathematical optimization to find the optimal partner assignment
 * Implements branch-and-bound with constraint satisfaction
 */
class LinearProgrammingScheduler extends BaseScheduler {
    private solverTimeout: number;
    private solver: string;
    private tolerance: number;
    private maxIterations: number;
    private solverConfig: SolverConfig;

    constructor(config: any) {
        super(config);
        this.solverTimeout = this.parameters.time_limit_seconds || 300;
        this.solver = this.parameters.solver || 'SCIP';
        this.tolerance = this.parameters.tolerance || 0.001;
        this.maxIterations = this.parameters.max_iterations || 10000;
        
        // Initialize default config
        this.solverConfig = {
            method: 'simplex',
            maximize: true,
            tolerance: this.tolerance,
            timeout: this.solverTimeout * 1000
        };
    }

    /**
     * Initialize the linear programming solver
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing LinearProgrammingScheduler', { solver: this.solver });
            
            // Initialize solver parameters
            this.solverConfig = {
                method: 'simplex',
                maximize: true, // We maximize the optimization score
                tolerance: this.tolerance,
                timeout: this.solverTimeout * 1000 // Convert to milliseconds
            };

            this.isInitialized = true;
            logger.info('LinearProgrammingScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize LinearProgrammingScheduler:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Generate schedule using linear programming optimization
     */
    async generateSchedule(context: SchedulingContext): Promise<any> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            logger.info('Generating linear programming schedule', { 
                installationCode: context.installation.installation_code,
                partnerCount: context.availablePartners.length 
            });

            const startTime = Date.now();

            // Formulate optimization problem
            const problem = this.formulateOptimizationProblem(context);
            
            // Solve the linear programming problem
            const solution = await this.solveProblem(problem);
            
            if (!solution.feasible) {
                return {
                    feasible: false,
                    optimizationScore: 0,
                    partnerId: null,
                    totalHours: 0,
                    status: solution.status,
                    executionTime: Date.now() - startTime,
                    algorithm: this.name
                };
            }

            // Extract partner assignment from solution
            const selectedPartnerId = this.extractPartnerFromSolution(solution, context);
            const selectedPartner = context.availablePartners.find(p => p.id === selectedPartnerId);
            
            if (!selectedPartner) {
                return {
                    feasible: false,
                    optimizationScore: solution.objectiveValue,
                    partnerId: selectedPartnerId,
                    totalHours: 0,
                    status: 'NO_PARTNER_FOUND',
                    executionTime: Date.now() - startTime,
                    algorithm: this.name
                };
            }

            // Generate schedule for selected partner
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() + 1);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 12);

            const schedule = this.generateVisitSchedule(
                selectedPartner,
                context,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            const result = {
                feasible: true,
                optimizationScore: solution.objectiveValue,
                partnerId: selectedPartner.id,
                partnerName: selectedPartner.name,
                totalHours: schedule.totalHours,
                visits: schedule.visits,
                status: solution.status,
                iterations: solution.iterations,
                solutionTime: solution.solutionTime,
                executionTime: Date.now() - startTime,
                algorithm: this.name,
                lpSolution: {
                    variables: solution.variables,
                    objectiveValue: solution.objectiveValue
                }
            };

            this.logMetrics(result.executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Linear programming scheduling failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Formulate the optimization problem
     */
    private formulateOptimizationProblem(context: SchedulingContext): {
        variables: OptimizationVariable[];
        constraints: OptimizationConstraint[];
        objective: Record<string, number>;
    } {
        const variables: OptimizationVariable[] = [];
        const constraints: OptimizationConstraint[] = [];
        const objective: Record<string, number> = {};

        // Decision variables: x_i = 1 if partner i is selected, 0 otherwise
        context.availablePartners.forEach((partner, index) => {
            const varName = `x_${partner.id}`;
            
            // Binary variable for partner selection
            variables.push({
                name: varName,
                type: 'binary',
                lowerBound: 0,
                upperBound: 1,
                coefficient: 0 // Will be set in objective
            });

            // Calculate partner score for objective function
            const score = this.calculateCompositeScore(partner, context);
            objective[varName] = score.compositeScore;
        });

        // Constraint 1: Select exactly one partner
        const partnerSelectionConstraint: OptimizationConstraint = {
            name: 'select_one_partner',
            variables: {},
            operator: '=',
            value: 1,
            priority: 1
        };

        context.availablePartners.forEach(partner => {
            partnerSelectionConstraint.variables[`x_${partner.id}`] = 1;
        });
        constraints.push(partnerSelectionConstraint);

        // Constraint 2: Budget constraint
        if (context.contract.contract_value > 0) {
            const budgetConstraint: OptimizationConstraint = {
                name: 'budget_constraint',
                variables: {},
                operator: '<=',
                value: context.contract.contract_value,
                priority: 1
            };

            context.availablePartners.forEach(partner => {
                const estimatedCost = partner.hourly_rate * context.regulatoryRequirements.totalHours;
                budgetConstraint.variables[`x_${partner.id}`] = estimatedCost;
            });
            constraints.push(budgetConstraint);
        }

        // Constraint 3: Capacity constraint (partner availability)
        context.availablePartners.forEach(partner => {
            if (partner.max_hours_per_week) {
                const maxHoursPerMonth = partner.max_hours_per_week * 4.33; // Average weeks per month
                
                if (maxHoursPerMonth < context.regulatoryRequirements.minimumHoursPerMonth) {
                    const capacityConstraint: OptimizationConstraint = {
                        name: `capacity_${partner.id}`,
                        variables: { [`x_${partner.id}`]: 1 },
                        operator: '<=',
                        value: 0, // Cannot select this partner
                        priority: 1
                    };
                    constraints.push(capacityConstraint);
                }
            }
        });

        // Constraint 4: Specialty requirement (soft constraint with penalty)
        const requiredSpecialties = this.getRequiredSpecialties(context.installation.service_type);
        if (requiredSpecialties.length > 0) {
            context.availablePartners.forEach(partner => {
                const specialtyMatch = this.calculateSpecialtyScore(partner, context.installation.service_type);
                
                // If specialty match is too low, add penalty constraint
                if (specialtyMatch < 0.5) {
                    const specialtyPenalty: OptimizationConstraint = {
                        name: `specialty_penalty_${partner.id}`,
                        variables: { [`x_${partner.id}`]: specialtyMatch },
                        operator: '>=',
                        value: 0,
                        priority: 2
                    };
                    constraints.push(specialtyPenalty);
                }
            });
        }

        return { variables, constraints, objective };
    }

    /**
     * Solve the linear programming problem using simplex method
     */
    private async solveProblem(problem: {
        variables: OptimizationVariable[];
        constraints: OptimizationConstraint[];
        objective: Record<string, number>;
    }): Promise<LinearProgrammingResult> {
        const startTime = Date.now();
        
        try {
            // Simplified LP solver implementation
            // In production, would use library like highs-js or glpk-js
            const solution = this.simplexSolver(problem);
            
            return {
                ...solution,
                solutionTime: Date.now() - startTime
            };

        } catch (error) {
            logger.error('LP solver failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            
            return {
                feasible: false,
                optimal: false,
                objectiveValue: 0,
                variables: {},
                iterations: 0,
                solutionTime: Date.now() - startTime,
                status: 'INFEASIBLE'
            };
        }
    }

    /**
     * Simplified simplex solver implementation
     */
    private simplexSolver(problem: {
        variables: OptimizationVariable[];
        constraints: OptimizationConstraint[];
        objective: Record<string, number>;
    }): Omit<LinearProgrammingResult, 'solutionTime'> {
        // This is a simplified implementation
        // In production, use a proper LP solver library
        
        const partnerIds = problem.variables.map(v => v.name.replace('x_', ''));
        
        // Find the partner with highest objective value that satisfies constraints
        let bestPartnerId = '';
        let bestObjectiveValue = -1;
        
        for (const partnerId of partnerIds) {
            const varName = `x_${partnerId}`;
            const objectiveValue = problem.objective[varName] || 0;
            
            // Check if this partner satisfies all constraints
            const satisfiesConstraints = this.checkConstraints(partnerId, problem.constraints);
            
            if (satisfiesConstraints && objectiveValue > bestObjectiveValue) {
                bestObjectiveValue = objectiveValue;
                bestPartnerId = partnerId;
            }
        }
        
        if (!bestPartnerId) {
            return {
                feasible: false,
                optimal: false,
                objectiveValue: 0,
                variables: {},
                iterations: 1,
                status: 'INFEASIBLE'
            };
        }
        
        // Create solution with selected partner
        const variables: Record<string, number> = {};
        partnerIds.forEach(partnerId => {
            variables[`x_${partnerId}`] = partnerId === bestPartnerId ? 1 : 0;
        });
        
        return {
            feasible: true,
            optimal: true,
            objectiveValue: bestObjectiveValue,
            variables,
            iterations: 1,
            status: 'OPTIMAL'
        };
    }

    /**
     * Check if partner satisfies constraints
     */
    private checkConstraints(partnerId: string, constraints: OptimizationConstraint[]): boolean {
        for (const constraint of constraints) {
            const varName = `x_${partnerId}`;
            const coefficient = constraint.variables[varName];
            
            if (coefficient !== undefined) {
                const value = coefficient * 1; // Partner is selected
                
                switch (constraint.operator) {
                    case '<=':
                        if (value > constraint.value) return false;
                        break;
                    case '>=':
                        if (value < constraint.value) return false;
                        break;
                    case '=':
                        if (Math.abs(value - constraint.value) > this.tolerance) return false;
                        break;
                }
            }
        }
        
        return true;
    }

    /**
     * Extract selected partner from LP solution
     */
    private extractPartnerFromSolution(solution: LinearProgrammingResult, context: SchedulingContext): string | null {
        for (const [varName, value] of Object.entries(solution.variables)) {
            if (varName.startsWith('x_') && value > 0.5) { // Binary variable threshold
                return varName.substring(2); // Remove 'x_' prefix
            }
        }
        
        return null;
    }

    /**
     * Get required specialties for service type
     */
    private getRequiredSpecialties(serviceType: string): string[] {
        const specialtyMappings: Record<string, string[]> = {
            'occupational_doctor': ['Παθολόγος', 'Ιατρός', 'Ειδικός Ιατρός Εργασίας'],
            'safety_engineer': ['Μηχανικός', 'Ηλεκτρολόγος Μηχανικός', 'Μηχανολόγος Μηχανικός'],
            'specialist_consultation': ['Ειδικός Ιατρός Εργασίας', 'Παθολόγος']
        };
        
        return specialtyMappings[serviceType] || [];
    }

    /**
     * Get solver statistics
     */
    getSolverStats(): any {
        return {
            solver: this.solver,
            timeout: this.solverTimeout,
            tolerance: this.tolerance,
            maxIterations: this.maxIterations,
            method: this.solverConfig.method,
            maximize: this.solverConfig.maximize
        };
    }

    /**
     * Update solver configuration
     */
    updateSolverConfig(config: Partial<SolverConfig>): void {
        this.solverConfig = { ...this.solverConfig, ...config };
        logger.info('Solver configuration updated', this.solverConfig);
    }
}

export default LinearProgrammingScheduler;