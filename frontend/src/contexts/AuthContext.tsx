import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../config/supabase.ts';

interface User {
  email: string;
  role: 'admin' | 'manager' | 'partner';
  name?: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to determine user role based on email
  const getUserRole = (email: string): 'admin' | 'manager' | 'partner' => {
    if (email.includes('admin')) return 'admin';
    if (email.includes('partner')) return 'partner';
    return 'manager';
  };

  // Function to get user name from email
  const getUserName = (email: string): string => {
    return email
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    // Check for demo user session in localStorage first
    const demoUser = localStorage.getItem('gep_demo_user');
    if (demoUser) {
      try {
        const parsedUser = JSON.parse(demoUser);
        setUser(parsedUser);
        setLoading(false);
        return;
      } catch (error) {
        console.warn('Invalid demo user data in localStorage');
        localStorage.removeItem('gep_demo_user');
      }
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: getUserRole(session.user.email!),
          name: getUserName(session.user.email!),
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: getUserRole(session.user.email!),
          name: getUserName(session.user.email!),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check for demo accounts using environment variables
        const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';
        const demoCredentials = process.env.REACT_APP_DEMO_CREDENTIALS;

        if (isDemoMode && demoCredentials) {
          try {
            const demoAccounts = JSON.parse(demoCredentials);
            const demoAccount = demoAccounts.find(
              (acc: any) => acc.email === email && acc.password === password
            );

            if (demoAccount) {
              // Simulate successful auth for demo accounts
              const demoUser = {
                id: `demo-${Date.now()}`,
                email: email,
                role: getUserRole(email),
                name: getUserName(email),
              };
              setUser(demoUser);
              // Persist demo user session
              localStorage.setItem('gep_demo_user', JSON.stringify(demoUser));
              return { success: true };
            }
          } catch (parseError) {
            console.warn('Invalid demo credentials format in environment variable');
          }
        }

        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      // Additional fallback for network errors
      const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';
      const demoCredentials = process.env.REACT_APP_DEMO_CREDENTIALS;

      if (isDemoMode && demoCredentials) {
        try {
          const demoAccounts = JSON.parse(demoCredentials);
          const demoAccount = demoAccounts.find(
            (acc: any) => acc.email === email && acc.password === password
          );

          if (demoAccount) {
            // Simulate successful auth for demo accounts
            const demoUser = {
              id: `demo-${Date.now()}`,
              email: email,
              role: getUserRole(email),
              name: getUserName(email),
            };
            setUser(demoUser);
            // Persist demo user session
            localStorage.setItem('gep_demo_user', JSON.stringify(demoUser));
            return { success: true };
          }
        } catch (parseError) {
          console.warn('Invalid demo credentials format in environment variable');
        }
      }

      return { success: false, error: 'Authentication service unavailable.' };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    // Clear demo user session
    localStorage.removeItem('gep_demo_user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: user !== null,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
