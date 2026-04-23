const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Product = require('../models/product.model');

// Mock the models
jest.mock('../models/product.model');

// Helper function to generate test JWT tokens
const generateToken = (role, id = 'test-user-id') => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('GET /api/product/seller - Seller\'s Product List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    test('should return 401 when user is not authenticated', async () => {
      const response = await request(app).get('/api/product/seller');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|authentication/i);
    });

    test('should return 403 when user is admin trying to access seller endpoint', async () => {
      const adminToken = generateToken('admin', 'admin-id');
      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/forbidden|permission/i);
    });

    test('should return 403 when user is customer trying to access seller endpoint', async () => {
      const customerToken = generateToken('customer', 'customer-id');
      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/forbidden|permission/i);
    });

    test('should allow authenticated seller to access endpoint', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Get Seller\'s Products - Basic Functionality', () => {
    test('should fetch all products for authenticated seller with default pagination', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Product 1',
          price: { amount: 100, currency: 'USD' },
          description: 'Description 1',
          images: [],
          seller: sellerId,
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          _id: '2',
          title: 'Product 2',
          price: { amount: 200, currency: 'USD' },
          description: 'Description 2',
          images: [],
          seller: sellerId,
          status: 'active',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/product|fetched|successfully/i);
      expect(response.body.data).toEqual(mockProducts);
      expect(response.body.data.length).toBe(2);
      expect(Product.find).toHaveBeenCalledWith({ seller: sellerId });
    });

    test('should return empty array when seller has no products', async () => {
      const sellerId = 'seller-456';
      const sellerToken = generateToken('seller', sellerId);
      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('should filter results by seller ID only', async () => {
      const sellerId = 'seller-789';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Seller Product',
          price: { amount: 150, currency: 'USD' },
          description: 'Only this seller\'s product',
          images: [],
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      // Verify that the filter only includes seller ID, not other sellers' products
      expect(Product.find).toHaveBeenCalledWith({ seller: sellerId });
    });
  });

  describe('Pagination', () => {
    test('should use default skip=0 and limit=20 when not provided', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(Product.find().skip).toHaveBeenCalledWith(0);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(20);
    });

    test('should apply custom skip parameter', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/seller?skip=10')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(Product.find().skip).toHaveBeenCalledWith(10);
    });

    test('should apply custom limit parameter', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/seller?limit=50')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(Product.find().skip().limit).toHaveBeenCalledWith(50);
    });

    test('should apply both skip and limit parameters', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/seller?skip=5&limit=15')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(Product.find().skip).toHaveBeenCalledWith(5);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(15);
    });

    test('should handle pagination with multiple products', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = Array.from({ length: 10 }, (_, i) => ({
        _id: `${i + 1}`,
        title: `Product ${i + 1}`,
        price: { amount: 100 * (i + 1), currency: 'USD' },
        seller: sellerId,
      }));

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?skip=0&limit=10')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
    });
  });

  describe('Filtering and Search', () => {
    test('should filter products by search query (q parameter) for seller', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Laptop',
          price: { amount: 1000, currency: 'USD' },
          description: 'Gaming laptop',
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?q=laptop')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockProducts);
      expect(Product.find).toHaveBeenCalledWith({
        seller: sellerId,
        $text: { $search: 'laptop' },
      });
    });

    test('should filter products by minimum price for seller', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Expensive Product',
          price: { amount: 500, currency: 'USD' },
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?minprice=400')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.find).toHaveBeenCalledWith({
        seller: sellerId,
        'price.amount': { $gte: 400 },
      });
    });

    test('should filter products by maximum price for seller', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Cheap Product',
          price: { amount: 50, currency: 'USD' },
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?maxprice=100')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.find).toHaveBeenCalledWith({
        seller: sellerId,
        'price.amount': { $lte: 100 },
      });
    });

    test('should filter products by price range for seller', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Mid-range Product',
          price: { amount: 250, currency: 'USD' },
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?minprice=100&maxprice=500')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.find).toHaveBeenCalledWith({
        seller: sellerId,
        'price.amount': { $gte: 100, $lte: 500 },
      });
    });

    test('should combine search and price filter for seller', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Laptop',
          price: { amount: 800, currency: 'USD' },
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?q=laptop&minprice=700&maxprice=1000')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(Product.find).toHaveBeenCalledWith({
        seller: sellerId,
        $text: { $search: 'laptop' },
        'price.amount': { $gte: 700, $lte: 1000 },
      });
    });
  });

  describe('Response Format', () => {
    test('should return response with correct structure', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Product',
          price: { amount: 100, currency: 'USD' },
          description: 'Test',
          images: [],
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.message).toBe('string');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should include all product fields in response', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Complete Product',
          price: { amount: 100, currency: 'USD' },
          description: 'Full description',
          images: ['img1.jpg', 'img2.jpg'],
          seller: sellerId,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          status: 'active',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      const product = response.body.data[0];
      expect(product).toHaveProperty('_id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('images');
      expect(product).toHaveProperty('seller');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      
      // Mock Product.find to reject with an error
      Product.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/error/i);
    });

    test('should handle invalid skip parameter', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?skip=invalid')
        .set('Authorization', `Bearer ${sellerToken}`);

      // Should either return 400 or handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    test('should handle invalid limit parameter', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?limit=invalid')
        .set('Authorization', `Bearer ${sellerToken}`);

      // Should either return 400 or handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    test('should handle negative skip parameter', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?skip=-5')
        .set('Authorization', `Bearer ${sellerToken}`);

      // Should either reject or convert to 0
      expect(response.status).toBeLessThan(500);
    });

    test('should handle negative limit parameter', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?limit=-5')
        .set('Authorization', `Bearer ${sellerToken}`);

      // Should either reject or use default
      expect(response.status).toBeLessThan(500);
    });

    test('should handle very large limit parameter', async () => {
      const sellerToken = generateToken('seller', 'seller-123');
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?limit=999999')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Data Integrity', () => {
    test('should not return products from other sellers', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      
      // Only seller-123's products should be returned
      const mockProducts = [
        {
          _id: '1',
          title: 'Product by seller-123',
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      // Verify all products belong to the authenticated seller
      response.body.data.forEach(product => {
        expect(product.seller).toBe(sellerId);
      });
    });

    test('should maintain data consistency across multiple calls', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        { _id: '1', title: 'Product 1', seller: sellerId },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response1 = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response2 = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response1.body.data).toEqual(response2.body.data);
    });
  });

  describe('Edge Cases', () => {
    test('should handle seller with many products', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = Array.from({ length: 100 }, (_, i) => ({
        _id: `${i}`,
        title: `Product ${i}`,
        seller: sellerId,
      }));

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?limit=100')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(100);
    });

    test('should handle special characters in search query', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller?q=product%20%26%20accessories')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle products with various currencies', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Product USD',
          price: { amount: 100, currency: 'USD' },
          seller: sellerId,
        },
        {
          _id: '2',
          title: 'Product EUR',
          price: { amount: 85, currency: 'EUR' },
          seller: sellerId,
        },
        {
          _id: '3',
          title: 'Product INR',
          price: { amount: 8500, currency: 'INR' },
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(3);
    });

    test('should handle empty description and other optional fields', async () => {
      const sellerId = 'seller-123';
      const sellerToken = generateToken('seller', sellerId);
      const mockProducts = [
        {
          _id: '1',
          title: 'Product',
          price: { amount: 100, currency: 'USD' },
          description: '',
          images: [],
          seller: sellerId,
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].description).toBe('');
    });
  });
});
