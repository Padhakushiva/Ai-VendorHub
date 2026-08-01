const axios = require("axios");

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:3002";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3003";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeGet(url, token, params) {
  try {
    const response = await axios.get(url, {
      params,
      headers: authHeaders(token),
      timeout: 3500,
    });
    return response.data;
  } catch (_) {
    return null;
  }
}

function normalizeProducts(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.data || payload.products || payload.items || payload.wishlist || payload.recentlyViewed || [];
}

function extractCartProducts(payload) {
  const cart = payload?.cart || payload?.data || payload;
  return (cart?.items || []).map((item) => ({
    ...(item.productSnapshot || {}),
    _id: item.productId,
    productId: item.productId,
    quantity: item.quantity,
    source: "cart",
  }));
}

function extractOrderProducts(payload) {
  const orders = payload?.orders || payload?.data || [];
  return orders.flatMap((order) => (order.items || []).map((item) => ({
    ...(item.productSnapshot || item.product || {}),
    _id: item.productId || item.product?._id,
    productId: item.productId || item.product?._id,
    quantity: item.quantity,
    source: "order",
  })));
}

class PersonalizationService {
  async getSignals(token, memory = {}) {
    const [cartPayload, wishlistPayload, recentPayload, orderPayload] = await Promise.all([
      safeGet(`${CART_SERVICE_URL}/api/cart`, token),
      safeGet(`${PRODUCT_SERVICE_URL}/api/product/wishlist`, token),
      safeGet(`${PRODUCT_SERVICE_URL}/api/product/recently-viewed`, token),
      safeGet(`${ORDER_SERVICE_URL}/api/orders/me`, token, { limit: 10 }),
    ]);

    const cartProducts = extractCartProducts(cartPayload);
    const wishlistProducts = normalizeProducts(wishlistPayload).map((product) => ({ ...product, source: "wishlist" }));
    const recentProducts = normalizeProducts(recentPayload).map((product) => ({ ...product, source: "recently_viewed" }));
    const orderProducts = extractOrderProducts(orderPayload);

    const productIds = new Set();
    const categories = new Map();
    const brands = new Map();
    const terms = new Map();

    const addWeighted = (map, key, weight) => {
      if (!key) return;
      const normalized = String(key).trim().toLowerCase();
      if (!normalized) return;
      map.set(normalized, Number((Number(map.get(normalized) || 0) + weight).toFixed(2)));
    };

    const observe = (product, weight) => {
      const id = product._id || product.id || product.productId;
      if (id) productIds.add(String(id));
      addWeighted(categories, product.category, weight);
      addWeighted(brands, product.brand, weight);
      for (const tag of product.tags || []) addWeighted(terms, tag, weight * 0.5);
    };

    cartProducts.forEach((product) => observe(product, 2));
    wishlistProducts.forEach((product) => observe(product, 1.6));
    recentProducts.forEach((product) => observe(product, 0.9));
    orderProducts.forEach((product) => observe(product, 2.4));

    for (const item of memory.preferredCategories || []) addWeighted(categories, item.key, Number(item.weight || 0));
    for (const item of memory.preferredBrands || []) addWeighted(brands, item.key, Number(item.weight || 0));
    for (const item of memory.preferredTerms || []) addWeighted(terms, item.key, Number(item.weight || 0));
    for (const id of memory.positiveProductIds || []) productIds.add(String(id));

    return {
      cartProducts,
      wishlistProducts,
      recentProducts,
      orderProducts,
      productIds,
      categories,
      brands,
      terms,
      memory,
    };
  }
}

module.exports = new PersonalizationService();
