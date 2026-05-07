const request = require('supertest');
const app = require('../../src/app');
const sellerModel = require('../../src/Models/seller.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Seller Me Endpoint - GET /api/auth/me', () => {
  
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/auth/me - Seller Success Cases', () => {
    
    it('Should return current seller data with valid token', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const seller = await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      const token = jwt.sign({
        id: seller._id,
        username: seller.username,
        email: seller.email,
        role: seller.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.seller).toBeDefined();
      expect(response.body.seller.username).toBe('testseller');
      expect(response.body.seller.email).toBe('seller@example.com');
      expect(response.body.seller.role).toBe('seller');
    });

    it('Should not include addresses for seller', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const seller = await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      const token = jwt.sign({
        id: seller._id,
        username: seller.username,
        email: seller.email,
        role: seller.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.seller).toBeDefined();
      expect(response.body.seller.addresses).toBeUndefined();
    });

    it('Should include addresses for user (not seller)', async () => {
      const userModel = require('../../src/Models/user.model');
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user = await userModel.create({
        username: 'testuser',
        email: 'user@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'User'
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

      expect(response.body.user).toBeDefined();
      expect(response.body.user.addresses).toBeDefined();
    });
  });

  describe('GET /api/auth/me - Seller Authorization Cases', () => {
    
    it('Should return 401 without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('Should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);
    });

    it('Should return 401 with expired token', async () => {
      const seller = await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: await bcrypt.hash('Test@1234', 10),
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      // Create token with expiry in the past
      const expiredToken = jwt.sign({
        id: seller._id,
        username: seller.username,
        email: seller.email,
        role: seller.role
      }, process.env.JWT_SECRET, { expiresIn: '-1h' });

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Seller Cannot Access Address Endpoints', () => {
    
    it('Should return 403 when seller tries to get addresses', async () => {
      const seller = await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: await bcrypt.hash('Test@1234', 10),
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      const token = jwt.sign({
        id: seller._id,
        username: seller.username,
        email: seller.email,
        role: seller.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Sellers cannot access address endpoints');
    });

    it('Should return 403 when seller tries to add address', async () => {
      const seller = await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: await bcrypt.hash('Test@1234', 10),
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      const token = jwt.sign({
        id: seller._id,
        username: seller.username,
        email: seller.email,
        role: seller.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressLine: '123 Main St',
          city: 'City',
          state: 'State',
          pincode: '123456',
          phone: '1234567890'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Sellers cannot access address endpoints');
    });
  });

  describe('Seller Logout', () => {
    
    it('Should logout seller successfully', async () => {
      const seller = await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: await bcrypt.hash('Test@1234', 10),
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      const token = jwt.sign({
        id: seller._id,
        username: seller.username,
        email: seller.email,
        role: seller.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
