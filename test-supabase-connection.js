// Quick test script to check Supabase connection
require('dotenv').config({ path: './backend/.env' });

const { createClient } = require('@supabase/supabase-js');

console.log('Testing Supabase connection...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Query error:', error);
    } else {
      console.log('Query successful:', data);
    }
    
    console.log('\n2. Testing table existence...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (tablesError) {
      console.error('Tables query error:', tablesError);
    } else {
      console.log('Available tables:', tables?.map(t => t.table_name) || []);
    }
    
  } catch (err) {
    console.error('Connection test failed:', err.message);
  }
}

testConnection();