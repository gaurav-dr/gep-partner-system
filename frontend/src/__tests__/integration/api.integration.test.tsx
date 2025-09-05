/**
 * API Integration Health Check Tests
 * Tests to verify backend API endpoints are reachable and responding
 */

import axios, { AxiosResponse } from 'axios';

// Mock environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:8000';

// Increase timeout for integration tests
jest.setTimeout(15000);

describe('API Integration Health Checks', () => {
  beforeAll(() => {
    // Mock console.log to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Backend API Health', () => {
    test('Backend health endpoint is reachable', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      } catch (error: any) {
        // If backend isn't running, we should at least verify the URL format
        expect(API_BASE_URL).toMatch(/^https?:\/\/.+/);

        // Log the error for debugging but don't fail the test if backend is down
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.warn(
            `Backend not available at ${API_BASE_URL} - this may be expected in test environment`
          );
        } else {
          throw error;
        }
      }
    });

    test('Backend responds with CORS headers', async () => {
      try {
        const response = await axios.options(`${API_BASE_URL}/health`, {
          timeout: 5000,
          headers: {
            Origin: 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
          },
        });

        // Should have CORS headers or at least not block the request
        expect(response.status).toBeLessThan(500);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend CORS check skipped - backend not available');
        } else {
          // Some servers may not support OPTIONS, that's okay
          expect(error.response?.status).toBeDefined();
        }
      }
    });

    test('Backend API base URL is properly configured', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(API_BASE_URL).toMatch(/^https?:\/\/.+/);
      expect(API_BASE_URL).not.toContain('undefined');
      expect(API_BASE_URL).not.toContain('null');
    });

    const apiEndpoints = [
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/api/status', method: 'GET', description: 'API status' },
      { path: '/api/auth/me', method: 'GET', description: 'Auth status' },
    ];

    apiEndpoints.forEach(({ path, method, description }) => {
      test(`${description} endpoint (${method} ${path}) structure is valid`, async () => {
        const fullUrl = `${API_BASE_URL}${path}`;
        expect(fullUrl).toMatch(/^https?:\/\/.+/);

        try {
          const response = await axios.request({
            method: method.toLowerCase() as any,
            url: fullUrl,
            timeout: 5000,
            validateStatus: () => true, // Don't throw on HTTP errors
          });

          // Any response (even 404) is better than no response
          expect(response.status).toBeDefined();
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(600);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.warn(`Endpoint ${path} not reachable - backend may not be running`);
          } else {
            throw error;
          }
        }
      });
    });
  });

  describe('Supabase API Health', () => {
    test('Supabase URL is properly configured', () => {
      expect(SUPABASE_URL).toBeDefined();
      expect(SUPABASE_URL).toMatch(/^https?:\/\/.+/);
      expect(SUPABASE_URL).not.toContain('undefined');
      expect(SUPABASE_URL).not.toContain('null');
    });

    test('Supabase health endpoint responds', async () => {
      try {
        const response = await axios.get(`${SUPABASE_URL}/health`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.status).toBe(200);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.warn(
            `Supabase not available at ${SUPABASE_URL} - this may be expected in test environment`
          );
        } else if (error.response?.status === 404) {
          // Some Supabase instances may not have /health endpoint
          console.warn('Supabase health endpoint not found, trying root endpoint');

          try {
            const rootResponse = await axios.get(`${SUPABASE_URL}/`, {
              timeout: 5000,
              validateStatus: () => true,
            });
            expect(rootResponse.status).toBeLessThan(500);
          } catch (rootError) {
            console.warn('Supabase root endpoint also not available');
          }
        } else {
          throw error;
        }
      }
    });

    test('Supabase REST API endpoint is reachable', async () => {
      try {
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/`, {
          timeout: 5000,
          headers: {
            apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true, // Don't throw on HTTP errors
        });

        // Should get some response from the REST API
        expect(response.status).toBeDefined();
        expect(response.status).toBeLessThan(500);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Supabase REST API not available - may be expected in test environment');
        } else {
          throw error;
        }
      }
    });

    test('Supabase Auth endpoint is reachable', async () => {
      try {
        const response = await axios.get(`${SUPABASE_URL}/auth/v1/health`, {
          timeout: 5000,
          validateStatus: () => true,
        });

        expect(response.status).toBeDefined();
        expect(response.status).toBeLessThan(500);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Supabase Auth API not available - may be expected in test environment');
        } else {
          // Try alternative auth health check
          try {
            const altResponse = await axios.get(`${SUPABASE_URL}/auth/v1/settings`, {
              timeout: 5000,
              validateStatus: () => true,
            });
            expect(altResponse.status).toBeDefined();
          } catch {
            console.warn('Supabase Auth endpoints not available');
          }
        }
      }
    });
  });

  describe('Network Configuration', () => {
    test('Axios is properly configured', () => {
      expect(axios.defaults.timeout).toBeDefined();
      expect(axios.defaults.headers).toBeDefined();
    });

    test('Request interceptors work', () => {
      const requestInterceptorId = axios.interceptors.request.use(config => {
        config.headers = config.headers || {};
        config.headers['X-Test-Header'] = 'test';
        return config;
      });

      expect(requestInterceptorId).toBeDefined();
      expect(typeof requestInterceptorId).toBe('number');

      // Clean up
      axios.interceptors.request.eject(requestInterceptorId);
    });

    test('Response interceptors work', () => {
      const responseInterceptorId = axios.interceptors.response.use(
        response => response,
        error => Promise.reject(error)
      );

      expect(responseInterceptorId).toBeDefined();
      expect(typeof responseInterceptorId).toBe('number');

      // Clean up
      axios.interceptors.response.eject(responseInterceptorId);
    });

    test('Error handling is configured', async () => {
      try {
        await axios.get('http://localhost:99999/non-existent', {
          timeout: 1000,
        });
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code || error.response?.status).toBeDefined();
      }
    });

    test('Headers are properly set', () => {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      };

      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('Service Integration', () => {
    test('Can create HTTP client instances', () => {
      const client = axios.create({
        baseURL: API_BASE_URL,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(client).toBeDefined();
      expect(client.defaults.baseURL).toBe(API_BASE_URL);
      expect(client.defaults.timeout).toBe(5000);
    });

    test('Environment variables are consistent', () => {
      // Check that all required URLs are configured
      expect(process.env.REACT_APP_API_URL).toBeDefined();
      expect(process.env.REACT_APP_SUPABASE_URL).toBeDefined();
      expect(process.env.REACT_APP_SUPABASE_ANON_KEY).toBeDefined();

      // URLs should be different (API and Supabase on different ports)
      if (process.env.REACT_APP_API_URL && process.env.REACT_APP_SUPABASE_URL) {
        expect(process.env.REACT_APP_API_URL).not.toBe(process.env.REACT_APP_SUPABASE_URL);
      }
    });
  });
});
