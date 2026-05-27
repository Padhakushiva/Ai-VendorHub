const mongoose = require('mongoose');
const cartModel = require('../models/cart.model');
const productService = require('../services/product.service');
const cartCache = require('../services/cache.service');
const { publishCartEvent } = require('../services/event.service');

const ZERO_TOTALS = {
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  currency: 'INR',
};

const getUserId = (user = {}) => user.id || user._id || user.userId;

const normalizeQuantity = (body = {}) => {
  const value = body.quantity !== undefined ? body.quantity : body.qty;
  return Number(value);
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cartCachePrefix = (userId) => `cart:${userId}`;

const sameCartLine = (item, productId, variantId) => (
  item.productId?.toString?.() === productId.toString()
  && ((item.variantId?.toString?.() || '') === (variantId?.toString?.() || ''))
);

const getProductFromService = async (productId) => {
  if (typeof productService.fetchProduct === 'function') {
    return productService.fetchProduct(productId);
  }
  return null;
};

const buildSnapshot = (product = {}, variant = null) => {
  const price = variant?.price || product.price || { amount: 0, currency: 'INR' };
  return {
    title: product.title,
    price,
    variant: variant ? {
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      ram: variant.ram,
      storage: variant.storage,
      price: variant.price,
    } : undefined,
    seller: product.seller,
    stock: variant?.stock ?? product.stock,
    images: product.images || [],
  };
};

const normalizeMoney = (price = {}) => ({
  amount: Number(price.amount) || 0,
  currency: price.currency || 'INR',
});

const sameMoney = (left = {}, right = {}) => (
  Number(left.amount) === Number(right.amount)
  && (left.currency || 'INR') === (right.currency || 'INR')
);

const updateLinePricing = (item) => {
  const price = item.currentPrice
    || item.productSnapshot?.variant?.price
    || item.productSnapshot?.price
    || item.unitPrice
    || {};
  const amount = Number(price.amount) || 0;
  const currency = price.currency || 'INR';
  item.unitPrice = { amount, currency };
  item.lineTotal = {
    amount: Number((amount * Number(item.quantity || 0)).toFixed(2)),
    currency,
  };
};

const applyPriceSnapshot = (item, product, variant) => {
  const latestPrice = normalizeMoney(variant?.price || product?.price || item.currentPrice || item.unitPrice);
  const originalPrice = item.priceAtAdded ? normalizeMoney(item.priceAtAdded) : latestPrice;

  item.priceAtAdded = originalPrice;
  item.currentPrice = latestPrice;
  item.priceChanged = !sameMoney(originalPrice, latestPrice);
  updateLinePricing(item);
};

const calculateTotalsFromSnapshots = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    updateLinePricing(item);
    return sum + (Number(item.lineTotal?.amount) || 0);
  }, 0);

  if (subtotal <= 0) return { ...ZERO_TOTALS };

  const tax = Number((subtotal * 0.18).toFixed(2));
  const shipping = subtotal > 500 ? 0 : 50;
  const total = Number((subtotal + tax + shipping).toFixed(2));
  const currency = items[0]?.unitPrice?.currency || 'INR';

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: 0,
    tax,
    shipping,
    total,
    currency,
  };
};

const recomputeTotals = async (cart) => {
  if (!cart.items || cart.items.length === 0) {
    cart.totals = { ...ZERO_TOTALS };
    return cart.totals;
  }

  if (typeof productService.recomputeCartTotals === 'function') {
    cart.totals = await productService.recomputeCartTotals(cart.items);
  } else {
    cart.totals = calculateTotalsFromSnapshots(cart.items);
  }

  return cart.totals;
};

const invalidateCartCache = async (userId) => {
  if (userId) await cartCache.del(cartCachePrefix(userId));
};

const emitCartEvent = async (eventName, cart, extra = {}) => {
  await publishCartEvent(eventName, {
    cartId: cart?._id,
    userId: cart?.user,
    itemCount: cart?.items?.length || 0,
    total: cart?.totals?.total || 0,
    ...extra,
  });
};

const refreshCartItems = async (cart) => {
  if (typeof productService.checkAvailability !== 'function') return;

  const refreshedItems = [];

  for (const item of cart.items || []) {
    const availability = await validateProductAndQuantity(
      item.productId,
      item.quantity,
      item.variantId,
    );

    if (!availability.ok) {
      refreshedItems.push(item);
      continue;
    }

    item.productSnapshot = buildSnapshot(availability.product, availability.variant);
    applyPriceSnapshot(item, availability.product, availability.variant);
    refreshedItems.push(item);
  }

  cart.items = refreshedItems;
};

const resolveCartStatus = (issues = []) => {
  if (!issues.length) return 'healthy';
  if (issues.some((issue) => issue.issueType === 'out_of_stock')) return 'out_of_stock';
  if (issues.some((issue) => ['inactive_product', 'invalid_product', 'unavailable'].includes(issue.issueType))) {
    return 'invalid_items';
  }
  return 'needs_review';
};

const validateCartState = async (cart, { mutate = false } = {}) => {
  const issues = [];

  for (const item of cart.items || []) {
    const productId = item.productId;
    const variantId = item.variantId;

    const availability = await validateProductAndQuantity(productId, Number(item.quantity), variantId);

    if (!availability.ok) {
      issues.push({
        productId,
        variantId,
        issueType: availability.body?.stock === 0 ? 'out_of_stock' : 'unavailable',
        message: availability.body?.message || availability.body?.error || 'Product is not available',
        detectedAt: new Date(),
      });
      continue;
    }

    const latestPrice = normalizeMoney(
      availability.variant?.price
      || availability.product?.price
      || availability.price
      || item.currentPrice,
    );
    const originalPrice = item.priceAtAdded ? normalizeMoney(item.priceAtAdded) : latestPrice;

    if (!sameMoney(originalPrice, latestPrice)) {
      issues.push({
        productId,
        variantId,
        issueType: 'price_changed',
        message: `Price changed from ${originalPrice.amount} ${originalPrice.currency} to ${latestPrice.amount} ${latestPrice.currency}`,
        detectedAt: new Date(),
      });
    }

    if (mutate) {
      item.productSnapshot = buildSnapshot(availability.product, availability.variant);
      applyPriceSnapshot(item, availability.product, availability.variant);
    }
  }

  const cartStatus = resolveCartStatus(issues);

  if (mutate) {
    cart.cartStatus = cartStatus;
    cart.cartIssues = issues;
    cart.lastValidatedAt = new Date();
    await recomputeTotals(cart);
  }

  return {
    valid: issues.length === 0,
    cartStatus,
    cartIssues: issues,
  };
};

const getOrCreateCart = async (userId) => {
  let cart = await cartModel.findOne({ user: userId });

  if (!cart) {
    cart = new cartModel({
      user: userId,
      items: [],
    });
  }

  return cart;
};

const validateProductAndQuantity = async (productId, quantity, variantId) => {
  const availability = typeof productService.checkAvailability === 'function'
    ? await (variantId
      ? productService.checkAvailability(productId, quantity, variantId)
      : productService.checkAvailability(productId, quantity))
    : { available: true };

  if (!availability.available) {
    return {
      ok: false,
      status: 409,
      body: {
        message: 'Product unavailable',
        stock: availability.stock,
        requested: quantity,
        error: availability.error,
      },
    };
  }

  const product = availability.product || await getProductFromService(productId) || {
    _id: productId,
    title: availability.title,
    price: availability.price,
    stock: availability.stock,
  };
  const variant = availability.variant || null;
  const stock = Number(variant?.stock ?? product.stock ?? availability.stock);

  if (!Number.isNaN(stock) && stock < quantity) {
    return {
      ok: false,
      status: 409,
      body: {
        message: `Insufficient stock. Max available: ${stock}`,
        stock,
        requested: quantity,
      },
    };
  }

  return { ok: true, product, variant, stock };
};

async function addItemToCart(req, res) {
  const { productId, variantId } = req.body;
  const requestedQuantity = normalizeQuantity(req.body);
  const userId = getUserId(req.user);

  try {
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    if (variantId && !isValidObjectId(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const availability = await validateProductAndQuantity(productId, requestedQuantity, variantId);
    if (!availability.ok) return res.status(availability.status).json(availability.body);

    if (process.env.ENABLE_SOFT_STOCK_RESERVATION === 'true'
      && typeof productService.reserveSoftStock === 'function') {
      await productService.reserveSoftStock(productId, requestedQuantity, userId);
    }

    const cart = await getOrCreateCart(userId);
    const existingItemIndex = cart.items.findIndex((item) => sameCartLine(item, productId, variantId));

    if (existingItemIndex >= 0) {
      const newQuantity = Number(cart.items[existingItemIndex].quantity) + requestedQuantity;
      const combinedAvailability = await validateProductAndQuantity(productId, newQuantity, variantId);
      if (!combinedAvailability.ok) return res.status(combinedAvailability.status).json(combinedAvailability.body);

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].productSnapshot = buildSnapshot(combinedAvailability.product, combinedAvailability.variant);
      applyPriceSnapshot(cart.items[existingItemIndex], combinedAvailability.product, combinedAvailability.variant);
    } else {
      const item = {
        productId,
        variantId,
        quantity: requestedQuantity,
        productSnapshot: buildSnapshot(availability.product, availability.variant),
      };
      applyPriceSnapshot(item, availability.product, availability.variant);
      cart.items.push(item);
    }

    cart.lastActivityAt = new Date();
    await recomputeTotals(cart);
    await cart.save();
    await invalidateCartCache(userId);
    await emitCartEvent('cart.item_added', cart, { productId, variantId, quantity: requestedQuantity });

    return res.status(200).json({
      message: 'Item added to cart successfully',
      cart,
      stock: availability.stock,
    });
  } catch (err) {
    console.error('Error adding item to cart:', err.message);
    return res.status(500).json({
      message: 'Error adding item to cart',
      error: err.message,
    });
  }
}

async function updateCartItemQuantity(req, res) {
  const { productId } = req.params;
  const { variantId } = req.body;
  const quantity = normalizeQuantity(req.body);
  const userId = getUserId(req.user);

  try {
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    if (variantId && !isValidObjectId(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    if (!Number.isInteger(quantity)) {
      return res.status(400).json({ message: 'Quantity is required and must be an integer' });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const existingItemIndex = cart.items.findIndex((item) => sameCartLine(item, productId, variantId));
    if (existingItemIndex < 0) return res.status(404).json({ message: 'Item not found in cart' });

    if (quantity <= 0) {
      cart.items.splice(existingItemIndex, 1);
    } else {
      const availability = await validateProductAndQuantity(productId, quantity, variantId);
      if (!availability.ok) return res.status(availability.status).json(availability.body);

      cart.items[existingItemIndex].quantity = quantity;
      cart.items[existingItemIndex].productSnapshot = buildSnapshot(availability.product, availability.variant);
      applyPriceSnapshot(cart.items[existingItemIndex], availability.product, availability.variant);
    }

    cart.lastActivityAt = new Date();
    await recomputeTotals(cart);
    await cart.save();
    await invalidateCartCache(userId);
    await emitCartEvent(
      quantity <= 0 ? 'cart.item_removed' : 'cart.quantity_updated',
      cart,
      { productId, variantId, quantity },
    );

    return res.status(200).json({
      message: quantity <= 0 ? 'Cart item removed successfully' : 'Cart item quantity updated successfully',
      cart,
    });
  } catch (err) {
    console.error('Error updating cart item:', err.message);
    return res.status(500).json({
      message: 'Error updating cart item',
      error: err.message,
    });
  }
}

async function removeCartItem(req, res) {
  const { productId } = req.params;
  const { variantId } = req.query;
  const userId = getUserId(req.user);

  try {
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    if (variantId && !isValidObjectId(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const existingItemIndex = cart.items.findIndex((item) => sameCartLine(item, productId, variantId));
    if (existingItemIndex < 0) return res.status(404).json({ message: 'Item not found in cart' });

    cart.items.splice(existingItemIndex, 1);
    cart.lastActivityAt = new Date();
    await recomputeTotals(cart);
    await cart.save();
    await invalidateCartCache(userId);
    await emitCartEvent('cart.item_removed', cart, { productId, variantId });

    return res.status(200).json({
      message: 'Cart item removed successfully',
      cart,
    });
  } catch (err) {
    console.error('Error removing cart item:', err.message);
    return res.status(500).json({
      message: 'Error removing cart item',
      error: err.message,
    });
  }
}

async function getCart(req, res) {
  const userId = getUserId(req.user);

  try {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    await refreshCartItems(cart);
    const validation = await validateCartState(cart, { mutate: true });
    if (typeof cart.save === 'function') await cart.save();
    await cartCache.set(`${cartCachePrefix(userId)}:summary`, {
      totals: cart.totals,
      cartStatus: validation.cartStatus,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      cart,
      totals: cart.totals,
      cartStatus: validation.cartStatus,
      cartIssues: validation.cartIssues,
      message: 'Cart retrieved successfully',
    });
  } catch (err) {
    console.error('Error fetching cart:', err.message);
    return res.status(500).json({
      message: 'Error fetching cart',
      error: err.message,
    });
  }
}

async function clearCart(req, res) {
  const userId = getUserId(req.user);

  try {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = [];
    cart.totals = { ...ZERO_TOTALS };
    cart.cartStatus = 'healthy';
    cart.cartIssues = [];
    cart.lastActivityAt = new Date();
    await cart.save();
    await invalidateCartCache(userId);

    return res.status(200).json({
      message: 'Cart cleared successfully',
      cart,
    });
  } catch (err) {
    console.error('Error clearing cart:', err.message);
    return res.status(500).json({
      message: 'Error clearing cart',
      error: err.message,
    });
  }
}

async function validateCart(req, res) {
  const userId = getUserId(req.user);

  try {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const validation = await validateCartState(cart, { mutate: true });
    await cart.save();
    await invalidateCartCache(userId);

    if (validation.valid && req.body?.checkout === true) {
      await emitCartEvent('cart.checked_out', cart, { validationOnly: true });
    }

    return res.status(200).json({
      message: validation.valid ? 'Cart is valid for checkout' : 'Cart needs review before checkout',
      valid: validation.valid,
      cartStatus: validation.cartStatus,
      cartIssues: validation.cartIssues,
      cart,
    });
  } catch (err) {
    console.error('Error validating cart:', err.message);
    return res.status(500).json({
      message: 'Error validating cart',
      error: err.message,
    });
  }
}

async function getCartStatus(req, res) {
  const userId = getUserId(req.user);

  try {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const validation = await validateCartState(cart, { mutate: true });
    await cart.save();

    return res.status(200).json({
      cartStatus: validation.cartStatus,
      valid: validation.valid,
      issueCount: validation.cartIssues.length,
      totals: cart.totals,
    });
  } catch (err) {
    console.error('Error fetching cart status:', err.message);
    return res.status(500).json({
      message: 'Error fetching cart status',
      error: err.message,
    });
  }
}

async function getCartHealth(req, res) {
  const userId = getUserId(req.user);

  try {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const validation = await validateCartState(cart, { mutate: true });
    await cart.save();

    return res.status(200).json({
      cartStatus: validation.cartStatus,
      cartIssues: validation.cartIssues,
      valid: validation.valid,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching cart health:', err.message);
    return res.status(500).json({
      message: 'Error fetching cart health',
      error: err.message,
    });
  }
}

async function saveItemForLater(req, res) {
  const { productId } = req.params;
  const { variantId } = req.query;
  const userId = getUserId(req.user);

  try {
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    if (variantId && !isValidObjectId(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const existingItemIndex = cart.items.findIndex((item) => sameCartLine(item, productId, variantId));
    if (existingItemIndex < 0) return res.status(404).json({ message: 'Item not found in cart' });

    const [item] = cart.items.splice(existingItemIndex, 1);
    cart.saveForLater = cart.saveForLater || [];
    const savedIndex = cart.saveForLater.findIndex((savedItem) => sameCartLine(savedItem, productId, variantId));

    const savedItem = {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      productSnapshot: item.productSnapshot,
      priceAtAdded: item.priceAtAdded,
      currentPrice: item.currentPrice,
      priceChanged: item.priceChanged,
      savedAt: new Date(),
    };

    if (savedIndex >= 0) {
      cart.saveForLater[savedIndex].quantity += item.quantity;
      cart.saveForLater[savedIndex].savedAt = new Date();
    } else {
      cart.saveForLater.push(savedItem);
    }

    cart.lastActivityAt = new Date();
    await recomputeTotals(cart);
    await cart.save();
    await invalidateCartCache(userId);

    return res.status(200).json({
      message: 'Item moved to save for later',
      saveForLater: cart.saveForLater,
      cart,
    });
  } catch (err) {
    console.error('Error saving item for later:', err.message);
    return res.status(500).json({
      message: 'Error saving item for later',
      error: err.message,
    });
  }
}

async function getSaveForLater(req, res) {
  const userId = getUserId(req.user);

  try {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    return res.status(200).json({
      saveForLater: cart.saveForLater || [],
      count: cart.saveForLater?.length || 0,
    });
  } catch (err) {
    console.error('Error fetching save for later:', err.message);
    return res.status(500).json({
      message: 'Error fetching save for later',
      error: err.message,
    });
  }
}

async function moveSavedItemToCart(req, res) {
  const { productId } = req.params;
  const { variantId } = req.query;
  const userId = getUserId(req.user);

  try {
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    if (variantId && !isValidObjectId(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.saveForLater = cart.saveForLater || [];
    const savedIndex = cart.saveForLater.findIndex((item) => sameCartLine(item, productId, variantId));
    if (savedIndex < 0) return res.status(404).json({ message: 'Saved item not found' });

    const [savedItem] = cart.saveForLater.splice(savedIndex, 1);
    const availability = await validateProductAndQuantity(productId, savedItem.quantity, variantId);
    if (!availability.ok) return res.status(availability.status).json(availability.body);

    const existingItemIndex = cart.items.findIndex((item) => sameCartLine(item, productId, variantId));
    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += savedItem.quantity;
      applyPriceSnapshot(cart.items[existingItemIndex], availability.product, availability.variant);
    } else {
      const item = {
        productId: savedItem.productId,
        variantId: savedItem.variantId,
        quantity: savedItem.quantity,
        productSnapshot: buildSnapshot(availability.product, availability.variant),
        priceAtAdded: savedItem.priceAtAdded,
      };
      applyPriceSnapshot(item, availability.product, availability.variant);
      cart.items.push(item);
    }

    cart.lastActivityAt = new Date();
    await recomputeTotals(cart);
    await cart.save();
    await invalidateCartCache(userId);
    await emitCartEvent('cart.item_added', cart, { productId, variantId, quantity: savedItem.quantity, source: 'save_for_later' });

    return res.status(200).json({
      message: 'Saved item moved back to cart',
      cart,
    });
  } catch (err) {
    console.error('Error moving saved item to cart:', err.message);
    return res.status(500).json({
      message: 'Error moving saved item to cart',
      error: err.message,
    });
  }
}

async function publishAbandonedCartEvents(req, res) {
  const thresholdMinutes = Number(req.body?.thresholdMinutes || process.env.CART_ABANDONED_AFTER_MINUTES || 60);
  const limit = Number(req.body?.limit || 100);
  const inactiveBefore = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  try {
    const carts = await cartModel.find({
      items: { $exists: true, $ne: [] },
      updatedAt: { $lte: inactiveBefore },
    }).limit(limit);

    for (const cart of carts) {
      await emitCartEvent('cart.abandoned', cart, {
        inactiveBefore,
        thresholdMinutes,
      });
    }

    return res.status(200).json({
      message: 'Abandoned cart scan completed',
      thresholdMinutes,
      published: carts.length,
    });
  } catch (err) {
    console.error('Error publishing abandoned cart events:', err.message);
    return res.status(500).json({
      message: 'Error publishing abandoned cart events',
      error: err.message,
    });
  }
}

module.exports = {
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  getCart,
  clearCart,
  validateCart,
  getCartStatus,
  getCartHealth,
  saveItemForLater,
  getSaveForLater,
  moveSavedItemToCart,
  publishAbandonedCartEvents,
};
