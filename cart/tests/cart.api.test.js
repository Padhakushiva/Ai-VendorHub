const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/cart.model', () => {
  const MockCartModel = jest.fn();
  MockCartModel.findOne = jest.fn();
  return MockCartModel;
});

jest.mock('../src/services/product.service', () => ({
  checkAvailability: jest.fn(),
  reserveSoftStock: jest.fn(),
}));

const cartModel = require('../src/models/cart.model');
const productService = require('../src/services/product.service');
const createAuthMiddleware = require('../src/middleware/auth.middleware');
const { validateAddItemToCart } = require('../src/middleware/validation.middleware');
const { addItemToCart } = require('../src/controllers/cart.controller');

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.post(
    '/api/cart/items',
    createAuthMiddleware(['user']),
    validateAddItemToCart,
    addItemToCart
  );

  return app;
}

describe('POST /api/cart/items', () => {
  const userId = '64b9f0a9f2d3a4b5c6d7e8f9';
  const productId = '64b9f0a9f2d3a4b5c6d7e8aa';
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    process.env.ENABLE_SOFT_STOCK_RESERVATION = 'false';
    productService.checkAvailability.mockResolvedValue({ available: true });
    productService.reserveSoftStock.mockResolvedValue({ reserved: true });
  });

  function authHeader(role = 'user') {
    const token = jwt.sign({ _id: userId, role }, process.env.JWT_SECRET);
    return { Authorization: `Bearer ${token}` };
  }

  test('adds first item when cart does not exist', async () => {
    const newCartDoc = {
      user: userId,
      items: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(null);
    cartModel.mockImplementation(() => newCartDoc);

    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Item added to cart successfully');
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toMatchObject({ productId, quantity: 2 });
    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
    expect(cartModel).toHaveBeenCalledWith({
      user: userId,
      items: [],
    });
    expect(newCartDoc.save).toHaveBeenCalledTimes(1);
  });

  test('increments quantity when product already exists in cart', async () => {
    const existingCart = {
      user: userId,
      items: [{ productId: { toString: () => productId }, quantity: 1 }],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(existingCart);

    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(4);
    expect(existingCart.save).toHaveBeenCalledTimes(1);
  });

  test('adds a new line when product is not already in cart', async () => {
    const existingCart = {
      user: userId,
      items: [{ productId: { toString: () => '64b9f0a9f2d3a4b5c6d7e8ab' }, quantity: 1 }],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(existingCart);

    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(2);
    expect(res.body.cart.items[1]).toMatchObject({ productId, quantity: 2 });
    expect(existingCart.save).toHaveBeenCalledTimes(1);
  });

  test('returns 401 when auth token is missing', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .send({ productId, quantity: 1 });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication token missing');
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('returns 403 when role is not allowed', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader('admin'))
      .send({ productId, quantity: 1 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden: Insufficient permissions');
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('returns 400 for invalid productId format', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId: 'bad-id', quantity: 1 });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('returns 400 when quantity is less than 1', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, quantity: 0 });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('returns 409 when Product Service marks product unavailable', async () => {
    productService.checkAvailability.mockResolvedValue({ available: false });

    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Product unavailable');
    expect(productService.checkAvailability).toHaveBeenCalledWith(productId, 2);
    expect(productService.reserveSoftStock).not.toHaveBeenCalled();
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  test('attempts optional soft-stock reservation before persisting cart', async () => {
    process.env.ENABLE_SOFT_STOCK_RESERVATION = 'true';

    const newCartDoc = {
      user: userId,
      items: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValue(null);
    cartModel.mockImplementation(() => newCartDoc);

    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(200);
    expect(productService.checkAvailability).toHaveBeenCalledWith(productId, 2);
    expect(productService.reserveSoftStock).toHaveBeenCalledWith(productId, 2, userId);
    expect(newCartDoc.save).toHaveBeenCalledTimes(1);
  });
});
