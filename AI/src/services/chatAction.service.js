const axios = require("axios");

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:3002";
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeAction(message = "") {
  const lower = message.toLowerCase();
  if (/\b(add|put|place)\b.*\b(cart|bag)\b/.test(lower) || /\bbuy this\b/.test(lower)) return "add_to_cart";
  if (/\b(wishlist|wish list|favourite|favorite|save to wishlist)\b/.test(lower)) return "add_to_wishlist";
  if (/\bsave\b.*\b(later|for later)\b/.test(lower)) return "save_for_later";
  if (/\b(remove|delete)\b.*\b(cart|bag)\b/.test(lower)) return "remove_from_cart";
  return null;
}

function parseQuantity(message = "") {
  const match = message.match(/\b(?:qty|quantity|x)?\s*(\d{1,2})\b/i);
  const quantity = match ? Number(match[1]) : 1;
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function resolveProductId(message, products = [], conversation = {}) {
  const explicit = message.match(/\b[0-9a-f]{24}\b/i);
  if (explicit) return explicit[0];

  const ordinal = message.match(/\b(?:first|1st|one|second|2nd|two|third|3rd|three|fourth|4th|four|fifth|5th|five|last)\b/i);
  const map = {
    first: 0, "1st": 0, one: 0,
    second: 1, "2nd": 1, two: 1,
    third: 2, "3rd": 2, three: 2,
    fourth: 3, "4th": 3, four: 3,
    fifth: 4, "5th": 4, five: 4,
  };
  if (ordinal) {
    const word = ordinal[0].toLowerCase();
    const index = word === "last" ? products.length - 1 : map[word];
    const product = products[index];
    if (product) return String(product._id || product.id || product.productId);
  }

  const lastIds = conversation.lastProductIds || [];
  if (lastIds.length) return String(lastIds[0]);
  const firstProduct = products[0];
  return firstProduct ? String(firstProduct._id || firstProduct.id || firstProduct.productId) : null;
}

class ChatActionService {
  detect(message) {
    return normalizeAction(message);
  }

  async execute({ type, message, products = [], conversation = {}, token }) {
    if (!type) return null;
    const productId = resolveProductId(message, products, conversation);
    if (!productId) {
      return {
        type,
        success: false,
        status: "needs_product",
        message: "I need a product to act on. Pick a product first, then ask me again.",
      };
    }

    const quantity = parseQuantity(message);

    try {
      if (type === "add_to_cart") {
        const response = await axios.post(
          `${CART_SERVICE_URL}/api/cart/items`,
          { productId, quantity },
          { headers: authHeaders(token), timeout: 6000 },
        );
        return {
          type,
          productId,
          quantity,
          success: true,
          status: "completed",
          message: `Added ${quantity} item(s) to your cart.`,
          data: response.data,
        };
      }

      if (type === "save_for_later") {
        const response = await axios.post(
          `${CART_SERVICE_URL}/api/cart/items/${productId}/save-for-later`,
          {},
          { headers: authHeaders(token), timeout: 6000 },
        );
        return {
          type,
          productId,
          success: true,
          status: "completed",
          message: "Saved this product for later.",
          data: response.data,
        };
      }

      if (type === "add_to_wishlist") {
        const response = await axios.post(
          `${PRODUCT_SERVICE_URL}/api/product/wishlist/${productId}`,
          {},
          { headers: authHeaders(token), timeout: 6000 },
        );
        return {
          type,
          productId,
          success: true,
          status: "completed",
          message: "Added this product to your wishlist.",
          data: response.data,
        };
      }

      if (type === "remove_from_cart") {
        const response = await axios.delete(
          `${CART_SERVICE_URL}/api/cart/items/${productId}`,
          { headers: authHeaders(token), timeout: 6000 },
        );
        return {
          type,
          productId,
          success: true,
          status: "completed",
          message: "Removed this product from your cart.",
          data: response.data,
        };
      }
    } catch (error) {
      return {
        type,
        productId,
        quantity,
        success: false,
        status: "failed",
        message: error.response?.data?.message || error.message || "Action failed.",
      };
    }

    return null;
  }
}

module.exports = new ChatActionService();
