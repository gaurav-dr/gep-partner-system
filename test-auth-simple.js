const axios = require('axios');

async function testAuth() {
  console.log('Testing authentication with DirectAuthService...\n');
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@gephellas.com',
      password: 'GEPAdmin2024!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Authentication successful!');
    console.log(`Token: ${response.data.token}`);
    console.log(`User: ${response.data.user.email} (${response.data.user.role})`);
    
  } catch (error) {
    console.log('❌ Authentication failed');
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.status) {
      console.log(`HTTP Status: ${error.response.status}`);
    }
  }
}

testAuth();