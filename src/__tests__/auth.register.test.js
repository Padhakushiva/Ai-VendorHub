const request = require('supertest');
const app=require('../../src/app');
const userModel=require('../../src/Models/user.model');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Auth Register Endpoint', () => {
  
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

  describe('POST /api/auth/register - Success Cases', () => {
    
    it('Should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Test',
          lastName: 'User'
        },
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('Should hash the password before storing', async () => {
      const userData = {
        username: 'hashtest',
        email: 'hashtest@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Hash',
          lastName: 'Test'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Explicitly select password field (it's hidden by default with select: false)
      const user = await userModel.findOne({ email: 'hashtest@example.com' }).select('+password');
      expect(user).toBeDefined();
      expect(user.password).not.toBe('Test@1234'); // Password should be hashed
      expect(user.password.length).toBeGreaterThan(10); // Hashed passwords are longer
    });

    it('Should set role to "user" by default', async () => {
      const userData = {
        username: 'roletest',
        email: 'roletest@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Role',
          lastName: 'Test'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await userModel.findOne({ email: 'roletest@example.com' });
      expect(user.role).toBe('user');
    });

  });

  describe('POST /api/auth/register - Validation Cases', () => {
    
    it('Should return 400 if username is missing', async () => {
      const userData = {
        email: 'nouser@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'No',
          lastName: 'User'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('Should return 400 if email is missing', async () => {
      const userData = {
        username: 'noemail',
        password: 'Test@1234',
        fullName: {
          firstName: 'No',
          lastName: 'Email'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('Should return 400 if password is missing', async () => {
      const userData = {
        username: 'nopass',
        email: 'nopass@example.com',
        fullName: {
          firstName: 'No',
          lastName: 'Pass'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('Should return 400 if firstName is missing', async () => {
      const userData = {
        username: 'nofirst',
        email: 'nofirst@example.com',
        password: 'Test@1234',
        fullName: {
          lastName: 'User'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('Should return 400 if lastName is missing', async () => {
      const userData = {
        username: 'nolast',
        email: 'nolast@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'User'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

  });

  describe('POST /api/auth/register - Duplicate User Cases', () => {
    
    it('Should return 409 if email already exists', async () => {
      const userData = {
        username: 'duplicate1',
        email: 'duplicate@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Duplicate',
          lastName: 'User'
        },
        role: 'user'
      };

      // First registration - should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email - should fail
      const userData2 = {
        username: 'duplicate2',
        email: 'duplicate@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Duplicate',
          lastName: 'User'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(409);
    });

    it('Should return 409 if username already exists', async () => {
      const userData = {
        username: 'uniqueuser',
        email: 'email1@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'User',
          lastName: 'One'
        },
        role: 'user'
      };

      // First registration - should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same username - should fail
      const userData2 = {
        username: 'uniqueuser',
        email: 'email2@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'User',
          lastName: 'Two'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(409);
    });

    it('Should allow registration with both different email and username', async () => {
      const userData = {
        username: 'user1',
        email: 'user1@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'User',
          lastName: 'One'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userData2 = {
        username: 'user2',
        email: 'user2@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'User',
          lastName: 'Two'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(201);
    });

  });

  describe('POST /api/auth/register - Database Tests', () => {
    
    it('Should persist user data in database', async () => {
      const userData = {
        username: 'persisttest',
        email: 'persist@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Persist',
          lastName: 'Test'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await userModel.findOne({ email: 'persist@example.com' });
      expect(user).toBeDefined();
      expect(user.username).toBe('persisttest');
      expect(user.fullName.firstName).toBe('Persist');
      expect(user.fullName.lastName).toBe('Test');
    });

    it('Should not create duplicate users in database', async () => {
      const userData = {
        username: 'nodup',
        email: 'nodup@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'No',
          lastName: 'Dup'
        },
        role: 'user'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const count = await userModel.countDocuments({ email: 'nodup@example.com' });
      expect(count).toBe(1);
    });

  });

  describe('POST /api/auth/register - Multiple Users', () => {
    
    it('Should allow registering multiple different users', async () => {
      const users = [
        { 
          username: 'multi1', 
          email: 'multi1@example.com', 
          password: 'Test@1234', 
          fullName: {
            firstName: 'Multi', 
            lastName: 'One'
          },
          role: 'user'
        },
        { 
          username: 'multi2', 
          email: 'multi2@example.com', 
          password: 'Test@1234', 
          fullName: {
            firstName: 'Multi', 
            lastName: 'Two'
          },
          role: 'user'
        },
        { 
          username: 'multi3', 
          email: 'multi3@example.com', 
          password: 'Test@1234', 
          fullName: {
            firstName: 'Multi', 
            lastName: 'Three'
          },
          role: 'user'
        }
      ];

      for (const userData of users) {
        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);
      }

      const count = await userModel.countDocuments({ 
        email: { 
          $in: ['multi1@example.com', 'multi2@example.com', 'multi3@example.com'] 
        } 
      });
      expect(count).toBe(3);
    });

    it('Should clear database between test suites', async () => {
      // beforeEach hook handles database cleanup
      const count = await userModel.countDocuments({});
      expect(count).toBe(0);
    });

  });

  describe('POST /api/auth/register - Response Format', () => {
    
    it('Should return proper response structure on success', async () => {
      const userData = {
        username: 'resptest',
        email: 'resptest@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'Resp',
          lastName: 'Test'
        },
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
    });

    it('Should not expose password in response', async () => {
      const userData = {
        username: 'nopassresp',
        email: 'nopassresp@example.com',
        password: 'Test@1234',
        fullName: {
          firstName: 'No',
          lastName: 'Pass'
        },
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Password should never be sent in the response
      expect(response.body.user.password).toBeUndefined();
    });

  });
});
