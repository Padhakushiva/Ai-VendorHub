const axios = require('axios');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000';

function productUrl(productId) {
  return `${PRODUCT_SERVICE_URL}/api/product/${productId}`;
}

function normalizeProductResponse(response) {
  const product = response?.data?.data || response?.data?.Product || response?.data?.product || response?.data;
  if (!product || product.success === false) return null;
  return product;
}

function findVariant(product, variantId) {
  if (!variantId || !Array.isArray(product?.variants)) return null;
  return product.variants.find((variant) => (
    variant?._id?.toString?.() === variantId.toString()
    || variant?.id?.toString?.() === variantId.toString()
  ));
}

async function fetchProduct(productId) {
  const response = await axios.get(productUrl(productId), {
    timeout: 5000,
    headers: {
      'X-Service-Request': 'true'
    }
  });

  const product = normalizeProductResponse(response);
  if (!product || product.status === 'archived') {
    throw new Error('Product not found or unavailable');
  }

  return product;
}

async function checkAvailability(productId, quantity, variantId) {
  try {
    const product = await fetchProduct(productId);
    const variant = findVariant(product, variantId);
    const stock = variant ? variant.stock : product.stock;
    const price = variant ? variant.price : product.price;
    
    return {
      available: Number(stock) >= Number(quantity),
      stock: Number(stock) || 0,
      price,
      title: product.title,
      product,
      variant,
    };
  } catch (err) {
    console.error(`Stock check failed for ${productId}:`, err.message);
    return {
      available: false,
      error: 'Unable to verify product availability'
    };
  }
}

async function reserveSoftStock(productId, quantity, userId) {
  try {
    // Future implementation: track reservations in cache/DB
    console.log(`Soft stock reserved: ${quantity} units of ${productId} for user ${userId}`);
    return { reserved: true };
  } catch (err) {
    console.error('Soft stock reservation failed:', err.message);
    return { reserved: false, error: err.message };
  }
}

async function recomputeCartTotals(cartItems) {
  try {
    let subtotal = 0;
    let currency = 'INR';
    
    for (let item of cartItems) {
      const product = await fetchProduct(item.productId);
      const variant = findVariant(product, item.variantId);
      const price = item.currentPrice || variant?.price || product.price || item.productSnapshot?.price || item.unitPrice;
      const amount = Number(price?.amount) || 0;
      currency = price?.currency || currency;
      const itemTotal = amount * item.quantity;
      
      subtotal += itemTotal;
    }

    // Retail-style GST baseline for marketplace totals
    const GST_RATE = 0.18;
    const SHIPPING_FREE_THRESHOLD = 500;
    const SHIPPING_CHARGE = 50;

    const tax = Number((subtotal * GST_RATE).toFixed(2));
    const shipping = subtotal > SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_CHARGE;
    const total = Number((subtotal + tax + shipping).toFixed(2));
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      discount: 0,
      tax,
      shipping,
      total,
      currency
    };
  } catch (err) {
    console.error('Failed to recompute totals:', err.message);
    throw new Error('Unable to calculate cart totals');
  }
}

module.exports = {
  fetchProduct,
  checkAvailability,
  reserveSoftStock,
  recomputeCartTotals,
};
