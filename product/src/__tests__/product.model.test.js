const mongoose = require("mongoose");

describe("Product model derived fields", () => {
  let Product;

  beforeAll(() => {
    jest.unmock("../models/product.model");
    Product = require("../models/product.model");
  });

  test("should calculate out of stock availability", () => {
    const product = new Product({
      title: "Out Product",
      seller: new mongoose.Types.ObjectId(),
      price: { amount: 100, currency: "INR" },
      stock: 0,
      variants: [],
    });

    expect(product.calculateAvailability()).toBe("out_of_stock");
  });

  test("should calculate low stock availability using product and variant stock", () => {
    const product = new Product({
      title: "Low Product",
      seller: new mongoose.Types.ObjectId(),
      price: { amount: 100, currency: "INR" },
      stock: 2,
      variants: [{
        sku: "LOW-RED",
        price: { amount: 120, currency: "INR" },
        stock: 2,
      }],
    });

    expect(product.calculateAvailability()).toBe("low_stock");
  });

  test("should calculate in stock availability", () => {
    const product = new Product({
      title: "Stock Product",
      seller: new mongoose.Types.ObjectId(),
      price: { amount: 100, currency: "INR" },
      stock: 10,
      variants: [],
    });

    expect(product.calculateAvailability()).toBe("in_stock");
  });

  test("should calculate weighted popularity score", () => {
    const product = new Product({
      title: "Popular Product",
      seller: new mongoose.Types.ObjectId(),
      price: { amount: 100, currency: "INR" },
      stock: 10,
      metrics: {
        views: 10,
        wishlist: 3,
        cartAdds: 2,
        orders: 1,
      },
    });

    expect(product.calculatePopularityScore()).toBe(27);
  });
});
