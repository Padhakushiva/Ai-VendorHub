const request = require('supertest');
const app=require('../../src/app');
const userModel=require('../../src/Models/user.model');
const { connect, closeDatabase, clearDatabase } = require('./setup');

// Helper to create test user data with address
const createUserData = (overrides = {}) => {
  return {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test@1234',
    fullName: {
      firstName: 'Test',
      lastName: 'User'
    },
    address: {
      addressLine: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      phone: '1234567890'
    },
    role: 'user',
    ...overrides
  };
};

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
      const userData = createUserData({
        username: 'testuser',
        email: 'testuser@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('Should hash the password before storing', async () => {
      const userData = createUserData({
        username: 'hashtest',
        email: 'hashtest@example.com'
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await userModel.findOne({ email: 'hashtest@example.com' }).select('+password');
      expect(user).toBeDefined();
      expect(user.password).not.toBe('Test@1234');
      expect(user.password.length).toBeGreaterThan(10);
    });

    it('Should set role to "user" by default', async () => {
      const userData = createUserData({
        username: 'roletest',
        email: 'roletest@example.com'
      });
      delete userData.role;

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
      const userData = createUserData({ email: 'nouser@example.com' });
      delete userData.username;

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('Should return 400 if email is missing', async () => {
      const userData = createUserData({ username: 'noemail' });
      delete userData.email;

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('Should return 400 if password is missing', async () => {
      const userData = createUserData({ username: 'nopass', email: 'nopass@example.com' });
      delete userData.password;

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

  });

  describe('POST /api/auth/register - Duplicate Cases', () => {
    
    it('Should return 409 if email already exists', async () => {
      const userData = createUserData({
        username: 'duplicate1',
        email: 'duplicate@example.com'
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userData2 = createUserData({
        username: 'duplicate2',
        email: 'duplicate@example.com'
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(409);
    });

    it('Should return 409 if username already exists', async () => {
      const userData = createUserData({
        username: 'uniqueuser',
        email: 'email1@example.com'
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userData2 = createUserData({
        username: 'uniqueuser',
        email: 'email2@example.com'
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(409);
    });

  });
});
