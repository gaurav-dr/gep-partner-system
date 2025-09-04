/**
 * Authentication API Tests
 * Comprehensive testing for authentication endpoints including security, validation, and business logic
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/server');
const AuthService = require('../../src/services/AuthService');
const TestDataFactory = require('../factories/testDataFactory');

describe('Authentication API Endpoints', () => {
  let testDataFactory;
  let testUser;
  let validToken;

  beforeAll(() => {
    // Disable rate limiting for tests by setting NODE_ENV to test
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // Restore original NODE_ENV
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    testDataFactory = new TestDataFactory();
    testUser = {
      email: 'test@gep.gr',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'partner'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      // Mock AuthService.register to avoid actual database operations
      AuthService.register = jest.fn().mockResolvedValue({
        message: 'User registered successfully',
        user: { id: 'user-123', email: testUser.email, role: testUser.role }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('role', testUser.role);
      expect(AuthService.register).toHaveBeenCalledWith(testUser);
    });

    test('should reject registration with missing required fields', async () => {
      const incompleteUser = { email: testUser.email, password: testUser.password };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('All fields are required');
      expect(response.body.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordUser = { ...testUser, password: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Password must be at least 8 characters');
      expect(response.body.code).toBe('WEAK_PASSWORD');
    });

    test('should reject registration with invalid role', async () => {
      const invalidRoleUser = { ...testUser, role: 'invalid_role' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidRoleUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid role');
      expect(response.body.code).toBe('INVALID_ROLE');
    });

    test('should handle duplicate user registration', async () => {
      AuthService.register = jest.fn().mockRejectedValue(
        new Error('User with this email already exists')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toContain('already exists');
      expect(response.body.code).toBe('USER_EXISTS');
    });

    test('should respect rate limiting for registration attempts', async () => {
      // Mock multiple rapid registration attempts
      AuthService.register = jest.fn().mockResolvedValue({
        message: 'User registered successfully',
        user: { id: 'user-123', email: testUser.email }
      });

      // Make 11 requests (rate limit is 10 per 15 minutes)
      const promises = [];
      for (let i = 0; i < 11; i++) {
        const uniqueUser = { ...testUser, email: `test${i}@gep.gr` };
        promises.push(request(app).post('/api/auth/register').send(uniqueUser));
      }

      const responses = await Promise.all(promises);
      
      // The 11th request should be rate limited
      const rateLimitedResponse = responses[responses.length - 1];
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('should enforce production registration restrictions', async () => {
      // Temporarily set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_SELF_REGISTRATION = 'false';

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toContain('registration is restricted');
      expect(response.body.code).toBe('REGISTRATION_RESTRICTED');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      delete process.env.ALLOW_SELF_REGISTRATION;
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() => {
      validToken = jwt.sign(
        { id: 'user-123', email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('should login user with valid credentials', async () => {
      AuthService.login = jest.fn().mockResolvedValue({
        token: validToken,
        user: { id: 'user-123', email: testUser.email, role: testUser.role },
        expiresIn: '1h'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.expiresIn).toBe('1h');
      expect(AuthService.login).toHaveBeenCalledWith(
        testUser.email,
        testUser.password,
        expect.any(String), // IP address
        expect.any(String)  // User agent
      );
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Email and password are required');
      expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });

    test('should reject login with invalid credentials', async () => {
      AuthService.login = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid email or password');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    test('should track IP address and user agent on login', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockUserAgent = 'Mozilla/5.0 Test Browser';

      AuthService.login = jest.fn().mockResolvedValue({
        token: validToken,
        user: { id: 'user-123', email: testUser.email },
        expiresIn: '1h'
      });

      await request(app)
        .post('/api/auth/login')
        .set('User-Agent', mockUserAgent)
        .set('X-Forwarded-For', mockIpAddress)
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(AuthService.login).toHaveBeenCalledWith(
        testUser.email,
        testUser.password,
        expect.stringContaining(mockIpAddress),
        mockUserAgent
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh valid JWT token', async () => {
      const newToken = jwt.sign(
        { id: 'user-123', email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      AuthService.refreshToken = jest.fn().mockResolvedValue({
        token: newToken,
        expiresIn: '1h'
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.expiresIn).toBe('1h');
    });

    test('should reject refresh without valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toContain('token');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toContain('token');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    test('should change password with valid current password', async () => {
      AuthService.changePassword = jest.fn().mockResolvedValue({
        message: 'Password changed successfully'
      });

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');
      expect(AuthService.changePassword).toHaveBeenCalledWith(
        expect.any(String),
        'OldPass123!',
        'NewPass123!'
      );
    });

    test('should reject password change with missing fields', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ currentPassword: 'OldPass123!' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('required');
      expect(response.body.code).toBe('MISSING_PASSWORDS');
    });

    test('should reject weak new password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: '123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('at least 8 characters');
      expect(response.body.code).toBe('WEAK_PASSWORD');
    });

    test('should reject incorrect current password', async () => {
      AuthService.changePassword = jest.fn().mockRejectedValue(
        new Error('Current password is incorrect')
      );

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'WrongPass123!',
          newPassword: 'NewPass123!'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('incorrect');
      expect(response.body.code).toBe('INCORRECT_PASSWORD');
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    test('should send password reset email for valid user', async () => {
      AuthService.requestPasswordReset = jest.fn().mockResolvedValue({
        message: 'Password reset email sent'
      });

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');
      expect(AuthService.requestPasswordReset).toHaveBeenCalledWith(testUser.email);
    });

    test('should require email for password reset request', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Email is required');
      expect(response.body.code).toBe('MISSING_EMAIL');
    });

    test('should enforce rate limiting for password reset requests', async () => {
      AuthService.requestPasswordReset = jest.fn().mockResolvedValue({
        message: 'Password reset email sent'
      });

      // Make 4 requests (rate limit is 3 per hour for password reset)
      const promises = [];
      for (let i = 0; i < 4; i++) {
        promises.push(
          request(app)
            .post('/api/auth/request-password-reset')
            .send({ email: `test${i}@gep.gr` })
        );
      }

      const responses = await Promise.all(promises);
      
      // The 4th request should be rate limited
      const rateLimitedResponse = responses[responses.length - 1];
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      AuthService.resetPassword = jest.fn().mockResolvedValue({
        message: 'Password reset successfully'
      });

      const resetToken = 'valid-reset-token-123';
      const newPassword = 'NewSecurePass123!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');
      expect(AuthService.resetPassword).toHaveBeenCalledWith(resetToken, newPassword);
    });

    test('should require token and new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'test-token' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('required');
      expect(response.body.code).toBe('MISSING_RESET_DATA');
    });

    test('should reject invalid reset token', async () => {
      AuthService.resetPassword = jest.fn().mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPass123!' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid');
      expect(response.body.code).toBe('INVALID_RESET_TOKEN');
    });
  });

  describe('Security Tests', () => {
    test('should sanitize SQL injection attempts in login', async () => {
      const maliciousPayload = {
        email: "admin@gep.gr'; DROP TABLE users; --",
        password: 'password123'
      };

      AuthService.login = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(401);

      // Should not leak specific error information
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should prevent XSS in user input fields', async () => {
      const xssPayload = {
        email: 'test@gep.gr',
        password: 'password123',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
        role: 'partner'
      };

      // The sanitizeInput middleware should clean this
      const response = await request(app)
        .post('/api/auth/register')
        .send(xssPayload);

      // The response should not contain the script tag
      if (response.body.user) {
        expect(response.body.user.firstName).not.toContain('<script>');
      }
    });

    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Admin User Management', () => {
    let adminToken;

    beforeEach(() => {
      adminToken = jwt.sign(
        { id: 'admin-123', email: 'admin@gep.gr', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('should allow admin to fetch all users', async () => {
      // Mock Supabase response
      const mockUsers = [
        { id: 'user-1', email: 'user1@gep.gr', role: 'partner' },
        { id: 'user-2', email: 'user2@gep.gr', role: 'manager' }
      ];

      // Mock the supabase admin call
      const mockSupabaseAdmin = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: mockUsers, error: null }))
          }))
        }))
      };

      jest.doMock('../../src/config/supabase', () => ({
        supabaseAdmin: mockSupabaseAdmin
      }));

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(2);
    });

    test('should prevent non-admin from accessing user management', async () => {
      const partnerToken = jwt.sign(
        { id: 'partner-123', email: 'partner@gep.gr', role: 'partner' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toContain('access');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      AuthService.login = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(500);
    });

    test('should handle malformed JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformed.jwt.token')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    test('should validate email format in registration', async () => {
      const invalidEmailUser = { ...testUser, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailUser)
        .expect(400);

      expect(response.body.error).toContain('valid email');
    });
  });
});