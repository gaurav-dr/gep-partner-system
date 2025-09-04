import { 
  Partner, 
  CustomerRequest, 
  OptimizationConstraints, 
  OptimizationResult, 
  ScoredPartner,
  OptimizationWeights,
  FilteringReasons,
  Logger 
} from '../types';

interface OptimizationConfig {
  maxDistance?: number;
  weights?: Partial<OptimizationWeights>;
  timeout?: number;
}

interface PartnerScores {
  location: number;
  availability: number;
  cost: number;
  specialty: number;
  performance: number;
  distance: number;
}

class OptimizationEngine {
  private maxDistance: number;
  private weights: OptimizationWeights;
  private timeout: number;
  private logger: Logger;

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
    this.logger = require('../utils/logger');
  }

  /**
   * Main optimization function
   */
  async optimize(
    request: CustomerRequest, 
    partners: Partner[], 
    constraints: OptimizationConstraints = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting optimization', {
        requestId: request.id,
        partnersCount: partners.length,
        serviceType: request.service_type
      });

      // Filter partners based on basic requirements
      const candidatePartners = this.filterPartners(request, partners, constraints);
      
      if (candidatePartners.length === 0) {
        this.logger.warn('No candidate partners after filtering', { requestId: request.id });
        return {
          selectedPartner: null,
          topCandidates: [],
          executionTimeMs: Date.now() - startTime,
          evaluation: {
            totalPartnersEvaluated: partners.length,
            candidatesAfterFiltering: 0,
            executionTimeMs: Date.now() - startTime,
            weights: this.weights,
            filteringReasons: this.getFilteringReasons(request, partners, constraints)
          }
        };
      }

      // Calculate scores for each candidate
      const scoredPartners = await this.scorePartners(request, candidatePartners);

      // Sort by score (highest first)
      scoredPartners.sort((a, b) => b.score - a.score);

      const topCandidates = scoredPartners.slice(0, 5).map(partner => ({
        ...partner,
        score: Math.round(partner.score * 100) / 100,
        availability_score: Math.round(partner.availability_score * 100) / 100,
        cost_score: Math.round(partner.cost_score * 100) / 100,
        location_score: Math.round(partner.location_score * 100) / 100,
        specialty_score: Math.round(partner.specialty_score * 100) / 100,
        performance_score: Math.round(partner.performance_score * 100) / 100
      }));

      const selectedPartner = scoredPartners[0];
      const executionTime = Date.now() - startTime;

      this.logger.info('Optimization completed', {
        requestId: request.id,
        selectedPartnerId: selectedPartner.id,
        score: selectedPartner.score,
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

    } catch (error) {
      this.logger.error('Optimization failed', {
        requestId: request.id,
        error: (error as Error).message,
        executionTimeMs: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Filter partners based on requirements and constraints
   */
  private filterPartners(
    request: CustomerRequest, 
    partners: Partner[], 
    constraints: OptimizationConstraints
  ): Partner[] {
    return partners.filter(partner => {
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
          performance_score: scores.performance,
          availability_score: scores.availability,
          cost_score: scores.cost,
          specialty_score: scores.specialty,
          distance: scores.distance
        });

      } catch (error) {
        this.logger.warn('Failed to score partner', {
          partnerId: partner.id,
          error: (error as Error).message
        });
      }
    }

    return scoredPartners;
  }

  /**
   * Calculate individual scores for a partner
   */
  private async calculatePartnerScore(request: CustomerRequest, partner: Partner): Promise<PartnerScores> {
    const scores: PartnerScores = {
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
    scores.availability = this.calculateAvailabilityScore(partner);

    // Cost Score (lower cost = higher score)
    scores.cost = this.calculateCostScore(partner);

    // Specialty Score
    scores.specialty = this.calculateSpecialtyScore(request.service_type, partner.specialty);

    // Performance Score (based on completion rate, response time, satisfaction)
    scores.performance = this.calculatePerformanceScore(partner, request);

    return scores;
  }

  /**
   * Calculate distance between request location and partner
   */
  private calculateDistance(request: CustomerRequest, partner: Partner): number {
    // For demo purposes, calculate distance based on city
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
   * Calculate availability score based on partner's availability
   */
  private calculateAvailabilityScore(partner: Partner): number {
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
   * Calculate cost score (inverse of hourly rate)
   */
  private calculateCostScore(partner: Partner): number {
    // Assume max reasonable rate is 100 EUR/hour
    const maxRate = 100;
    const rate = partner.hourly_rate;
    return Math.max(0, ((maxRate - rate) / maxRate) * 100);
  }

  /**
   * Calculate specialty match score
   */
  private calculateSpecialtyScore(requestedServiceType: string, partnerSpecialty: string): number {
    const specialtyMap: Record<string, string[]> = {
      'occupational_doctor': ['Occupational Doctor', 'Doctor', 'Παθολόγος', 'Ιατρός'],
      'safety_engineer': ['Safety Engineer', 'Engineer', 'Μηχανικός', 'Τεχνικός Ασφαλείας']
    };

    const requiredSpecialties = specialtyMap[requestedServiceType] || [];
    
    for (const specialty of requiredSpecialties) {
      if (partnerSpecialty.includes(specialty)) {
        return 100; // Perfect match
      }
    }

    // Partial match for related specialties
    if (requestedServiceType === 'occupational_doctor' && partnerSpecialty.includes('Doctor')) {
      return 75;
    }
    if (requestedServiceType === 'safety_engineer' && partnerSpecialty.includes('Engineer')) {
      return 75;
    }

    return 50; // Default score for any qualified professional
  }

  /**
   * Calculate performance score based on partner's historical performance
   */
  private calculatePerformanceScore(partner: Partner, request: CustomerRequest): number {
    if (!partner.performance_metrics) {
      return 50; // Default score for partners without performance data
    }

    const metrics = partner.performance_metrics;
    let performanceScore = 0;

    // Completion Rate Score (0-100 scale) - Highest weight
    const completionRate = metrics.completion_rate || 0;
    let completionScore = completionRate;
    
    // Bonus for high performers (>70% completion rate)
    if (completionRate > 70) {
      completionScore = completionScore * 1.2; // 20% bonus
    }
    
    // Penalty for very low performers (<30% completion rate)
    if (completionRate < 30) {
      completionScore = completionScore * 0.7; // 30% penalty
    }

    // Response Time Score (inverse - faster is better)
    const responseTime = metrics.avg_response_time || 5.0;
    const maxResponseTime = 8.0; // Anything over 8 hours is poor
    const responseScore = Math.max(0, ((maxResponseTime - responseTime) / maxResponseTime) * 100);

    // Client Satisfaction Score (1-5 scale normalized to 0-100)
    const satisfaction = metrics.client_satisfaction || 3.0;
    const satisfactionScore = ((satisfaction - 1) / 4) * 100; // Convert 1-5 to 0-100

    // Weighted combination of performance factors
    performanceScore = (
      completionScore * 0.6 +      // 60% weight on completion rate
      responseScore * 0.25 +       // 25% weight on response time
      satisfactionScore * 0.15     // 15% weight on satisfaction
    );

    // Handle urgency level - critical installations need proven performers
    if (request.urgency_level === 'high' || request.urgency_level === 'urgent') {
      if (completionRate > 80) {
        performanceScore *= 1.3; // 30% bonus for urgent requests
      } else if (completionRate < 50) {
        performanceScore *= 0.5; // 50% penalty for urgent requests
      }
    }

    return Math.min(100, Math.max(0, performanceScore));
  }

  /**
   * Check if partner specialty matches request
   */
  private checkSpecialtyMatch(requestedServiceType: string, partnerSpecialty: string): boolean {
    const specialtyMap: Record<string, string[]> = {
      'occupational_doctor': ['Occupational Doctor', 'Doctor', 'Παθολόγος', 'Ιατρός'],
      'safety_engineer': ['Safety Engineer', 'Engineer', 'Μηχανικός', 'Τεχνικός Ασφαλείας']
    };

    const requiredSpecialties = specialtyMap[requestedServiceType] || [];
    
    return requiredSpecialties.some(specialty => 
      partnerSpecialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  /**
   * Check basic availability
   */
  private checkBasicAvailability(partner: Partner): boolean {
    // Check if partner is active
    if (!partner.is_active) {
      return false;
    }

    // Check if has availability data
    if (partner.partner_availability && partner.partner_availability.length > 0) {
      return partner.partner_availability.some(day => 
        day.is_available && (day.available_hours - day.booked_hours) > 0
      );
    }

    // Default to available if no availability data
    return true;
  }

  /**
   * Get reasons why partners were filtered out
   */
  private getFilteringReasons(
    request: CustomerRequest, 
    partners: Partner[], 
    constraints: OptimizationConstraints
  ): FilteringReasons {
    const reasons: FilteringReasons = {
      excludedPartners: 0,
      specialtyMismatch: 0,
      tooExpensive: 0,
      notAvailable: 0
    };

    partners.forEach(partner => {
      if (constraints.excludedPartners && constraints.excludedPartners.includes(partner.id)) {
        reasons.excludedPartners++;
      } else if (!this.checkSpecialtyMatch(request.service_type, partner.specialty)) {
        reasons.specialtyMismatch++;
      } else if (constraints.maxHourlyRate && partner.hourly_rate > constraints.maxHourlyRate) {
        reasons.tooExpensive++;
      } else if (!this.checkBasicAvailability(partner)) {
        reasons.notAvailable++;
      }
    });

    return reasons;
  }
}

export default OptimizationEngine;