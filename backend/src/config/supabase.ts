import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../types';

const logger: Logger = require('../utils/logger');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  logger.error('Missing Supabase configuration in environment variables');
  process.exit(1);
}

// Client for authenticated operations
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

// Service role client for admin operations
const supabaseAdmin: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test connection
const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('Supabase connection test failed:', { error: error.message });
      return false;
    }
    
    logger.info('Supabase connection established successfully');
    return true;
  } catch (err) {
    logger.error('Supabase connection error:', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
};

export {
  supabase,
  supabaseAdmin,
  testConnection
};