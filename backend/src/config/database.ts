import { Pool, QueryResult as PgQueryResult } from 'pg';
import { Logger, QueryResult } from '../types';

// Direct PostgreSQL connection as a fallback when Supabase Kong is not available
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_postgres_password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Get logger instance
const logger: Logger = require('../utils/logger');

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Direct database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', { error: (error as Error).message });
    return false;
  }
};

// Execute query with error handling
export const query = async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  try {
    const client = await dbPool.connect();
    const result = await client.query<T>(text, params);
    client.release();
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    logger.error('Database query error:', { error: (error as Error).message });
    throw error;
  }
};

// Export the pool for advanced usage
export { dbPool };