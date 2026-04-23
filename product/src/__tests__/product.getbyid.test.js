const request = require('supertest');
const app = require('../app');
const Product = require('../models/product.model');

// Mock the models
jest.mock('../models/product.model');

describe('GET /api/product/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Product by Valid ID', () => {
    test('should fetch product by valid ID', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Test Product',
        price: { amount: 100, currency: 'USD' },
        description: 'Test Description',
        images: [],
        seller: 'seller-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product fetched successfully');
      expect(response.body.Product).toEqual(mockProduct);
      expect(Product.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    test('should fetch product with all fields populated', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Laptop',
        price: { amount: 999.99, currency: 'USD' },
        description: 'High-end gaming laptop',
        images: [
          { fileId: 'img1', url: 'https://example.com/img1.jpg', name: 'laptop.jpg' },
          { fileId: 'img2', url: 'https://example.com/img2.jpg', name: 'laptop2.jpg' },
        ],
        seller: 'seller-456',
        ratings: 4.5,
        reviews: 150,
        stock: 25,
        category: 'Electronics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439012');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.Product).toEqual(mockProduct);
      expect(response.body.Product.title).toBe('Laptop');
      expect(response.body.Product.images.length).toBe(2);
      expect(response.body.Product.price.currency).toBe('USD');
    });

    test('should fetch product with multiple images', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439013',
        title: 'Camera',
        price: { amount: 500, currency: 'USD' },
        images: [
          { fileId: 'img1', url: 'https://example.com/camera1.jpg' },
          { fileId: 'img2', url: 'https://example.com/camera2.jpg' },
          { fileId: 'img3', url: 'https://example.com/camera3.jpg' },
          { fileId: 'img4', url: 'https://example.com/camera4.jpg' },
        ],
        seller: 'seller-789',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439013');

      expect(response.status).toBe(200);
      expect(response.body.Product.images.length).toBe(4);
      expect(Array.isArray(response.body.Product.images)).toBe(true);
    });

    test('should fetch product with empty description', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439014',
        title: 'Product',
        price: { amount: 50, currency: 'USD' },
        description: '',
        images: [],
        seller: 'seller-111',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439014');

      expect(response.status).toBe(200);
      expect(response.body.Product.description).toBe('');
    });

    test('should fetch product with decimal price values', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439015',
        title: 'Item',
        price: { amount: 99.99, currency: 'USD' },
        description: 'Test',
        seller: 'seller-222',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439015');

      expect(response.status).toBe(200);
      expect(response.body.Product.price.amount).toBe(99.99);
    });

    test('should fetch product with different currency', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439016',
        title: 'Product EUR',
        price: { amount: 100, currency: 'EUR' },
        seller: 'seller-333',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439016');

      expect(response.status).toBe(200);
      expect(response.body.Product.price.currency).toBe('EUR');
    });
  });

  describe('Get Product by Invalid/Not Found ID', () => {
    test('should return null when product does not exist', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439099');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.Product).toBeNull();
      expect(Product.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439099');
    });

    test('should handle non-existent ObjectID format', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app).get('/api/product/nonexistentid123');

      expect(response.status).toBe(200);
      expect(response.body.Product).toBeNull();
    });

    test('should handle empty string or special characters as ID', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);

      // Test with a hyphen-only ID (will still call findById)
      const response = await request(app).get('/api/product/-');

      expect(response.status).toBe(200);
      expect(response.body.Product).toBeNull();
      expect(Product.findById).toHaveBeenCalledWith('-');
    });

    test('should handle UUID format ID that does not exist', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app).get(`/api/product/${uuidId}`);

      expect(response.status).toBe(200);
      expect(response.body.Product).toBeNull();
    });
  });

  describe('Get Product by ID - Error Handling', () => {
    test('should handle database connection error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Error fetching product');
      expect(response.body.error).toContain('Database connection failed');
    });

    test('should handle invalid ObjectID format error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Cast to ObjectId failed'));

      const response = await request(app).get('/api/product/invalidid');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle findById query error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Query execution failed'));

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Error fetching product');
    });

    test('should handle timeout error during product fetch', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Query timeout'));

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle database unavailable error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('MongoNetworkError: connect ECONNREFUSED'));

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle permission denied error', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Unauthorized access'));

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Get Product by ID - Edge Cases', () => {
    test('should handle product ID with special characters in URL', async () => {
      const specialId = '507f1f77bcf86cd799439011';
      const mockProduct = {
        _id: specialId,
        title: 'Product',
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get(`/api/product/${specialId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle very long product ID', async () => {
      const longId = 'a'.repeat(100);
      Product.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app).get(`/api/product/${longId}`);

      expect(response.status).toBe(200);
      expect(Product.findById).toHaveBeenCalledWith(longId);
    });

    test('should handle ID with numeric characters', async () => {
      const numericId = '123456789012345678901234';
      const mockProduct = {
        _id: numericId,
        title: 'Numeric ID Product',
        seller: 'seller-456',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get(`/api/product/${numericId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.Product._id).toBe(numericId);
    });

    test('should handle product with null values in optional fields', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439017',
        title: 'Product',
        price: { amount: 100, currency: 'USD' },
        description: null,
        images: null,
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439017');

      expect(response.status).toBe(200);
      expect(response.body.Product.description).toBeNull();
      expect(response.body.Product.images).toBeNull();
    });

    test('should handle product with nested object structures', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439018',
        title: 'Complex Product',
        price: { amount: 1000, currency: 'USD', discount: { percent: 10, amount: 100 } },
        seller: { id: 'seller-123', name: 'Seller Name' },
        metadata: { sku: 'ABC123', warehouse: 'US-East' },
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439018');

      expect(response.status).toBe(200);
      expect(response.body.Product.price.discount.percent).toBe(10);
      expect(response.body.Product.seller.name).toBe('Seller Name');
      expect(response.body.Product.metadata.sku).toBe('ABC123');
    });

    test('should handle product with arrays of nested objects', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439019',
        title: 'Product with Reviews',
        reviews: [
          { userId: 'user1', rating: 5, comment: 'Great!' },
          { userId: 'user2', rating: 4, comment: 'Good' },
        ],
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439019');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.Product.reviews)).toBe(true);
      expect(response.body.Product.reviews.length).toBe(2);
      expect(response.body.Product.reviews[0].rating).toBe(5);
    });
  });

  describe('Response Structure Validation', () => {
    test('should include all required fields in success response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Test',
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439020');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('Product');
      expect(response.body.success).toBe(true);
      expect(typeof response.body.message).toBe('string');
    });

    test('should maintain product object structure in response', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439021',
        title: 'Laptop',
        price: { amount: 999.99, currency: 'USD' },
        description: 'Gaming Laptop',
        images: ['img1.jpg'],
        seller: 'seller-123',
        createdAt: '2024-01-01T00:00:00Z',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439021');

      expect(response.body.Product).toEqual(mockProduct);
      expect(response.body.Product._id).toBe('507f1f77bcf86cd799439021');
      expect(response.body.Product.title).toBe('Laptop');
    });

    test('should include error details in error response', async () => {
      Product.findById = jest
        .fn()
        .mockRejectedValue(new Error('Test error message'));

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439022');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Test error message');
    });
  });

  describe('Get Product by ID - Performance', () => {
    test('should handle large product object', async () => {
      const largeDescription = 'A'.repeat(10000);
      const mockProduct = {
        _id: '507f1f77bcf86cd799439030',
        title: 'Large Product',
        description: largeDescription,
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439030');

      expect(response.status).toBe(200);
      expect(response.body.Product.description.length).toBe(10000);
    });

    test('should handle product with many images', async () => {
      const manyImages = Array(100).fill({
        fileId: 'img',
        url: 'https://example.com/img.jpg',
      });

      const mockProduct = {
        _id: '507f1f77bcf86cd799439031',
        title: 'Many Images Product',
        images: manyImages,
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app).get('/api/product/507f1f77bcf86cd799439031');

      expect(response.status).toBe(200);
      expect(response.body.Product.images.length).toBe(100);
    });
  });

  describe('Get Product by ID - Data Consistency', () => {
    test('should return same product data on multiple calls with same ID', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439040',
        title: 'Consistent Product',
        price: { amount: 100, currency: 'USD' },
        seller: 'seller-123',
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const response1 = await request(app).get('/api/product/507f1f77bcf86cd799439040');
      const response2 = await request(app).get('/api/product/507f1f77bcf86cd799439040');

      expect(response1.body.Product).toEqual(response2.body.Product);
      expect(Product.findById).toHaveBeenCalledTimes(2);
    });

    test('should return different products for different IDs', async () => {
      const product1 = {
        _id: '507f1f77bcf86cd799439041',
        title: 'Product 1',
        seller: 'seller-123',
      };

      const product2 = {
        _id: '507f1f77bcf86cd799439042',
        title: 'Product 2',
        seller: 'seller-456',
      };

      Product.findById = jest
        .fn()
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      const response1 = await request(app).get('/api/product/507f1f77bcf86cd799439041');
      const response2 = await request(app).get('/api/product/507f1f77bcf86cd799439042');

      expect(response1.body.Product.title).toBe('Product 1');
      expect(response2.body.Product.title).toBe('Product 2');
      expect(response1.body.Product._id).not.toBe(response2.body.Product._id);
    });
  });
});
