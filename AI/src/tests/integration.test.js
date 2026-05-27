// Example test file to verify all AI endpoints

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';
const AUTH_TOKEN = 'your_jwt_token_here'; // Replace with actual token

// Test utilities
const testEndpoint = async (name, method, endpoint, data, needsAuth = false) => {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Testing: ${name}`);
    console.log(`${'='.repeat(60)}`);

    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
    };

    if (needsAuth) {
      config.headers = {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      };
    }

    const response = await axios(config);
    console.log('✅ Success:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('\n🚀 Starting AI Service Tests\n');

  // Test 1: Search Intent
  await testEndpoint(
    'Search Intent',
    'POST',
    '/ai/search-intent',
    {
      query: 'show me shoes under 2000 for college',
    },
    true
  );

  // Test 2: Generate Description
  await testEndpoint(
    'Generate Description',
    'POST',
    '/ai/generate-description',
    {
      title: 'Nike Air Max Running Shoes',
      category: 'Footwear',
      basicDescription: 'Comfortable running shoes with air cushioning',
      price: 5999,
    }
  );

  // Test 3: Suggest Categories
  await testEndpoint(
    'Suggest Categories & Tags',
    'POST',
    '/ai/suggest-category-tags',
    {
      title: 'Sony Wireless Headphones',
      description:
        'Premium noise-cancelling wireless headphones with 30-hour battery life',
    }
  );

  // Test 4: Review Summary
  await testEndpoint(
    'Review Summary',
    'POST',
    '/ai/review-summary/507f1f77bcf86cd799439011', // Replace with actual product ID
    {},
    true
  );

  console.log('\n✅ All tests completed!\n');
};

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
