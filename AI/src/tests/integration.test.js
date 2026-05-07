/**
 * AI Service Integration Tests
 *
 * Tests all AI endpoints including health, metrics, and feature flags.
 *
 * Usage:
 *   node src/tests/integration.test.js
 *
 * Requires AI service running on port 3005.
 * For authenticated endpoints, set AUTH_TOKEN env var or update the token below.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your_jwt_token_here';

let passCount = 0;
let failCount = 0;

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
      timeout: 10000,
    };

    if (needsAuth) {
      config.headers = {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      };
    }

    const response = await axios(config);
    console.log('✅ Success:', JSON.stringify(response.data, null, 2).substring(0, 500));

    // Validate response structure
    if (response.data.success !== undefined && !response.data.success) {
      console.warn('⚠️ Response indicates failure');
      failCount++;
    } else {
      passCount++;
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    failCount++;
  }
};

// Run all tests
const runTests = async () => {
  console.log('\n🚀 Starting AI Service Integration Tests\n');

  // Test 0: Health Check
  await testEndpoint(
    'Health Check',
    'GET',
    '/health',
    null
  );

  // Test 0b: Root endpoint
  await testEndpoint(
    'Root Info',
    'GET',
    '/',
    null
  );

  // Test 0c: Metrics
  await testEndpoint(
    'LLM Metrics',
    'GET',
    '/ai/metrics',
    null
  );

  // Test 1: Search Intent
  await testEndpoint(
    'Search Intent - Shoes under 2000',
    'POST',
    '/ai/search-intent',
    {
      query: 'show me shoes under 2000 for college',
    },
    true
  );

  // Test 1b: Search Intent - Phone query
  await testEndpoint(
    'Search Intent - iPhone',
    'POST',
    '/ai/search-intent',
    {
      query: 'iphone under 50000',
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
    '/ai/review-summary/507f1f77bcf86cd799439011',
    {},
    true
  );

  // Test 5: Feature Flags Toggle
  await testEndpoint(
    'Feature Flags - Get State',
    'GET',
    '/health',
    null
  );

  // Test 6: Metrics after calls
  const metricsResult = await testEndpoint(
    'Metrics After Tests',
    'GET',
    '/ai/metrics',
    null
  );

  if (metricsResult?.metrics) {
    console.log('\n📊 LLM Metrics Summary:');
    console.log(`   Total Calls: ${metricsResult.metrics.global.totalCalls}`);
    console.log(`   Successes: ${metricsResult.metrics.global.totalSuccesses}`);
    console.log(`   Failures: ${metricsResult.metrics.global.totalFailures}`);
    console.log(`   Success Rate: ${metricsResult.metrics.global.successRate}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Test Results: ${passCount} passed, ${failCount} failed`);
  console.log(`${'='.repeat(60)}\n`);

  if (failCount > 0) {
    console.log('⚠️ Some tests failed. Check logs above for details.');
  } else {
    console.log('✅ All tests passed!');
  }
};

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
