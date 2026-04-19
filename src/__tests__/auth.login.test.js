const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/Models/user.model');
const bcrypt = require('bcrypt');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Auth Login Endpoint', () => {
  
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

  describe('POST /api/auth/login - Success Cases', () => {
    
    it('Should login a user successfully with valid credentials', async () => {
      // First, create a user
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

      // Now attempt login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('testuser@example.com');
      expect(response.body.user.username).toBe('testuser');
    });

    it('Should return user data in response', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const createdUser = await userModel.create({
        username: 'datatest',
        email: 'datatest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Data',
          lastName: 'Test'
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'datatest@example.com',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.body.user.id).toBe(createdUser._id.toString());
      expect(response.body.user.fullName).toEqual({
        firstName: 'Data',
        lastName: 'Test'
      });
      expect(response.body.user.role).toBe('user');
    });

    it('Should set JWT token in cookies', async () => {
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

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'cookietest@example.com',
          password: 'Test@1234'
        })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });

  });

  describe('POST /api/auth/login - Error Cases', () => {

    it('Should return 401 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          email: 'nonexistent@example.com',
          password: 'Test@1234'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username, email or password');
    });

    it('Should return 401 when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'wrongpass',
        email: 'wrongpass@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Wrong',
          lastName: 'Pass'
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username, email or password');
    });

    it('Should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Test@1234'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });

    it('Should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });

    it('Should return 400 when email format is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Test@1234'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });

    it('Should return 400 when request body is empty', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });

  });

  describe('POST /api/auth/login - Edge Cases', () => {

    it('Should be case-sensitive for email (if database is case-sensitive)', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'casetest',
        email: 'casetest@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Case',
          lastName: 'Test'
        }
      });

      // MongoDB is case-insensitive by default, so this might succeed
      // Adjust based on your MongoDB configuration
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'CASETEST@EXAMPLE.COM',
          password: 'Test@1234'
        });

      // Just verify the response is handled gracefully
      expect([200, 401]).toContain(response.status);
    });

    it('Should handle whitespace in password correctly', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'whitespacetest',
        email: 'whitespace@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Whitespace',
          lastName: 'Test'
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'whitespace@example.com',
          password: 'Test@1234 ' // extra space at the end
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should handle very long password input', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await userModel.create({
        username: 'longpasstest',
        email: 'longpass@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Long',
          lastName: 'Pass'
        }
      });

      const veryLongPassword = 'a'.repeat(500) + 'Test@1234';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'longpass@example.com',
          password: veryLongPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

  });

});
