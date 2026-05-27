// Test setup file - runs before all tests
const mongoose = require('mongoose');
const productCache = require('../services/cache.service');

// Mock environment variables for testing
process.env.IMAGEKIT_PUBLIC_KEY = 'test_public_key';
process.env.IMAGEKIT_PRIVATE_KEY = 'test_private_key';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test/';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-product-db';
process.env.JWT_SECRET = 'test_jwt_secret_key';

jest.mock('../Broker/broker', () => ({
  connect: jest.fn().mockResolvedValue(null),
  publishToQueue: jest.fn().mockResolvedValue(null),
  SubscribeToQueue: jest.fn().mockResolvedValue(null),
}));

// Increase timeout for database operations
jest.setTimeout(30000);

afterEach(async () => {
  await productCache.clear();
});

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});
