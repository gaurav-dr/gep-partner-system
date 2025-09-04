import BaseScheduler, { OptimizationResult } from './BaseScheduler';
import { Logger, Partner } from '../../types';

const logger: Logger = require('../../utils/logger');

interface Individual {
  partnerId: string;
  schedule: any;
  fitness: number;
  genes: number[];
}

interface Population {
  individuals: Individual[];
  generation: number;
  bestFitness: number;
  averageFitness: number;
}

interface GeneticAlgorithmResult extends OptimizationResult {
  partnerName?: string;
  generations: number;
  finalPopulation: Population;
  convergenceData: number[];
  executionTime: number;
  algorithm: string;
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
 * Genetic Algorithm Scheduler
 * Uses evolutionary optimization to find optimal partner assignments and schedules
 * Implements selection, crossover, and mutation operations
 */
class GeneticAlgorithmScheduler extends BaseScheduler {
    private populationSize: number;
    private generations: number;
    private mutationRate: number;
    private crossoverRate: number;
    private eliteSize: number;
    private tournamentSize: number;
    private convergenceThreshold: number;
    private maxStagnantGenerations: number;
    private random: () => number;

    constructor(config: any) {
        super(config);
        this.populationSize = this.parameters.population_size || 50;
        this.generations = this.parameters.generations || 100;
        this.mutationRate = this.parameters.mutation_rate || 0.1;
        this.crossoverRate = this.parameters.crossover_rate || 0.8;
        this.eliteSize = this.parameters.elite_size || Math.floor(this.populationSize * 0.1);
        this.tournamentSize = this.parameters.tournament_size || 5;
        this.convergenceThreshold = this.parameters.convergence_threshold || 0.001;
        this.maxStagnantGenerations = this.parameters.max_stagnant_generations || 20;
        this.random = Math.random; // Will be replaced with seeded random
    }

    /**
     * Initialize the genetic algorithm scheduler
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing GeneticAlgorithmScheduler');
            
            // Initialize random number generator with seed for reproducibility
            this.random = this.createSeededRandom(this.parameters.seed || Date.now());
            
            // Validate parameters
            this.validateParameters();
            
            this.isInitialized = true;
            logger.info('GeneticAlgorithmScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize GeneticAlgorithmScheduler:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Generate schedule using genetic algorithm
     */
    async generateSchedule(context: SchedulingContext): Promise<GeneticAlgorithmResult> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            logger.info('Generating genetic algorithm schedule', { 
                installationCode: context.installation.installation_code,
                partnerCount: context.availablePartners.length 
            });

            const startTime = Date.now();

            // Initialize population
            let population = this.initializePopulation(context);
            
            // Evolution tracking
            const convergenceData: number[] = [];
            let stagnantGenerations = 0;
            let previousBestFitness = 0;

            // Evolution loop
            for (let generation = 0; generation < this.generations; generation++) {
                // Evaluate fitness
                population = this.evaluatePopulation(population, context);
                
                // Track convergence
                convergenceData.push(population.bestFitness);
                
                // Check for convergence
                if (Math.abs(population.bestFitness - previousBestFitness) < this.convergenceThreshold) {
                    stagnantGenerations++;
                } else {
                    stagnantGenerations = 0;
                }
                
                // Early termination on convergence
                if (stagnantGenerations >= this.maxStagnantGenerations) {
                    logger.info('Genetic algorithm converged early', { 
                        generation, 
                        fitness: population.bestFitness 
                    });
                    break;
                }

                // Selection
                const parents = this.selection(population);
                
                // Crossover and Mutation
                const offspring = this.reproduction(parents, context);
                
                // Create new population (elitism + offspring)
                population = this.createNewGeneration(population, offspring);
                
                previousBestFitness = population.bestFitness;
                population.generation = generation + 1;

                // Log progress periodically
                if (generation % 20 === 0) {
                    logger.info('GA Progress', { 
                        generation, 
                        bestFitness: population.bestFitness.toFixed(3),
                        avgFitness: population.averageFitness.toFixed(3) 
                    });
                }
            }

            // Get best solution
            const bestIndividual = population.individuals[0]; // Population is sorted by fitness
            const selectedPartner = context.availablePartners.find(p => p.id === bestIndividual.partnerId);

            const result: GeneticAlgorithmResult = {
                feasible: bestIndividual.fitness > 0 && bestIndividual.partnerId !== null,
                optimizationScore: bestIndividual.fitness,
                partnerId: bestIndividual.partnerId || '', // Ensure it's not null
                partnerName: selectedPartner?.name,
                totalHours: bestIndividual.schedule?.totalHours || 0,
                visits: bestIndividual.schedule?.visits || [],
                generations: population.generation,
                finalPopulation: population,
                convergenceData,
                executionTime: Date.now() - startTime,
                algorithm: this.name
            };

            this.logMetrics(result.executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Genetic algorithm scheduling failed:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Initialize random population
     */
    private initializePopulation(context: SchedulingContext): Population {
        const individuals: Individual[] = [];

        for (let i = 0; i < this.populationSize; i++) {
            // Randomly select a partner
            const partnerIndex = Math.floor(this.random() * context.availablePartners.length);
            const partner = context.availablePartners[partnerIndex];

            // Generate random genes for schedule parameters
            const genes = this.generateRandomGenes();

            // Create individual
            const individual: Individual = {
                partnerId: partner.id,
                schedule: null, // Will be generated during evaluation
                fitness: 0,
                genes
            };

            individuals.push(individual);
        }

        return {
            individuals,
            generation: 0,
            bestFitness: 0,
            averageFitness: 0
        };
    }

    /**
     * Generate random genes for an individual
     */
    private generateRandomGenes(): number[] {
        const genes: number[] = [];
        
        // Genes represent various scheduling parameters
        // Gene 0: Visit frequency modifier (0.5 - 1.5)
        genes.push(0.5 + this.random());
        
        // Gene 1: Time slot preference (0-1)
        genes.push(this.random());
        
        // Gene 2: Duration variance (0.8 - 1.2)
        genes.push(0.8 + this.random() * 0.4);
        
        // Gene 3: Schedule density (0.5 - 1.0)
        genes.push(0.5 + this.random() * 0.5);
        
        // Gene 4: Preference weight (0-1)
        genes.push(this.random());

        return genes;
    }

    /**
     * Evaluate fitness of all individuals in population
     */
    private evaluatePopulation(population: Population, context: SchedulingContext): Population {
        const evaluatedIndividuals: Individual[] = [];

        for (const individual of population.individuals) {
            const fitness = this.evaluateIndividual(individual, context);
            individual.fitness = fitness;
            evaluatedIndividuals.push(individual);
        }

        // Sort by fitness (descending)
        evaluatedIndividuals.sort((a, b) => b.fitness - a.fitness);

        const bestFitness = evaluatedIndividuals[0].fitness;
        const averageFitness = evaluatedIndividuals.reduce((sum, ind) => sum + ind.fitness, 0) / evaluatedIndividuals.length;

        return {
            individuals: evaluatedIndividuals,
            generation: population.generation,
            bestFitness,
            averageFitness
        };
    }

    /**
     * Evaluate fitness of individual
     */
    private evaluateIndividual(individual: Individual, context: SchedulingContext): number {
        const partner = context.availablePartners.find(p => p.id === individual.partnerId);
        if (!partner) return 0;

        try {
            // Generate schedule based on genes
            const schedule = this.generateGeneticSchedule(partner, context, individual.genes);
            individual.schedule = schedule;

            // Calculate composite score
            const compositeScore = this.calculateCompositeScore(partner, context);
            
            // Apply genetic modifications based on genes
            let fitness = compositeScore.compositeScore;

            // Gene 0: Visit frequency impact
            const frequencyModifier = individual.genes[0];
            fitness *= (0.8 + frequencyModifier * 0.4);

            // Gene 3: Schedule density impact
            const densityModifier = individual.genes[3];
            fitness *= (0.9 + densityModifier * 0.2);

            // Penalty for constraint violations
            const validation = this.validateSchedule(schedule, context);
            if (!validation.valid) {
                fitness *= 0.5; // 50% penalty for violations
            }

            // Bonus for efficient scheduling
            const efficiency = this.calculateScheduleEfficiency(schedule, context);
            fitness *= (1.0 + efficiency * 0.1);

            return Math.max(0, Math.min(1, fitness));

        } catch (error) {
            logger.warn('Individual evaluation failed', { 
                partnerId: individual.partnerId,
                error: error instanceof Error ? error.message : String(error) 
            });
            return 0;
        }
    }

    /**
     * Generate schedule based on genetic parameters
     */
    private generateGeneticSchedule(partner: Partner, context: SchedulingContext, genes: number[]): any {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 12);

        // Use base schedule generation with genetic modifications
        const baseSchedule = this.generateVisitSchedule(
            partner, 
            context, 
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        // Apply genetic modifications
        const frequencyModifier = genes[0];
        const durationModifier = genes[2];

        // Modify visit frequency and duration based on genes
        const modifiedVisits = baseSchedule.visits.map(visit => ({
            ...visit,
            duration: Math.max(1, visit.duration * durationModifier)
        }));

        return {
            visits: modifiedVisits,
            totalHours: modifiedVisits.reduce((sum, visit) => sum + visit.duration, 0),
            visitDuration: baseSchedule.visitDuration,
            visitsPerMonth: baseSchedule.visitsPerMonth
        };
    }

    /**
     * Selection operation (Tournament Selection)
     */
    private selection(population: Population): Individual[] {
        const parents: Individual[] = [];
        const selectionCount = this.populationSize - this.eliteSize;

        for (let i = 0; i < selectionCount; i++) {
            const parent = this.tournamentSelection(population);
            parents.push(parent);
        }

        return parents;
    }

    /**
     * Tournament selection
     */
    private tournamentSelection(population: Population): Individual {
        const tournament: Individual[] = [];
        
        for (let i = 0; i < this.tournamentSize; i++) {
            const randomIndex = Math.floor(this.random() * population.individuals.length);
            tournament.push(population.individuals[randomIndex]);
        }

        // Return best individual from tournament
        return tournament.reduce((best, current) => 
            current.fitness > best.fitness ? current : best
        );
    }

    /**
     * Reproduction (Crossover and Mutation)
     */
    private reproduction(parents: Individual[], context: SchedulingContext): Individual[] {
        const offspring: Individual[] = [];

        for (let i = 0; i < parents.length; i += 2) {
            const parent1 = parents[i];
            const parent2 = parents[i + 1] || parents[0]; // Use first parent if odd number

            let child1, child2;

            if (this.random() < this.crossoverRate) {
                [child1, child2] = this.crossover(parent1, parent2);
            } else {
                child1 = this.cloneIndividual(parent1);
                child2 = this.cloneIndividual(parent2);
            }

            // Mutation
            if (this.random() < this.mutationRate) {
                child1 = this.mutate(child1, context);
            }
            if (this.random() < this.mutationRate) {
                child2 = this.mutate(child2, context);
            }

            offspring.push(child1, child2);
        }

        return offspring.slice(0, parents.length); // Ensure same size
    }

    /**
     * Crossover operation
     */
    private crossover(parent1: Individual, parent2: Individual): [Individual, Individual] {
        const crossoverPoint = Math.floor(this.random() * parent1.genes.length);

        const child1Genes = [
            ...parent1.genes.slice(0, crossoverPoint),
            ...parent2.genes.slice(crossoverPoint)
        ];

        const child2Genes = [
            ...parent2.genes.slice(0, crossoverPoint),
            ...parent1.genes.slice(crossoverPoint)
        ];

        const child1: Individual = {
            partnerId: this.random() < 0.5 ? parent1.partnerId : parent2.partnerId,
            schedule: null,
            fitness: 0,
            genes: child1Genes
        };

        const child2: Individual = {
            partnerId: this.random() < 0.5 ? parent2.partnerId : parent1.partnerId,
            schedule: null,
            fitness: 0,
            genes: child2Genes
        };

        return [child1, child2];
    }

    /**
     * Mutation operation
     */
    private mutate(individual: Individual, context: SchedulingContext): Individual {
        const mutatedGenes = [...individual.genes];

        // Mutate random gene
        const geneIndex = Math.floor(this.random() * mutatedGenes.length);
        const mutationAmount = (this.random() - 0.5) * 0.2; // ±10% variation
        
        mutatedGenes[geneIndex] = Math.max(0, Math.min(2, mutatedGenes[geneIndex] + mutationAmount));

        // Occasionally mutate partner selection
        let partnerId = individual.partnerId;
        if (this.random() < 0.1) { // 10% chance to change partner
            const randomIndex = Math.floor(this.random() * context.availablePartners.length);
            partnerId = context.availablePartners[randomIndex].id;
        }

        return {
            partnerId,
            schedule: null,
            fitness: 0,
            genes: mutatedGenes
        };
    }

    /**
     * Create new generation (Elitism + Offspring)
     */
    private createNewGeneration(currentPopulation: Population, offspring: Individual[]): Population {
        const newIndividuals: Individual[] = [];

        // Elitism: Keep best individuals
        for (let i = 0; i < this.eliteSize; i++) {
            newIndividuals.push(this.cloneIndividual(currentPopulation.individuals[i]));
        }

        // Add offspring
        for (let i = 0; i < offspring.length && newIndividuals.length < this.populationSize; i++) {
            newIndividuals.push(offspring[i]);
        }

        return {
            individuals: newIndividuals,
            generation: currentPopulation.generation + 1,
            bestFitness: currentPopulation.bestFitness,
            averageFitness: currentPopulation.averageFitness
        };
    }

    /**
     * Calculate schedule efficiency
     */
    private calculateScheduleEfficiency(schedule: any, context: SchedulingContext): number {
        const totalHours = schedule.totalHours;
        const requiredHours = context.regulatoryRequirements.totalHours;
        const visits = schedule.visits.length;

        // Efficiency based on optimal hour distribution
        const hourEfficiency = Math.min(1.0, totalHours / requiredHours);
        
        // Efficiency based on visit distribution
        const optimalVisits = Math.ceil(requiredHours / 4); // 4 hours per visit
        const visitEfficiency = 1.0 - Math.abs(visits - optimalVisits) / optimalVisits;

        return (hourEfficiency + visitEfficiency) / 2;
    }

    /**
     * Clone individual
     */
    private cloneIndividual(individual: Individual): Individual {
        return {
            partnerId: individual.partnerId,
            schedule: individual.schedule ? { ...individual.schedule } : null,
            fitness: individual.fitness,
            genes: [...individual.genes]
        };
    }

    /**
     * Validate genetic algorithm parameters
     */
    private validateParameters(): void {
        if (this.populationSize < 10) {
            throw new Error('Population size must be at least 10');
        }
        if (this.generations < 1) {
            throw new Error('Generations must be at least 1');
        }
        if (this.mutationRate < 0 || this.mutationRate > 1) {
            throw new Error('Mutation rate must be between 0 and 1');
        }
        if (this.crossoverRate < 0 || this.crossoverRate > 1) {
            throw new Error('Crossover rate must be between 0 and 1');
        }
    }

    /**
     * Create seeded random number generator
     */
    private createSeededRandom(seed: number): () => number {
        let state = seed;
        return () => {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }

    /**
     * Get algorithm statistics
     */
    getAlgorithmStats(): any {
        return {
            populationSize: this.populationSize,
            generations: this.generations,
            mutationRate: this.mutationRate,
            crossoverRate: this.crossoverRate,
            eliteSize: this.eliteSize,
            tournamentSize: this.tournamentSize,
            convergenceThreshold: this.convergenceThreshold,
            maxStagnantGenerations: this.maxStagnantGenerations
        };
    }
}

export default GeneticAlgorithmScheduler;