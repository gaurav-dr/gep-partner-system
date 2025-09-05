import { Logger } from '../../types';
import { supabaseAdmin } from '../../config/supabase';
import { 
    ContractAssignmentResults,
    BatchAssignmentResults,
    ContractAssignment,
    ContractData,
    ContractParameters,
    IdentifiedRelationship
} from '../types/migration-types';

const logger: Logger = require('../../utils/logger');

export default class ContractAssignmentManager {
    private batchSize: number;
    private confidenceThreshold: number;

    constructor(batchSize: number = 50, confidenceThreshold: number = 0.7) {
        this.batchSize = batchSize;
        this.confidenceThreshold = confidenceThreshold;
    }

    async createAutomaticContractAssignments(relationships: IdentifiedRelationship[]): Promise<ContractAssignmentResults> {
        try {
            logger.info('Creating automatic contract assignments', { totalRelationships: relationships.length });

            const results: ContractAssignmentResults = {
                successful: 0,
                failed: 0,
                warnings: 0,
                unassigned: [],
                assignments: []
            };

            const eligibleRelationships = relationships.filter(r => 
                r.relationshipStrength >= this.confidenceThreshold
            );

            const batches = this.createBatches(eligibleRelationships, this.batchSize);

            for (const batch of batches) {
                const batchResult = await this.processBatchAssignments(batch);
                
                results.successful += batchResult.successful;
                results.failed += batchResult.failed;
                results.warnings += batchResult.warnings;
                results.assignments.push(...batchResult.assignments);
            }

            logger.info('Contract assignments completed', {
                successful: results.successful,
                failed: results.failed,
                warnings: results.warnings
            });

            return results;

        } catch (error) {
            logger.error('Contract assignment creation failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async processBatchAssignments(relationships: IdentifiedRelationship[]): Promise<BatchAssignmentResults> {
        const results: BatchAssignmentResults = {
            successful: 0,
            failed: 0,
            warnings: 0,
            assignments: []
        };

        for (const relationship of relationships) {
            try {
                if (await this.checkExistingAssignment(relationship.installationCode, relationship.partnerId)) {
                    logger.warn('Assignment already exists', {
                        partnerId: relationship.partnerId,
                        installationCode: relationship.installationCode
                    });
                    results.warnings++;
                    continue;
                }

                const assignment = await this.createContractAssignment(relationship);
                if (assignment) {
                    results.assignments.push(assignment);
                    results.successful++;
                } else {
                    results.failed++;
                }

            } catch (error) {
                logger.error('Individual assignment failed:', {
                    error: error instanceof Error ? error.message : String(error),
                    relationship: relationship.installationCode
                });
                results.failed++;
            }
        }

        return results;
    }

    async createContractAssignment(relationship: IdentifiedRelationship): Promise<ContractAssignment | null> {
        try {
            const contractCode = this.generateContractCode(relationship.partnerId, relationship.installationCode);
            const parameters = await this.calculateContractParameters(relationship);

            const contractData: ContractData = {
                contract_code: contractCode,
                installation_code: relationship.installationCode,
                partner_id: relationship.partnerId,
                service_type: parameters.serviceType,
                start_date: parameters.startDate,
                end_date: parameters.endDate,
                contract_value: parameters.contractValue,
                status: 'active',
                migration_source: 'automatic',
                migration_confidence: relationship.relationshipStrength,
                migration_date: new Date().toISOString(),
                notes: `Auto-generated from ${relationship.visitCount} historical visits`,
                created_by: 'migration_system',
                metadata: {
                    originalVisitCount: relationship.visitCount,
                    relationshipStrength: relationship.relationshipStrength,
                    lastHistoricalVisit: relationship.lastVisit,
                    migrationReason: `Strong relationship (${relationship.relationshipType}) detected`
                }
            };

            const { data: contract, error: contractError } = await supabaseAdmin
                .from('contracts')
                .insert([contractData])
                .select()
                .single();

            if (contractError) {
                throw contractError;
            }

            await this.createContractServices(contract.id, parameters.services);

            const assignment: ContractAssignment = {
                contractId: contract.id,
                contractCode,
                partnerId: relationship.partnerId,
                partnerName: relationship.partnerName,
                installationCode: relationship.installationCode,
                installationName: relationship.installationName,
                confidence: relationship.relationshipStrength,
                migrationDate: new Date().toISOString()
            };

            return assignment;

        } catch (error) {
            logger.error('Contract assignment creation failed:', {
                error: error instanceof Error ? error.message : String(error),
                relationship: relationship.installationCode
            });
            return null;
        }
    }

    async calculateContractParameters(relationship: IdentifiedRelationship): Promise<ContractParameters> {
        try {
            const serviceTypes = relationship.serviceTypes;
            const primaryServiceType = serviceTypes.length > 0 ? serviceTypes[0] : 'general_consultation';

            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

            const baseValue = this.calculateContractValue(relationship);

            const services = await this.generateContractServices(relationship, primaryServiceType);

            return {
                serviceType: primaryServiceType,
                startDate,
                endDate,
                contractValue: baseValue,
                services
            };

        } catch (error) {
            logger.error('Contract parameters calculation failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private async createContractServices(contractId: string, services: any[]): Promise<void> {
        try {
            if (services.length === 0) return;

            const serviceData = services.map(service => ({
                contract_id: contractId,
                service_type: service.type,
                frequency: service.frequency,
                duration: service.duration,
                rate: service.rate,
                total_value: service.totalValue
            }));

            const { error } = await supabaseAdmin
                .from('contract_services')
                .insert(serviceData);

            if (error) {
                throw error;
            }

        } catch (error) {
            logger.error('Contract services creation failed:', {
                error: error instanceof Error ? error.message : String(error),
                contractId
            });
            throw error;
        }
    }

    private generateContractCode(partnerId: string, installationCode: string): string {
        const timestamp = Date.now().toString().slice(-6);
        const partnerCode = partnerId.slice(-4);
        const installationCodeShort = installationCode.slice(-4);
        return `AUTO-${partnerCode}-${installationCodeShort}-${timestamp}`;
    }

    private calculateContractValue(relationship: IdentifiedRelationship): number {
        const baseRate = 100; // Base hourly rate
        const visitCount = relationship.visitCount;
        const avgInterval = relationship.averageInterval;
        
        // Estimate annual visits
        const annualVisits = Math.ceil(365 / avgInterval);
        const estimatedHoursPerVisit = 4; // Default duration
        
        return annualVisits * estimatedHoursPerVisit * baseRate;
    }

    private async generateContractServices(relationship: IdentifiedRelationship, primaryServiceType: string): Promise<any[]> {
        try {
            const services = [];
            const frequency = this.determineServiceFrequency(relationship.averageInterval);
            
            services.push({
                type: primaryServiceType,
                frequency,
                duration: 4, // hours
                rate: 100, // per hour
                totalValue: this.calculateServiceValue(frequency, 4, 100)
            });

            return services;

        } catch (error) {
            logger.error('Contract services generation failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }

    private determineServiceFrequency(avgInterval: number): string {
        if (avgInterval <= 7) return 'weekly';
        if (avgInterval <= 30) return 'monthly';
        if (avgInterval <= 90) return 'quarterly';
        return 'yearly';
    }

    private calculateServiceValue(frequency: string, duration: number, rate: number): number {
        const frequencyMultipliers = {
            weekly: 52,
            monthly: 12,
            quarterly: 4,
            yearly: 1
        };
        
        const multiplier = frequencyMultipliers[frequency as keyof typeof frequencyMultipliers] || 1;
        return duration * rate * multiplier;
    }

    private async checkExistingAssignment(installationCode: string, partnerId: string): Promise<boolean> {
        try {
            const { data, error } = await supabaseAdmin
                .from('contracts')
                .select('id')
                .eq('installation_code', installationCode)
                .eq('partner_id', partnerId)
                .eq('status', 'active')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw error;
            }

            return data !== null;

        } catch (error) {
            logger.error('Existing assignment check failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    async updateInstallationAssignmentStatus(installationCode: string, status: string): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('installations')
                .update({ 
                    contract_status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('installation_code', installationCode);

            if (error) {
                throw error;
            }

        } catch (error) {
            logger.error('Installation status update failed:', {
                error: error instanceof Error ? error.message : String(error),
                installationCode
            });
            throw error;
        }
    }
}