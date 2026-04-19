const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/Models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connect, closeDatabase, clearDatabase } = require('./setup');

describe('User Addresses Endpoints', () => {
  
  let authToken;
  let userId;
  
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create a test user
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
    
    userId = user._id;
    
    // Generate JWT token directly for testing
    authToken = jwt.sign({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  describe('GET /api/auth/users/me/addresses - List Addresses', () => {

    it('Should return empty addresses array for new user', async () => {
      const response = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.addresses).toBeInstanceOf(Array);
      expect(response.body.addresses.length).toBe(0);
    });

    it('Should return all saved addresses for user', async () => {
      // Add addresses manually
      const user = await userModel.findById(userId);
      user.addresses = [
        {
          addressLine: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '100001',
          phone: '9876543210',
          default: true
        },
        {
          addressLine: '456 Secondary Ave',
          city: 'Los Angeles',
          state: 'CA',
          pincode: '900001',
          phone: '9876543211',
          default: false
        }
      ];
      await user.save();

      const response = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.addresses.length).toBe(2);
      expect(response.body.addresses[0].default).toBe(true);
      expect(response.body.addresses[1].default).toBe(false);
    });

    it('Should mark default address in response', async () => {
      const user = await userModel.findById(userId);
      user.addresses = [
        {
          addressLine: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '100001',
          phone: '9876543210',
          default: true
        }
      ];
      await user.save();

      const response = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.addresses[0].default).toBe(true);
      expect(response.body.addresses[0].addressLine).toBe('123 Main St');
    });

    it('Should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/users/me/addresses')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return addresses with correct structure', async () => {
      const user = await userModel.findById(userId);
      user.addresses = [
        {
          addressLine: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '100001',
          phone: '9876543210',
          default: true
        }
      ];
      await user.save();

      const response = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const address = response.body.addresses[0];
      expect(address).toHaveProperty('addressLine');
      expect(address).toHaveProperty('city');
      expect(address).toHaveProperty('state');
      expect(address).toHaveProperty('pincode');
      expect(address).toHaveProperty('phone');
      expect(address).toHaveProperty('default');
    });
  });

  describe('POST /api/auth/users/me/addresses - Add Address', () => {

    it('Should add a valid address successfully', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Address added successfully');
      expect(response.body.address).toBeDefined();
      expect(response.body.address.addressLine).toBe('789 New Road');
    });

    it('Should mark first address as default', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        })
        .expect(201);

      expect(response.body.address.default).toBe(true);
    });

    it('Should not mark subsequent addresses as default', async () => {
      // Add first address
      await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        });

      // Add second address
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '456 Another St',
          city: 'Denver',
          state: 'CO',
          pincode: '802021',
          phone: '9876543213'
        })
        .expect(201);

      expect(response.body.address.default).toBe(false);
    });

    it('Should validate pincode format (6 digits)', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: 'INVALID',
          phone: '9876543212'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/pincode/i);
    });

    it('Should validate phone number format (10 digits)', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/phone/i);
    });

    it('Should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago'
          // Missing state, pincode, phone
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('Should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should return address with id after adding', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        })
        .expect(201);

      expect(response.body.address).toHaveProperty('_id');
      expect(response.body.address._id).toBeDefined();
    });

    it('Should validate phone with leading zero or special chars', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '+1-987-654-3212'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('Should accept valid phone with exactly 10 digits', async () => {
      const response = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543210'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.address.phone).toBe('9876543210');
    });
  });

  describe('DELETE /api/auth/users/me/addresses/:addressId - Remove Address', () => {

    it('Should delete an address successfully', async () => {
      // First add an address
      const addResponse = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        });

      const addressId = addResponse.body.address._id;

      // Now delete it
      const deleteResponse = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Address deleted successfully');
    });

    it('Should return 404 when address not found', async () => {
      const fakeAddressId = '507f1f77bcf86cd799439999';

      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('Should return 401 when user is not authenticated', async () => {
      const fakeAddressId = '507f1f77bcf86cd799439999';

      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('Should not delete other users addresses', async () => {
      // Create second user
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      const user2 = await userModel.create({
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: hashedPassword,
        fullName: {
          firstName: 'Test',
          lastName: 'User2'
        }
      });

      // Add address to first user
      const addResponse = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        });

      const addressId = addResponse.body.address._id;

      // Create token for second user
      const user2Token = jwt.sign({
        id: user2._id,
        username: user2.username,
        email: user2.email,
        role: user2.role
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Try to delete first user's address as second user
      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('Should remove address from user addresses array', async () => {
      // Add address
      const addResponse = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        });

      const addressId = addResponse.body.address._id;

      // Verify address exists
      let getResponse = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.addresses.length).toBe(1);

      // Delete address
      await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify address is deleted
      getResponse = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.addresses.length).toBe(0);
    });

    it('Should handle invalid address id format', async () => {
      const response = await request(app)
        .delete('/api/auth/users/me/addresses/invalidid123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('Should update default address when default is deleted', async () => {
      // Add two addresses
      const addr1 = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        });

      const addr2 = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '456 Another St',
          city: 'Denver',
          state: 'CO',
          pincode: '802021',
          phone: '9876543213'
        });

      const addressId1 = addr1.body.address._id;

      // Delete first (default) address
      await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify second address is now default
      const getResponse = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.addresses.length).toBe(1);
      expect(getResponse.body.addresses[0].default).toBe(true);
    });
  });

  describe('Address Endpoints - Integration Tests', () => {

    it('Should handle full address lifecycle', async () => {
      // 1. Add first address
      const addr1 = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '789 New Road',
          city: 'Chicago',
          state: 'IL',
          pincode: '606011',
          phone: '9876543212'
        })
        .expect(201);

      expect(addr1.body.address.default).toBe(true);

      // 2. Add second address
      const addr2 = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addressLine: '456 Another St',
          city: 'Denver',
          state: 'CO',
          pincode: '802021',
          phone: '9876543213'
        })
        .expect(201);

      expect(addr2.body.address.default).toBe(false);

      // 3. List addresses
      let getResponse = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.addresses.length).toBe(2);
      expect(getResponse.body.addresses[0].default).toBe(true);
      expect(getResponse.body.addresses[1].default).toBe(false);

      // 4. Delete first address
      await request(app)
        .delete(`/api/auth/users/me/addresses/${addr1.body.address._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 5. Verify only second address remains and is now default
      getResponse = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.addresses.length).toBe(1);
      expect(getResponse.body.addresses[0]._id.toString()).toBe(addr2.body.address._id.toString());
      expect(getResponse.body.addresses[0].default).toBe(true);
    });
  });
});
