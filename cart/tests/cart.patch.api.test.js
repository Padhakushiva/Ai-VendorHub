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

const updateCartItemQuantity = cartController.updateCartItemQuantity || ((req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.patch(
    '/api/cart/items/:productId',
    createAuthMiddleware(['user']),
    updateCartItemQuantity
  );

  return app;
}

describe('PATCH /api/cart/items/:productId', () => {
  const userId = '64b9f0a9f2d3a4b5c6d7e8f9';
  const productId = '64b9f0a9f2d3a4b5c6d7e8aa';
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    productService.recomputeCartTotals.mockResolvedValue({
      subtotal: 200,
      discount: 0,
      tax: 0,
      total: 200,
    });
  });

  function authHeader(role = 'user') {
    const token = jwt.sign({ _id: userId, role }, process.env.JWT_SECRET);
    return { Authorization: `Bearer ${token}` };
  }

  test('changes quantity when qty is greater than 0 and returns recalculated totals', async () => {
    const cartDoc = {
      user: userId,
      items: [{ productId: { toString: () => productId }, quantity: 1 }],
      save: jest.fn().mockResolvedValue(undefined),
      totals: { subtotal: 200, discount: 0, tax: 0, total: 200 },
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader())
      .send({ quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.cart).toBeDefined();
    expect(res.body.cart.items).toBeDefined();
    expect(res.body.cart.totals).toBeDefined();
    expect(res.body.cart.items[0].quantity).toBe(4);
    expect(cartDoc.save).toHaveBeenCalledTimes(1);
  });

  test('removes item when qty is 0 and returns recalculated totals', async () => {
    const cartDoc = {
      user: userId,
      items: [{ productId: { toString: () => productId }, quantity: 3 }],
      save: jest.fn().mockResolvedValue(undefined),
      totals: { subtotal: 0, discount: 0, tax: 0, total: 0 },
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader())
      .send({ quantity: 0 });

    expect(res.status).toBe(200);
    expect(res.body.cart).toBeDefined();
    expect(Array.isArray(res.body.cart.items)).toBe(true);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.totals).toBeDefined();
    expect(cartDoc.save).toHaveBeenCalledTimes(1);
  });

  test('removes item when qty is negative and returns recalculated totals', async () => {
    const cartDoc = {
      user: userId,
      items: [{ productId: { toString: () => productId }, quantity: 3 }],
      save: jest.fn().mockResolvedValue(undefined),
      totals: { subtotal: 0, discount: 0, tax: 0, total: 0 },
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader())
      .send({ quantity: -2 });

    expect(res.status).toBe(200);
    expect(res.body.cart).toBeDefined();
    expect(Array.isArray(res.body.cart.items)).toBe(true);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.totals).toBeDefined();
    expect(cartDoc.save).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when cart does not exist', async () => {
    cartModel.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader())
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
  });

  test('returns 404 when product is not present in the cart', async () => {
    const cartDoc = {
      user: userId,
      items: [{ productId: { toString: () => '64b9f0a9f2d3a4b5c6d7e8ab' }, quantity: 1 }],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader())
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
    expect(cartDoc.save).not.toHaveBeenCalled();
  });

  test('returns 401 when auth token is missing', async () => {
    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication token missing');
  });

  test('returns 403 when role is not allowed', async () => {
    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader('admin'))
      .send({ quantity: 2 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden: Insufficient permissions');
  });

  test('returns 400 when quantity is missing', async () => {
    const res = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid productId format', async () => {
    const res = await request(app)
      .patch('/api/cart/items/invalid-id')
      .set(authHeader())
      .send({ quantity: 2 });

    expect(res.status).toBe(400);
  });
});
