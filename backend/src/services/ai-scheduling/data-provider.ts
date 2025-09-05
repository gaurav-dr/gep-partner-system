import { supabaseAdmin } from '../../config/supabase';
import { Logger } from '../../types';
import { ScheduleRequest, RegulatoryRequirements } from './types';

const logger: Logger = require('../../utils/logger');

export class AISchedulingDataProvider {
    /**
     * Get contract details from database
     */
    async getContractDetails(contractCode: string): Promise<any> {
        try {
            const { data: contract, error } = await supabaseAdmin
                .from('contracts')
                .select('*')
                .eq('contract_code', contractCode)
                .single();

            if (error) {
                logger.error('Error fetching contract details:', { contractCode, error: error.message });
                throw new Error(`Contract not found: ${contractCode}`);
            }

            return contract;
        } catch (error) {
            logger.error('Failed to get contract details:', { contractCode, error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get installation details from database
     */
    async getInstallationDetails(installationCode: string): Promise<any> {
        try {
            const { data: installation, error } = await supabaseAdmin
                .from('installations')
                .select('*')
                .eq('installation_code', installationCode)
                .single();

            if (error) {
                logger.error('Error fetching installation details:', { installationCode, error: error.message });
                throw new Error(`Installation not found: ${installationCode}`);
            }

            return installation;
        } catch (error) {
            logger.error('Failed to get installation details:', { installationCode, error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get available partners for scheduling
     */
    async getAvailablePartners(scheduleRequest: ScheduleRequest): Promise<any[]> {
        try {
            const { data: partners, error } = await supabaseAdmin
                .from('partners')
                .select(`
                    *,
                    partner_specialties(specialty),
                    partner_availability(day_of_week, start_time, end_time)
                `)
                .eq('is_active', true)
                .contains('service_types', [scheduleRequest.serviceType]);

            if (error) {
                logger.error('Error fetching available partners:', { error: error.message });
                throw new Error('Failed to fetch available partners');
            }

            return partners || [];
        } catch (error) {
            logger.error('Failed to get available partners:', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get historical scheduling data
     */
    async getHistoricalData(scheduleRequest: ScheduleRequest): Promise<any[]> {
        try {
            // Get historical visit data for similar installations
            const { data: historicalData, error } = await supabaseAdmin
                .from('scheduled_visits')
                .select(`
                    *,
                    schedules!inner(
                        installation_code,
                        service_type,
                        partner_id,
                        partners(name, specialties)
                    )
                `)
                .eq('schedules.service_type', scheduleRequest.serviceType)
                .gte('visit_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
                .order('visit_date', { ascending: false })
                .limit(500);

            if (error) {
                logger.error('Error fetching historical data:', { error: error.message });
                return [];
            }

            return historicalData || [];
        } catch (error) {
            logger.error('Failed to get historical data:', { error: (error as Error).message });
            return [];
        }
    }

    /**
     * Calculate regulatory requirements based on installation
     */
    async calculateRegulatoryRequirements(installation: any): Promise<RegulatoryRequirements> {
        try {
            // Basic regulatory requirements
            let requirements: RegulatoryRequirements = {
                totalHours: installation.required_hours || 8,
                minimumHoursPerMonth: installation.minimum_monthly_hours || 4,
                excludeWeekends: installation.exclude_weekends || false,
                workingHours: installation.working_hours || '08:00-17:00'
            };

            // Check for special regulatory requirements based on service type
            if (installation.service_type === 'medical') {
                requirements.minimumHoursPerMonth = Math.max(requirements.minimumHoursPerMonth, 8);
                requirements.excludeWeekends = true;
            }

            return requirements;
        } catch (error) {
            logger.error('Failed to calculate regulatory requirements:', { error: (error as Error).message });
            // Return default requirements
            return {
                totalHours: 8,
                minimumHoursPerMonth: 4,
                excludeWeekends: false,
                workingHours: '08:00-17:00'
            };
        }
    }

    /**
     * Get partner patterns for optimization
     */
    async getPartnerPatterns(partnerIds: string[]): Promise<any[]> {
        try {
            if (!partnerIds.length) return [];

            const { data: patterns, error } = await supabaseAdmin
                .from('partner_performance_metrics')
                .select('*')
                .in('partner_id', partnerIds)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                logger.error('Error fetching partner patterns:', { error: error.message });
                return [];
            }

            return patterns || [];
        } catch (error) {
            logger.error('Failed to get partner patterns:', { error: (error as Error).message });
            return [];
        }
    }

    /**
     * Create a new schedule record
     */
    async createScheduleRecord(scheduleData: any): Promise<any> {
        try {
            const { data: schedule, error } = await supabaseAdmin
                .from('schedules')
                .insert({
                    contract_code: scheduleData.contractCode,
                    installation_code: scheduleData.installationCode,
                    service_type: scheduleData.serviceType,
                    partner_id: scheduleData.partnerId,
                    start_date: scheduleData.startDate,
                    end_date: scheduleData.endDate,
                    total_hours: scheduleData.totalHours,
                    algorithm_used: scheduleData.algorithmUsed,
                    optimization_score: scheduleData.optimizationScore,
                    execution_time_ms: scheduleData.executionTime,
                    feasible: scheduleData.feasible,
                    metadata: scheduleData.metadata,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                logger.error('Error creating schedule record:', { error: error.message });
                throw new Error('Failed to create schedule record');
            }

            return schedule;
        } catch (error) {
            logger.error('Failed to create schedule record:', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Create scheduled visits for a schedule
     */
    async createScheduledVisits(scheduleId: string, visits: any[]): Promise<void> {
        try {
            const visitRecords = visits.map(visit => ({
                schedule_id: scheduleId,
                visit_date: visit.date,
                start_time: visit.startTime,
                end_time: visit.endTime,
                duration_hours: visit.duration,
                visit_type: visit.type,
                notes: visit.notes || '',
                special_requirements: visit.specialRequirements,
                status: 'scheduled',
                created_at: new Date().toISOString()
            }));

            const { error } = await supabaseAdmin
                .from('scheduled_visits')
                .insert(visitRecords);

            if (error) {
                logger.error('Error creating scheduled visits:', { scheduleId, error: error.message });
                throw new Error('Failed to create scheduled visits');
            }

            logger.info('Created scheduled visits successfully', { 
                scheduleId, 
                visitCount: visits.length 
            });
        } catch (error) {
            logger.error('Failed to create scheduled visits:', { scheduleId, error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Update algorithm statistics
     */
    async updateAlgorithmStats(algorithmId: string, result: any, executionTime: number): Promise<void> {
        try {
            const successful = result.feasible && result.score > 0;
            
            const { error } = await supabaseAdmin
                .from('algorithm_performance')
                .upsert({
                    algorithm_id: algorithmId,
                    total_runs: 1,
                    successful_runs: successful ? 1 : 0,
                    total_execution_time_ms: executionTime,
                    total_optimization_score: successful ? result.score : 0,
                    last_run_at: new Date().toISOString()
                }, {
                    onConflict: 'algorithm_id'
                });

            if (error) {
                logger.error('Error updating algorithm stats:', { algorithmId, error: error.message });
            }
        } catch (error) {
            logger.error('Failed to update algorithm stats:', { algorithmId, error: (error as Error).message });
            // Don't throw - this is not critical for the main flow
        }
    }
}

export default AISchedulingDataProvider;