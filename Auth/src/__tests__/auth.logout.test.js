const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/Models/user.model');
const bcrypt = require('bcrypt');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Auth Logout Endpoint', () => {
  
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

  describe('GET /api/auth/logout - Success Cases', () => {
    
    it('Should logout a user successfully with valid token', async () => {
      // First, create and login a user to get token
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'testuser',
        email: 'testuser@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'User'
        }
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Test@1234'
        });

      // Get token from cookies
      const token = loginResponse.headers['set-cookie'];
      expect(token).toBeDefined();

      // Now logout
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('Should clear JWT token from cookies on logout', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'cookietest',
        email: 'cookietest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Cookie',
          lastName: 'Test'
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'cookietest@example.com',
          password: 'Test@1234'
        });

      const token = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', token)
        .expect(200);

      // Check that token cookie is cleared
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toMatch(/token=;/);
    });

    it('Should return success response with correct structure', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'structuretest',
        email: 'structuretest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Structure',
          lastName: 'Test'
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'structuretest@example.com',
          password: 'Test@1234'
        });

      const token = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', token)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('GET /api/auth/logout - Error Cases', () => {

    it('Should return 401 error when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('Should return 401 error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', 'token=invalidtoken123')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('Should return 401 error with malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', 'token=invalid.token.format')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return 401 error when token is expired', async () => {
      // Create a user
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'expiredtest',
        email: 'expiredtest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Expired',
          lastName: 'Test'
        }
      });

      // Create a token with very short expiration
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign({
        id: 'testid',
        username: 'expiredtest',
        email: 'expiredtest@example.com',
        role: 'user'
      }, process.env.JWT_SECRET, { expiresIn: '-1s' });

      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/logout - Multiple Logouts', () => {

    it('Should handle multiple logout attempts from same user', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'multilogout',
        email: 'multilogout@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Multi',
          lastName: 'Logout'
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'multilogout@example.com',
          password: 'Test@1234'
        });

      const token = loginResponse.headers['set-cookie'];

      // First logout
      const firstLogout = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', token)
        .expect(200);

      expect(firstLogout.body.success).toBe(true);

      // Attempt second logout with cleared token
      const secondLogout = await request(app)
        .get('/api/auth/logout')
        .expect(401);

      expect(secondLogout.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/logout - Different Users', () => {

    it('Should logout different users independently', async () => {
      // Create two users
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'user1',
        email: 'user1@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'User',
          lastName: 'One'
        }
      });

      await userModel.create({
        username: 'user2',
        email: 'user2@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'User',
          lastName: 'Two'
        }
      });

      // Login both users
      const user1Login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'Test@1234'
        });

      const user2Login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'Test@1234'
        });

      const token1 = user1Login.headers['set-cookie'];
      const token2 = user2Login.headers['set-cookie'];

      // Logout user1
      const user1Logout = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', token1)
        .expect(200);

      expect(user1Logout.body.success).toBe(true);

      // Logout user2
      const user2Logout = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', token2)
        .expect(200);

      expect(user2Logout.body.success).toBe(true);
    });
  });
});
