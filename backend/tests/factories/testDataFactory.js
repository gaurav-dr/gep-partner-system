/**
 * Test Data Factory
 * Creates realistic test data based on actual business metrics from JTBD framework
 */

class TestDataFactory {
  constructor() {
    // Athens coordinates (46% concentration as per business data)
    this.athensCoords = { latitude: 37.9838, longitude: 23.7275 };
    
    // Performance rate ranges based on real data (0% to 86.5%)
    this.performanceRanges = {
      high: { min: 70, max: 86.5 },
      medium: { min: 40, max: 69 },
      low: { min: 0, max: 39 }
    };
    
    // Visit variance based on real data (2-40 visits)
    this.visitRanges = {
      light: { min: 2, max: 10 },
      medium: { min: 11, max: 25 },
      heavy: { min: 26, max: 40 }
    };
    
    // Average visit duration: 4.03 hours (real data)
    this.avgVisitDuration = 4.03;
  }

  /**
   * Generate partners with realistic performance distribution
   */
  generatePartners(count = 10, options = {}) {
    const partners = [];
    const athensCount = Math.floor(count * 0.46); // 46% Athens concentration
    
    for (let i = 0; i < count; i++) {
      const isAthens = i < athensCount;
      const performanceLevel = this.getRandomPerformanceLevel();
      
      partners.push({
        id: `partner-${i + 1}`,
        name: `Partner ${i + 1}`,
        email: `partner${i + 1}@test.com`,
        phone: `+30210000000${i}`,
        city: isAthens ? 'Athens' : this.getRandomCity(),
        specialty: options.specialty || 'occupational_doctor',
        hourly_rate: this.generateHourlyRate(performanceLevel),
        max_hours_per_week: this.generateWeeklyCapacity(),
        is_active: true,
        location: isAthens ? 
          this.generateAthensLocation() : 
          this.generateRandomGreekLocation(),
        performance_metrics: {
          completion_rate: this.generateCompletionRate(performanceLevel),
          avg_response_time: this.generateResponseTime(performanceLevel),
          client_satisfaction: this.generateSatisfactionScore(performanceLevel),
          total_assignments: this.generateTotalAssignments(),
          avg_visit_duration: this.generateVisitDuration()
        },
        availability: {
          weekly_capacity: this.generateWeeklyCapacity(),
          current_load: this.generateCurrentLoad(),
          next_available: this.generateNextAvailable()
        },
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return partners;
  }

  /**
   * Generate installations with geographic distribution
   */
  generateInstallations(count = 5, options = {}) {
    const installations = [];
    const athensCount = Math.floor(count * 0.46); // Match partner distribution
    
    for (let i = 0; i < count; i++) {
      const isAthens = i < athensCount;
      const employeeCount = this.generateEmployeeCount();
      
      installations.push({
        id: `install-${i + 1}`,
        company_name: `Test Company ${i + 1} Ltd`,
        address: isAthens ? `Athens Address ${i + 1}` : `${this.getRandomCity()} Address ${i + 1}`,
        service_type: options.service_type || 'occupational_doctor',
        employee_count: employeeCount,
        installation_category: this.determineInstallationCategory(employeeCount),
        urgency_level: this.generateUrgencyLevel(),
        location: isAthens ? 
          this.generateAthensLocation() : 
          this.generateRandomGreekLocation(),
        work_hours: {
          start: '09:00',
          end: '17:00'
        },
        estimated_hours: this.calculateEstimatedHours(employeeCount),
        max_budget: this.calculateMaxBudget(employeeCount),
        special_requirements: Math.random() > 0.7 ? this.generateSpecialRequirements() : null,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return installations;
  }

  /**
   * Generate customer requests
   */
  generateCustomerRequests(count = 5, options = {}) {
    const installations = options.installations || this.generateInstallations(count);
    const requests = [];
    
    installations.forEach((installation, i) => {
      requests.push({
        id: i + 1,
        client_name: installation.company_name,
        installation_address: installation.address,
        service_type: installation.service_type,
        employee_count: installation.employee_count,
        installation_category: installation.installation_category,
        work_hours: `${installation.work_hours.start}-${installation.work_hours.end}`,
        estimated_hours: installation.estimated_hours,
        max_budget: installation.max_budget,
        special_requirements: installation.special_requirements,
        status: options.status || 'pending',
        urgency_level: installation.urgency_level,
        preferred_partner_id: options.preferred_partner_id || null,
        location: installation.location,
        created_at: installation.created_at,
        updated_at: installation.created_at
      });
    });
    
    return requests;
  }

  // Helper methods for realistic data generation
  
  getRandomPerformanceLevel() {
    const rand = Math.random();
    if (rand < 0.3) return 'high';   // 30% high performers
    if (rand < 0.6) return 'medium'; // 30% medium performers  
    return 'low';                    // 40% low performers
  }

  generateCompletionRate(performanceLevel) {
    const range = this.performanceRanges[performanceLevel];
    return parseFloat((Math.random() * (range.max - range.min) + range.min).toFixed(1));
  }

  generateHourlyRate(performanceLevel) {
    const baseRates = { high: 60, medium: 50, low: 40 };
    const variation = Math.random() * 20 - 10; // ±10 variation
    return Math.max(30, baseRates[performanceLevel] + variation);
  }

  generateWeeklyCapacity() {
    return Math.floor(Math.random() * 20) + 20; // 20-40 hours per week
  }

  generateCurrentLoad() {
    return Math.floor(Math.random() * 30); // Current workload
  }

  generateNextAvailable() {
    const days = Math.floor(Math.random() * 14); // Available within 2 weeks
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  generateResponseTime(performanceLevel) {
    const baseTimes = { high: 1.5, medium: 3.0, low: 5.0 };
    const variation = Math.random() * 2; // ±2 hour variation
    return parseFloat((baseTimes[performanceLevel] + variation).toFixed(1));
  }

  generateSatisfactionScore(performanceLevel) {
    const baseScores = { high: 4.5, medium: 3.8, low: 3.0 };
    const variation = Math.random() * 1 - 0.5; // ±0.5 variation
    return parseFloat(Math.min(5.0, Math.max(1.0, baseScores[performanceLevel] + variation)).toFixed(1));
  }

  generateTotalAssignments() {
    const range = this.visitRanges[Object.keys(this.visitRanges)[Math.floor(Math.random() * 3)]];
    return Math.floor(Math.random() * (range.max - range.min) + range.min);
  }

  generateVisitDuration() {
    // Based on real average of 4.03 hours with realistic variance
    const variance = Math.random() * 2 - 1; // ±1 hour variance
    return parseFloat(Math.max(1.0, this.avgVisitDuration + variance).toFixed(2));
  }

  generateEmployeeCount() {
    // Realistic distribution of company sizes
    const rand = Math.random();
    if (rand < 0.5) return Math.floor(Math.random() * 50) + 10;  // 10-59 employees (small)
    if (rand < 0.8) return Math.floor(Math.random() * 200) + 60; // 60-259 employees (medium)
    return Math.floor(Math.random() * 500) + 260;                // 260+ employees (large)
  }

  determineInstallationCategory(employeeCount) {
    if (employeeCount < 50) return 'A';
    if (employeeCount < 200) return 'B';
    return 'C';
  }

  calculateEstimatedHours(employeeCount) {
    // Based on installation category and employee count
    const baseHours = Math.ceil(employeeCount / 25); // Rough estimation
    return Math.max(2, Math.min(12, baseHours));
  }

  calculateMaxBudget(employeeCount) {
    const hoursEstimate = this.calculateEstimatedHours(employeeCount);
    const rateEstimate = 55; // Average hourly rate
    return hoursEstimate * rateEstimate * 1.2; // 20% buffer
  }

  generateUrgencyLevel() {
    const levels = ['low', 'medium', 'high', 'urgent'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  generateSpecialRequirements() {
    const requirements = [
      'Weekend availability required',
      'Bilingual Greek/English required',
      'Previous experience with manufacturing required',
      'Specific industry certification needed',
      'Emergency response capability required'
    ];
    return requirements[Math.floor(Math.random() * requirements.length)];
  }

  generateAthensLocation() {
    // Generate location within Athens metropolitan area
    const latVariation = (Math.random() - 0.5) * 0.2; // ±0.1 degree variation
    const lngVariation = (Math.random() - 0.5) * 0.3; // ±0.15 degree variation
    
    return {
      latitude: this.athensCoords.latitude + latVariation,
      longitude: this.athensCoords.longitude + lngVariation
    };
  }

  generateRandomGreekLocation() {
    // Major Greek cities coordinates
    const cities = [
      { name: 'Thessaloniki', lat: 40.6401, lng: 22.9444 },
      { name: 'Patras', lat: 38.2466, lng: 21.7346 },
      { name: 'Heraklion', lat: 35.3387, lng: 25.1442 },
      { name: 'Larissa', lat: 39.6390, lng: 22.4181 },
      { name: 'Volos', lat: 39.3681, lng: 22.9417 }
    ];
    
    const city = cities[Math.floor(Math.random() * cities.length)];
    const latVariation = (Math.random() - 0.5) * 0.1;
    const lngVariation = (Math.random() - 0.5) * 0.1;
    
    return {
      latitude: city.lat + latVariation,
      longitude: city.lng + lngVariation
    };
  }

  getRandomCity() {
    const cities = ['Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina'];
    return cities[Math.floor(Math.random() * cities.length)];
  }

  /**
   * Create test scenarios for specific test cases
   */
  createTestScenario(scenarioName, options = {}) {
    switch (scenarioName) {
      case 'high_performance_priority':
        return {
          partners: [
            {
              ...this.generatePartners(1)[0],
              id: 'high-performer-1',
              performance_metrics: {
                completion_rate: 85.0, // Guaranteed >70%
                avg_response_time: 1.5,
                client_satisfaction: 4.5,
                total_assignments: 25
              }
            },
            {
              ...this.generatePartners(1)[0],
              id: 'low-performer-1', 
              performance_metrics: {
                completion_rate: 25.0, // Guaranteed <40%
                avg_response_time: 4.5,
                client_satisfaction: 3.2,
                total_assignments: 8
              }
            }
          ],
          installation: this.generateInstallations(1, { urgency_level: 'high' })[0]
        };
        
      case 'geographic_optimization':
        return {
          partners: this.generatePartners(5).map((p, i) => ({
            ...p,
            city: i < 3 ? 'Athens' : 'Thessaloniki',
            location: i < 3 ? this.generateAthensLocation() : { latitude: 40.6401, longitude: 22.9444 }
          })),
          installation: { ...this.generateInstallations(1)[0], location: this.generateAthensLocation() }
        };
        
      case 'workload_balancing':
        return {
          partners: this.generatePartners(3).map((p, i) => ({
            ...p,
            availability: {
              ...p.availability,
              current_load: [5, 25, 35][i] // Light, medium, heavy workload
            }
          })),
          installation: this.generateInstallations(1)[0]
        };
        
      default:
        return {
          partners: this.generatePartners(options.partnerCount || 5),
          installations: this.generateInstallations(options.installationCount || 3),
          requests: this.generateCustomerRequests(options.requestCount || 3)
        };
    }
  }
}

module.exports = TestDataFactory;