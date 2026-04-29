const axios = require('axios');

async function checkAvailability(productId, quantity) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/product/${productId}`,
      {
        timeout: 5000,
        headers: {
          'X-Service-Request': 'true'
        }
      }
    );
    
    const product = response.data.data;
    
    return {
      available: product.stock >= quantity,
      stock: product.stock,
      price: product.price,
      title: product.title
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
    
    for (let item of cartItems) {
      const productResponse = await axios.get(
        `http://localhost:3000/api/product/${item.productId}`,
        { timeout: 5000 }
      );
      
      const product = productResponse.data.data;
      const itemTotal = product.price.amount * item.quantity;
      
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
      subtotal,
      tax,
      shipping,
      total,
      currency: 'INR'
    };
  } catch (err) {
    console.error('Failed to recompute totals:', err.message);
    throw new Error('Unable to calculate cart totals');
  }
}

module.exports = {
  checkAvailability,
  reserveSoftStock,
  recomputeCartTotals,
};
