const request = require('supertest');
const app = require('../../src/app');
const sellerModel = require('../../src/Models/seller.model');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Seller Register Endpoint', () => {
  
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register/seller - Success Cases', () => {
    
    it('Should register a new seller successfully', async () => {
      const sellerData = {
        username: 'testseller',
        email: 'seller@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Test',
          lastName: 'Seller'
        }
      };

      const response = await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Seller registered successfully');
      expect(response.body.seller).toBeDefined();
      expect(response.body.seller.username).toBe('testseller');
      expect(response.body.seller.email).toBe('seller@example.com');
      expect(response.body.seller.role).toBe('seller');
    });

    it('Should set role to "seller" by default', async () => {
      const sellerData = {
        username: 'roletest',
        email: 'roletest@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Role',
          lastName: 'Test'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(201);

      const seller = await sellerModel.findOne({ email: 'roletest@example.com' });
      expect(seller.role).toBe('seller');
    });

    it('Should hash the password before storing', async () => {
      const sellerData = {
        username: 'hashtest',
        email: 'hashtest@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Hash',
          lastName: 'Test'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(201);

      const seller = await sellerModel.findOne({ email: 'hashtest@example.com' }).select('+password');
      expect(seller).toBeDefined();
      expect(seller.password).not.toBe('Test@1234');
      expect(seller.password.length).toBeGreaterThan(10);
    });

    it('Should set token in cookies', async () => {
      const sellerData = {
        username: 'cookietest',
        email: 'cookietest@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Cookie',
          lastName: 'Test'
        }
      };

      const response = await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(201);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });
  });

  describe('POST /api/auth/register/seller - Validation Cases', () => {
    
    it('Should return 400 if username is missing', async () => {
      const sellerData = {
        email: 'nouser@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'No',
          lastName: 'User'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(400);
    });

    it('Should return 400 if email is missing', async () => {
      const sellerData = {
        username: 'noemail',
        password: 'Test@1234',
        fullName: {
          firstName: 'No',
          lastName: 'Email'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(400);
    });

    it('Should return 400 if password is missing', async () => {
      const sellerData = {
        username: 'nopass',
        email: 'nopass@example.com',
        fullName: {
          firstName: 'No',
          lastName: 'Pass'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(400);
    });
  });

  describe('POST /api/auth/register/seller - Duplicate Cases', () => {
    
    it('Should return 409 if seller email already exists', async () => {
      const sellerData = {
        username: 'seller1',
        email: 'duplicate@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Duplicate',
          lastName: 'Seller'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(201);

      const duplicateData = {
        username: 'seller2',
        email: 'duplicate@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Duplicate',
          lastName: 'Seller'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(duplicateData)
        .expect(409);
    });

    it('Should return 409 if seller username already exists', async () => {
      const sellerData = {
        username: 'uniqueseller',
        email: 'seller1@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Unique',
          lastName: 'Seller'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(sellerData)
        .expect(201);

      const duplicateData = {
        username: 'uniqueseller',
        email: 'seller2@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Unique',
          lastName: 'Seller'
        }
      };

      await request(app)
        .post('/api/auth/register/seller')
        .send(duplicateData)
        .expect(409);
    });
  });
});
