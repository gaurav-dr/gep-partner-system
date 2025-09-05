import { Logger } from '../types';
import { supabaseAdmin } from '../config/supabase';
import VisitDataAnalyzer from './data-analysis/VisitDataAnalyzer';
import ContractAssignmentManager from './contract-assignment/ContractAssignmentManager';
import { 
    MigrationStats,
    VisitAnalysis,
    IdentifiedRelationship,
    ContractAssignmentResults,
    MigrationReport,
    MigrationConfiguration,
    ValidationResults,
    PartnerInstallationPair,
    RelationshipStrength
} from './types/migration-types';

const logger: Logger = require('../utils/logger');

export default class ContractMigrationService {
    private visitAnalyzer: VisitDataAnalyzer;
    private assignmentManager: ContractAssignmentManager;
    private config: MigrationConfiguration;
    private stats: MigrationStats;

    constructor(config?: Partial<MigrationConfiguration>) {
        this.config = {
            minimumVisitThreshold: 3,
            relationshipStrengthThreshold: 0.7,
            autoAssignmentConfidenceThreshold: 0.8,
            maxDaysForRecentVisit: 180,
            batchSize: 50,
            ...config
        };

        this.visitAnalyzer = new VisitDataAnalyzer(this.config.relationshipStrengthThreshold);
        this.assignmentManager = new ContractAssignmentManager(
            this.config.batchSize, 
            this.config.autoAssignmentConfidenceThreshold
        );
        
        this.resetMigrationStats();
    }

    async executeFullMigration(): Promise<MigrationReport> {
        const startTime = Date.now();
        logger.info('Starting full contract migration process');
        
        try {
            this.resetMigrationStats();

            // Step 1: Analyze existing visit data
            logger.info('Step 1: Analyzing existing visit data');
            const visitAnalysis = await this.visitAnalyzer.analyzeExistingVistData();
            this.stats.processed = visitAnalysis.totalVisits;

            // Step 2: Identify strong relationships
            logger.info('Step 2: Identifying partner-installation relationships');
            const relationships = await this.identifyPartnerInstallationRelationships(visitAnalysis);
            
            // Step 3: Create contract assignments
            logger.info('Step 3: Creating automatic contract assignments');
            const assignmentResults = await this.assignmentManager.createAutomaticContractAssignments(relationships);
            
            this.stats.successful = assignmentResults.successful;
            this.stats.failed = assignmentResults.failed;
            this.stats.warnings = assignmentResults.warnings;

            // Step 4: Handle unassigned installations
            logger.info('Step 4: Handling unassigned installations');
            const unassignedResults = await this.handleUnassignedInstallations(assignmentResults.unassigned);

            // Step 5: Validate results
            logger.info('Step 5: Validating migration results');
            const validationResults = await this.validateMigrationResults();

            // Step 6: Generate report
            const report = await this.generateMigrationReport(
                visitAnalysis,
                assignmentResults,
                unassignedResults,
                validationResults,
                startTime
            );

            logger.info('Contract migration completed successfully', {
                duration: Date.now() - startTime,
                successful: this.stats.successful,
                failed: this.stats.failed
            });

            return report;

        } catch (error) {
            logger.error('Contract migration failed:', {
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    private async identifyPartnerInstallationRelationships(analysis: VisitAnalysis): Promise<IdentifiedRelationship[]> {
        try {
            const relationships: IdentifiedRelationship[] = [];
            
            // Filter pairs with minimum visit threshold
            const eligiblePairs = analysis.partnerInstallationPairs.filter(
                pair => pair.visitCount >= this.config.minimumVisitThreshold
            );

            for (const pair of eligiblePairs) {
                const strength = await this.visitAnalyzer.calculateRelationshipStrength(pair);
                
                if (strength.score >= this.config.relationshipStrengthThreshold) {
                    const relationship: IdentifiedRelationship = {
                        ...pair,
                        relationshipStrength: strength.score,
                        relationshipType: strength.type,
                        averageInterval: this.calculateAverageInterval(pair),
                        serviceTypes: this.extractServiceTypes(pair),
                        confidenceFactors: strength.factors,
                        migrationPriority: this.calculateMigrationPriority(pair, strength)
                    };
                    
                    relationships.push(relationship);
                }
            }

            // Sort by migration priority
            relationships.sort((a, b) => b.migrationPriority - a.migrationPriority);

            logger.info('Identified strong relationships', {
                total: relationships.length,
                exclusive: relationships.filter(r => r.relationshipType === 'exclusive').length,
                primary: relationships.filter(r => r.relationshipType === 'primary').length,
                regular: relationships.filter(r => r.relationshipType === 'regular').length
            });

            return relationships;

        } catch (error) {
            logger.error('Relationship identification failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private async handleUnassignedInstallations(unassignedInstallations: any[]): Promise<any> {
        try {
            logger.info('Processing unassigned installations', { count: unassignedInstallations.length });
            
            const results = {
                processed: unassignedInstallations.length,
                assigned: 0,
                flagged: 0,
                strategies: {} as Record<string, number>
            };

            for (const installation of unassignedInstallations) {
                const strategy = await this.determineAssignmentStrategy(installation);
                
                if (!results.strategies[strategy.type]) {
                    results.strategies[strategy.type] = 0;
                }
                results.strategies[strategy.type]++;

                switch (strategy.type) {
                    case 'auto_assign':
                        if (strategy.partner) {
                            await this.autoAssignBestMatch(installation, strategy.partner);
                            results.assigned++;
                        }
                        break;
                    case 'manual_review':
                        await this.flagForManualReview(installation, strategy.reason || 'Requires manual review');
                        results.flagged++;
                        break;
                    default:
                        results.flagged++;
                }
            }

            return results;

        } catch (error) {
            logger.error('Unassigned installations handling failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private async validateMigrationResults(): Promise<ValidationResults> {
        try {
            logger.info('Validating migration results');

            const results: ValidationResults = {
                duplicates: 0,
                missing: 0,
                integrityIssues: 0,
                coverage: { percentage: 0 },
                validationPassed: false,
                warnings: []
            };

            // Check for duplicate assignments
            const { data: duplicates } = await supabaseAdmin
                .from('contracts')
                .select('installation_code, partner_id, count(*)')
                .eq('migration_source', 'automatic')
                .group('installation_code, partner_id')
                .having('count(*) > 1');

            results.duplicates = duplicates?.length || 0;

            // Calculate coverage
            const { data: totalInstallations } = await supabaseAdmin
                .from('installations')
                .select('count(*)');

            const { data: assignedInstallations } = await supabaseAdmin
                .from('contracts')
                .select('count(distinct installation_code)')
                .eq('status', 'active');

            const total = totalInstallations?.[0]?.count || 0;
            const assigned = assignedInstallations?.[0]?.count || 0;
            results.coverage.percentage = total > 0 ? (assigned / total) * 100 : 0;

            // Add validation warnings
            if (results.duplicates > 0) {
                results.warnings.push(`Found ${results.duplicates} duplicate assignments`);
            }
            if (results.coverage.percentage < 80) {
                results.warnings.push(`Low coverage: ${results.coverage.percentage.toFixed(1)}%`);
            }

            results.validationPassed = results.duplicates === 0 && results.coverage.percentage > 50;

            return results;

        } catch (error) {
            logger.error('Migration validation failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private async generateMigrationReport(
        visitAnalysis: VisitAnalysis,
        assignmentResults: ContractAssignmentResults,
        unassignedResults: any,
        validationResults: ValidationResults,
        startTime: number
    ): Promise<MigrationReport> {
        
        const executionTime = Date.now() - startTime;
        const successRate = this.stats.processed > 0 ? 
            (this.stats.successful / this.stats.processed) * 100 : 0;

        const report: MigrationReport = {
            migrationSummary: {
                executionDate: new Date().toISOString(),
                totalProcessed: this.stats.processed,
                successfulAssignments: this.stats.successful,
                failedAssignments: this.stats.failed,
                warnings: this.stats.warnings,
                successRate: Math.round(successRate * 100) / 100
            },
            dataAnalysis: {
                historicalVisits: visitAnalysis.totalVisits,
                uniquePartners: visitAnalysis.uniquePartners,
                uniqueInstallations: visitAnalysis.uniqueInstallations,
                strongRelationships: visitAnalysis.summary.strongRelationships,
                averageRelationshipStrength: 0 // Would be calculated from relationships
            },
            assignmentResults: {
                automaticAssignments: assignmentResults.successful,
                failedAssignments: assignmentResults.failed,
                unassignedInstallations: assignmentResults.unassigned.length,
                coveragePercentage: validationResults.coverage.percentage
            },
            validationResults,
            recommendations: this.generateRecommendations(validationResults),
            nextSteps: this.generateNextSteps(validationResults, unassignedResults)
        };

        // Store report in database
        await this.storeMigrationReport(report);

        return report;
    }

    // Helper methods
    private calculateAverageInterval(pair: PartnerInstallationPair): number {
        if (pair.visits.length < 2) return 365;
        
        const sortedVisits = pair.visits.sort((a, b) => 
            new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
        );
        
        let totalInterval = 0;
        for (let i = 1; i < sortedVisits.length; i++) {
            const interval = (new Date(sortedVisits[i].visit_date).getTime() - 
                            new Date(sortedVisits[i-1].visit_date).getTime()) / (1000 * 60 * 60 * 24);
            totalInterval += interval;
        }
        
        return totalInterval / (sortedVisits.length - 1);
    }

    private extractServiceTypes(pair: PartnerInstallationPair): string[] {
        const serviceTypes = new Set(pair.visits.map(v => v.service_type).filter(Boolean));
        return Array.from(serviceTypes) as string[];
    }

    private calculateMigrationPriority(pair: PartnerInstallationPair, strength: RelationshipStrength): number {
        let priority = strength.score * 100;
        
        // Bonus for recent activity
        const daysSinceLastVisit = (Date.now() - new Date(pair.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastVisit <= this.config.maxDaysForRecentVisit) {
            priority += 20;
        }
        
        // Bonus for high visit count
        if (pair.visitCount >= 10) {
            priority += 10;
        }
        
        return Math.min(priority, 150);
    }

    private async determineAssignmentStrategy(installation: any): Promise<{ type: string; partner?: any; reason?: string }> {
        // Simplified strategy determination
        return { type: 'manual_review', reason: 'No strong relationship found' };
    }

    private async autoAssignBestMatch(installation: any, partner: any): Promise<void> {
        // Auto-assignment logic would go here
        logger.info('Auto-assigning best match', { installation: installation.installation_code, partner: partner.id });
    }

    private async flagForManualReview(installation: any, reason: string): Promise<void> {
        // Flag for manual review logic would go here
        logger.info('Flagging for manual review', { installation: installation.installation_code, reason });
    }

    private generateRecommendations(validationResults: ValidationResults): string[] {
        const recommendations = [];
        
        if (validationResults.duplicates > 0) {
            recommendations.push('Review and resolve duplicate contract assignments');
        }
        
        if (validationResults.coverage.percentage < 80) {
            recommendations.push('Increase coverage by reviewing unassigned installations');
        }
        
        recommendations.push('Monitor new visit patterns for emerging relationships');
        recommendations.push('Periodic review of contract assignments for optimization');
        
        return recommendations;
    }

    private generateNextSteps(validationResults: ValidationResults, unassignedResults: any): string[] {
        const nextSteps = [];
        
        if (unassignedResults.flagged > 0) {
            nextSteps.push(`Review ${unassignedResults.flagged} installations flagged for manual assignment`);
        }
        
        nextSteps.push('Set up monitoring for new visit patterns');
        nextSteps.push('Schedule quarterly migration reviews');
        
        return nextSteps;
    }

    private async storeMigrationReport(report: MigrationReport): Promise<void> {
        try {
            await supabaseAdmin
                .from('migration_reports')
                .insert([{
                    report_type: 'contract_migration',
                    execution_date: report.migrationSummary.executionDate,
                    summary: report,
                    created_at: new Date().toISOString()
                }]);
        } catch (error) {
            logger.error('Failed to store migration report:', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private resetMigrationStats(): void {
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            warnings: 0
        };
    }
}