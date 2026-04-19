const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/Models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('Debug Address Routes', () => {
  
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('Should test POST address route with real user', async () => {
    // Create a real user
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

    // Create token
    const token = jwt.sign({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('Token:', token);
    console.log('User ID:', user._id);

    // Make POST request
    const response = await request(app)
      .post('/api/auth/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        addressLine: '789 New Road',
        city: 'Chicago',
        state: 'IL',
        pincode: '606011',
        phone: '9876543212'
      });

    console.log('POST Response status:', response.status);
    console.log('POST Response body:', response.body);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
