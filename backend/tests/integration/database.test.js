/**
 * Database Integration Tests
 * Tests database operations, constraints, triggers, and data integrity
 * for the healthcare compliance scheduling system
 */

const { supabaseAdmin } = require('../../src/config/supabase');
const TestDataFactory = require('../factories/testDataFactory');
const logger = require('../../src/utils/logger');

describe('Database Integration Tests', () => {
  let testDataFactory;
  let testPartner;
  let testCustomerRequest;
  let testAssignment;

  beforeAll(async () => {
    testDataFactory = new TestDataFactory();
    
    // Ensure test database is clean before starting
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    testPartner = testDataFactory.generatePartners(1)[0];
    testCustomerRequest = testDataFactory.generateCustomerRequests(1)[0];
    
    // Ensure valid IDs for database constraints
    testPartner.id = `R${Date.now().toString().slice(-5)}`;
    testCustomerRequest.id = Math.floor(Math.random() * 1000000);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  describe('Partner Data Management', () => {
    test('should create partner with all required fields', async () => {
      const { data: partner, error } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id,
          name: testPartner.name,
          email: testPartner.email,
          phone: testPartner.phone || '+30210123456',
          city: testPartner.city,
          specialty: testPartner.specialty,
          hourly_rate: testPartner.hourly_rate,
          max_hours_per_week: testPartner.max_hours_per_week || 40,
          is_active: testPartner.is_active !== false,
          location: testPartner.location,
          performance_metrics: testPartner.performance_metrics
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(partner).toBeDefined();
      expect(partner.id).toBe(testPartner.id);
      expect(partner.name).toBe(testPartner.name);
      expect(partner.email).toBe(testPartner.email);
      expect(partner.performance_metrics).toBeDefined();
      expect(partner.created_at).toBeDefined();
    });

    test('should enforce unique partner ID constraint', async () => {
      // Insert first partner
      const { error: firstError } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id,
          name: testPartner.name,
          email: testPartner.email,
          city: testPartner.city,
          specialty: testPartner.specialty,
          hourly_rate: testPartner.hourly_rate
        }]);

      expect(firstError).toBeNull();

      // Try to insert duplicate ID
      const { error: duplicateError } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id, // Same ID
          name: 'Different Partner',
          email: 'different@gep.gr',
          city: 'Athens',
          specialty: 'safety_engineer',
          hourly_rate: 75
        }]);

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe('23505'); // PostgreSQL unique violation
    });

    test('should enforce unique email constraint', async () => {
      const uniqueEmail = `test-${Date.now()}@gep.gr`;
      
      // Insert first partner
      const { error: firstError } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id,
          name: testPartner.name,
          email: uniqueEmail,
          city: testPartner.city,
          specialty: testPartner.specialty,
          hourly_rate: testPartner.hourly_rate
        }]);

      expect(firstError).toBeNull();

      // Try to insert partner with same email
      const { error: duplicateError } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: `R${Date.now().toString().slice(-4)}9`,
          name: 'Different Partner',
          email: uniqueEmail, // Same email
          city: 'Thessaloniki',
          specialty: 'occupational_doctor',
          hourly_rate: 80
        }]);

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe('23505');
    });

    test('should validate hourly rate constraints', async () => {
      // Test negative hourly rate
      const { error: negativeRateError } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id,
          name: testPartner.name,
          email: testPartner.email,
          city: testPartner.city,
          specialty: testPartner.specialty,
          hourly_rate: -10 // Invalid negative rate
        }]);

      expect(negativeRateError).toBeDefined();
      expect(negativeRateError.code).toBe('23514'); // Check constraint violation
    });

    test('should handle partner performance metrics correctly', async () => {
      const performanceMetrics = {
        completion_rate: 85.5,
        avg_response_time: 2.3,
        client_satisfaction: 4.2,
        total_assignments: 28,
        avg_visit_duration: 4.1
      };

      const { data: partner, error } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id,
          name: testPartner.name,
          email: testPartner.email,
          city: testPartner.city,
          specialty: testPartner.specialty,
          hourly_rate: testPartner.hourly_rate,
          performance_metrics: performanceMetrics
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(partner.performance_metrics).toEqual(performanceMetrics);
      expect(partner.performance_metrics.completion_rate).toBe(85.5);
      expect(partner.performance_metrics.total_assignments).toBe(28);
    });

    test('should support geographic location data', async () => {
      const location = {
        latitude: 37.9838,
        longitude: 23.7275
      };

      const { data: partner, error } = await supabaseAdmin
        .from('partners')
        .insert([{
          id: testPartner.id,
          name: testPartner.name,
          email: testPartner.email,
          city: testPartner.city,
          specialty: testPartner.specialty,
          hourly_rate: testPartner.hourly_rate,
          location: location
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(partner.location).toEqual(location);
      expect(partner.location.latitude).toBe(37.9838);
      expect(partner.location.longitude).toBe(23.7275);
    });
  });

  describe('Customer Request Management', () => {
    test('should create customer request with complete data', async () => {
      const { data: request, error } = await supabaseAdmin
        .from('customer_requests')
        .insert([{
          id: testCustomerRequest.id,
          client_name: testCustomerRequest.client_name,
          installation_address: testCustomerRequest.installation_address,
          service_type: testCustomerRequest.service_type,
          employee_count: testCustomerRequest.employee_count,
          installation_category: testCustomerRequest.installation_category,
          work_hours: testCustomerRequest.work_hours,
          estimated_hours: testCustomerRequest.estimated_hours,
          max_budget: testCustomerRequest.max_budget,
          urgency_level: testCustomerRequest.urgency_level,
          status: testCustomerRequest.status || 'pending',
          location: testCustomerRequest.location
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(request).toBeDefined();
      expect(request.client_name).toBe(testCustomerRequest.client_name);
      expect(request.service_type).toBe(testCustomerRequest.service_type);
      expect(request.employee_count).toBe(testCustomerRequest.employee_count);
      expect(request.status).toBe(testCustomerRequest.status || 'pending');
      expect(request.created_at).toBeDefined();
    });

    test('should validate employee count constraints', async () => {
      // Test negative employee count
      const { error: negativeCountError } = await supabaseAdmin
        .from('customer_requests')
        .insert([{
          id: testCustomerRequest.id,
          client_name: testCustomerRequest.client_name,
          installation_address: testCustomerRequest.installation_address,
          service_type: testCustomerRequest.service_type,
          employee_count: -5, // Invalid negative count
          installation_category: 'A',
          estimated_hours: 4,
          max_budget: 200
        }]);

      expect(negativeCountError).toBeDefined();
      expect(negativeCountError.code).toBe('23514');
    });

    test('should validate service type enum values', async () => {
      const { error } = await supabaseAdmin
        .from('customer_requests')
        .insert([{
          id: testCustomerRequest.id,
          client_name: testCustomerRequest.client_name,
          installation_address: testCustomerRequest.installation_address,
          service_type: 'invalid_service_type', // Invalid enum value
          employee_count: 50,
          installation_category: 'B',
          estimated_hours: 6,
          max_budget: 300
        }]);

      expect(error).toBeDefined();
      expect(error.code).toBe('23514'); // Check constraint or enum violation
    });

    test('should handle urgency level properly', async () => {
      const urgencyLevels = ['low', 'medium', 'high', 'urgent'];
      
      for (const urgency of urgencyLevels) {
        const uniqueId = Math.floor(Math.random() * 1000000);
        const { data: request, error } = await supabaseAdmin
          .from('customer_requests')
          .insert([{
            id: uniqueId,
            client_name: `Test Client ${urgency}`,
            installation_address: 'Athens, Greece',
            service_type: 'occupational_doctor',
            employee_count: 50,
            installation_category: 'B',
            estimated_hours: 4,
            max_budget: 250,
            urgency_level: urgency
          }])
          .select()
          .single();

        expect(error).toBeNull();
        expect(request.urgency_level).toBe(urgency);
      }
    });
  });

  describe('Assignment Management', () => {
    beforeEach(async () => {
      // Create partner and customer request for assignment tests
      await supabaseAdmin.from('partners').insert([{
        id: testPartner.id,
        name: testPartner.name,
        email: testPartner.email,
        city: testPartner.city,
        specialty: testPartner.specialty,
        hourly_rate: testPartner.hourly_rate
      }]);

      await supabaseAdmin.from('customer_requests').insert([{
        id: testCustomerRequest.id,
        client_name: testCustomerRequest.client_name,
        installation_address: testCustomerRequest.installation_address,
        service_type: testCustomerRequest.service_type,
        employee_count: testCustomerRequest.employee_count,
        installation_category: testCustomerRequest.installation_category,
        estimated_hours: testCustomerRequest.estimated_hours,
        max_budget: testCustomerRequest.max_budget
      }]);
    });

    test('should create assignment with foreign key relationships', async () => {
      const assignmentData = {
        partner_id: testPartner.id,
        customer_request_id: testCustomerRequest.id,
        assignment_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        estimated_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const { data: assignment, error } = await supabaseAdmin
        .from('assignments')
        .insert([assignmentData])
        .select(`
          *,
          partners!inner(*),
          customer_requests!inner(*)
        `)
        .single();

      expect(error).toBeNull();
      expect(assignment).toBeDefined();
      expect(assignment.partner_id).toBe(testPartner.id);
      expect(assignment.customer_request_id).toBe(testCustomerRequest.id);
      expect(assignment.partners).toBeDefined();
      expect(assignment.customer_requests).toBeDefined();
      expect(assignment.partners.name).toBe(testPartner.name);
      expect(assignment.customer_requests.client_name).toBe(testCustomerRequest.client_name);
    });

    test('should enforce foreign key constraints', async () => {
      // Try to create assignment with non-existent partner
      const { error: partnerError } = await supabaseAdmin
        .from('assignments')
        .insert([{
          partner_id: 'R99999', // Non-existent partner
          customer_request_id: testCustomerRequest.id,
          assignment_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }]);

      expect(partnerError).toBeDefined();
      expect(partnerError.code).toBe('23503'); // Foreign key violation

      // Try to create assignment with non-existent customer request
      const { error: requestError } = await supabaseAdmin
        .from('assignments')
        .insert([{
          partner_id: testPartner.id,
          customer_request_id: 999999, // Non-existent request
          assignment_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }]);

      expect(requestError).toBeDefined();
      expect(requestError.code).toBe('23503');
    });

    test('should prevent duplicate assignments for same request', async () => {
      const assignmentData = {
        partner_id: testPartner.id,
        customer_request_id: testCustomerRequest.id,
        assignment_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      };

      // Create first assignment
      const { error: firstError } = await supabaseAdmin
        .from('assignments')
        .insert([assignmentData]);

      expect(firstError).toBeNull();

      // Try to create duplicate assignment
      const { error: duplicateError } = await supabaseAdmin
        .from('assignments')
        .insert([assignmentData]);

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe('23505'); // Unique constraint violation
    });
  });

  describe('Partner Availability Management', () => {
    beforeEach(async () => {
      await supabaseAdmin.from('partners').insert([{
        id: testPartner.id,
        name: testPartner.name,
        email: testPartner.email,
        city: testPartner.city,
        specialty: testPartner.specialty,
        hourly_rate: testPartner.hourly_rate
      }]);
    });

    test('should manage partner availability calendar', async () => {
      const availabilityData = [
        {
          partner_id: testPartner.id,
          date: '2024-01-15',
          is_available: true,
          hours_available: 8,
          start_time: '09:00',
          end_time: '17:00'
        },
        {
          partner_id: testPartner.id,
          date: '2024-01-16',
          is_available: false,
          hours_available: 0,
          start_time: null,
          end_time: null
        }
      ];

      const { data: availability, error } = await supabaseAdmin
        .from('partner_availability')
        .insert(availabilityData)
        .select();

      expect(error).toBeNull();
      expect(availability).toHaveLength(2);
      expect(availability[0].is_available).toBe(true);
      expect(availability[0].hours_available).toBe(8);
      expect(availability[1].is_available).toBe(false);
    });

    test('should validate availability hours constraints', async () => {
      // Test negative hours
      const { error: negativeHoursError } = await supabaseAdmin
        .from('partner_availability')
        .insert([{
          partner_id: testPartner.id,
          date: '2024-01-15',
          is_available: true,
          hours_available: -2, // Invalid negative hours
          start_time: '09:00',
          end_time: '17:00'
        }]);

      expect(negativeHoursError).toBeDefined();
      expect(negativeHoursError.code).toBe('23514');

      // Test excessive hours (more than 24)
      const { error: excessiveHoursError } = await supabaseAdmin
        .from('partner_availability')
        .insert([{
          partner_id: testPartner.id,
          date: '2024-01-16',
          is_available: true,
          hours_available: 25, // Invalid excessive hours
          start_time: '00:00',
          end_time: '23:59'
        }]);

      expect(excessiveHoursError).toBeDefined();
      expect(excessiveHoursError.code).toBe('23514');
    });
  });

  describe('Data Integrity and Relationships', () => {
    test('should maintain referential integrity on partner deletion', async () => {
      // Create partner
      await supabaseAdmin.from('partners').insert([{
        id: testPartner.id,
        name: testPartner.name,
        email: testPartner.email,
        city: testPartner.city,
        specialty: testPartner.specialty,
        hourly_rate: testPartner.hourly_rate
      }]);

      // Create customer request
      await supabaseAdmin.from('customer_requests').insert([{
        id: testCustomerRequest.id,
        client_name: testCustomerRequest.client_name,
        installation_address: testCustomerRequest.installation_address,
        service_type: testCustomerRequest.service_type,
        employee_count: testCustomerRequest.employee_count,
        installation_category: testCustomerRequest.installation_category,
        estimated_hours: testCustomerRequest.estimated_hours,
        max_budget: testCustomerRequest.max_budget
      }]);

      // Create assignment
      await supabaseAdmin.from('assignments').insert([{
        partner_id: testPartner.id,
        customer_request_id: testCustomerRequest.id,
        assignment_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      }]);

      // Try to delete partner with active assignment
      const { error: deleteError } = await supabaseAdmin
        .from('partners')
        .delete()
        .eq('id', testPartner.id);

      expect(deleteError).toBeDefined();
      expect(deleteError.code).toBe('23503'); // Foreign key constraint prevents deletion
    });

    test('should handle cascade deletes properly', async () => {
      // Create partner with availability
      await supabaseAdmin.from('partners').insert([{
        id: testPartner.id,
        name: testPartner.name,
        email: testPartner.email,
        city: testPartner.city,
        specialty: testPartner.specialty,
        hourly_rate: testPartner.hourly_rate
      }]);

      await supabaseAdmin.from('partner_availability').insert([{
        partner_id: testPartner.id,
        date: '2024-01-15',
        is_available: true,
        hours_available: 8
      }]);

      // Verify availability exists
      const { data: beforeDelete } = await supabaseAdmin
        .from('partner_availability')
        .select('*')
        .eq('partner_id', testPartner.id);

      expect(beforeDelete).toHaveLength(1);

      // Delete partner (should cascade delete availability if configured)
      await supabaseAdmin.from('assignments').delete().eq('partner_id', testPartner.id);
      const { error: deleteError } = await supabaseAdmin
        .from('partners')
        .delete()
        .eq('id', testPartner.id);

      expect(deleteError).toBeNull();

      // Check if availability was cascade deleted
      const { data: afterDelete } = await supabaseAdmin
        .from('partner_availability')
        .select('*')
        .eq('partner_id', testPartner.id);

      expect(afterDelete).toHaveLength(0);
    });
  });

  describe('Database Performance Tests', () => {
    test('should efficiently query partners with filters', async () => {
      // Create test dataset
      const partners = testDataFactory.generatePartners(100);
      const partnersToInsert = partners.map((partner, index) => ({
        id: `R${String(index).padStart(5, '0')}`,
        name: partner.name,
        email: `partner${index}@gep.gr`,
        city: partner.city,
        specialty: partner.specialty,
        hourly_rate: partner.hourly_rate,
        is_active: partner.is_active !== false,
        performance_metrics: partner.performance_metrics
      }));

      await supabaseAdmin.from('partners').insert(partnersToInsert);

      const startTime = Date.now();

      // Complex query with multiple filters
      const { data: filteredPartners, error } = await supabaseAdmin
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .eq('city', 'Athens')
        .gte('hourly_rate', 50)
        .order('name')
        .limit(20);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(filteredPartners).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Query should complete under 1 second
      
      filteredPartners.forEach(partner => {
        expect(partner.is_active).toBe(true);
        expect(partner.city).toBe('Athens');
        expect(partner.hourly_rate).toBeGreaterThanOrEqual(50);
      });
    });

    test('should handle concurrent database operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, index) => {
        const uniqueId = `R${String(Date.now() + index).slice(-5)}`;
        return supabaseAdmin.from('partners').insert([{
          id: uniqueId,
          name: `Concurrent Partner ${index}`,
          email: `concurrent${index}@gep.gr`,
          city: 'Athens',
          specialty: 'occupational_doctor',
          hourly_rate: 60 + index
        }]);
      });

      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(5000); // All operations should complete within 5 seconds
      
      results.forEach(result => {
        expect(result.error).toBeNull();
      });
    });
  });

  // Helper function to clean up test data
  async function cleanupTestData() {
    try {
      // Delete in correct order due to foreign key constraints
      await supabaseAdmin.from('assignments').delete().neq('id', 0);
      await supabaseAdmin.from('partner_availability').delete().neq('partner_id', '');
      await supabaseAdmin.from('customer_requests').delete().neq('id', 0);
      await supabaseAdmin.from('partners').delete().like('id', 'R%');
    } catch (error) {
      logger.warn('Cleanup failed:', error.message);
    }
  }
});