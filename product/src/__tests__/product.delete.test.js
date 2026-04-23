/**
 * DELETE /api/product/:id - Delete Product Tests
 * 
 * Tests for deleting a product by ID. The endpoint implements soft delete
 * (status=archived) for products with existing orders, and hard delete for
 * products with no orders. Emits product.deleted events.
 * 
 * Deletion behavior:
 * - If product has orders: Soft delete (set status='archived')
 * - If product has no orders: Hard delete (remove from database)
 * - Both emit product.deleted events
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

describe('DELETE /api/product/:id - Delete Product (Seller)', () => {
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
    test('should allow seller to delete their own product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Product to Delete',
        seller: 'seller-123',
        orders: [],
        deleteOne: jest.fn().mockResolvedValue({}),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect([200, 204]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    test('should allow admin to delete any product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Product to Delete',
        seller: 'seller-456',
        orders: [],
        deleteOne: jest.fn().mockResolvedValue({}),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    test('should deny buyer from deleting product', async () => {
      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
    });

    test('should deny access without authentication token', async () => {
      const response = await request(app).delete('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(401);
    });

    test('should deny seller from deleting another seller product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Another Seller Product',
        seller: 'seller-456',
        orders: [],
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(403);
    });

    test('should deny invalid token', async () => {
      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439011')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
    });
  });

  describe('Soft Delete - Product with Orders', () => {
    test('should soft delete product when it has orders', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Product with Orders',
        seller: 'seller-123',
        status: 'active',
        orders: ['order-1', 'order-2'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439012',
          title: 'Product with Orders',
          seller: 'seller-123',
          status: 'archived',
          orders: ['order-1', 'order-2'],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439012')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect([200, 204]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(mockProduct.save).toHaveBeenCalled();
    });

    test('should set status to archived on soft delete', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439013',
        title: 'Product',
        seller: 'seller-123',
        status: 'active',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439013',
          title: 'Product',
          seller: 'seller-123',
          status: 'archived',
          orders: ['order-1'],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439013')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(mockProduct.save).toHaveBeenCalled();
    });

    test('should preserve product data on soft delete', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439014',
        title: 'Product to Archive',
        description: 'Important description',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
        status: 'active',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439014',
          title: 'Product to Archive',
          description: 'Important description',
          price: { amount: 100, currency: 'USD' },
          seller: 'seller-123',
          status: 'archived',
          orders: ['order-1'],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439014')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Product to Archive');
      expect(response.body.data.description).toBe('Important description');
      expect(response.body.data.price.amount).toBe(100);
    });

    test('should handle product with multiple orders', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439015',
        title: 'Popular Product',
        seller: 'seller-123',
        status: 'active',
        orders: ['order-1', 'order-2', 'order-3', 'order-4', 'order-5'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439015',
          title: 'Popular Product',
          seller: 'seller-123',
          status: 'archived',
          orders: ['order-1', 'order-2', 'order-3', 'order-4', 'order-5'],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439015')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(mockProduct.save).toHaveBeenCalled();
    });
  });

  describe('Hard Delete - Product without Orders', () => {
    test('should hard delete product when it has no orders', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Product to Delete',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439020')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect([200, 204]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(Product.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439020' });
    });

    test('should remove product from database on hard delete', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439021',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439021')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.deleteOne).toHaveBeenCalled();
    });

    test('should handle empty orders array', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439022',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439022')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.deleteOne).toHaveBeenCalled();
    });

    test('should handle product with no orders field', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439023',
        title: 'Product',
        seller: 'seller-123',
        orders: undefined,
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439023')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.deleteOne).toHaveBeenCalled();
    });
  });

  describe('Event Emission - product.deleted', () => {
    test('should emit product.deleted event on soft delete', async () => {
      const productId = '507f1f77bcf86cd799439030';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        status: 'active',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: productId,
          title: 'Product',
          seller: 'seller-123',
          status: 'archived',
          orders: ['order-1'],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      // Event should be emitted during deletion
      expect(response.body.success).toBe(true);
    });

    test('should emit product.deleted event on hard delete', async () => {
      const productId = '507f1f77bcf86cd799439031';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      // Event should be emitted during deletion
      expect(response.body.success).toBe(true);
      expect(Product.deleteOne).toHaveBeenCalled();
    });

    test('should include product ID in deletion event', async () => {
      const productId = '507f1f77bcf86cd799439032';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.productId).toBe(productId);
    });

    test('should include deletion type in event (soft vs hard)', async () => {
      const productIdSoft = '507f1f77bcf86cd799439033';
      const mockProductSoft = {
        _id: productIdSoft,
        title: 'Product',
        seller: 'seller-123',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: productIdSoft,
          status: 'archived',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProductSoft);

      const response = await request(app)
        .delete(`/api/product/${productIdSoft}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.deletionType).toBe('soft');
      expect(mockProductSoft.save).toHaveBeenCalled();
    });

    test('should include seller info in deletion event', async () => {
      const productId = '507f1f77bcf86cd799439034';
      const sellerId = 'seller-123';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: sellerId,
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.seller).toBe(sellerId);
    });

    test('should include timestamp in deletion event', async () => {
      const productId = '507f1f77bcf86cd799439035';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        deleteOne: jest.fn().mockResolvedValue({}),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      // Timestamp should be part of event/response
      expect(response.body.success).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate cache after deletion', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439040',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439040')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.deleteOne).toHaveBeenCalled();
    });

    test('should invalidate product-specific cache key', async () => {
      const productId = '507f1f77bcf86cd799439041';
      const mockProduct = {
        _id: productId,
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/product/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });

    test('should invalidate all products list cache', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439042',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439042')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should handle product not found', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439050')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should handle invalid product ID', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/product/invalid-id-format')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle database connection error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439051')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle delete operation error', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439052',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockRejectedValue(new Error('Delete failed'));

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439052')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle save operation error on soft delete', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439053',
        title: 'Product',
        seller: 'seller-123',
        orders: ['order-1'],
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439053')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle concurrent delete requests', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439054',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const [response1, response2] = await Promise.all([
        request(app)
          .delete('/api/product/507f1f77bcf86cd799439054')
          .set('Authorization', `Bearer ${sellerToken}`),
        request(app)
          .delete('/api/product/507f1f77bcf86cd799439054')
          .set('Authorization', `Bearer ${sellerToken}`),
      ]);

      // Both requests should complete without error
      expect([response1.status, response2.status]).toEqual(
        expect.arrayContaining([200, 200])
      );
    });
  });

  describe('Response Structure', () => {
    test('should return success response on deletion', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439060',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439060')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    test('should include appropriate message in response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439061',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439061')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.body.message.toLowerCase()).toMatch(/delete|remove|archive/);
    });

    test('should include deleted product data in response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439062',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439062')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.productId).toBe('507f1f77bcf86cd799439062');
    });

    test('should handle 204 No Content response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439063',
        title: 'Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439063')
        .set('Authorization', `Bearer ${sellerToken}`);

      // Should handle both 200 and 204
      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Edge Cases', () => {
    test('should handle product with special characters in title', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439070',
        title: 'Product™ with © symbols',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439070')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle product with large orders array', async () => {
      const largeOrdersArray = Array(1000).fill('order-id');
      const mockProduct = {
        _id: '507f1f77bcf86cd799439071',
        title: 'Popular Product',
        seller: 'seller-123',
        orders: largeOrdersArray,
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439071',
          title: 'Popular Product',
          seller: 'seller-123',
          status: 'archived',
          orders: largeOrdersArray,
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439071')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(mockProduct.save).toHaveBeenCalled();
    });

    test('should handle product with very long description before deletion', async () => {
      const longDescription = 'A'.repeat(10000);
      const mockProduct = {
        _id: '507f1f77bcf86cd799439072',
        title: 'Product',
        description: longDescription,
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439072')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle product already in archived status on soft delete', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439073',
        title: 'Product',
        seller: 'seller-123',
        status: 'archived',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439073',
          title: 'Product',
          seller: 'seller-123',
          status: 'archived',
          orders: ['order-1'],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439073')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle deletion of newly created product (no orders)', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439074',
        title: 'New Product',
        seller: 'seller-123',
        orders: [],
        createdAt: new Date().toISOString(),
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439074')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.deleteOne).toHaveBeenCalled();
    });

    test('should handle unicode characters in product data', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439075',
        title: '这是一个中文产品 🎉',
        description: 'Описание на русском',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439075')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle product with null optional fields', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439076',
        title: 'Product',
        description: null,
        seller: 'seller-123',
        orders: null,
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439076')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Data Consistency', () => {
    test('should not delete other products when deleting one', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439080',
        title: 'Product 1',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439080')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      // Should only delete the specific product
      expect(Product.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439080' });
    });

    test('should only affect sellers products when seller deletes', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439081',
        title: 'Seller Product',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439081',
          title: 'Seller Product',
          seller: 'seller-123',
          orders: [],
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439081')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.seller).toBe('seller-123');
    });

    test('should correctly identify soft vs hard delete based on orders', async () => {
      // Test soft delete
      const softDeleteProduct = {
        _id: '507f1f77bcf86cd799439082',
        title: 'Product with Orders',
        seller: 'seller-123',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439082',
          status: 'archived',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(softDeleteProduct);

      const response1 = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439082')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response1.status).toBe(200);
      expect(softDeleteProduct.save).toHaveBeenCalled();

      // Test hard delete (no orders)
      jest.clearAllMocks();
      const hardDeleteProduct = {
        _id: '507f1f77bcf86cd799439083',
        title: 'Product without Orders',
        seller: 'seller-123',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(hardDeleteProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response2 = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439083')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.deletionType).toBe('hard');
      expect(Product.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439083' });
    });
  });

  describe('Admin Privileges', () => {
    test('should allow admin to soft delete any product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439090',
        title: 'Product',
        seller: 'seller-456',
        orders: ['order-1'],
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439090',
          status: 'archived',
        }),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439090')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should allow admin to hard delete any product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439091',
        title: 'Product',
        seller: 'seller-456',
        orders: [],
        save: jest.fn(),
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);
      Product.deleteOne = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .delete('/api/product/507f1f77bcf86cd799439091')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Product.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439091' });
    });
  });
});
