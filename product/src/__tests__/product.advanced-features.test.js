const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const Product = require("../models/product.model");
const Wishlist = require("../models/wishlist.model");
const productCache = require("../services/cache.service");

jest.mock("../models/product.model");
jest.mock("../models/wishlist.model");

const sellerId = "507f1f77bcf86cd799439111";
const userId = "507f1f77bcf86cd799439222";
const productId = "507f1f77bcf86cd799439011";
const secondProductId = "507f1f77bcf86cd799439012";
const variantId = "507f1f77bcf86cd799439333";

const generateToken = (role = "seller", id = sellerId) => jwt.sign(
  { id, role, email: `${role}@example.com` },
  process.env.JWT_SECRET,
  { expiresIn: "1h" },
);

const findChain = (products) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(products),
});

describe("Product advanced catalogue features", () => {
  let sellerToken;
  let userToken;
  const originalCacheEnabled = process.env.PRODUCT_CACHE_ENABLED;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.PRODUCT_CACHE_ENABLED = "true";
    await productCache.clear();
    sellerToken = generateToken("seller", sellerId);
    userToken = generateToken("user", userId);
  });

  afterAll(async () => {
    if (originalCacheEnabled === undefined) {
      delete process.env.PRODUCT_CACHE_ENABLED;
    } else {
      process.env.PRODUCT_CACHE_ENABLED = originalCacheEnabled;
    }
    await productCache.clear();
  });

  test("should add a product variant with SKU, variant price, and stock", async () => {
    const product = {
      _id: productId,
      seller: sellerId,
      variants: [],
      stock: 0,
      save: jest.fn().mockImplementation(function save() {
        return Promise.resolve(this);
      }),
    };
    Product.findById = jest.fn().mockResolvedValue(product);

    const response = await request(app)
      .post(`/api/product/${productId}/variants`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        sku: "phone-red-128",
        color: "red",
        storage: "128GB",
        amount: 39999,
        currency: "INR",
        stock: 4,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(product.variants[0].sku).toBe("PHONE-RED-128");
    expect(product.save).toHaveBeenCalled();
  });

  test("should update an existing product variant", async () => {
    const product = {
      _id: productId,
      seller: sellerId,
      stock: 0,
      variants: [{
        _id: variantId,
        sku: "PHONE-RED-128",
        price: { amount: 39999, currency: "INR" },
        stock: 4,
      }],
      save: jest.fn().mockImplementation(function save() {
        return Promise.resolve(this);
      }),
    };
    Product.findById = jest.fn().mockResolvedValue(product);

    const response = await request(app)
      .patch(`/api/product/${productId}/variants/${variantId}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        sku: "phone-red-256",
        amount: 44999,
        currency: "INR",
        stock: 8,
      });

    expect(response.status).toBe(200);
    expect(product.variants[0].sku).toBe("PHONE-RED-256");
    expect(product.variants[0].stock).toBe(8);
  });

  test("should reject duplicate variant SKU for the same product", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      seller: sellerId,
      variants: [{ _id: variantId, sku: "PHONE-RED-128" }],
    });

    const response = await request(app)
      .post(`/api/product/${productId}/variants`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        sku: "phone-red-128",
        amount: 39999,
        stock: 4,
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("should reject invalid variant payloads", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      seller: sellerId,
      variants: [],
    });

    const response = await request(app)
      .post(`/api/product/${productId}/variants`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        sku: "bad-variant",
        amount: -10,
        currency: "INR",
        stock: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Variant price must be a non-negative number");
  });

  test("should compare multiple products in one query", async () => {
    Product.find = jest.fn().mockReturnValue(findChain([
      { _id: productId, title: "Phone A", stock: 5, price: { amount: 100, currency: "INR" } },
      { _id: secondProductId, title: "Phone B", stock: 0, price: { amount: 200, currency: "INR" } },
    ]));

    const response = await request(app)
      .get(`/api/product/compare?ids=${productId},${secondProductId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].availability).toBe("low_stock");
    expect(response.body.data[1].availability).toBe("out_of_stock");
  });

  test("should reject compare request without at least two valid ids", async () => {
    const response = await request(app)
      .get(`/api/product/compare?ids=${productId},bad-id`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("should track product views and recently viewed ids", async () => {
    const product = {
      _id: productId,
      seller: sellerId,
      status: "active",
      stock: 10,
      metrics: { views: 1, wishlist: 0, cartAdds: 0, orders: 0 },
      calculatePopularityScore: jest.fn(() => 2),
      save: jest.fn().mockImplementation(function save() {
        return Promise.resolve(this);
      }),
    };
    Product.findById = jest.fn().mockResolvedValue(product);

    const response = await request(app)
      .post(`/api/product/${productId}/view`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.views).toBe(2);
    await expect(productCache.get(`recently_viewed:${userId}`)).resolves.toEqual([productId]);
  });

  test("should fetch recently viewed products in viewed order", async () => {
    await productCache.set(`recently_viewed:${userId}`, [secondProductId, productId], 60);
    Product.find = jest.fn().mockResolvedValue([
      { _id: productId, title: "First", stock: 10 },
      { _id: secondProductId, title: "Second", stock: 0 },
    ]);

    const response = await request(app)
      .get("/api/product/recently-viewed")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((product) => product._id)).toEqual([secondProductId, productId]);
  });

  test("should return empty recently viewed list when user has no history", async () => {
    const response = await request(app)
      .get("/api/product/recently-viewed")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  test("should fetch related products using category brand tag and price signals", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      status: "active",
      category: "mobile",
      brand: "apple",
      tags: ["ios"],
      price: { amount: 1000, currency: "USD" },
    });
    Product.find = jest.fn().mockReturnValue(findChain([
      { _id: secondProductId, title: "Related Phone", stock: 12 },
    ]));

    const response = await request(app).get(`/api/product/${productId}/related`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].title).toBe("Related Phone");
    expect(Product.find).toHaveBeenCalledWith(expect.objectContaining({
      status: "active",
      _id: { $ne: productId },
    }));
  });

  test("should return 404 for related products when base product is archived", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      status: "archived",
    });

    const response = await request(app).get(`/api/product/${productId}/related`);

    expect(response.status).toBe(404);
  });

  test("should fetch trending products sorted by popularity score", async () => {
    Product.find = jest.fn().mockReturnValue(findChain([
      {
        _id: productId,
        title: "Trending Phone",
        stock: 20,
        metrics: { popularityScore: 99 },
      },
    ]));

    const response = await request(app).get("/api/product/trending?limit=5");

    expect(response.status).toBe(200);
    expect(response.body.data[0].title).toBe("Trending Phone");
    const query = Product.find.mock.results[0].value;
    expect(query.sort).toHaveBeenCalledWith({
      "metrics.popularityScore": -1,
      "metrics.views": -1,
      createdAt: -1,
    });
  });

  test("should add product to wishlist and increase wishlist metric", async () => {
    const product = {
      _id: productId,
      seller: sellerId,
      status: "active",
      metrics: { views: 0, wishlist: 0, cartAdds: 0, orders: 0 },
      calculatePopularityScore: jest.fn(() => 2),
      save: jest.fn().mockImplementation(function save() {
        return Promise.resolve(this);
      }),
    };
    Product.findById = jest.fn().mockResolvedValue(product);
    Wishlist.findOne = jest.fn().mockResolvedValue(null);
    Wishlist.create = jest.fn().mockResolvedValue({ _id: "wish-1", user: userId, product: productId });

    const response = await request(app)
      .post(`/api/product/wishlist/${productId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(201);
    expect(product.metrics.wishlist).toBe(1);
    expect(Wishlist.create).toHaveBeenCalledWith({ user: userId, product: productId });
  });

  test("should return existing wishlist item without incrementing metrics twice", async () => {
    const existingItem = { _id: "wish-1", user: userId, product: productId };
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      seller: sellerId,
      status: "active",
    });
    Wishlist.findOne = jest.fn().mockResolvedValue(existingItem);

    const response = await request(app)
      .post(`/api/product/wishlist/${productId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(existingItem);
    expect(Wishlist.create).not.toHaveBeenCalled();
  });

  test("should remove product from wishlist", async () => {
    const product = {
      _id: productId,
      seller: sellerId,
      metrics: { views: 0, wishlist: 2, cartAdds: 0, orders: 0 },
      calculatePopularityScore: jest.fn(() => 2),
      save: jest.fn().mockImplementation(function save() {
        return Promise.resolve(this);
      }),
    };
    Wishlist.findOneAndDelete = jest.fn().mockResolvedValue({ _id: "wish-1", user: userId, product: productId });
    Product.findById = jest.fn().mockResolvedValue(product);

    const response = await request(app)
      .delete(`/api/product/wishlist/${productId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(product.metrics.wishlist).toBe(1);
  });

  test("should return 404 when wishlist item does not exist", async () => {
    Wishlist.findOneAndDelete = jest.fn().mockResolvedValue(null);

    const response = await request(app)
      .delete(`/api/product/wishlist/${productId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(404);
  });
});
