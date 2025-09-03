import { createClient } from '@supabase/supabase-js';

// Get environment variables - required, no defaults
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    'Missing REACT_APP_SUPABASE_URL environment variable. ' +
    'Please set it in your .env file or Docker environment.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing REACT_APP_SUPABASE_ANON_KEY environment variable. ' +
    'Please set it in your .env file or Docker environment.'
  );
}

// Helper function to decode JWT payload
function decodeJWTPayload(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

// Validate the JWT token structure
const payload = decodeJWTPayload(supabaseAnonKey);
if (!payload || !payload.role) {
  throw new Error('Invalid REACT_APP_SUPABASE_ANON_KEY format. Must be a valid JWT token.');
}

// Log configuration (safe to log in development)
console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 JWT Role:', payload.role);
console.log('🔑 JWT Issuer:', payload.iss);
console.log('✅ Supabase configuration loaded successfully');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export default supabase;