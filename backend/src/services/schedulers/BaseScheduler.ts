import { Logger, Partner } from '../../types';

const logger: Logger = require('../../utils/logger');

interface SchedulerConfig {
  name: string;
  algorithm_type: string;
  version: string;
  parameters?: Record<string, any>;
  weights?: {
    location?: number;
    availability?: number;
    cost?: number;
    specialty?: number;
  };
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
}

interface Visit {
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  notes: string;
  specialRequirements?: string | null;
}

interface ScheduleResult {
  visits: Visit[];
  totalHours: number;
  visitDuration: number;
  visitsPerMonth: number;
}

interface ScoreBreakdown {
  location: number;
  availability: number;
  cost: number;
  specialty: number;
  historical: number;
}

interface CompositeScoreResult {
  compositeScore: number;
  breakdown: ScoreBreakdown;
}

interface ValidationResult {
  valid: boolean;
  violations: string[];
}

interface OptimizationResult {
  optimizationScore: number;
  feasible: boolean;
  partnerId: string;
  visits?: Visit[];
  totalHours: number;
}

/**
 * Base class for all scheduling algorithms
 * Provides common interface and utility methods
 */
abstract class BaseScheduler {
    protected config: SchedulerConfig;
    protected name: string;
    protected type: string;
    protected version: string;
    protected parameters: Record<string, any>;
    protected weights: {
        location: number;
        availability: number;
        cost: number;
        specialty: number;
    };
    protected isInitialized: boolean;

    constructor(config: SchedulerConfig) {
        this.config = config;
        this.name = config.name;
        this.type = config.algorithm_type;
        this.version = config.version;
        this.parameters = config.parameters || {};
        this.weights = {
            location: 0.4,
            availability: 0.3,
            cost: 0.2,
            specialty: 0.1,
            ...config.weights
        };
        this.isInitialized = false;
    }

    /**
     * Initialize the scheduler - must be implemented by subclasses
     */
    abstract initialize(): Promise<void>;

    /**
     * Generate schedule - must be implemented by subclasses
     */
    abstract generateSchedule(context: SchedulingContext): Promise<OptimizationResult>;

    /**
     * Calculate distance between two locations (simplified)
     */
    protected calculateDistance(location1: string, location2: string): number {
        // Simplified distance calculation - in production, use proper geospatial calculations
        if (!location1 || !location2) return 50; // Default distance

        // Mock implementation - replace with actual geospatial calculation
        const cityDistances: Record<string, number> = {
            'ΑΘΗΝΑ-ΚΑΛΛΙΘΕΑ': 8,
            'ΑΘΗΝΑ-ΓΕΡΑΚΑΣ': 25,
            'ΚΑΛΛΙΘΕΑ-ΓΕΡΑΚΑΣ': 30,
            'ΑΘΗΝΑ-ΑΘΗΝΑ': 0,
            'ΚΑΛΛΙΘΕΑ-ΚΑΛΛΙΘΕΑ': 0,
            'ΓΕΡΑΚΑΣ-ΓΕΡΑΚΑΣ': 0
        };

        const key = `${location1}-${location2}`;
        const reverseKey = `${location2}-${location1}`;
        
        return cityDistances[key] || cityDistances[reverseKey] || 20; // Default 20km
    }

    /**
     * Calculate location score (higher is better)
     */
    protected calculateLocationScore(partnerCity: string, installationCity: string): number {
        const distance = this.calculateDistance(partnerCity, installationCity);
        
        // Convert distance to score (0-1, where 1 is best)
        const maxDistance = 50; // km
        return Math.max(0, 1 - (distance / maxDistance));
    }

    /**
     * Calculate availability score based on partner availability
     */
    protected calculateAvailabilityScore(partner: any, timeRequirements: any): number {
        if (!partner.partner_availability || partner.partner_availability.length === 0) {
            return 0.5; // Default availability if no data
        }

        // Calculate based on available hours vs required hours
        const totalAvailableHours = partner.partner_availability.reduce((sum: number, avail: any) => {
            return sum + (avail.available_hours - avail.booked_hours);
        }, 0);

        const requiredHours = timeRequirements.totalHours || 20;
        
        if (totalAvailableHours >= requiredHours) {
            return 1.0;
        } else if (totalAvailableHours >= requiredHours * 0.8) {
            return 0.8;
        } else if (totalAvailableHours >= requiredHours * 0.6) {
            return 0.6;
        } else {
            return Math.max(0, totalAvailableHours / requiredHours);
        }
    }

    /**
     * Calculate cost score (lower cost = higher score)
     */
    protected calculateCostScore(partner: Partner, budget: number): number {
        if (!budget || budget <= 0) return 0.5;

        const costEfficiency = Math.min(1.0, budget / (partner.hourly_rate * 20)); // Assume 20 hours
        return costEfficiency;
    }

    /**
     * Calculate specialty match score
     */
    protected calculateSpecialtyScore(partner: Partner, serviceType: string): number {
        const specialtyMappings: Record<string, string[]> = {
            'occupational_doctor': ['Παθολόγος', 'Ιατρός', 'Ειδικός Ιατρός Εργασίας', 'Παιδίατρος'],
            'safety_engineer': ['Μηχανικός', 'Ηλεκτρολόγος Μηχανικός', 'Μηχανολόγος Μηχανικός', 'Μηχανικός Δομικών Έργων ΤΕ', 'Μηχανικός Παραγωγής & Διοίκησης', 'Μηχανολόγος Μηχανικός ΤΕ'],
            'specialist_consultation': ['Ειδικός Ιατρός Εργασίας', 'Παθολόγος']
        };

        const requiredSpecialties = specialtyMappings[serviceType] || [];
        
        // Check for exact match
        if (requiredSpecialties.includes(partner.specialty)) {
            return 1.0;
        }

        // Check for partial match (contains keywords)
        for (const requiredSpecialty of requiredSpecialties) {
            if (partner.specialty.includes(requiredSpecialty) || requiredSpecialty.includes(partner.specialty)) {
                return 0.8;
            }
        }

        return 0.2; // Low score for poor specialty match
    }

    /**
     * Calculate historical success score based on past performance
     */
    protected calculateHistoricalScore(partner: Partner, installation: any, historicalData: any[]): number {
        if (!historicalData || historicalData.length === 0) {
            return 0.5; // Neutral score if no historical data
        }

        // Find schedules with this partner and installation
        const relevantSchedules = historicalData.filter(schedule => 
            schedule.partner_id === partner.id &&
            schedule.installation_code === installation.installation_code
        );

        if (relevantSchedules.length === 0) {
            // Check for schedules with this partner at other installations
            const partnerSchedules = historicalData.filter(schedule => 
                schedule.partner_id === partner.id
            );

            if (partnerSchedules.length === 0) {
                return 0.5; // No history with this partner
            }

            // Calculate average success rate for this partner
            const avgScore = partnerSchedules.reduce((sum: number, schedule: any) => 
                sum + (schedule.optimization_score || 0.5), 0) / partnerSchedules.length;
            
            return Math.min(1.0, avgScore + 0.1); // Small bonus for partner familiarity
        }

        // Calculate success rate for this specific partner-installation combination
        const avgScore = relevantSchedules.reduce((sum: number, schedule: any) => 
            sum + (schedule.optimization_score || 0.5), 0) / relevantSchedules.length;

        // Bonus for successful history
        return Math.min(1.0, avgScore + 0.2);
    }

    /**
     * Calculate composite optimization score
     */
    protected calculateCompositeScore(partner: Partner, context: SchedulingContext): CompositeScoreResult {
        const locationScore = this.calculateLocationScore(partner.city, context.installation.address);
        const availabilityScore = this.calculateAvailabilityScore(partner, context.regulatoryRequirements);
        const costScore = this.calculateCostScore(partner, context.contract.contract_value);
        const specialtyScore = this.calculateSpecialtyScore(partner, context.installation.service_type);
        const historicalScore = this.calculateHistoricalScore(partner, context.installation, context.historicalData || []);

        const compositeScore = 
            (locationScore * this.weights.location) +
            (availabilityScore * this.weights.availability) +
            (costScore * this.weights.cost) +
            (specialtyScore * this.weights.specialty) +
            (historicalScore * 0.1); // Small weight for historical performance

        return {
            compositeScore: Math.min(1.0, compositeScore),
            breakdown: {
                location: locationScore,
                availability: availabilityScore,
                cost: costScore,
                specialty: specialtyScore,
                historical: historicalScore
            }
        };
    }

    /**
     * Generate visit schedule based on requirements
     */
    protected generateVisitSchedule(partner: Partner, context: SchedulingContext, startDate: string, endDate: string): ScheduleResult {
        const visits: Visit[] = [];
        const regulatoryReqs = context.regulatoryRequirements;
        
        // Calculate visit frequency
        const totalMonths = this.getMonthsBetween(new Date(startDate), new Date(endDate));
        const visitsPerMonth = Math.max(1, Math.ceil(regulatoryReqs.minimumHoursPerMonth / 4)); // Assume 4 hours per visit
        const totalVisits = Math.ceil(totalMonths * visitsPerMonth);
        
        // Calculate visit duration
        const visitDuration = Math.min(4, Math.max(1, regulatoryReqs.minimumHoursPerMonth / visitsPerMonth));
        
        // Generate visit dates
        const visitDates = this.generateVisitDates(startDate, endDate, totalVisits, context.constraints);
        
        // Create visit objects
        for (let i = 0; i < visitDates.length; i++) {
            const visitDate = visitDates[i];
            const startTime = this.getOptimalVisitTime(visitDate, context.installation.work_hours, partner);
            
            visits.push({
                date: visitDate.toISOString().split('T')[0],
                startTime: startTime,
                endTime: this.addHours(startTime, visitDuration),
                duration: visitDuration,
                type: context.installation.service_type || 'occupational_doctor',
                notes: `Generated visit for ${partner.name}`,
                specialRequirements: context.installation.special_requirements || null
            });
        }

        return {
            visits,
            totalHours: visits.reduce((sum, visit) => sum + visit.duration, 0),
            visitDuration,
            visitsPerMonth
        };
    }

    /**
     * Generate optimal visit dates avoiding conflicts
     */
    private generateVisitDates(startDate: string, endDate: string, totalVisits: number, constraints: any): Date[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates: Date[] = [];
        
        const daysBetween = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const intervalDays = Math.floor(daysBetween / totalVisits);
        
        let currentDate = new Date(start);
        
        for (let i = 0; i < totalVisits; i++) {
            // Skip weekends if required
            while (constraints.excludeWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Add some randomization to avoid rigid patterns
            const randomOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1 days
            const visitDate = new Date(currentDate);
            visitDate.setDate(visitDate.getDate() + randomOffset);
            
            if (visitDate <= end) {
                dates.push(new Date(visitDate));
            }
            
            // Move to next interval
            currentDate.setDate(currentDate.getDate() + intervalDays);
            
            if (currentDate > end) {
                break;
            }
        }
        
        return dates;
    }

    /**
     * Get optimal visit time based on working hours and partner availability
     */
    private getOptimalVisitTime(visitDate: Date, workingHours: string, partner: Partner): string {
        // Parse working hours (e.g., "ΔΕΥΤΕΡΑ - ΠΑΡΑΣΚΕΥΗ 09:00-17:00")
        const timeMatch = workingHours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
        
        if (!timeMatch) {
            return '10:00:00'; // Default time
        }
        
        const startHour = parseInt(timeMatch[1]);
        const endHour = parseInt(timeMatch[3]);
        
        // Prefer mid-morning times
        const preferredHour = Math.min(endHour - 2, Math.max(startHour + 1, 10));
        
        return `${preferredHour.toString().padStart(2, '0')}:00:00`;
    }

    /**
     * Add hours to time string
     */
    protected addHours(timeString: string, hours: number): string {
        const [hour, minute, second] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hour, minute, second || 0);
        date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
        
        return date.toTimeString().split(' ')[0];
    }

    /**
     * Calculate months between two dates
     */
    private getMonthsBetween(startDate: Date, endDate: Date): number {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
        return months - startDate.getMonth() + endDate.getMonth();
    }

    /**
     * Check if generated schedule meets all constraints
     */
    protected validateSchedule(schedule: ScheduleResult, context: SchedulingContext): ValidationResult {
        const violations: string[] = [];
        
        // Check total hours requirement
        const requiredHours = context.regulatoryRequirements.minimumHoursPerMonth;
        const actualHours = schedule.totalHours;
        
        if (actualHours < requiredHours * 0.9) { // Allow 10% tolerance
            violations.push(`Insufficient hours: ${actualHours} < ${requiredHours}`);
        }
        
        // Check visit overlaps
        const visits = schedule.visits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        for (let i = 1; i < visits.length; i++) {
            const prevVisit = visits[i - 1];
            const currentVisit = visits[i];
            
            if (prevVisit.date === currentVisit.date) {
                const prevEnd = new Date(`${prevVisit.date}T${prevVisit.endTime}`);
                const currentStart = new Date(`${currentVisit.date}T${currentVisit.startTime}`);
                
                if (currentStart < prevEnd) {
                    violations.push(`Visit overlap on ${currentVisit.date}: ${prevVisit.endTime} - ${currentVisit.startTime}`);
                }
            }
        }
        
        // Check working hours compliance
        for (const visit of visits) {
            if (!this.isWithinWorkingHours(visit, context.installation.work_hours)) {
                violations.push(`Visit outside working hours: ${visit.date} ${visit.startTime}`);
            }
        }
        
        return {
            valid: violations.length === 0,
            violations
        };
    }

    /**
     * Check if visit is within working hours
     */
    private isWithinWorkingHours(visit: Visit, workingHours: string): boolean {
        // Simplified check - implement proper parsing for complex working hours
        const timeMatch = workingHours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
        
        if (!timeMatch) {
            return true; // Allow if can't parse working hours
        }
        
        const workStart = `${timeMatch[1]}:${timeMatch[2]}:00`;
        const workEnd = `${timeMatch[3]}:${timeMatch[4]}:00`;
        
        return visit.startTime >= workStart && visit.endTime <= workEnd;
    }

    /**
     * Log algorithm execution metrics
     */
    protected logMetrics(executionTime: number, result: OptimizationResult, context: SchedulingContext): void {
        logger.info('Algorithm execution completed', {
            algorithm: this.name,
            type: this.type,
            executionTime,
            optimizationScore: result.optimizationScore,
            feasible: result.feasible,
            partnerId: result.partnerId,
            totalVisits: result.visits?.length || 0,
            totalHours: result.totalHours
        });
    }
}

export default BaseScheduler;
export { OptimizationResult };