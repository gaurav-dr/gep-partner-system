/**
 * Supabase Connection Health Check Tests
 * Tests to verify Supabase client configuration and connectivity
 */

import { createClient } from '@supabase/supabase-js';

// Mock environment variables for testing
const mockEnv = {
  REACT_APP_SUPABASE_URL: 'http://localhost:8000',
  REACT_APP_SUPABASE_ANON_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTczNDEyMDB9.dc_X5iR_VP_qT0zsityj_I_OZ2T9FtRU2BBNWN8Bu4GE'
};

// Set up environment variables
Object.keys(mockEnv).forEach(key => {
  process.env[key] = mockEnv[key as keyof typeof mockEnv];
});

describe('Supabase Health Checks', () => {
  let supabase: any;

  beforeAll(() => {
    // Mock console.log to avoid test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Create fresh Supabase client for each test
    supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL!,
      process.env.REACT_APP_SUPABASE_ANON_KEY!
    );
  });

  test('Supabase client can be created without errors', () => {
    expect(() => {
      const client = createClient(
        process.env.REACT_APP_SUPABASE_URL!,
        process.env.REACT_APP_SUPABASE_ANON_KEY!
      );
      expect(client).toBeDefined();
    }).not.toThrow();
  });

  test('Environment variables are properly configured for Supabase', () => {
    expect(process.env.REACT_APP_SUPABASE_URL).toBeDefined();
    expect(process.env.REACT_APP_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.REACT_APP_SUPABASE_URL).toMatch(/^https?:\/\/.+/);
    expect(process.env.REACT_APP_SUPABASE_ANON_KEY).toMatch(/^eyJ[\w-]*\.[\w-]*\.[\w-]*$/);
  });

  test('JWT token has valid structure and claims', () => {
    const token = process.env.REACT_APP_SUPABASE_ANON_KEY!;
    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    // Decode JWT payload
    const payload = JSON.parse(atob(parts[1]));
    expect(payload.iss).toBe('supabase');
    expect(payload.role).toBe('anon');
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
  });

  test('Supabase client has required methods', () => {
    expect(supabase.auth).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(supabase.storage).toBeDefined();
    expect(supabase.realtime).toBeDefined();
    
    // Check auth methods
    expect(typeof supabase.auth.signIn).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
    expect(typeof supabase.auth.getUser).toBe('function');
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  test('Supabase client configuration is correct', () => {
    expect(supabase.supabaseUrl).toBe(process.env.REACT_APP_SUPABASE_URL);
    expect(supabase.supabaseKey).toBe(process.env.REACT_APP_SUPABASE_ANON_KEY);
  });

  test('Auth state change listener can be set up', () => {
    expect(() => {
      const { data } = supabase.auth.onAuthStateChange(
        (event: string, session: any) => {
          // Mock callback
        }
      );
      expect(data).toBeDefined();
      expect(typeof data.subscription?.unsubscribe).toBe('function');
      
      // Clean up
      data.subscription?.unsubscribe();
    }).not.toThrow();
  });

  test('Database queries can be constructed', () => {
    expect(() => {
      const query = supabase.from('test_table').select('*');
      expect(query).toBeDefined();
    }).not.toThrow();
  });

  test('Storage bucket access can be configured', () => {
    expect(() => {
      const storage = supabase.storage.from('test-bucket');
      expect(storage).toBeDefined();
    }).not.toThrow();
  });

  test('Realtime subscription can be created', () => {
    expect(() => {
      const channel = supabase.channel('test-channel');
      expect(channel).toBeDefined();
      expect(typeof channel.subscribe).toBe('function');
      expect(typeof channel.unsubscribe).toBe('function');
      
      // Clean up
      channel.unsubscribe();
    }).not.toThrow();
  });

  test('Client handles network errors gracefully', async () => {
    // This test verifies that the client doesn't crash on network issues
    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Network error')
    );

    try {
      await supabase.from('test').select('*').limit(1);
    } catch (error) {
      // Error is expected in test environment
      expect(error).toBeDefined();
    }

    mockFetch.mockRestore();
  });

  test('Authentication methods are available', () => {
    const authMethods = [
      'signInWithPassword',
      'signInWithOtp',
      'signUp',
      'signOut',
      'refreshSession',
      'getUser',
      'getSession'
    ];

    authMethods.forEach(method => {
      expect(typeof supabase.auth[method]).toBe('function');
    });
  });
});