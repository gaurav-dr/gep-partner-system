// Jest Test Setup
require('dotenv').config({ path: '.env.test' });

// Mock external dependencies for testing
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
};

// Mock Supabase
jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: mockSupabaseClient,
  supabase: mockSupabaseClient
}));

// Mock logger to avoid console noise during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Global test utilities
global.createMockPartner = (overrides = {}) => ({
  id: 'partner-' + Math.random().toString(36).substr(2, 9),
  name: 'Test Partner',
  email: 'partner@test.com',
  city: 'Athens',
  specialty: 'occupational_doctor',
  hourly_rate: 50,
  max_hours_per_week: 40,
  is_active: true,
  performance_metrics: {
    completion_rate: 85.0,
    avg_response_time: 2.5,
    client_satisfaction: 4.2
  },
  location: {
    latitude: 37.9838,
    longitude: 23.7275
  },
  ...overrides
});

global.createMockInstallation = (overrides = {}) => ({
  id: 'install-' + Math.random().toString(36).substr(2, 9),
  company_name: 'Test Company Ltd',
  address: 'Athens, Greece',
  service_type: 'occupational_doctor',
  employee_count: 50,
  urgency_level: 'medium',
  location: {
    latitude: 37.9755,
    longitude: 23.7348
  },
  work_hours: {
    start: '09:00',
    end: '17:00'
  },
  estimated_hours: 4,
  max_budget: 200,
  ...overrides
});

global.createMockCustomerRequest = (overrides = {}) => ({
  id: parseInt(Math.random() * 10000),
  client_name: 'Test Client Corp',
  installation_address: 'Athens, Greece',
  service_type: 'occupational_doctor',
  employee_count: 50,
  status: 'pending',
  estimated_hours: 4,
  max_budget: 200,
  preferred_partner_id: null,
  installation_category: 'B',
  work_hours: '09:00-17:00',
  special_requirements: null,
  created_at: new Date().toISOString(),
  ...overrides
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});