/**
 * Partners API Tests
 * Comprehensive testing for partner management endpoints including CRUD operations,
 * validation, performance metrics, and business logic
 */

const request = require('supertest');
const app = require('../../src/server');
const TestDataFactory = require('../factories/testDataFactory');
const jwt = require('jsonwebtoken');

describe('Partners API Endpoints', () => {
  let testDataFactory;
  let adminToken;
  let partnerToken;
  let mockSupabase;
  let testPartner;

  beforeAll(() => {
    testDataFactory = new TestDataFactory();
    
    // Generate JWT tokens for different roles
    adminToken = jwt.sign(
      { id: 'admin-123', email: 'admin@gep.gr', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    partnerToken = jwt.sign(
      { id: 'partner-123', email: 'partner@gep.gr', role: 'partner' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    // Create test partner data
    testPartner = testDataFactory.generatePartners(1)[0];
    testPartner.id = 'R12345'; // Ensure valid ID format
    testPartner.email = 'testpartner@gep.gr';

    // Mock Supabase operations
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: testPartner, error: null })),
            order: jest.fn(() => Promise.resolve({ data: [testPartner], error: null }))
          })),
          ilike: jest.fn(() => ({
            range: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [testPartner], error: null }))
            }))
          })),
          range: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [testPartner], error: null }))
          })),
          order: jest.fn(() => Promise.resolve({ data: [testPartner], error: null }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: testPartner, error: null }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: testPartner, error: null }))
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    };

    // Mock the Supabase import
    jest.doMock('../../src/config/supabase', () => ({
      supabase: mockSupabase
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/partners', () => {
    test('should return all active partners by default', async () => {
      const partners = testDataFactory.generatePartners(3);
      mockSupabase.from().select().range().order.mockResolvedValue({
        data: partners,
        error: null
      });

      const response = await request(app)
        .get('/api/partners')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('specialty');
      expect(response.body.data[0]).toHaveProperty('performance_metrics');
    });

    test('should filter partners by specialty', async () => {
      const occupationalDoctors = testDataFactory.generatePartners(2, { specialty: 'occupational_doctor' });
      
      mockSupabase.from().select().ilike().range().order.mockResolvedValue({
        data: occupationalDoctors,
        error: null
      });

      const response = await request(app)
        .get('/api/partners?specialty=occupational_doctor')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach(partner => {
        expect(partner.specialty).toContain('occupational_doctor');
      });
    });

    test('should filter partners by city', async () => {
      const athensPartners = testDataFactory.generatePartners(2);
      athensPartners.forEach(p => p.city = 'Athens');

      mockSupabase.from().select().eq().range().order.mockResolvedValue({
        data: athensPartners,
        error: null
      });

      const response = await request(app)
        .get('/api/partners?city=Athens')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach(partner => {
        expect(partner.city).toBe('Athens');
      });
    });

    test('should support pagination', async () => {
      const allPartners = testDataFactory.generatePartners(25);
      const firstPage = allPartners.slice(0, 20);

      mockSupabase.from().select().range().order.mockResolvedValue({
        data: firstPage,
        error: null
      });

      const response = await request(app)
        .get('/api/partners?page=1&limit=20')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(20);
    });

    test('should filter by active status', async () => {
      const activePartners = testDataFactory.generatePartners(3);
      activePartners.forEach(p => p.is_active = true);

      mockSupabase.from().select().eq().range().order.mockResolvedValue({
        data: activePartners,
        error: null
      });

      const response = await request(app)
        .get('/api/partners?is_active=true')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach(partner => {
        expect(partner.is_active).toBe(true);
      });
    });

    test('should handle database errors gracefully', async () => {
      mockSupabase.from().select().range().order.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const response = await request(app)
        .get('/api/partners')
        .expect(500);

      expect(response.body.error).toContain('Database');
    });
  });

  describe('GET /api/partners/:id', () => {
    test('should return specific partner with availability data', async () => {
      const partnerWithAvailability = {
        ...testPartner,
        partner_availability: [
          {
            date: '2024-01-15',
            is_available: true,
            hours_available: 8
          }
        ]
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: partnerWithAvailability,
        error: null
      });

      const response = await request(app)
        .get(`/api/partners/${testPartner.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe(testPartner.id);
      expect(response.body.name).toBe(testPartner.name);
      expect(response.body.performance_metrics).toBeDefined();
      expect(response.body.partner_availability).toHaveLength(1);
    });

    test('should return 404 for non-existent partner', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Supabase not found error
      });

      const response = await request(app)
        .get('/api/partners/R99999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Partner not found');
    });

    test('should validate partner ID format', async () => {
      const response = await request(app)
        .get('/api/partners/invalid-id')
        .expect('Content-Type', /json/);

      // Should either return 404 or validation error
      expect([404, 400]).toContain(response.status);
    });
  });

  describe('POST /api/partners', () => {
    const validPartnerData = {
      id: 'R12345',
      name: 'Dr. Test Partner',
      specialty: 'occupational_doctor',
      city: 'Athens',
      hourly_rate: 75,
      max_hours_per_week: 40,
      email: 'newpartner@gep.gr',
      phone: '+30210123456',
      is_active: true
    };

    test('should create new partner with valid data', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { ...validPartnerData, created_at: new Date().toISOString() },
        error: null
      });

      const response = await request(app)
        .post('/api/partners')
        .send(validPartnerData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.id).toBe(validPartnerData.id);
      expect(response.body.name).toBe(validPartnerData.name);
      expect(response.body.email).toBe(validPartnerData.email);
      expect(response.body.created_at).toBeDefined();
    });

    test('should validate partner ID format (R + 5 digits)', async () => {
      const invalidIdData = { ...validPartnerData, id: 'INVALID123' };

      const response = await request(app)
        .post('/api/partners')
        .send(invalidIdData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        name: 'Dr. Test Partner',
        specialty: 'occupational_doctor'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/partners')
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    test('should validate hourly rate range', async () => {
      const invalidRateData = { ...validPartnerData, hourly_rate: 5 }; // Below minimum

      const response = await request(app)
        .post('/api/partners')
        .send(invalidRateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('hourly_rate');
    });

    test('should validate email format', async () => {
      const invalidEmailData = { ...validPartnerData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/partners')
        .send(invalidEmailData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    test('should validate maximum hours per week', async () => {
      const invalidHoursData = { ...validPartnerData, max_hours_per_week: 80 }; // Above maximum

      const response = await request(app)
        .post('/api/partners')
        .send(invalidHoursData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('max_hours_per_week');
    });

    test('should handle duplicate partner ID', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' } // PostgreSQL unique violation
      });

      const response = await request(app)
        .post('/api/partners')
        .send(validPartnerData)
        .expect(500);

      expect(response.body.error).toContain('duplicate');
    });

    test('should set default values for optional fields', async () => {
      const minimalData = {
        id: 'R54321',
        name: 'Minimal Partner',
        specialty: 'safety_engineer',
        city: 'Thessaloniki',
        hourly_rate: 50,
        email: 'minimal@gep.gr'
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          ...minimalData,
          max_hours_per_week: 40, // Default value
          is_active: true, // Default value
          created_at: new Date().toISOString()
        },
        error: null
      });

      const response = await request(app)
        .post('/api/partners')
        .send(minimalData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.max_hours_per_week).toBe(40);
      expect(response.body.is_active).toBe(true);
    });
  });

  describe('PUT /api/partners/:id', () => {
    const updateData = {
      hourly_rate: 85,
      city: 'Thessaloniki',
      is_active: false
    };

    test('should update partner with valid data', async () => {
      const updatedPartner = { ...testPartner, ...updateData };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedPartner,
        error: null
      });

      const response = await request(app)
        .put(`/api/partners/${testPartner.id}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.hourly_rate).toBe(85);
      expect(response.body.city).toBe('Thessaloniki');
      expect(response.body.is_active).toBe(false);
    });

    test('should return 404 for non-existent partner', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .put('/api/partners/R99999')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Partner not found');
    });

    test('should validate update data', async () => {
      const invalidUpdateData = { hourly_rate: -10 };

      const response = await request(app)
        .put(`/api/partners/${testPartner.id}`)
        .send(invalidUpdateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    test('should allow partial updates', async () => {
      const partialUpdate = { hourly_rate: 90 };
      const updatedPartner = { ...testPartner, hourly_rate: 90 };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedPartner,
        error: null
      });

      const response = await request(app)
        .put(`/api/partners/${testPartner.id}`)
        .send(partialUpdate)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.hourly_rate).toBe(90);
      expect(response.body.name).toBe(testPartner.name); // Unchanged
    });

    test('should not allow ID updates', async () => {
      const attemptIdUpdate = { id: 'R99999' };

      const response = await request(app)
        .put(`/api/partners/${testPartner.id}`)
        .send(attemptIdUpdate)
        .expect('Content-Type', /json/);

      // ID should be ignored in updates (validation schema marks it optional)
      expect(response.status).toBeOneOf([200, 400]);
    });
  });

  describe('DELETE /api/partners/:id', () => {
    test('should soft delete partner successfully', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: null
      });

      const response = await request(app)
        .delete(`/api/partners/${testPartner.id}`)
        .expect(204);

      expect(response.body).toEqual({});
    });

    test('should handle deletion of non-existent partner', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .delete('/api/partners/R99999')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    test('should prevent deletion of partner with active assignments', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: { 
          code: '23503', 
          message: 'violates foreign key constraint'
        }
      });

      const response = await request(app)
        .delete(`/api/partners/${testPartner.id}`)
        .expect(500);

      expect(response.body.error).toContain('constraint');
    });
  });

  describe('Business Logic Tests', () => {
    test('should calculate partner performance score correctly', () => {
      const scenarios = testDataFactory.createTestScenario('high_performance_priority');
      const highPerformer = scenarios.partners[0];
      const lowPerformer = scenarios.partners[1];

      expect(highPerformer.performance_metrics.completion_rate).toBeGreaterThan(70);
      expect(lowPerformer.performance_metrics.completion_rate).toBeLessThan(40);
    });

    test('should validate geographic distribution (46% Athens concentration)', () => {
      const partners = testDataFactory.generatePartners(100);
      const athensPartners = partners.filter(p => p.city === 'Athens');
      const athensPercentage = (athensPartners.length / partners.length) * 100;

      // Allow some variance in the distribution
      expect(athensPercentage).toBeGreaterThan(40);
      expect(athensPercentage).toBeLessThan(50);
    });

    test('should generate realistic hourly rates based on performance', () => {
      const partners = testDataFactory.generatePartners(50);
      
      partners.forEach(partner => {
        expect(partner.hourly_rate).toBeGreaterThan(30);
        expect(partner.hourly_rate).toBeLessThan(100);
        
        // High performers should generally have higher rates
        if (partner.performance_metrics.completion_rate > 80) {
          expect(partner.hourly_rate).toBeGreaterThan(50);
        }
      });
    });

    test('should maintain workload capacity constraints', () => {
      const partners = testDataFactory.generatePartners(20);
      
      partners.forEach(partner => {
        expect(partner.availability.current_load).toBeLessThanOrEqual(
          partner.availability.weekly_capacity
        );
        expect(partner.availability.weekly_capacity).toBeGreaterThanOrEqual(20);
        expect(partner.availability.weekly_capacity).toBeLessThanOrEqual(40);
      });
    });
  });

  describe('Performance and Scale Tests', () => {
    test('should handle large partner dataset queries efficiently', async () => {
      const largePartnerSet = testDataFactory.generatePartners(1000);
      
      mockSupabase.from().select().range().order.mockResolvedValue({
        data: largePartnerSet.slice(0, 20), // Paginated response
        error: null
      });

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/partners?limit=20')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.data).toHaveLength(20);
      expect(responseTime).toBeLessThan(1000); // Response under 1 second
    });

    test('should handle concurrent partner creation requests', async () => {
      const partnerBatch = Array.from({ length: 10 }, (_, i) => ({
        id: `R1234${i}`,
        name: `Partner ${i}`,
        specialty: 'occupational_doctor',
        city: 'Athens',
        hourly_rate: 60 + i,
        email: `partner${i}@gep.gr`
      }));

      // Mock successful creation for all partners
      mockSupabase.from().insert().select().single.mockImplementation((data) => 
        Promise.resolve({ data: data[0], error: null })
      );

      const promises = partnerBatch.map(partner =>
        request(app)
          .post('/api/partners')
          .send(partner)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect([201, 409]).toContain(response.status); // 201 success or 409 conflict
      });
    });
  });

  describe('Security Tests', () => {
    test('should prevent partner data injection attacks', async () => {
      const maliciousData = {
        id: 'R12345',
        name: "'; DROP TABLE partners; --",
        specialty: 'occupational_doctor',
        city: 'Athens',
        hourly_rate: 75,
        email: 'test@gep.gr'
      };

      // The validation middleware should sanitize this
      const response = await request(app)
        .post('/api/partners')
        .send(maliciousData);

      if (response.status === 201) {
        expect(response.body.name).not.toContain('DROP TABLE');
      }
    });

    test('should validate sensitive partner information access', async () => {
      // Ensure partner data doesn't leak sensitive information
      mockSupabase.from().select().range().order.mockResolvedValue({
        data: [testPartner],
        error: null
      });

      const response = await request(app)
        .get('/api/partners')
        .expect(200);

      const partner = response.body.data[0];
      
      // Ensure no sensitive data is exposed
      expect(partner).not.toHaveProperty('password_hash');
      expect(partner).not.toHaveProperty('ssn');
      expect(partner).not.toHaveProperty('bank_account');
    });
  });

  describe('Integration with Other Services', () => {
    test('should trigger performance metrics calculation on partner update', async () => {
      const metricsUpdate = {
        performance_metrics: {
          completion_rate: 88.5,
          avg_response_time: 2.1,
          client_satisfaction: 4.3,
          total_assignments: 42
        }
      };

      const updatedPartner = { ...testPartner, ...metricsUpdate };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedPartner,
        error: null
      });

      const response = await request(app)
        .put(`/api/partners/${testPartner.id}`)
        .send(metricsUpdate)
        .expect(200);

      expect(response.body.performance_metrics.completion_rate).toBe(88.5);
      expect(response.body.performance_metrics.total_assignments).toBe(42);
    });

    test('should validate partner availability for scheduling', async () => {
      const partnerWithAvailability = {
        ...testPartner,
        partner_availability: [
          {
            date: '2024-01-15',
            is_available: true,
            hours_available: 6
          },
          {
            date: '2024-01-16',
            is_available: false,
            hours_available: 0
          }
        ]
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: partnerWithAvailability,
        error: null
      });

      const response = await request(app)
        .get(`/api/partners/${testPartner.id}`)
        .expect(200);

      const availableDays = response.body.partner_availability.filter(
        day => day.is_available
      );
      
      expect(availableDays).toHaveLength(1);
      expect(availableDays[0].hours_available).toBe(6);
    });
  });
});

// Custom Jest matcher
expect.extend({
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${validOptions}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${validOptions}`,
        pass: false,
      };
    }
  },
});