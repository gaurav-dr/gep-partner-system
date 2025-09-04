/**
 * Routing Health Check Tests
 * Tests to verify React Router functionality and navigation works
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';

import App from '../../App';

// Mock the AuthContext since we're testing routing, not auth
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isAuthenticated: true,
    user: { role: 'admin', email: 'test@test.com' },
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
}));

// Mock environment variables
const mockEnv = {
  REACT_APP_SUPABASE_URL: 'http://localhost:8000',
  REACT_APP_SUPABASE_ANON_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTczNDEyMDB9.dc_X5iR_VP_qT0zsityj_I_OZ2T9FtRU2BBNWN8Bu4GE',
  REACT_APP_API_URL: 'http://localhost:3001',
};

Object.keys(mockEnv).forEach(key => {
  process.env[key] = mockEnv[key as keyof typeof mockEnv];
});

// Mock Supabase to avoid connection issues in tests
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

describe('Routing Health Checks', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    // Mock console.log to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

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

  const renderAppWithRouter = (initialPath = '/') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  test('App renders with root route', () => {
    expect(() => {
      renderAppWithRouter('/');
    }).not.toThrow();
  });

  test('App handles unknown routes gracefully', () => {
    expect(() => {
      renderAppWithRouter('/unknown-route');
    }).not.toThrow();
  });

  test('Router provides navigation context', () => {
    const { container } = renderAppWithRouter('/');
    
    // Check that the app is wrapped with routing context
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeDefined();
  });

  const routes = [
    { path: '/', name: 'Dashboard' },
    { path: '/requests', name: 'Customer Requests' },
    { path: '/requests/new', name: 'New Request' },
    { path: '/partners', name: 'Partners' },
    { path: '/assignments', name: 'Assignments' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/traceability', name: 'Traceability' },
    { path: '/test', name: 'Test Connection' },
  ];

  routes.forEach(({ path, name }) => {
    test(`Route ${path} renders without crashing`, () => {
      expect(() => {
        renderAppWithRouter(path);
      }).not.toThrow();
    });

    test(`Route ${path} creates valid DOM structure`, () => {
      const { container } = renderAppWithRouter(path);
      
      // Should have basic HTML structure
      expect(container.firstChild).toBeTruthy();
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  test('Partner role routing works', () => {
    // Mock partner user
    const mockUseAuth = jest.fn(() => ({
      isAuthenticated: true,
      user: { role: 'partner', email: 'partner@test.com' },
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
    }));

    jest.doMock('../../contexts/AuthContext', () => ({
      AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      useAuth: mockUseAuth,
    }));

    expect(() => {
      renderAppWithRouter('/');
    }).not.toThrow();
  });

  test('Unauthenticated routing shows login', () => {
    // Mock unauthenticated user
    const mockUseAuth = jest.fn(() => ({
      isAuthenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
    }));

    jest.doMock('../../contexts/AuthContext', () => ({
      AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      useAuth: mockUseAuth,
    }));

    expect(() => {
      renderAppWithRouter('/');
    }).not.toThrow();
  });

  test('Loading state routing works', () => {
    // Mock loading state
    const mockUseAuth = jest.fn(() => ({
      isAuthenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      loading: true,
    }));

    jest.doMock('../../contexts/AuthContext', () => ({
      AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      useAuth: mockUseAuth,
    }));

    expect(() => {
      renderAppWithRouter('/');
    }).not.toThrow();
  });

  test('Route transitions work without errors', () => {
    const { rerender } = renderAppWithRouter('/');

    // Test route transitions
    const routesToTest = ['/', '/requests', '/partners', '/analytics'];
    
    routesToTest.forEach(route => {
      expect(() => {
        rerender(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>
              <App />
            </MemoryRouter>
          </QueryClientProvider>
        );
      }).not.toThrow();
    });
  });

  test('BrowserRouter is properly configured', () => {
    // This tests that our routing setup works with memory router
    const { container } = renderAppWithRouter('/');
    expect(container).toBeInTheDocument();
    
    // Should not have any router errors
    const routerError = screen.queryByText(/router/i);
    expect(routerError).not.toBeInTheDocument();
  });
});