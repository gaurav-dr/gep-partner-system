import { Logger } from '../../types';
import { 
    ScheduleRequest, 
    SchedulingContext, 
    SchedulingConstraints, 
    SchedulingObjectives,
    RegulatoryRequirements 
} from './types';
import AISchedulingDataProvider from './data-provider';

const logger: Logger = require('../../utils/logger');

export class AISchedulingContextBuilder {
    private dataProvider: AISchedulingDataProvider;

    constructor() {
        this.dataProvider = new AISchedulingDataProvider();
    }

    /**
     * Prepare complete scheduling context from request
     */
    async prepareSchedulingContext(scheduleRequest: ScheduleRequest): Promise<SchedulingContext> {
        try {
            logger.info('Preparing scheduling context', { 
                contractCode: scheduleRequest.contractCode,
                installationCode: scheduleRequest.installationCode
            });

            // Fetch all required data in parallel
            const [
                contract,
                installation,
                availablePartners,
                historicalData
            ] = await Promise.all([
                this.dataProvider.getContractDetails(scheduleRequest.contractCode),
                this.dataProvider.getInstallationDetails(scheduleRequest.installationCode),
                this.dataProvider.getAvailablePartners(scheduleRequest),
                this.dataProvider.getHistoricalData(scheduleRequest)
            ]);

            // Calculate regulatory requirements
            const regulatoryRequirements = await this.dataProvider.calculateRegulatoryRequirements(installation);

            // Get partner patterns for optimization
            const partnerIds = availablePartners.map(p => p.id);
            const partnerPatterns = await this.dataProvider.getPartnerPatterns(partnerIds);

            // Build constraints and objectives
            const constraints = this.buildConstraints(scheduleRequest, installation);
            const objectives = this.buildObjectives(scheduleRequest);

            const context: SchedulingContext = {
                installation,
                contract,
                availablePartners,
                regulatoryRequirements,
                constraints,
                objectives,
                historicalData,
                partnerPatterns
            };

            logger.info('Scheduling context prepared successfully', {
                installationCode: scheduleRequest.installationCode,
                partnerCount: availablePartners.length,
                historicalDataCount: historicalData.length,
                patternCount: partnerPatterns.length
            });

            return context;
        } catch (error) {
            logger.error('Failed to prepare scheduling context:', { 
                scheduleRequest,
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Build scheduling constraints based on request and installation
     */
    private buildConstraints(scheduleRequest: ScheduleRequest, installation: any): SchedulingConstraints {
        const constraints: SchedulingConstraints = {
            excludeWeekends: installation.exclude_weekends || false,
            workingHours: installation.working_hours || '08:00-17:00',
            minimumVisitDuration: installation.minimum_visit_duration || 1,
            maximumVisitDuration: installation.maximum_visit_duration || 8,
            minimumGapBetweenVisits: installation.minimum_gap_hours || 24,
            partnerAvailability: []
        };

        // Add special constraints based on service type
        if (scheduleRequest.serviceType === 'medical') {
            constraints.excludeWeekends = true;
            constraints.minimumVisitDuration = Math.max(constraints.minimumVisitDuration, 2);
            constraints.workingHours = '09:00-17:00'; // Stricter hours for medical
        } else if (scheduleRequest.serviceType === 'emergency') {
            constraints.excludeWeekends = false;
            constraints.workingHours = '00:00-23:59'; // 24/7 for emergency
            constraints.minimumGapBetweenVisits = 4; // Shorter gap for emergency
        }

        // Add time-based constraints
        const startDate = new Date(scheduleRequest.startDate);
        const endDate = new Date(scheduleRequest.endDate);
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff < 7) {
            // Short timeframe - more flexible constraints
            constraints.minimumGapBetweenVisits = Math.max(constraints.minimumGapBetweenVisits / 2, 4);
        } else if (daysDiff > 90) {
            // Long timeframe - can enforce stricter constraints
            constraints.minimumGapBetweenVisits = Math.max(constraints.minimumGapBetweenVisits, 48);
        }

        logger.debug('Built scheduling constraints', { constraints });
        return constraints;
    }

    /**
     * Build scheduling objectives based on request
     */
    private buildObjectives(scheduleRequest: ScheduleRequest): SchedulingObjectives {
        const objectives: SchedulingObjectives = {
            costWeight: 0.25,
            qualityWeight: 0.30,
            proximityWeight: 0.25,
            availabilityWeight: 0.20,
            flexibilityRequirement: 0.5
        };

        // Adjust weights based on service type
        if (scheduleRequest.serviceType === 'medical') {
            objectives.qualityWeight = 0.40;
            objectives.costWeight = 0.15;
            objectives.proximityWeight = 0.25;
            objectives.availabilityWeight = 0.20;
        } else if (scheduleRequest.serviceType === 'emergency') {
            objectives.availabilityWeight = 0.45;
            objectives.proximityWeight = 0.35;
            objectives.qualityWeight = 0.15;
            objectives.costWeight = 0.05;
        } else if (scheduleRequest.serviceType === 'maintenance') {
            objectives.costWeight = 0.40;
            objectives.qualityWeight = 0.20;
            objectives.proximityWeight = 0.20;
            objectives.availabilityWeight = 0.20;
        }

        // Adjust flexibility based on total hours
        if (scheduleRequest.totalHours > 40) {
            objectives.flexibilityRequirement = 0.7; // More flexibility for longer engagements
        } else if (scheduleRequest.totalHours < 10) {
            objectives.flexibilityRequirement = 0.3; // Less flexibility for short engagements
        }

        // Set preferred start time if specified in special requirements
        if (scheduleRequest.specialRequirements) {
            const morningMatch = scheduleRequest.specialRequirements.match(/morning|early/i);
            const afternoonMatch = scheduleRequest.specialRequirements.match(/afternoon|late/i);
            
            if (morningMatch) {
                objectives.preferredStartTime = '08:00';
            } else if (afternoonMatch) {
                objectives.preferredStartTime = '14:00';
            }
        }

        logger.debug('Built scheduling objectives', { objectives });
        return objectives;
    }

    /**
     * Validate schedule request
     */
    validateScheduleRequest(request: ScheduleRequest): boolean {
        const errors: string[] = [];

        if (!request.contractCode?.trim()) {
            errors.push('Contract code is required');
        }

        if (!request.installationCode?.trim()) {
            errors.push('Installation code is required');
        }

        if (!request.serviceType?.trim()) {
            errors.push('Service type is required');
        }

        if (!request.startDate || !request.endDate) {
            errors.push('Start date and end date are required');
        }

        if (request.startDate && request.endDate) {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            
            if (startDate >= endDate) {
                errors.push('End date must be after start date');
            }
            
            if (startDate < new Date()) {
                errors.push('Start date cannot be in the past');
            }
        }

        if (!request.totalHours || request.totalHours <= 0) {
            errors.push('Total hours must be greater than 0');
        }

        if (!request.minimumHoursPerMonth || request.minimumHoursPerMonth <= 0) {
            errors.push('Minimum hours per month must be greater than 0');
        }

        if (request.totalHours < request.minimumHoursPerMonth) {
            errors.push('Total hours cannot be less than minimum hours per month');
        }

        if (errors.length > 0) {
            logger.warn('Schedule request validation failed', { errors, request });
            return false;
        }

        return true;
    }
}

export default AISchedulingContextBuilder;