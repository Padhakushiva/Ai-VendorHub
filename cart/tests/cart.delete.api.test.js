const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/cart.model', () => {
  const MockCartModel = jest.fn();
  MockCartModel.findOne = jest.fn();
  return MockCartModel;
});

const cartModel = require('../src/models/cart.model');
const createAuthMiddleware = require('../src/middleware/auth.middleware');
const { clearCart } = require('../src/controllers/cart.controller');

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.delete('/api/cart', createAuthMiddleware(['user']), clearCart);

  return app;
}

describe('DELETE /api/cart', () => {
  const userId = '64b9f0a9f2d3a4b5c6d7e8f9';
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  function authHeader(role = 'user') {
    const token = jwt.sign({ _id: userId, role }, process.env.JWT_SECRET);
    return { Authorization: `Bearer ${token}` };
  }

  test('clears all items and returns zero totals', async () => {
    const cartDoc = {
      user: userId,
      items: [
        { productId: { toString: () => '64b9f0a9f2d3a4b5c6d7e8aa' }, quantity: 2 },
      ],
      totals: { subtotal: 100, discount: 0, tax: 0, total: 100 },
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app).delete('/api/cart').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Cart cleared successfully');
    expect(Array.isArray(res.body.cart.items)).toBe(true);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.totals).toMatchObject({
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
    expect(cartDoc.save).toHaveBeenCalledTimes(1);
  });

  test('returns 200 even when cart is already empty', async () => {
    const cartDoc = {
      user: userId,
      items: [],
      totals: { subtotal: 0, discount: 0, tax: 0, total: 0 },
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app).delete('/api/cart').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.totals.total).toBe(0);
    expect(cartDoc.save).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when cart is not found', async () => {
    cartModel.findOne.mockResolvedValue(null);

    const res = await request(app).delete('/api/cart').set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Cart not found');
    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
  });

  test('returns 401 when auth token is missing', async () => {
    const res = await request(app).delete('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication token missing');
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('returns 403 when role is not allowed', async () => {
    const res = await request(app).delete('/api/cart').set(authHeader('admin'));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden: Insufficient permissions');
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });
});
