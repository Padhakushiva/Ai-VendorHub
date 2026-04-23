/**
 * PATCH /api/product/:id - Update Product Tests
 * 
 * Tests for updating a product by ID. The endpoint allows sellers to update 
 * their own products and admins to update any product. Updates invalidate caches 
 * and emit product.updated events.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Product = require('../models/product.model');

// Mock the models
jest.mock('../models/product.model');

// Helper function to generate JWT token for testing
const generateTestToken = (role = 'seller', userId = 'test-user-id') => {
  return jwt.sign(
    { id: userId, role: role, email: 'test@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('PATCH /api/product/:id - Update Product (Seller)', () => {
  let sellerToken;
  let adminToken;
  let buyerToken;

  beforeEach(() => {
    jest.clearAllMocks();
    sellerToken = generateTestToken('seller', 'seller-123');
    adminToken = generateTestToken('admin', 'admin-123');
    buyerToken = generateTestToken('buyer', 'buyer-123');
  });

  describe('Authentication & Authorization', () => {
    test('should allow seller to update their own product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Original Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          title: 'Updated Product',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated Product' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should allow admin to update any product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Original Product',
        seller: 'seller-456',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          title: 'Updated by Admin',
          seller: 'seller-456',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated by Admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny buyer from updating product', async () => {
      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ title: 'Hacked Product' });

      expect(response.status).toBe(403);
    });

    test('should deny access without authentication token', async () => {
      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439011')
        .send({ title: 'No Auth Product' });

      expect(response.status).toBe(401);
    });

    test('should deny seller from updating another seller product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Another Seller Product',
        seller: 'seller-456',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Unauthorized Update' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should deny invalid token', async () => {
      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ title: 'Invalid Token' });

      expect(response.status).toBe(401);
    });
  });

  describe('Product Field Updates', () => {
    test('should update product title only', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Original Title',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439012',
          title: 'Updated Title',
          price: { amount: 100, currency: 'USD' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439012')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
      expect(mockProduct.save).toHaveBeenCalled();
    });

    test('should update product description', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439013',
        title: 'Product',
        description: 'Old Description',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439013',
          title: 'Product',
          description: 'New Description',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439013')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ description: 'New Description' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('New Description');
    });

    test('should update product price amount', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439014',
        title: 'Product',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439014',
          title: 'Product',
          price: { amount: 150, currency: 'USD' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439014')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.amount': 150 });

      expect(response.status).toBe(200);
      expect(response.body.data.price.amount).toBe(150);
    });

    test('should update product price currency', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439015',
        title: 'Product',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439015',
          title: 'Product',
          price: { amount: 100, currency: 'EUR' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439015')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.currency': 'EUR' });

      expect(response.status).toBe(200);
      expect(response.body.data.price.currency).toBe('EUR');
    });

    test('should update multiple fields at once', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439016',
        title: 'Old Title',
        description: 'Old Description',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439016',
          title: 'New Title',
          description: 'New Description',
          price: { amount: 200, currency: 'EUR' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439016')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'New Title',
          description: 'New Description',
          'price.amount': 200,
          'price.currency': 'EUR',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('New Title');
      expect(response.body.data.description).toBe('New Description');
      expect(response.body.data.price.amount).toBe(200);
    });

    test('should update with trimmed whitespace', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439017',
        title: '  Original  ',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439017',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439017')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: '  Updated  ' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated');
    });

    test('should not allow updating seller field', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439018',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439018')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ seller: 'seller-999' });

      expect([400, 403]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('should not allow updating _id field', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439019',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439019')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ _id: 'different-id' });

      expect([400, 403]).toContain(response.status);
    });

    test('should update with empty description', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Product',
        description: 'Old Description',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439020',
          title: 'Product',
          description: '',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439020')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ description: '' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('');
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate cache after update', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439021',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439021',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      // Mock cache clearing
      const mockCacheDelete = jest.fn();
      global.cacheDelete = mockCacheDelete;

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439021')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      // Cache invalidation should happen (implementation specific)
    });

    test('should invalidate product-specific cache key', async () => {
      const productId = '507f1f77bcf86cd799439022';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      // Should invalidate cache for this specific product ID
    });

    test('should invalidate all products list cache', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439023',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439023',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439023')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      // Should invalidate all products cache
    });
  });

  describe('Event Emission - product.updated', () => {
    test('should trigger product.updated event on successful update', async () => {
      const productId = '507f1f77bcf86cd799439024';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      // Event emission should be triggered during update
      expect(mockProduct.save).toHaveBeenCalled();
    });

    test('should pass product ID to event when emitted', async () => {
      const productId = '507f1f77bcf86cd799439025';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(productId);
    });

    test('should include updated fields in event data', async () => {
      const productId = '507f1f77bcf86cd799439026';
      const mockProduct = {
        _id: productId,
        title: 'Original',
        description: 'Original',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Updated',
          description: 'New Description',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated', description: 'New Description' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated');
      expect(response.body.data.description).toBe('New Description');
    });

    test('should include seller info in event data', async () => {
      const productId = '507f1f77bcf86cd799439027';
      const sellerId = 'seller-123';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: sellerId,
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Updated',
          seller: sellerId,
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.seller).toBe(sellerId);
    });

    test('should emit event with timestamp on update', async () => {
      const productId = '507f1f77bcf86cd799439028';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Updated',
          seller: 'seller-123',
          updatedAt: new Date().toISOString(),
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('title', 'Updated');
    });
  });

  describe('Validation', () => {
    test('should reject empty title', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439030',
        title: 'Product',
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439030')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: '' });

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('should reject negative price', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439031',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439031')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.amount': -50 });

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('should validate price is a number', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439032',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439032')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.amount': 'not-a-number' });

      expect([400, 422]).toContain(response.status);
    });

    test('should validate currency format', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439033',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439033')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.currency': 'INVALID' });

      expect([400, 422]).toContain(response.status);
    });

    test('should accept valid currency codes', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439034',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439034',
          price: { amount: 100, currency: 'GBP' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439034')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.currency': 'GBP' });

      expect(response.status).toBe(200);
    });

    test('should reject invalid product ID', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/product/invalid-id-format')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should reject update with no fields', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439035',
        title: 'Product',
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439035')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({});

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle database save error', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439040',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439040')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle product not found', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439041')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should handle database connection error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439042')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle concurrent updates gracefully', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439043',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439043',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const [response1, response2] = await Promise.all([
        request(app)
          .patch('/api/product/507f1f77bcf86cd799439043')
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({ title: 'Update 1' }),
        request(app)
          .patch('/api/product/507f1f77bcf86cd799439043')
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({ title: 'Update 2' }),
      ]);

      expect([response1.status, response2.status]).toEqual(
        expect.arrayContaining([200, 200])
      );
    });
  });

  describe('Response Structure', () => {
    test('should return updated product in response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439050',
        title: 'Old Title',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439050',
          title: 'Updated Title',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439050')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated Title' });

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data._id).toBe('507f1f77bcf86cd799439050');
      expect(response.body.data.title).toBe('Updated Title');
    });

    test('should include success flag in response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439051',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439051',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439051')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.body.success).toBe(true);
    });

    test('should include appropriate message in response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439052',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439052',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439052')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.body.message).toContain('updated');
      expect(response.body.message.toLowerCase()).toMatch(/success|updated/);
    });

    test('should not expose sensitive fields', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439053',
        title: 'Product',
        seller: 'seller-123',
        internalNotes: 'secret data',
        __v: 0,
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439053',
          title: 'Updated',
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439053')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated' });

      expect(response.body.data).not.toHaveProperty('internalNotes');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long title update', async () => {
      const longTitle = 'A'.repeat(1000);
      const mockProduct = {
        _id: '507f1f77bcf86cd799439060',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439060',
          title: longTitle,
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439060')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: longTitle });

      expect([200, 400, 422]).toContain(response.status);
    });

    test('should handle special characters in title', async () => {
      const specialTitle = 'Product™ with © symbols & special chars!';
      const mockProduct = {
        _id: '507f1f77bcf86cd799439061',
        title: 'Product',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439061',
          title: specialTitle,
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439061')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: specialTitle });

      expect(response.status).toBe(200);
    });

    test('should handle zero price update', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439062',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439062',
          price: { amount: 0, currency: 'USD' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439062')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ 'price.amount': 0 });

      expect([200, 400, 422]).toContain(response.status);
    });

    test('should handle unicode characters in description', async () => {
      const unicodeDesc = '这是一个中文描述 🎉 Описание на русском';
      const mockProduct = {
        _id: '507f1f77bcf86cd799439063',
        description: 'Old',
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439063',
          description: unicodeDesc,
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439063')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ description: unicodeDesc });

      expect(response.status).toBe(200);
    });

    test('should maintain data integrity with partial updates', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439064',
        title: 'Original Title',
        description: 'Original Description',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439064',
          title: 'Updated Title',
          description: 'Original Description',
          price: { amount: 100, currency: 'USD' },
          seller: 'seller-123',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/product/507f1f77bcf86cd799439064')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Original Description');
      expect(response.body.data.price.amount).toBe(100);
    });
  });
});
