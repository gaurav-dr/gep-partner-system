#!/usr/bin/env node

// Create test users for GEP Partner System
// Directly connects to the running Docker PostgreSQL database

const { Client } = require('pg');
const crypto = require('crypto');

// Hash password using the same method as AuthService
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres', 
  password: 'your_postgres_password'
};

async function createTestUsers() {
  console.log('🔧 Creating test users and demo data...\n');
  
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist. Please ensure Supabase migrations have run.');
      return false;
    }
    
    // Create admin user
    console.log('👤 Creating admin user...');
    await client.query(`
      INSERT INTO users (
        id, email, first_name, last_name, role, 
        password_hash, is_active, email_verified, created_at
      ) VALUES (
        gen_random_uuid(),
        'admin@gephellas.com',
        'Admin', 
        'User',
        'admin',
        $1,
        true,
        true,
        NOW()
      ) ON CONFLICT (email) DO UPDATE SET password_hash = $1;
    `, [hashPassword('GEPAdmin2024!')]);
    
    // Create manager user
    console.log('👤 Creating manager user...');
    await client.query(`
      INSERT INTO users (
        id, email, first_name, last_name, role,
        password_hash, is_active, email_verified, created_at
      ) VALUES (
        gen_random_uuid(),
        'manager@gephellas.com',
        'Manager',
        'User', 
        'manager',
        $1,
        true,
        true,
        NOW()
      ) ON CONFLICT (email) DO UPDATE SET password_hash = $1;
    `, [hashPassword('Manager2024!')]);
    
    // Check if partners table exists and create sample partners
    const partnersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'partners'
      );
    `);
    
    if (partnersCheck.rows[0].exists) {
      console.log('👥 Creating sample partners...');
      
      await client.query(`
        INSERT INTO partners (
          id, name, specialty, city, hourly_rate, 
          is_active, max_hours_per_week, email, created_at
        ) VALUES 
        (
          'DOC001', 'Dr. Maria Danezis', 'Occupational Doctor', 
          'Athens', 75.00, true, 35, 
          'maria.danezis@gephellas.com', NOW()
        ),
        (
          'ENG001', 'Kostas Papadopoulos', 'Safety Engineer',
          'Thessaloniki', 65.00, true, 40,
          'kostas.papadopoulos@gephellas.com', NOW()
        ),
        (
          'DOC002', 'Dr. Nikos Georgiadis', 'Occupational Doctor',
          'Athens', 90.00, true, 30,
          'nikos.georgiadis@gephellas.com', NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }
    
    // Check if customer_requests table exists
    const requestsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_requests'
      );
    `);
    
    if (requestsCheck.rows[0].exists) {
      console.log('📋 Creating sample customer requests...');
      
      await client.query(`
        INSERT INTO customer_requests (
          client_name, service_type, installation_address,
          employee_count, start_date, end_date, status, created_at
        ) VALUES 
        (
          'ACME Manufacturing Ltd', 'occupational_doctor', 
          '123 Industrial Ave, Athens, Greece',
          25, '2025-09-10', '2025-09-10', 'pending', NOW()
        ),
        (
          'Greek Steel Works', 'safety_engineer',
          '456 Factory St, Thessaloniki, Greece', 
          50, '2025-09-12', '2025-09-12', 'pending', NOW()
        )
        ON CONFLICT DO NOTHING;
      `);
    }
    
    // Create partner users
    console.log('👥 Creating partner user accounts...');
    const partnerPassword = hashPassword('Partner2024!');
    await client.query(`
      INSERT INTO users (
        id, email, first_name, last_name, role,
        partner_id, password_hash, is_active, email_verified, created_at
      ) VALUES 
      (
        gen_random_uuid(), 'maria.danezis@gephellas.com',
        'Maria', 'Danezis', 'partner', 'DOC001',
        $1, true, true, NOW()
      ),
      (
        gen_random_uuid(), 'kostas.papadopoulos@gephellas.com',
        'Kostas', 'Papadopoulos', 'partner', 'ENG001', 
        $1, true, true, NOW()
      )
      ON CONFLICT (email) DO UPDATE SET password_hash = $1;
    `, [partnerPassword]);
    
    console.log('\n✅ Demo data created successfully!');
    console.log('\nTest Accounts:');
    console.log('Admin: admin@gephellas.com / GEPAdmin2024!');
    console.log('Manager: manager@gephellas.com / Manager2024!');
    console.log('Partner: maria.danezis@gephellas.com / Partner2024!');
    
    // Verify data
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`\nCreated ${userCount.rows[0].count} users total`);
    
    if (partnersCheck.rows[0].exists) {
      const partnerCount = await client.query('SELECT COUNT(*) FROM partners');
      console.log(`Created ${partnerCount.rows[0].count} partners`);
    }
    
    if (requestsCheck.rows[0].exists) {
      const requestCount = await client.query('SELECT COUNT(*) FROM customer_requests');
      console.log(`Created ${requestCount.rows[0].count} customer requests`);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error creating demo data:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Try using the correct Supabase database password');
      console.log('Check docker-compose.yml or .env file for POSTGRES_PASSWORD');
    }
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 Database tables may not exist. Run Supabase migrations first:');
      console.log('cd supabase && supabase db push');
    }
    
    return false;
    
  } finally {
    await client.end();
  }
}

// Execute
if (require.main === module) {
  createTestUsers().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}

module.exports = { createTestUsers };