const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { uploadToImageKit } = require('../services/imagekit.service');
const Product = require('../models/product.model');

// Mock the services (no mock folder - inline mocking)
jest.mock('../services/imagekit.service');
jest.mock('../models/product.model');

// Helper function to generate JWT token for testing
const generateTestToken = (role = 'admin') => {
  return jwt.sign(
    { id: 'test-user-id', role: role, email: 'test@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('POST /api/product/', () => {
  let testToken;

  beforeEach(() => {
    jest.clearAllMocks();
    testToken = generateTestToken('admin');
  });

  describe('Valid Product Creation', () => {
    test('should create product with title and amount (no images)', async () => {
      const mockProduct = {
        _id: '123',
        name: 'Test Product',
        price: 99.99,
        currency: 'USD',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Product',
          amount: 99.99,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Product');
      expect(response.body.data.price).toBe(99.99);
    });

    test('should create product with whitespace trimmed from title', async () => {
      const mockProduct = {
        _id: '124',
        name: 'Test Product',
        price: 50,
        currency: 'USD',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: '  Test Product  ',
          amount: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should create product with custom currency', async () => {
      const mockProduct = {
        _id: '125',
        name: 'Test Product',
        price: 100,
        currency: 'EUR',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Product',
          amount: 100,
          currency: 'EUR',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should create product with description', async () => {
      const mockProduct = {
        _id: '126',
        name: 'Test Product',
        price: 75,
        currency: 'USD',
        description: 'A great product',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Product',
          amount: 75,
          description: 'A great product',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should set default currency to INR if not provided', async () => {
      const mockProduct = {
        _id: '127',
        name: 'Test Product',
        price: 100,
        currency: 'INR',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Product',
          amount: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.currency).toBe('INR');
    });
  });

  describe('Image Upload Tests', () => {
    test('should create product with single image', async () => {
      uploadToImageKit.mockResolvedValue({
        fileId: 'file123',
        url: 'https://ik.imagekit.io/products/image.jpg',
        name: 'image.jpg',
      });

      const mockProduct = {
        _id: '201',
        name: 'Product with Image',
        price: 150,
        currency: 'USD',
        description: '',
        images: [
          {
            fileId: 'file123',
            url: 'https://ik.imagekit.io/products/image.jpg',
            name: 'image.jpg',
          },
        ],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .field('title', 'Product with Image')
        .field('amount', '150')
        .attach('images', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.images.length).toBe(1);
      expect(uploadToImageKit).toHaveBeenCalled();
    });

    test('should create product with multiple images (up to 5)', async () => {
      uploadToImageKit.mockResolvedValue({
        fileId: 'file123',
        url: 'https://ik.imagekit.io/products/image.jpg',
        name: 'image.jpg',
      });

      const mockImages = Array(3).fill({
        fileId: 'file123',
        url: 'https://ik.imagekit.io/products/image.jpg',
        name: 'image.jpg',
      });

      const mockProduct = {
        _id: '202',
        name: 'Multi Image Product',
        price: 200,
        currency: 'USD',
        description: '',
        images: mockImages,
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      let attachReq = request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .field('title', 'Multi Image Product')
        .field('amount', '200');

      for (let i = 0; i < 3; i++) {
        attachReq = attachReq.attach('images', Buffer.from('fake image data'), `test${i}.jpg`);
      }

      const response = await attachReq;

      expect(response.status).toBe(201);
      expect(response.body.data.images.length).toBe(3);
      expect(uploadToImageKit).toHaveBeenCalledTimes(3);
    });

    test('should reject non-image file types', async () => {
      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .field('title', 'Product')
        .field('amount', '100')
        .attach('images', Buffer.from('fake file data'), 'test.txt');

      expect(response.status).toBe(400);
      expect(uploadToImageKit).not.toHaveBeenCalled();
    });

    test('should reject files exceeding 5MB size limit', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .field('title', 'Product')
        .field('amount', '100')
        .attach('images', largeBuffer, 'large.jpg');

      expect(response.status).toBe(400);
    });

    test('should reject more than 5 images', async () => {
      let attachReq = request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .field('title', 'Product')
        .field('amount', '100');

      for (let i = 0; i < 6; i++) {
        attachReq = attachReq.attach('images', Buffer.from('fake image data'), `test${i}.jpg`);
      }

      const response = await attachReq;

      expect(response.status).toBe(400);
    });
  });

  describe('Validation Tests', () => {
    test('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should return 400 if amount is missing', async () => {
      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Product',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should return 400 if amount is invalid', async () => {
      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Product',
          amount: 'invalid-amount',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should accept amount as number', async () => {
      const mockProduct = {
        _id: '303',
        name: 'Test Product',
        price: 99.99,
        currency: 'USD',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Product',
          amount: 99.99,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should accept amount as string number', async () => {
      const mockProduct = {
        _id: '304',
        name: 'Test Product',
        price: 99.99,
        currency: 'USD',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Product',
          amount: '99.99',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should trim whitespace from description', async () => {
      const mockProduct = {
        _id: '305',
        name: 'Test',
        price: 100,
        currency: 'USD',
        description: 'Test description',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test',
          amount: 100,
          description: '  Test description  ',
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle ImageKit upload failure', async () => {
      uploadToImageKit.mockRejectedValue(new Error('ImageKit upload failed'));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .field('title', 'Product')
        .field('amount', '100')
        .attach('images', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle database save error', async () => {
      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app)
        .post('/api/product/')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Product',
          amount: 100,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Concurrent Requests Test', () => {
    test('should handle concurrent product creation requests', async () => {
      const mockProduct = {
        _id: '500',
        name: 'Concurrent Product',
        price: 100,
        currency: 'USD',
        description: '',
        images: [],
      };

      Product.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const promises = [
        request(app)
          .post('/api/product/')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            title: 'Concurrent Product',
            amount: 100,
          }),
        request(app)
          .post('/api/product/')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            title: 'Concurrent Product',
            amount: 100,
          }),
        request(app)
          .post('/api/product/')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            title: 'Concurrent Product',
            amount: 100,
          }),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
