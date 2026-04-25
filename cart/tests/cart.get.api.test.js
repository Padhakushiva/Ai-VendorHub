const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/cart.model', () => {
  const MockCartModel = jest.fn();
  MockCartModel.findOne = jest.fn();
  return MockCartModel;
});

jest.mock('../src/services/product.service', () => ({
  recomputeCartTotals: jest.fn(),
}));

const cartModel = require('../src/models/cart.model');
const productService = require('../src/services/product.service');
const createAuthMiddleware = require('../src/middleware/auth.middleware');
const cartController = require('../src/controllers/cart.controller');

const getCart =
  cartController.getCart ||
  cartController.getCurrentCart ||
  ((req, res) => res.status(501).json({ message: 'Not implemented' }));

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/cart', createAuthMiddleware(['user']), getCart);

  return app;
}

describe('GET /api/cart', () => {
  const userId = '64b9f0a9f2d3a4b5c6d7e8f9';
  const productId1 = '64b9f0a9f2d3a4b5c6d7e8aa';
  const productId2 = '64b9f0a9f2d3a4b5c6d7e8ab';
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    productService.recomputeCartTotals.mockResolvedValue({
      subtotal: 500,
      discount: 50,
      tax: 45,
      total: 495,
    });
  });

  function authHeader(role = 'user') {
    const token = jwt.sign({ _id: userId, role }, process.env.JWT_SECRET);
    return { Authorization: `Bearer ${token}` };
  }

  test('returns 200 with cart items and recomputed totals', async () => {
    const cartDoc = {
      user: userId,
      items: [
        { productId: { toString: () => productId1 }, quantity: 2 },
        { productId: { toString: () => productId2 }, quantity: 1 },
      ],
      totals: { subtotal: 1, discount: 0, tax: 0, total: 1 },
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app).get('/api/cart').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.cart).toBeDefined();
    expect(Array.isArray(res.body.cart.items)).toBe(true);
    expect(res.body.cart.items).toHaveLength(2);
    expect(res.body.cart.totals).toBeDefined();
    expect(productService.recomputeCartTotals).toHaveBeenCalledWith(cartDoc.items);
  });

  test('returns 200 with empty items and zero totals when cart exists but has no lines', async () => {
    productService.recomputeCartTotals.mockResolvedValue({
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });

    const cartDoc = {
      user: userId,
      items: [],
      totals: { subtotal: 99, discount: 0, tax: 0, total: 99 },
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app).get('/api/cart').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.cart).toBeDefined();
    expect(Array.isArray(res.body.cart.items)).toBe(true);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.totals).toMatchObject({
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
  });

  test('recomputes totals from Product Service instead of trusting stored totals', async () => {
    const cartDoc = {
      user: userId,
      items: [{ productId: { toString: () => productId1 }, quantity: 2 }],
      totals: { subtotal: 999999, discount: 0, tax: 0, total: 999999 },
      save: jest.fn().mockResolvedValue(undefined),
    };

    productService.recomputeCartTotals.mockResolvedValue({
      subtotal: 200,
      discount: 0,
      tax: 18,
      total: 218,
    });

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app).get('/api/cart').set(authHeader());

    expect(res.status).toBe(200);
    expect(productService.recomputeCartTotals).toHaveBeenCalledTimes(1);
    expect(res.body.cart.totals).toMatchObject({
      subtotal: 200,
      discount: 0,
      tax: 18,
      total: 218,
    });
    expect(res.body.cart.totals.total).not.toBe(999999);
  });

  test('returns 404 when cart is not found', async () => {
    cartModel.findOne.mockResolvedValue(null);

    const res = await request(app).get('/api/cart').set(authHeader());

    expect(res.status).toBe(404);
    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
  });

  test('returns 401 when auth token is missing', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication token missing');
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('returns 403 when role is not allowed', async () => {
    const res = await request(app).get('/api/cart').set(authHeader('admin'));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden: Insufficient permissions');
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });
});
