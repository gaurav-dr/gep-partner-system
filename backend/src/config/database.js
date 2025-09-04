const { Pool } = require('pg');
const logger = require('../utils/logger');

// Direct PostgreSQL connection as a fallback when Supabase Kong is not available
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_postgres_password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Direct database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const query = async (text, params) => {
  try {
    const client = await dbPool.connect();
    const result = await client.query(text, params);
    client.release();
    return result;
  } catch (error) {
    logger.error('Database query error:', error.message);
    throw error;
  }
};

module.exports = {
  dbPool,
  query,
  testDatabaseConnection
};