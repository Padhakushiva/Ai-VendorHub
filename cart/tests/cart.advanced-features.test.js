const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/cart.model', () => {
  const MockCartModel = jest.fn();
  MockCartModel.findOne = jest.fn();
  MockCartModel.find = jest.fn();
  return MockCartModel;
});

jest.mock('../src/services/product.service', () => ({
  checkAvailability: jest.fn(),
  recomputeCartTotals: jest.fn(),
}));

jest.mock('../src/services/event.service', () => ({
  publishCartEvent: jest.fn().mockResolvedValue(false),
}));

const cartModel = require('../src/models/cart.model');
const productService = require('../src/services/product.service');
const { publishCartEvent } = require('../src/services/event.service');
const cartRoutes = require('../src/routes/cart.routes');

describe('Advanced Cart features from implementation guide', () => {
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
      price: { amount: 120, currency: 'INR' },
      product: {
        _id: productId,
        title: 'Updated Product',
        stock: 10,
        price: { amount: 120, currency: 'INR' },
        images: [],
      },
    });
    productService.recomputeCartTotals.mockResolvedValue({
      subtotal: 120,
      discount: 0,
      tax: 21.6,
      shipping: 50,
      total: 191.6,
      currency: 'INR',
    });
  });

  function authHeader(role = 'user') {
    const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET);
    return { Authorization: `Bearer ${token}` };
  }

  test('tracks price snapshot and priceChanged after validation', async () => {
    const cartDoc = {
      user: userId,
      items: [{
        productId: { toString: () => productId },
        quantity: 1,
        priceAtAdded: { amount: 100, currency: 'INR' },
        currentPrice: { amount: 100, currency: 'INR' },
        productSnapshot: { price: { amount: 100, currency: 'INR' } },
      }],
      totals: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .post('/api/cart/validate')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.cartStatus).toBe('needs_review');
    expect(res.body.cartIssues[0].issueType).toBe('price_changed');
    expect(cartDoc.items[0].priceChanged).toBe(true);
    expect(cartDoc.items[0].currentPrice).toMatchObject({ amount: 120, currency: 'INR' });
  });

  test('returns out_of_stock status with health details', async () => {
    productService.checkAvailability.mockResolvedValueOnce({
      available: false,
      stock: 0,
      error: 'Out of stock',
    });
    const cartDoc = {
      user: userId,
      items: [{ productId: { toString: () => productId }, quantity: 3 }],
      totals: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    cartModel.findOne.mockResolvedValue(cartDoc);

    const res = await request(app)
      .get('/api/cart/health')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.cartStatus).toBe('out_of_stock');
    expect(res.body.valid).toBe(false);
    expect(res.body.cartIssues[0]).toMatchObject({
      issueType: 'out_of_stock',
    });
  });

  test('moves active cart item to save for later and back to cart', async () => {
    const cartDoc = {
      user: userId,
      items: [{
        productId: { toString: () => productId },
        quantity: 2,
        priceAtAdded: { amount: 100, currency: 'INR' },
        currentPrice: { amount: 100, currency: 'INR' },
        productSnapshot: { title: 'Old Product', price: { amount: 100, currency: 'INR' } },
      }],
      saveForLater: [],
      totals: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    cartModel.findOne.mockResolvedValue(cartDoc);

    const saveRes = await request(app)
      .post(`/api/cart/items/${productId}/save-for-later`)
      .set(authHeader());

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.cart.items).toHaveLength(0);
    expect(saveRes.body.saveForLater).toHaveLength(1);

    const moveRes = await request(app)
      .post(`/api/cart/save-for-later/${productId}/move-to-cart`)
      .set(authHeader());

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.cart.items).toHaveLength(1);
    expect(moveRes.body.cart.saveForLater).toHaveLength(0);
    expect(publishCartEvent).toHaveBeenCalledWith('cart.item_added', expect.objectContaining({
      source: 'save_for_later',
    }));
  });

  test('publishes abandoned cart events through admin scan endpoint', async () => {
    const abandonedCart = {
      _id: 'cart-1',
      user: userId,
      items: [{ productId, quantity: 1 }],
      totals: { total: 120 },
    };
    cartModel.find.mockReturnValue({
      limit: jest.fn().mockResolvedValue([abandonedCart]),
    });

    const res = await request(app)
      .post('/api/cart/abandoned/scan')
      .set(authHeader('admin'))
      .send({ thresholdMinutes: 30 });

    expect(res.status).toBe(200);
    expect(res.body.published).toBe(1);
    expect(publishCartEvent).toHaveBeenCalledWith('cart.abandoned', expect.objectContaining({
      cartId: 'cart-1',
      thresholdMinutes: 30,
    }));
  });
});
