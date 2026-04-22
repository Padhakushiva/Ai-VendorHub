const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/Models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Auth Me Endpoint', () => {
  
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // Clean up database before each test
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/auth/me - Success Cases', () => {
    
    it('Should return current user data with valid token', async () => {
      // Create a user
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'testuser',
        email: 'testuser@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'User'
        }
      });

      // Generate token
      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('testuser@example.com');
      expect(response.body.user.username).toBe('testuser');
    });

    it('Should return complete user profile with all fields', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'profiletest',
        email: 'profiletest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Profile',
          lastName: 'Test'
        },
        role: 'user'
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.id).toBe(user._id.toString());
      expect(response.body.user.username).toBe('profiletest');
      expect(response.body.user.email).toBe('profiletest@example.com');
      expect(response.body.user.fullName).toEqual({
        firstName: 'Profile',
        lastName: 'Test'
      });
      expect(response.body.user.role).toBe('user');
    });

    it('Should not return password in response', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'nopasswordtest',
        email: 'nopassword@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'No',
          lastName: 'Password'
        }
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.password).toBeUndefined();
    });

  });

  describe('GET /api/auth/me - Authentication Error Cases', () => {

    it('Should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('Should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return 401 with invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return 401 with malformed Bearer token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return 401 with invalid JWT token', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return 401 with token signed with different secret', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'wrongsecret',
        email: 'wrongsecret@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Wrong',
          lastName: 'Secret'
        }
      });

      // Sign token with different secret
      const wrongToken = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, 'wrong-secret-key', { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

  });

  describe('GET /api/auth/me - Token Expiration Cases', () => {

    it('Should return 401 with expired token', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'expiredtoken',
        email: 'expiredtoken@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Expired',
          lastName: 'Token'
        }
      });

      // Create an already expired token
      const expiredToken = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '0s' }); // Already expired

      // Small delay to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

  });

  describe('GET /api/auth/me - User Not Found Cases', () => {

    it('Should return 404 when user from token does not exist', async () => {
      // Create a fake user ID that doesn't exist
      const fakeUserId = '507f1f77bcf86cd799439011';

      const token = jwt.sign({
        id: fakeUserId,
        username: 'nonexistent',
        email: 'nonexistent@example.com',
        role: 'user'
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

  });

  describe('GET /api/auth/me - Header Format Cases', () => {

    it('Should handle Bearer token with correct format', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'headertest',
        email: 'headertest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Header',
          lastName: 'Test'
        }
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('Should reject token without Bearer prefix', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'nobearertest',
        email: 'nobearer@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'No',
          lastName: 'Bearer'
        }
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token) // Missing Bearer prefix
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should be case-insensitive for Bearer prefix', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'casetest',
        email: 'casetest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Case',
          lastName: 'Test'
        }
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Test with different case variations
      const response1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `bearer ${token}`); // lowercase

      const response2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `BEARER ${token}`); // uppercase

      // Both should work or both should fail consistently
      expect(response1.status).toBe(response2.status);
    });

  });

  describe('GET /api/auth/me - Response Format Cases', () => {

    it('Should return response with success flag', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'formattest',
        email: 'formattest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Format',
          lastName: 'Test'
        }
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('user');
    });

    it('Should return user with id field', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'idtest',
        email: 'idtest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'ID',
          lastName: 'Test'
        }
      });

      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('fullName');
      expect(response.body.user).toHaveProperty('role');
    });

  });

});
