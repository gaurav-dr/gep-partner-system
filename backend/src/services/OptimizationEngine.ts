import { Logger, Partner, CustomerRequest, ServiceType } from '../types';

const logger: Logger = require('../utils/logger');

interface OptimizationConfig {
  maxDistance?: number;
  weights?: Partial<OptimizationWeights>;
  timeout?: number;
}

interface OptimizationWeights {
  location: number;
  availability: number;
  cost: number;
  specialty: number;
  performance: number;
}

export interface OptimizationConstraints {
  maxDistance?: number;
  excludedPartners?: string[];
  maxHourlyRate?: number;
  requiredSkills?: string[];
  preferredPartners?: string[];
}

interface PartnerScore {
  location: number;
  availability: number;
  cost: number;
  specialty: number;
  performance: number;
  distance: number;
}

interface ScoredPartner extends Partner {
  score: number;
  location_score: number;
  availability_score: number;
  cost_score: number;
  specialty_score: number;
  performance_score: number;
  distance: number;
}

interface TopCandidate {
  id: string;
  name: string;
  score: number;
  hourly_rate: number;
  distance: number;
  availability_score: number;
  cost_score: number;
  location_score: number;
  specialty_score: number;
  performance_score: number;
}

interface OptimizationResult {
  selectedPartner: ScoredPartner | null;
  topCandidates: TopCandidate[];
  executionTimeMs?: number;
  evaluation: {
    totalPartnersEvaluated: number;
    candidatesAfterFiltering: number;
    executionTimeMs?: number;
    weights?: OptimizationWeights;
    filteringReasons?: string[];
  };
}

class OptimizationEngine {
  private maxDistance: number;
  private weights: OptimizationWeights;
  private timeout: number;

  constructor(config: OptimizationConfig = {}) {
    this.maxDistance = config.maxDistance || 50; // km
    this.weights = {
      location: 0.25,
      availability: 0.20,
      cost: 0.15,
      specialty: 0.10,
      performance: 0.30, // Highest weight for performance-based assignment
      ...config.weights
    };
    this.timeout = config.timeout || 5000; // ms
  }

  /**
   * Main optimization function
   */
  async optimize(request: CustomerRequest, partners: Partner[], constraints: OptimizationConstraints = {}): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting optimization', {
        requestId: request.id,
        partnersCount: partners.length,
        serviceType: request.service_type
      });

      // Filter partners based on basic requirements
      const candidatePartners = this.filterPartners(request, partners, constraints);
      
      if (candidatePartners.length === 0) {
        logger.warn('No candidate partners after filtering', { 
          requestId: request.id 
        });
        return {
          selectedPartner: null,
          topCandidates: [],
          evaluation: {
            totalPartnersEvaluated: partners.length,
            candidatesAfterFiltering: 0,
            filteringReasons: this.getFilteringReasons(request, partners, constraints)
          }
        };
      }

      // Calculate scores for each candidate
      const scoredPartners = await this.scorePartners(request, candidatePartners);

      // Sort by score (highest first)
      scoredPartners.sort((a, b) => b.score - a.score);

      const topCandidates: TopCandidate[] = scoredPartners.slice(0, 5).map(partner => ({
        id: partner.id,
        name: partner.name,
        score: Math.round(partner.score * 100) / 100,
        hourly_rate: partner.hourly_rate,
        distance: partner.distance,
        availability_score: partner.availability_score,
        cost_score: partner.cost_score,
        location_score: partner.location_score,
        specialty_score: partner.specialty_score,
        performance_score: partner.performance_score
      }));

      const selectedPartner = scoredPartners[0] || null;
      const executionTime = Date.now() - startTime;

      logger.info('Optimization completed', {
        requestId: request.id,
        selectedPartnerId: selectedPartner?.id,
        score: selectedPartner?.score,
        executionTimeMs: executionTime
      });

      return {
        selectedPartner,
        topCandidates,
        executionTimeMs: executionTime,
        evaluation: {
          totalPartnersEvaluated: partners.length,
          candidatesAfterFiltering: candidatePartners.length,
          executionTimeMs: executionTime,
          weights: this.weights
        }
      };

    } catch (error: any) {
      logger.error('Optimization failed', {
        requestId: request.id,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Filter partners based on requirements and constraints
   */
  private filterPartners(request: CustomerRequest, partners: Partner[], constraints: OptimizationConstraints): Partner[] {
    return partners.filter(partner => {
      // Check if partner is active
      if (!partner.is_active) {
        return false;
      }

      // Check if partner is in excluded list
      if (constraints.excludedPartners && constraints.excludedPartners.includes(partner.id)) {
        return false;
      }

      // Check specialty match
      if (!this.checkSpecialtyMatch(request.service_type, partner.specialty)) {
        return false;
      }

      // Check hourly rate constraint
      if (constraints.maxHourlyRate && partner.hourly_rate > constraints.maxHourlyRate) {
        return false;
      }

      // Check basic availability
      if (!this.checkBasicAvailability(partner)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Score all candidate partners
   */
  private async scorePartners(request: CustomerRequest, partners: Partner[]): Promise<ScoredPartner[]> {
    const scoredPartners: ScoredPartner[] = [];

    for (const partner of partners) {
      try {
        const scores = await this.calculatePartnerScore(request, partner);
        
        // Calculate weighted total score
        const totalScore = (
          scores.location * this.weights.location +
          scores.availability * this.weights.availability +
          scores.cost * this.weights.cost +
          scores.specialty * this.weights.specialty +
          scores.performance * this.weights.performance
        );

        scoredPartners.push({
          ...partner,
          score: totalScore,
          location_score: scores.location,
          availability_score: scores.availability,
          cost_score: scores.cost,
          specialty_score: scores.specialty,
          performance_score: scores.performance,
          distance: scores.distance
        });

      } catch (error: any) {
        logger.warn('Failed to score partner', {
          partnerId: partner.id,
          error: error.message
        });
      }
    }

    return scoredPartners;
  }

  /**
   * Calculate individual scores for a partner
   */
  private async calculatePartnerScore(request: CustomerRequest, partner: Partner): Promise<PartnerScore> {
    const scores: PartnerScore = {
      location: 0,
      availability: 0,
      cost: 0,
      specialty: 0,
      performance: 0,
      distance: 0
    };

    // Location Score (based on distance)
    const distance = this.calculateDistance(request, partner);
    scores.distance = distance;
    scores.location = Math.max(0, 100 - (distance / this.maxDistance) * 100);

    // Availability Score
    scores.availability = this.calculateAvailabilityScore(partner, request);

    // Cost Score (lower cost = higher score)
    scores.cost = this.calculateCostScore(partner);

    // Specialty Score
    scores.specialty = this.calculateSpecialtyScore(request.service_type, partner.specialty);

    // Performance Score (based on completion rate, response time, satisfaction)
    scores.performance = this.calculatePerformanceScore(partner);

    return scores;
  }

  /**
   * Calculate distance between request location and partner location
   */
  private calculateDistance(request: CustomerRequest, partner: Partner): number {
    // Simplified distance calculation based on Greek cities
    const cityDistances: Record<string, Record<string, number>> = {
      'Athens': { 'Athens': 5, 'Thessaloniki': 20, 'Patras': 15, 'Heraklion': 30 },
      'Thessaloniki': { 'Athens': 20, 'Thessaloniki': 5, 'Patras': 25, 'Heraklion': 35 },
      'Patras': { 'Athens': 15, 'Thessaloniki': 25, 'Patras': 5, 'Heraklion': 40 },
      'Heraklion': { 'Athens': 30, 'Thessaloniki': 35, 'Patras': 40, 'Heraklion': 5 }
    };

    // Extract city from installation address (simplified)
    let requestCity = 'Athens'; // default
    if (request.installation_address) {
      if (request.installation_address.includes('Thessaloniki')) requestCity = 'Thessaloniki';
      else if (request.installation_address.includes('Patras')) requestCity = 'Patras';
      else if (request.installation_address.includes('Heraklion')) requestCity = 'Heraklion';
    }

    return cityDistances[requestCity]?.[partner.city] || 25;
  }

  /**
   * Calculate availability score based on partner's current workload
   */
  private calculateAvailabilityScore(partner: Partner, request: CustomerRequest): number {
    // If partner has availability data
    if (partner.partner_availability && partner.partner_availability.length > 0) {
      const totalAvailable = partner.partner_availability.reduce((sum, day) => {
        return sum + (day.available_hours - day.booked_hours);
      }, 0);
      
      const averageDaily = totalAvailable / partner.partner_availability.length;
      return Math.min(100, (averageDaily / 8) * 100); // 8 hours is max daily
    }

    // Default availability score based on max hours per week
    const weeklyAvailable = partner.max_hours_per_week || 40;
    return Math.min(100, (weeklyAvailable / 40) * 100);
  }

  /**
   * Calculate cost score - lower hourly rate gets higher score
   */
  private calculateCostScore(partner: Partner): number {
    // Normalize against typical rate range (€20-100)
    const minRate = 20;
    const maxRate = 100;
    const normalizedRate = Math.max(0, Math.min(1, (partner.hourly_rate - minRate) / (maxRate - minRate)));
    
    // Invert so lower cost = higher score
    return (1 - normalizedRate) * 100;
  }

  /**
   * Calculate specialty match score
   */
  private calculateSpecialtyScore(serviceType: ServiceType, partnerSpecialty: string): number {
    // Direct specialty match mappings
    const specialtyMappings: Record<ServiceType, string[]> = {
      'installation': ['installation', 'installer', 'technician'],
      'maintenance': ['maintenance', 'service', 'technician'],
      'repair': ['repair', 'maintenance', 'technician'],
      'consultation': ['consultation', 'consultant', 'advisor'],
      'training': ['training', 'trainer', 'educator']
    };

    const relevantSpecialties = specialtyMappings[serviceType] || [];
    const partnerSpecialtyLower = partnerSpecialty.toLowerCase();

    // Check for exact matches
    for (const specialty of relevantSpecialties) {
      if (partnerSpecialtyLower.includes(specialty)) {
        return 100; // Perfect match
      }
    }

    // Check for partial matches
    if (relevantSpecialties.some(s => partnerSpecialtyLower.includes(s.substring(0, 4)))) {
      return 75; // Good match
    }

    return 50; // Basic match (partner can potentially handle the service)
  }

  /**
   * Calculate performance score based on metrics
   */
  private calculatePerformanceScore(partner: Partner): number {
    if (!partner.performance_metrics) {
      return 60; // Default score for partners without metrics
    }

    const metrics = partner.performance_metrics;
    
    // Weighted performance calculation
    const completionScore = metrics.completion_rate * 100;
    const responseScore = Math.max(0, 100 - (metrics.avg_response_time - 1) * 20); // Penalize slow response
    const satisfactionScore = metrics.client_satisfaction * 100;

    return (completionScore * 0.4 + responseScore * 0.3 + satisfactionScore * 0.3);
  }

  /**
   * Check if partner's specialty matches the service type
   */
  private checkSpecialtyMatch(serviceType: ServiceType, partnerSpecialty: string): boolean {
    const specialtyScore = this.calculateSpecialtyScore(serviceType, partnerSpecialty);
    return specialtyScore >= 50; // Minimum threshold for specialty match
  }

  /**
   * Check basic availability of partner
   */
  private checkBasicAvailability(partner: Partner): boolean {
    // Check if partner has availability data
    if (partner.partner_availability && partner.partner_availability.length > 0) {
      return partner.partner_availability.some(slot => 
        slot.is_available && (slot.available_hours - slot.booked_hours) > 0
      );
    }

    // If no detailed availability, assume available if max_hours_per_week is set
    return partner.max_hours_per_week ? partner.max_hours_per_week > 0 : true;
  }

  /**
   * Get reasons why partners were filtered out
   */
  private getFilteringReasons(request: CustomerRequest, partners: Partner[], constraints: OptimizationConstraints): string[] {
    const reasons: string[] = [];
    
    let inactiveCount = 0;
    let specialtyMismatchCount = 0;
    let costConstraintCount = 0;
    let unavailableCount = 0;

    partners.forEach(partner => {
      if (!partner.is_active) inactiveCount++;
      else if (!this.checkSpecialtyMatch(request.service_type, partner.specialty)) specialtyMismatchCount++;
      else if (constraints.maxHourlyRate && partner.hourly_rate > constraints.maxHourlyRate) costConstraintCount++;
      else if (!this.checkBasicAvailability(partner)) unavailableCount++;
    });

    if (inactiveCount > 0) reasons.push(`${inactiveCount} partners inactive`);
    if (specialtyMismatchCount > 0) reasons.push(`${specialtyMismatchCount} partners with specialty mismatch`);
    if (costConstraintCount > 0) reasons.push(`${costConstraintCount} partners exceed cost constraint`);
    if (unavailableCount > 0) reasons.push(`${unavailableCount} partners unavailable`);

    return reasons;
  }
}

export default OptimizationEngine;