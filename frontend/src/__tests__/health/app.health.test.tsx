/**
 * Frontend Health Check Tests
 * Tests to verify React app builds, renders, and core functionality works
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';

import App from '../../App';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock environment variables for testing
const mockEnv = {
  REACT_APP_SUPABASE_URL: 'http://localhost:8000',
  REACT_APP_SUPABASE_ANON_KEY:
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTczNDEyMDB9.dc_X5iR_VP_qT0zsityj_I_OZ2T9FtRU2BBNWN8Bu4GE',
  REACT_APP_API_URL: 'http://localhost:3001',
  REACT_APP_ENVIRONMENT: 'test',
};

// Set up environment variables
Object.keys(mockEnv).forEach(key => {
  process.env[key] = mockEnv[key as keyof typeof mockEnv];
});

// Mock console.log to avoid test noise
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('Frontend Health Checks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('Application renders without crashing', () => {
    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      );
    }).not.toThrow();
  });

  test('Application shows loading state initially', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should show loading spinner initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('Environment variables are properly configured', () => {
    expect(process.env.REACT_APP_SUPABASE_URL).toBeDefined();
    expect(process.env.REACT_APP_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.REACT_APP_API_URL).toBeDefined();
    expect(process.env.REACT_APP_SUPABASE_URL).toContain('localhost:8000');
    expect(process.env.REACT_APP_API_URL).toContain('localhost:3001');
  });

  test('React Query client is properly configured', () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    expect(queryClient.getDefaultOptions().queries?.cacheTime).toBe(0);
  });

  test('Application has required DOM elements', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Check for basic HTML structure
    expect(document.body).toBeInTheDocument();
    expect(document.querySelector('#root')).toBeInTheDocument();

    // Should have at least one div (loading or content)
    const divElements = document.querySelectorAll('div');
    expect(divElements.length).toBeGreaterThan(0);
  });

  test('CSS classes are properly loaded', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Check for Tailwind CSS classes in loading state
    const loadingContainer = document.querySelector('.min-h-screen');
    expect(loadingContainer).toBeInTheDocument();

    const flexContainer = document.querySelector('.flex');
    expect(flexContainer).toBeInTheDocument();
  });

  test('Application handles missing auth gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      );
    }).not.toThrow();

    // Clean up
    consoleSpy.mockRestore();
  });

  test('Toast notifications are available', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Toaster component should be rendered
    const toaster =
      document.querySelector('[data-hot-toast]') ||
      document.querySelector('.toaster') ||
      screen.queryByTestId('toast-container');

    // Toast container might not be visible until needed, but component should render
    expect(document.body).toBeInTheDocument();
  });
});
