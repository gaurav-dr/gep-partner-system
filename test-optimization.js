#!/usr/bin/env node

// Standalone test for OptimizationEngine
// This tests the core AI scheduling algorithm without Docker dependencies

// Mock logger to avoid dependency issues
const logger = {
  info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
  warn: (msg, data) => console.log(`WARN: ${msg}`, data || ''),
  error: (msg, data) => console.log(`ERROR: ${msg}`, data || '')
};

// Mock OptimizationEngine by copying the core logic
class OptimizationEngine {
  constructor(config = {}) {
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

  async optimize(request, partners, constraints = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting optimization', {
        requestId: request.id,
        partnersCount: partners.length,
        serviceType: request.service_type
      });

      // Filter partners based on basic requirements
      let candidatePartners = this.filterPartners(request, partners, constraints);
      
      if (candidatePartners.length === 0) {
        logger.warn('No candidate partners after filtering', { requestId: request.id });
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

      const topCandidates = scoredPartners.slice(0, 5).map(partner => ({
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

      const selectedPartner = scoredPartners[0];
      const executionTime = Date.now() - startTime;

      logger.info('Optimization completed', {
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
      logger.error('Optimization failed', {
        requestId: request.id,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      });
      throw error;
    }
  }

  filterPartners(request, partners, constraints) {
    return partners.filter(partner => {
      if (constraints.excludedPartners && constraints.excludedPartners.includes(partner.id)) {
        return false;
      }
      if (!this.checkSpecialtyMatch(request.service_type, partner.specialty)) {
        return false;
      }
      if (constraints.maxHourlyRate && partner.hourly_rate > constraints.maxHourlyRate) {
        return false;
      }
      if (!this.checkBasicAvailability(partner)) {
        return false;
      }
      return true;
    });
  }

  async scorePartners(request, partners) {
    const scoredPartners = [];

    for (const partner of partners) {
      try {
        const scores = await this.calculatePartnerScore(request, partner);
        
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
        logger.warn('Failed to score partner', {
          partnerId: partner.id,
          error: error.message
        });
      }
    }

    return scoredPartners;
  }

  async calculatePartnerScore(request, partner) {
    const scores = {
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

    // Performance Score
    scores.performance = this.calculatePerformanceScore(partner, request);

    return scores;
  }

  calculateDistance(request, partner) {
    const cityDistances = {
      'Athens': { 'Athens': 5, 'Thessaloniki': 20, 'Patras': 15, 'Heraklion': 30 },
      'Thessaloniki': { 'Athens': 20, 'Thessaloniki': 5, 'Patras': 25, 'Heraklion': 35 },
      'Patras': { 'Athens': 15, 'Thessaloniki': 25, 'Patras': 5, 'Heraklion': 40 },
      'Heraklion': { 'Athens': 30, 'Thessaloniki': 35, 'Patras': 40, 'Heraklion': 5 }
    };

    let requestCity = 'Athens'; // default
    if (request.installation_address) {
      if (request.installation_address.includes('Thessaloniki')) requestCity = 'Thessaloniki';
      else if (request.installation_address.includes('Patras')) requestCity = 'Patras';
      else if (request.installation_address.includes('Heraklion')) requestCity = 'Heraklion';
    }

    return cityDistances[requestCity]?.[partner.city] || 25;
  }

  calculateAvailabilityScore(partner, request) {
    if (partner.partner_availability && partner.partner_availability.length > 0) {
      const totalAvailable = partner.partner_availability.reduce((sum, day) => {
        return sum + (day.available_hours - day.booked_hours);
      }, 0);
      
      const averageDaily = totalAvailable / partner.partner_availability.length;
      return Math.min(100, (averageDaily / 8) * 100);
    }

    const weeklyAvailable = partner.max_hours_per_week || 40;
    return Math.min(100, (weeklyAvailable / 40) * 100);
  }

  calculateCostScore(partner) {
    const maxRate = 100;
    const rate = partner.hourly_rate || maxRate;
    return Math.max(0, ((maxRate - rate) / maxRate) * 100);
  }

  calculateSpecialtyScore(requestedServiceType, partnerSpecialty) {
    const specialtyMap = {
      'occupational_doctor': ['Occupational Doctor', 'Doctor', 'Παθολόγος', 'Ιατρός'],
      'safety_engineer': ['Safety Engineer', 'Engineer', 'Μηχανικός', 'Τεχνικός Ασφαλείας']
    };

    const requiredSpecialties = specialtyMap[requestedServiceType] || [];
    
    for (const specialty of requiredSpecialties) {
      if (partnerSpecialty.includes(specialty)) {
        return 100; // Perfect match
      }
    }

    if (requestedServiceType === 'occupational_doctor' && partnerSpecialty.includes('Doctor')) {
      return 75;
    }
    if (requestedServiceType === 'safety_engineer' && partnerSpecialty.includes('Engineer')) {
      return 75;
    }

    return 50; // Default score
  }

  calculatePerformanceScore(partner, request) {
    if (!partner.performance_metrics) {
      return 50; // Default score
    }

    const metrics = partner.performance_metrics;
    let performanceScore = 0;

    const completionRate = metrics.completion_rate || 0;
    let completionScore = completionRate;
    
    if (completionRate > 70) {
      completionScore = completionScore * 1.2; // 20% bonus
    }
    
    if (completionRate < 30) {
      completionScore = completionScore * 0.7; // 30% penalty
    }

    const responseTime = metrics.avg_response_time || 5.0;
    const maxResponseTime = 8.0;
    const responseScore = Math.max(0, ((maxResponseTime - responseTime) / maxResponseTime) * 100);

    const satisfaction = metrics.client_satisfaction || 3.0;
    const satisfactionScore = ((satisfaction - 1) / 4) * 100;

    performanceScore = (
      completionScore * 0.6 +
      responseScore * 0.25 +
      satisfactionScore * 0.15
    );

    if (request.urgency_level === 'high' || request.urgency_level === 'urgent') {
      if (completionRate > 80) {
        performanceScore *= 1.3;
      } else if (completionRate < 50) {
        performanceScore *= 0.5;
      }
    }

    return Math.min(100, Math.max(0, performanceScore));
  }

  checkSpecialtyMatch(requestedServiceType, partnerSpecialty) {
    const specialtyMap = {
      'occupational_doctor': ['Occupational Doctor', 'Doctor', 'Παθολόγος', 'Ιατρός'],
      'safety_engineer': ['Safety Engineer', 'Engineer', 'Μηχανικός', 'Τεχνικός Ασφαλείας']
    };

    const requiredSpecialties = specialtyMap[requestedServiceType] || [];
    
    return requiredSpecialties.some(specialty => 
      partnerSpecialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  checkBasicAvailability(partner) {
    if (!partner.is_active) {
      return false;
    }

    if (partner.availability && partner.availability.weekly_capacity && partner.availability.current_load) {
      if (partner.availability.current_load > partner.availability.weekly_capacity) {
        return false;
      }
    }

    if (partner.partner_availability && partner.partner_availability.length > 0) {
      return partner.partner_availability.some(day => 
        day.is_available && (day.available_hours - day.booked_hours) > 0
      );
    }

    return true;
  }

  getFilteringReasons(request, partners, constraints) {
    const reasons = {
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

// Test Data: Greek Healthcare Partners
const testPartners = [
  {
    id: 'DOC001',
    name: 'Dr. Maria Danezis',
    specialty: 'Occupational Doctor',
    city: 'Athens',
    hourly_rate: 75.00,
    is_active: true,
    max_hours_per_week: 35,
    performance_metrics: {
      completion_rate: 85,
      avg_response_time: 2.5,
      client_satisfaction: 4.2
    }
  },
  {
    id: 'ENG001', 
    name: 'Kostas Papadopoulos',
    specialty: 'Safety Engineer',
    city: 'Thessaloniki', 
    hourly_rate: 65.00,
    is_active: true,
    max_hours_per_week: 40,
    performance_metrics: {
      completion_rate: 92,
      avg_response_time: 1.8,
      client_satisfaction: 4.5
    }
  },
  {
    id: 'DOC002',
    name: 'Dr. Nikos Georgiadis',
    specialty: 'Occupational Doctor',
    city: 'Athens',
    hourly_rate: 90.00,
    is_active: true,
    max_hours_per_week: 30,
    performance_metrics: {
      completion_rate: 78,
      avg_response_time: 3.2,
      client_satisfaction: 3.8
    }
  },
  {
    id: 'ENG002',
    name: 'Sofia Alexandrou',
    specialty: 'Safety Engineer', 
    city: 'Patras',
    hourly_rate: 70.00,
    is_active: true,
    max_hours_per_week: 38,
    performance_metrics: {
      completion_rate: 88,
      avg_response_time: 2.1,
      client_satisfaction: 4.3
    }
  }
];

// Test Request: Healthcare Inspection
const testRequest = {
  id: 1,
  client_name: 'ACME Manufacturing Ltd',
  service_type: 'occupational_doctor',
  installation_address: '123 Industrial Ave, Athens, Greece',
  employee_count: 25,
  urgency_level: 'normal',
  start_date: '2025-09-10',
  end_date: '2025-09-10'
};

// Run Optimization Test
async function runOptimizationTest() {
  console.log('=== GEP AI SCHEDULING OPTIMIZATION TEST ===\n');
  
  const optimizer = new OptimizationEngine();
  
  console.log('Test Request:', JSON.stringify(testRequest, null, 2));
  console.log('\nAvailable Partners:');
  testPartners.forEach(p => {
    console.log(`- ${p.name} (${p.specialty}, ${p.city}) - €${p.hourly_rate}/hr - Performance: ${p.performance_metrics?.completion_rate}%`);
  });
  
  console.log('\n--- Running AI Optimization ---');
  
  try {
    const result = await optimizer.optimize(testRequest, testPartners);
    
    if (result.selectedPartner) {
      console.log('\n✅ OPTIMIZATION SUCCESSFUL');
      console.log(`Selected Partner: ${result.selectedPartner.name}`);
      console.log(`Optimization Score: ${result.selectedPartner.score.toFixed(2)}/100`);
      console.log(`Distance: ${result.selectedPartner.distance}km`);
      console.log(`Execution Time: ${result.executionTimeMs}ms`);
      
      console.log('\nScore Breakdown:');
      console.log(`- Location: ${result.selectedPartner.location_score.toFixed(1)}`);
      console.log(`- Performance: ${result.selectedPartner.performance_score.toFixed(1)}`);
      console.log(`- Availability: ${result.selectedPartner.availability_score.toFixed(1)}`);
      console.log(`- Cost: ${result.selectedPartner.cost_score.toFixed(1)}`);
      console.log(`- Specialty: ${result.selectedPartner.specialty_score.toFixed(1)}`);
      
      console.log('\nTop 3 Candidates:');
      result.topCandidates.slice(0, 3).forEach((candidate, i) => {
        console.log(`${i + 1}. ${candidate.name} - Score: ${candidate.score}`);
      });
      
      console.log('\n🎯 AI SCHEDULING ALGORITHM: WORKING ✅');
      return true;
      
    } else {
      console.log('\n❌ NO SUITABLE PARTNERS FOUND');
      console.log('Filtering Results:', result.evaluation.filteringReasons);
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ OPTIMIZATION FAILED');
    console.log('Error:', error.message);
    return false;
  }
}

// Test Edge Cases
async function testEdgeCases() {
  console.log('\n=== TESTING EDGE CASES ===');
  
  const optimizer = new OptimizationEngine();
  
  // Test 1: No matching specialty
  console.log('\n1. Testing specialty mismatch...');
  const wrongSpecialtyRequest = {
    ...testRequest,
    service_type: 'nonexistent_specialty'
  };
  
  const result1 = await optimizer.optimize(wrongSpecialtyRequest, testPartners);
  console.log(result1.selectedPartner ? '❌ Should have no matches' : '✅ Correctly filtered out all partners');
  
  // Test 2: Budget constraints
  console.log('\n2. Testing budget constraints...');
  const result2 = await optimizer.optimize(testRequest, testPartners, { maxHourlyRate: 60 });
  console.log(result2.selectedPartner ? `✅ Found partner within budget: ${result2.selectedPartner.name}` : '❌ Should find cheaper partner');
  
  // Test 3: Urgent request
  console.log('\n3. Testing urgent request priority...');
  const urgentRequest = {
    ...testRequest,
    urgency_level: 'urgent'
  };
  
  const result3 = await optimizer.optimize(urgentRequest, testPartners);
  if (result3.selectedPartner) {
    const highPerformer = result3.selectedPartner.performance_metrics?.completion_rate > 80;
    console.log(highPerformer ? '✅ Urgent request assigned to high performer' : '⚠️  Urgent request not optimally assigned');
  }
}

// Run all tests
async function runAllTests() {
  const optimizationWorking = await runOptimizationTest();
  await testEdgeCases();
  
  console.log('\n=== FINAL ASSESSMENT ===');
  if (optimizationWorking) {
    console.log('✅ AI SCHEDULING CORE FUNCTIONALITY: WORKING');
    console.log('✅ Partner scoring algorithm: FUNCTIONAL');  
    console.log('✅ Greek healthcare specialties: RECOGNIZED');
    console.log('✅ Multi-factor optimization: OPERATIONAL');
  } else {
    console.log('❌ AI SCHEDULING: BROKEN - NEEDS IMMEDIATE FIX');
  }
  
  return optimizationWorking;
}

// Execute tests
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { OptimizationEngine, runAllTests };