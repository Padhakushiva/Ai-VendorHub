const request = require('supertest');
const app = require('../app');
const Product = require('../models/product.model');

// Mock the models
jest.mock('../models/product.model');

describe('GET /api/product/', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get All Products - No Filters', () => {
    test('should fetch all products with default pagination', async () => {
      const mockProducts = [
        {
          _id: '1',
          title: 'Product 1',
          price: { amount: 100, currency: 'USD' },
          description: 'Description 1',
          images: [],
          seller: 'seller-1',
        },
        {
          _id: '2',
          title: 'Product 2',
          price: { amount: 200, currency: 'USD' },
          description: 'Description 2',
          images: [],
          seller: 'seller-2',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Products fetched successfully');
      expect(response.body.data).toEqual(mockProducts);
      expect(response.body.data.length).toBe(2);
      expect(Product.find).toHaveBeenCalledWith({});
    });

    test('should use default skip=0 and limit=20 when not provided', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.status).toBe(200);
      expect(Product.find).toHaveBeenCalledWith({});
      const skipCall = Product.find().skip;
      const limitCall = Product.find().skip().limit;
      
      expect(skipCall).toHaveBeenCalledWith(0);
      expect(limitCall).toHaveBeenCalledWith(20);
    });

    test('should return empty array when no products exist', async () => {
      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('Search - Text Query Filter', () => {
    test('should filter products by search query (q parameter)', async () => {
      const mockProducts = [
        {
          _id: '1',
          title: 'Laptop',
          price: { amount: 1000, currency: 'USD' },
          description: 'Gaming laptop',
          images: [],
          seller: 'seller-1',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ q: 'laptop' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProducts);
      expect(Product.find).toHaveBeenCalledWith({
        $text: { $search: 'laptop' },
      });
    });

    test('should handle search with multiple words', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ q: 'gaming laptop 2024' });

      expect(Product.find).toHaveBeenCalledWith({
        $text: { $search: 'gaming laptop 2024' },
      });
    });

    test('should handle search query with special characters', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ q: 'laptop & accessories' });

      expect(Product.find).toHaveBeenCalledWith({
        $text: { $search: 'laptop & accessories' },
      });
    });
  });

  describe('Price Filtering - Minimum Price', () => {
    test('should filter products by minimum price', async () => {
      const mockProducts = [
        {
          _id: '2',
          title: 'Expensive Product',
          price: { amount: 500, currency: 'USD' },
          description: 'High-end product',
          images: [],
          seller: 'seller-2',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ minprice: 400 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProducts);
      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: 400 },
      });
    });

    test('should convert minprice string to number', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ minprice: '250' });

      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: 250 },
      });
    });
  });

  describe('Price Filtering - Maximum Price', () => {
    test('should filter products by maximum price', async () => {
      const mockProducts = [
        {
          _id: '1',
          title: 'Affordable Product',
          price: { amount: 100, currency: 'USD' },
          description: 'Budget-friendly',
          images: [],
          seller: 'seller-1',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ maxprice: 200 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProducts);
      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $lte: 200 },
      });
    });

    test('should convert maxprice string to number', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ maxprice: '500' });

      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $lte: 500 },
      });
    });
  });

  describe('Price Filtering - Range (Min & Max)', () => {
    test('should filter products within price range', async () => {
      const mockProducts = [
        {
          _id: '2',
          title: 'Mid-range Product',
          price: { amount: 300, currency: 'USD' },
          description: 'Mid-range product',
          images: [],
          seller: 'seller-2',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ minprice: 200, maxprice: 400 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: 200, $lte: 400 },
      });
    });

    test('should filter products with decimal price values', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ minprice: 99.99, maxprice: 199.99 });

      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: 99.99, $lte: 199.99 },
      });
    });

    test('should handle min and max as equal values', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ minprice: 300, maxprice: 300 });

      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: 300, $lte: 300 },
      });
    });
  });

  describe('Pagination', () => {
    test('should paginate with custom skip value', async () => {
      const mockProducts = [
        {
          _id: '3',
          title: 'Product 3',
          price: { amount: 150, currency: 'USD' },
          description: 'Description 3',
          images: [],
          seller: 'seller-3',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ skip: 20 });

      expect(response.status).toBe(200);
      expect(Product.find().skip).toHaveBeenCalledWith(20);
      expect(response.body.data).toEqual(mockProducts);
    });

    test('should paginate with custom limit value', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ limit: 50 });

      expect(response.status).toBe(200);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(50);
    });

    test('should convert skip and limit strings to numbers', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ skip: '10', limit: '30' });

      expect(Product.find().skip).toHaveBeenCalledWith(10);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(30);
    });

    test('should paginate through multiple pages', async () => {
      const page1Products = [
        { _id: '1', title: 'Product 1' },
        { _id: '2', title: 'Product 2' },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(page1Products),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({ skip: 0, limit: 2 });

      expect(response.status).toBe(200);
      expect(Product.find().skip).toHaveBeenCalledWith(0);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(2);

      // Reset mocks for second page
      jest.clearAllMocks();

      const page2Products = [
        { _id: '3', title: 'Product 3' },
        { _id: '4', title: 'Product 4' },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(page2Products),
        }),
      });

      const response2 = await request(app)
        .get('/api/product/')
        .query({ skip: 2, limit: 2 });

      expect(response2.status).toBe(200);
      expect(Product.find().skip).toHaveBeenCalledWith(2);
    });
  });

  describe('Combined Filters with Pagination', () => {
    test('should apply search query with price range and pagination', async () => {
      const mockProducts = [
        {
          _id: '5',
          title: 'Laptop',
          price: { amount: 800, currency: 'USD' },
          description: 'Mid-range laptop',
          images: [],
          seller: 'seller-5',
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app)
        .get('/api/product/')
        .query({
          q: 'laptop',
          minprice: 700,
          maxprice: 1000,
          skip: 0,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Product.find).toHaveBeenCalledWith({
        $text: { $search: 'laptop' },
        'price.amount': { $gte: 700, $lte: 1000 },
      });
      expect(Product.find().skip).toHaveBeenCalledWith(0);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(10);
    });

    test('should apply all filters together: search + min price + pagination', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({
          q: 'phone',
          minprice: 400,
          skip: 5,
          limit: 15,
        });

      expect(Product.find).toHaveBeenCalledWith({
        $text: { $search: 'phone' },
        'price.amount': { $gte: 400 },
      });
      expect(Product.find().skip).toHaveBeenCalledWith(5);
      expect(Product.find().skip().limit).toHaveBeenCalledWith(15);
    });

    test('should apply max price filter with search query', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({
          q: 'book',
          maxprice: 50,
        });

      expect(Product.find).toHaveBeenCalledWith({
        $text: { $search: 'book' },
        'price.amount': { $lte: 50 },
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero as skip value', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ skip: 0 });

      expect(Product.find().skip).toHaveBeenCalledWith(0);
    });

    test('should handle large limit values', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ limit: 1000 });

      expect(Product.find().skip().limit).toHaveBeenCalledWith(1000);
    });

    test('should handle negative numbers gracefully (converted as-is)', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ minprice: -100 });

      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: -100 },
      });
    });

    test('should handle zero price filtering', async () => {
      const mockProducts = [];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      await request(app)
        .get('/api/product/')
        .query({ minprice: 0, maxprice: 0 });

      expect(Product.find).toHaveBeenCalledWith({
        'price.amount': { $gte: 0, $lte: 0 },
      });
    });

    test('should respond with proper structure even on empty results', async () => {
      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should handle database connection errors gracefully', async () => {
      Product.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app).get('/api/product/');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle find operation errors', async () => {
      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Query execution failed')),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Structure Validation', () => {
    test('should include all required fields in success response', async () => {
      const mockProducts = [
        {
          _id: '1',
          title: 'Test',
          price: { amount: 100, currency: 'USD' },
        },
      ];

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.body).toEqual({
        success: true,
        message: 'Products fetched successfully',
        data: mockProducts,
      });
    });

    test('should maintain product object structure in response', async () => {
      const mockProduct = {
        _id: '123',
        title: 'Laptop',
        price: { amount: 999.99, currency: 'USD' },
        description: 'Gaming Laptop',
        images: ['img1.jpg', 'img2.jpg'],
        seller: 'seller-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      Product.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockProduct]),
        }),
      });

      const response = await request(app).get('/api/product/');

      expect(response.body.data[0]).toEqual(mockProduct);
      expect(response.body.data[0]._id).toBe('123');
      expect(response.body.data[0].title).toBe('Laptop');
      expect(response.body.data[0].price.amount).toBe(999.99);
    });
  });
});
