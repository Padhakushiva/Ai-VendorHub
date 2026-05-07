const request = require('supertest');
const app = require('../../src/app');
const sellerModel = require('../../src/Models/seller.model');
const bcrypt = require('bcrypt');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Seller Login Endpoint', () => {
  
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/login/seller - Success Cases', () => {
    
    it('Should login a seller successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await sellerModel.create({
        username: 'testseller',
        email: 'seller@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      });

      const response = await request(app)
        .post('/api/auth/login/seller')
        .send({
          email: 'seller@example.com',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.seller).toBeDefined();
      expect(response.body.seller.email).toBe('seller@example.com');
      expect(response.body.seller.username).toBe('testseller');
      expect(response.body.seller.role).toBe('seller');
    });

    it('Should return seller data in response', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const createdSeller = await sellerModel.create({
        username: 'datatest',
        email: 'datatest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Data',
          lastName: 'Test'
        }
      });

      const response = await request(app)
        .post('/api/auth/login/seller')
        .send({
          email: 'datatest@example.com',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.body.seller.id).toBe(createdSeller._id.toString());
      expect(response.body.seller.fullName).toEqual({
        firstName: 'Data',
        lastName: 'Test'
      });
      expect(response.body.seller.role).toBe('seller');
    });

    it('Should set JWT token in cookies', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await sellerModel.create({
        username: 'cookietest',
        email: 'cookietest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Cookie',
          lastName: 'Test'
        }
      });

      const response = await request(app)
        .post('/api/auth/login/seller')
        .send({
          email: 'cookietest@example.com',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });

    it('Should allow login with username instead of email', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await sellerModel.create({
        username: 'usernameseller',
        email: 'username@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Username',
          lastName: 'Test'
        }
      });

      const response = await request(app)
        .post('/api/auth/login/seller')
        .send({
          username: 'usernameseller',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.seller.username).toBe('usernameseller');
    });
  });

  describe('POST /api/auth/login/seller - Failure Cases', () => {
    
    it('Should return 401 for non-existent seller', async () => {
      await request(app)
        .post('/api/auth/login/seller')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test@1234'
        })
        .expect(401);
    });

    it('Should return 401 for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await sellerModel.create({
        username: 'wrongpass',
        email: 'wrongpass@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Wrong',
          lastName: 'Pass'
        }
      });

      const response = await request(app)
        .post('/api/auth/login/seller')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('Should return 400 if email and username both missing', async () => {
      await request(app)
        .post('/api/auth/login/seller')
        .send({
          password: 'Test@1234'
        })
        .expect(400);
    });

    it('Should return 400 if password is missing', async () => {
      await request(app)
        .post('/api/auth/login/seller')
        .send({
          email: 'test@example.com'
        })
        .expect(400);
    });
  });
});
