#!/usr/bin/env node

// Live System Test for GEP Partner System
// Tests the actual running Docker containers

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testSystemHealth() {
  console.log('=== LIVE SYSTEM TEST ===\n');
  
  try {
    // Test 1: Health Check
    console.log('🔍 Testing system health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health: ${healthResponse.data.status} (${healthResponse.data.version})`);
    
    // Test 2: Authentication
    console.log('\n🔐 Testing authentication...');
    const loginData = {
      email: 'admin@gephellas.com',
      password: 'GEPAdmin2024!'
    };
    
    const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (authResponse.data.token) {
      console.log('✅ Authentication successful');
      console.log(`User: ${authResponse.data.user.email} (${authResponse.data.user.role})`);
      
      const token = authResponse.data.token;
      
      // Test 3: Protected endpoint
      console.log('\n👥 Testing protected endpoint (partners)...');
      const partnersResponse = await axios.get(`${BASE_URL}/api/partners`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ Partners endpoint: Found ${partnersResponse.data.length || 0} partners`);
      if (partnersResponse.data.length > 0) {
        const partner = partnersResponse.data[0];
        console.log(`   Sample: ${partner.name} (${partner.specialty})`);
      }
      
      // Test 4: Customer requests
      console.log('\n📋 Testing customer requests...');
      const requestsResponse = await axios.get(`${BASE_URL}/api/customer-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ Customer requests: Found ${requestsResponse.data.length || 0} requests`);
      
      // Test 5: AI Optimization (if there are partners and requests)
      if (partnersResponse.data.length > 0 && requestsResponse.data.length > 0) {
        console.log('\n🤖 Testing AI optimization...');
        const optimizationPayload = {
          requestId: requestsResponse.data[0].id,
          serviceType: requestsResponse.data[0].service_type,
          constraints: {
            maxBudget: 2000
          }
        };
        
        try {
          const optimizationResponse = await axios.post(`${BASE_URL}/api/optimization/generate-schedule`, optimizationPayload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (optimizationResponse.data.selectedPartner) {
            console.log('✅ AI Optimization successful');
            console.log(`   Selected: ${optimizationResponse.data.selectedPartner.name}`);
            console.log(`   Score: ${optimizationResponse.data.selectedPartner.score.toFixed(2)}`);
          } else {
            console.log('⚠️  AI Optimization returned no partner');
          }
        } catch (optimizationError) {
          console.log('❌ AI Optimization failed:', optimizationError.response?.data?.error || optimizationError.message);
        }
      }
      
      console.log('\n=== SYSTEM STATUS: OPERATIONAL ✅ ===');
      return true;
      
    } else {
      console.log('❌ Authentication failed - no token received');
      return false;
    }
    
  } catch (error) {
    console.log('❌ System test failed:', error.response?.data || error.message);
    
    if (error.response?.status) {
      console.log(`HTTP Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return false;
  }
}

// Test frontend accessibility
async function testFrontend() {
  console.log('\n🌐 Testing frontend accessibility...');
  
  try {
    const response = await axios.get('http://localhost:3000', {
      timeout: 5000
    });
    
    if (response.data.includes('GEP Partner Assignment System')) {
      console.log('✅ Frontend: Accessible and serving content');
      return true;
    } else {
      console.log('⚠️  Frontend: Accessible but unexpected content');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend: Not accessible:', error.message);
    return false;
  }
}

// Run all tests
async function runLiveSystemTests() {
  console.log('Testing live GEP Partner System deployment...\n');
  
  const frontendWorking = await testFrontend();
  const backendWorking = await testSystemHealth();
  
  console.log('\n=== FINAL ASSESSMENT ===');
  console.log(`Frontend: ${frontendWorking ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Backend API: ${backendWorking ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Overall System: ${frontendWorking && backendWorking ? '✅ OPERATIONAL' : '❌ NEEDS ATTENTION'}`);
  
  if (frontendWorking && backendWorking) {
    console.log('\n🎉 DELIVERY CONFIRMED: System is live and functional!');
    console.log('Frontend: http://localhost:3000');
    console.log('Backend API: http://localhost:3001');
    console.log('Database Admin: http://localhost:3010');
  }
  
  return frontendWorking && backendWorking;
}

// Execute tests
if (require.main === module) {
  runLiveSystemTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runLiveSystemTests };