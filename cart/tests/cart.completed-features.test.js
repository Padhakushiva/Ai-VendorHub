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
  recomputeCartTotals: jest.fn(),
}));

const cartModel = require('../src/models/cart.model');
const productService = require('../src/services/product.service');
const cartRoutes = require('../src/routes/cart.routes');

describe('Completed Cart features', () => {
  const userId = '64b9f0a9f2d3a4b5c6d7e8f9';
  const productId = '64b9f0a9f2d3a4b5c6d7e8aa';
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/cart', cartRoutes);
    jest.clearAllMocks();
    productService.checkAvailability.mockResolvedValue({
      available: true,
      stock: 10,
      price: { amount: 100, currency: 'INR' },
      product: {
        _id: productId,
        title: 'Test Product',
        stock: 10,
        price: { amount: 100, currency: 'INR' },
        images: [],
      },
    });
    productService.recomputeCartTotals.mockResolvedValue({
      subtotal: 100,
      discount: 0,
      tax: 18,
      shipping: 50,
      total: 168,
      currency: 'INR',
    });
  });

  function authHeader(role = 'user') {
    const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET);
    return { Authorization: `Bearer ${token}` };
  }

  test('health route does not shadow authenticated cart route', async () => {
    const cartDoc = {
      user: userId,
      items: [],
      totals: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    cartModel.findOne.mockResolvedValue(cartDoc);

    const health = await request(app).get('/api/cart/health');
    const cart = await request(app).get('/api/cart').set(authHeader());

    expect(health.status).toBe(200);
    expect(health.body.message).toBe('Cart API is running');
    expect(cart.status).toBe(200);
    expect(cart.body.message).toBe('Cart retrieved successfully');
  });

  test('accepts qty alias when adding an item', async () => {
    const cartDoc = {
      user: userId,
      items: [],
      totals: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    cartModel.findOne.mockResolvedValue(cartDoc);
    cartModel.mockImplementation(() => cartDoc);

    const res = await request(app)
      .post('/api/cart/items')
      .set(authHeader())
      .send({ productId, qty: 1 });

    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(1);
  });

  test('removes a single item through DELETE /items/:productId', async () => {
    const cartDoc = {
      user: userId,
      items: [
        { productId: { toString: () => productId }, quantity: 2 },
        { productId: { toString: () => '64b9f0a9f2d3a4b5c6d7e8ab' }, quantity: 1 },
      ],
      totals: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .delete(`/api/cart/items/${productId}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Cart item removed successfully');
    expect(res.body.cart.items).toHaveLength(1);
    expect(cartDoc.save).toHaveBeenCalledTimes(1);
  });
});
