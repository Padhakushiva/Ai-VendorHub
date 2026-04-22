// Test setup file - runs before all tests
const mongoose = require('mongoose');

// Mock environment variables for testing
process.env.IMAGEKIT_PUBLIC_KEY = 'test_public_key';
process.env.IMAGEKIT_PRIVATE_KEY = 'test_private_key';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test/';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-product-db';
process.env.JWT_SECRET = 'test_jwt_secret_key';

// Increase timeout for database operations
jest.setTimeout(30000);

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});
