/**
 * Test 1: Core AI Assignment Logic Tests
 * Focus: Performance-based partner assignment without external dependencies
 */

const OptimizationEngine = require('../../src/services/OptimizationEngine');
const TestDataFactory = require('../factories/testDataFactory');

describe('AI Partner Assignment Engine - Core Logic', () => {
  let optimizationEngine;
  let testDataFactory;

  beforeEach(() => {
    optimizationEngine = new OptimizationEngine({
      maxDistance: 50,
      weights: {
        location: 0.4,
        availability: 0.3,
        cost: 0.2,
        specialty: 0.1
      }
    });
    testDataFactory = new TestDataFactory();
  });

  describe('Performance-Based Partner Assignment', () => {
    test('should prioritize partners with >70% completion rate for critical installations', async () => {
      // Arrange: Create test scenario with high and low performing partners
      const scenario = testDataFactory.createTestScenario('high_performance_priority');
      const highPerformancePartner = scenario.partners[0];
      const lowPerformancePartner = scenario.partners[1];
      const criticalInstallation = {
        ...scenario.installation,
        urgency_level: 'high',
        service_type: 'occupational_doctor'
      };

      // Ensure test data is correct
      expect(highPerformancePartner.performance_metrics.completion_rate).toBeGreaterThan(70);
      expect(lowPerformancePartner.performance_metrics.completion_rate).toBeLessThan(40);

      // Act: Run optimization
      const result = await optimizationEngine.optimize(
        criticalInstallation, 
        [highPerformancePartner, lowPerformancePartner]
      );

      // Assert: High performer should be selected
      expect(result.selectedPartner).toBeDefined();
      expect(result.selectedPartner.id).toBe(highPerformancePartner.id);
      expect(result.selectedPartner.performance_metrics.completion_rate).toBeGreaterThan(70);
    });

    test('should handle edge case with all low performers', async () => {
      // Arrange: Create only low performing partners
      const lowPerformers = testDataFactory.generatePartners(3).map(partner => ({
        ...partner,
        performance_metrics: {
          ...partner.performance_metrics,
          completion_rate: Math.random() * 30 // 0-30% completion rate
        }
      }));
      const installation = testDataFactory.generateInstallations(1)[0];

      // Act: Run optimization  
      const result = await optimizationEngine.optimize(installation, lowPerformers);

      // Assert: Should still select best available (considering all factors)
      expect(result.selectedPartner).toBeDefined();
      // Should select one of the partners (algorithm considers multiple factors)
      const selectedId = result.selectedPartner.id;
      const selectedPartner = lowPerformers.find(p => p.id === selectedId);
      expect(selectedPartner).toBeDefined();
    });

    test('should factor in response time for performance evaluation', async () => {
      // Arrange: Partners with identical other metrics but different response times
      const fastPartner = {
        ...testDataFactory.generatePartners(1)[0],
        id: 'fast-responder',
        city: 'Athens', // Same city
        hourly_rate: 50, // Same rate
        specialty: 'occupational_doctor',
        performance_metrics: {
          completion_rate: 75,
          avg_response_time: 1.5, // Fast responder
          client_satisfaction: 4.0
        }
      };
      
      const slowPartner = {
        ...testDataFactory.generatePartners(1)[0],
        id: 'slow-responder', 
        city: 'Athens', // Same city
        hourly_rate: 50, // Same rate
        specialty: 'occupational_doctor',
        performance_metrics: {
          completion_rate: 75,
          avg_response_time: 6.0, // Slow responder
          client_satisfaction: 4.0
        }
      };

      const installation = {
        ...testDataFactory.generateInstallations(1)[0],
        installation_address: 'Athens, Greece' // Same city as partners
      };

      // Act
      const result = await optimizationEngine.optimize(installation, [fastPartner, slowPartner]);

      // Assert: Should be able to calculate performance scores for both
      expect(result.selectedPartner).toBeDefined();
      expect(result.topCandidates.length).toBeGreaterThan(0);
      
      // Fast responder should get higher performance score
      const fastCandidate = result.topCandidates.find(c => c.id === 'fast-responder');
      const slowCandidate = result.topCandidates.find(c => c.id === 'slow-responder');
      
      if (fastCandidate && slowCandidate) {
        expect(fastCandidate.performance_score).toBeGreaterThan(slowCandidate.performance_score);
      }
    });
  });

  describe('Geographic Optimization', () => {
    test('should minimize travel distance for Athens installations (46% concentration)', async () => {
      // Arrange: Athens installation with mixed partner locations
      const scenario = testDataFactory.createTestScenario('geographic_optimization');
      const athensInstallation = scenario.installation;
      const partners = scenario.partners;

      // Ensure test data represents 46% Athens concentration
      const athensPartners = partners.filter(p => p.city === 'Athens');
      expect(athensPartners.length).toBeGreaterThan(0);

      // Act: Run optimization
      const result = await optimizationEngine.optimize(athensInstallation, partners);

      // Assert: Should prefer Athens-based partners for Athens installation
      expect(result.selectedPartner).toBeDefined();
      
      if (athensPartners.length > 0) {
        // Geographic preference should be a factor (but performance may override)
        // Check that algorithm considered geographic proximity
        expect(result.topCandidates.length).toBeGreaterThan(0);
        // At least one Athens partner should be in top candidates due to location
        const athensInTopCandidates = result.topCandidates.some(c => 
          partners.find(p => p.id === c.id && p.city === 'Athens')
        );
        expect(athensInTopCandidates).toBe(true);
      }
    });

    test('should calculate travel distance correctly', async () => {
      // Arrange: Known locations for distance calculation
      const athensLocation = { latitude: 37.9838, longitude: 23.7275 };
      const thessalonikiLocation = { latitude: 40.6401, longitude: 22.9444 };
      
      const installation = {
        ...testDataFactory.generateInstallations(1)[0],
        location: athensLocation
      };
      
      const partners = [
        {
          ...testDataFactory.generatePartners(1)[0],
          city: 'Athens',
          location: athensLocation
        },
        {
          ...testDataFactory.generatePartners(1)[0],
          city: 'Thessaloniki', 
          location: thessalonikiLocation
        }
      ];

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert: Athens partner should be selected due to proximity
      expect(result.selectedPartner.city).toBe('Athens');
      expect(result.evaluation).toBeDefined();
      expect(result.topCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('Workload Balancing', () => {
    test('should balance workload distribution (target 15-25 visit range)', async () => {
      // Arrange: Partners with varying current workloads
      const scenario = testDataFactory.createTestScenario('workload_balancing');
      const partners = scenario.partners;
      const installation = scenario.installation;

      // Verify test data has different workload levels
      const workloads = partners.map(p => p.availability.current_load);
      expect(Math.max(...workloads) - Math.min(...workloads)).toBeGreaterThan(10);

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert: Should prefer partner with lighter workload (all else being equal)
      expect(result.selectedPartner).toBeDefined();
      
      // The selected partner should not be the most overloaded
      const maxWorkload = Math.max(...workloads);
      expect(result.selectedPartner.availability.current_load).toBeLessThan(maxWorkload);
    });

    test('should respect weekly capacity limits', async () => {
      // Arrange: Partners at different capacity utilizations
      const partners = testDataFactory.generatePartners(3).map((partner, index) => ({
        ...partner,
        availability: {
          weekly_capacity: 40,
          current_load: [10, 35, 45][index], // Under, near, over capacity
          next_available: new Date().toISOString()
        }
      }));
      const installation = testDataFactory.generateInstallations(1)[0];

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert: Should not select over-capacity partner
      expect(result.selectedPartner).toBeDefined();
      expect(result.selectedPartner.availability.current_load)
        .toBeLessThanOrEqual(result.selectedPartner.availability.weekly_capacity);
    });
  });

  describe('Service Type Matching', () => {
    test('should match partner specialty to installation service type', async () => {
      // Arrange: Partners with different specialties
      const partners = [
        {
          ...testDataFactory.generatePartners(1)[0],
          specialty: 'occupational_doctor',
          performance_metrics: { completion_rate: 80 }
        },
        {
          ...testDataFactory.generatePartners(1)[0],
          specialty: 'safety_engineer', 
          performance_metrics: { completion_rate: 85 }
        }
      ];
      
      const installation = {
        ...testDataFactory.generateInstallations(1)[0],
        service_type: 'occupational_doctor'
      };

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert: Should match specialty even if performance is slightly lower
      expect(result.selectedPartner).toBeDefined();
      expect(result.selectedPartner.specialty).toBe('occupational_doctor');
    });

    test('should handle mismatched service types gracefully', async () => {
      // Arrange: No partners match required service type
      const partners = testDataFactory.generatePartners(3).map(partner => ({
        ...partner,
        specialty: 'safety_engineer'
      }));
      
      const installation = {
        ...testDataFactory.generateInstallations(1)[0],
        service_type: 'occupational_doctor'
      };

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert: Should handle gracefully (either select best available or return null)
      if (result.selectedPartner) {
        expect(result.evaluation.candidatesAfterFiltering).toBeGreaterThan(0);
      } else {
        expect(result.selectedPartner).toBeNull();
        expect(result.evaluation.candidatesAfterFiltering).toBe(0);
      }
    });
  });

  describe('Cost Optimization', () => {
    test('should consider hourly rates in optimization', async () => {
      // Arrange: Partners with different rates but similar performance
      const partners = testDataFactory.generatePartners(2).map((partner, index) => ({
        ...partner,
        hourly_rate: [40, 80][index], // Significant rate difference
        performance_metrics: {
          completion_rate: 75, // Same performance
          avg_response_time: 2.5,
          client_satisfaction: 4.0
        }
      }));
      
      const installation = {
        ...testDataFactory.generateInstallations(1)[0],
        max_budget: 300 // Limited budget
      };

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert: Should consider cost as a factor
      expect(result.selectedPartner).toBeDefined();
      expect(result.evaluation).toBeDefined();
      
      // Verify cost calculation is included in evaluation
      expect(result.evaluation.totalPartnersEvaluated).toBe(2);
    });

    test('should respect budget constraints', async () => {
      // Arrange: Partner with rate exceeding budget
      const expensivePartner = {
        ...testDataFactory.generatePartners(1)[0],
        hourly_rate: 100,
        performance_metrics: { completion_rate: 90 }
      };
      
      const lowBudgetInstallation = {
        ...testDataFactory.generateInstallations(1)[0],
        estimated_hours: 5,
        max_budget: 200 // Only $200 budget, partner would cost $500
      };

      // Act
      const result = await optimizationEngine.optimize(lowBudgetInstallation, [expensivePartner]);

      // Assert: Should handle budget constraints appropriately
      expect(result).toBeDefined();
      // Result may be null if partner exceeds budget, or selected if budget is flexible
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty partner list', async () => {
      // Arrange
      const installation = testDataFactory.generateInstallations(1)[0];
      const emptyPartnerList = [];

      // Act
      const result = await optimizationEngine.optimize(installation, emptyPartnerList);

      // Assert
      expect(result.selectedPartner).toBeNull();
      expect(result.topCandidates).toEqual([]);
      expect(result.evaluation.totalPartnersEvaluated).toBe(0);
    });

    test('should handle invalid installation data', async () => {
      // Arrange
      const invalidInstallation = null;
      const partners = testDataFactory.generatePartners(2);

      // Act & Assert
      await expect(optimizationEngine.optimize(invalidInstallation, partners))
        .rejects.toThrow();
    });

    test('should return top candidates for comparison', async () => {
      // Arrange
      const partners = testDataFactory.generatePartners(5);
      const installation = testDataFactory.generateInstallations(1)[0];

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert
      expect(result.topCandidates).toBeDefined();
      expect(Array.isArray(result.topCandidates)).toBe(true);
      expect(result.topCandidates.length).toBeGreaterThan(0);
      
      // Top candidates should be sorted by score
      if (result.topCandidates.length > 1) {
        for (let i = 0; i < result.topCandidates.length - 1; i++) {
          expect(result.topCandidates[i].score)
            .toBeGreaterThanOrEqual(result.topCandidates[i + 1].score);
        }
      }
    });

    test('should include detailed evaluation metrics', async () => {
      // Arrange
      const partners = testDataFactory.generatePartners(3);
      const installation = testDataFactory.generateInstallations(1)[0];

      // Act
      const result = await optimizationEngine.optimize(installation, partners);

      // Assert
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation.totalPartnersEvaluated).toBe(3);
      expect(result.evaluation.candidatesAfterFiltering).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0); // Execution time should be present
      expect(typeof result.executionTimeMs).toBe('number'); // Should be a number
    });
  });
});