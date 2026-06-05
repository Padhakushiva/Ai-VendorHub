import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../services/cartApi';
import { useAuthBridge } from './AuthBridgeContext';

const CartContext = createContext(null);

const EMPTY_TOTALS = {
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  currency: 'INR',
};

const EMPTY_CART = {
  id: '',
  items: [],
  savedItems: [],
  totals: EMPTY_TOTALS,
  cartStatus: 'empty',
  cartIssues: [],
};

const extractProductId = (item = {}) => {
  const rawId = item.productId || item.product?._id || item.product?.id || item.id || item._id;
  return typeof rawId === 'object' ? rawId._id || rawId.id || String(rawId) : rawId;
};

const getImageUrl = (images = []) => {
  const first = Array.isArray(images) ? images[0] : images;
  if (!first) return '';
  return typeof first === 'string' ? first : first.url || first.src || '';
};

const normalizeMoney = (money = {}, fallbackCurrency = 'INR') => ({
  amount: Number(money.amount ?? money.value ?? money.price ?? 0) || 0,
  currency: money.currency || fallbackCurrency,
});

const normalizeCartItem = (item = {}) => {
  const snapshot = item.productSnapshot || item.snapshot || {};
  const unitPrice = normalizeMoney(item.unitPrice || item.currentPrice || snapshot.price);
  const lineTotal = normalizeMoney(item.lineTotal || {
    amount: unitPrice.amount * Number(item.quantity || 0),
    currency: unitPrice.currency,
  }, unitPrice.currency);

  return {
    id: `${extractProductId(item) || item._id || Math.random()}-${item.variantId || ''}`,
    productId: extractProductId(item),
    variantId: item.variantId || '',
    title: snapshot.title || item.title || 'Product',
    image: getImageUrl(snapshot.images || item.images),
    seller: snapshot.seller,
    variant: snapshot.variant,
    stock: Number(snapshot.stock ?? item.stock ?? 0),
    quantity: Number(item.quantity || 1),
    unitPrice,
    lineTotal,
    priceChanged: Boolean(item.priceChanged),
    savedAt: item.savedAt,
  };
};

const normalizeCart = (payload = {}) => {
  const rawCart = payload.cart || payload.data?.cart || payload.data || payload;
  if (!rawCart || typeof rawCart !== 'object' || Array.isArray(rawCart)) return EMPTY_CART;

  const totals = {
    ...EMPTY_TOTALS,
    ...(rawCart.totals || payload.totals || {}),
  };

  return {
    id: rawCart._id || rawCart.id || '',
    items: (rawCart.items || []).map(normalizeCartItem),
    savedItems: (rawCart.saveForLater || rawCart.savedItems || payload.saveForLater || []).map(normalizeCartItem),
    totals,
    cartStatus: rawCart.cartStatus || payload.cartStatus || 'healthy',
    cartIssues: rawCart.cartIssues || payload.cartIssues || [],
  };
};

const getErrorMessage = (error, fallback = 'Cart update failed') => (
  error.response?.data?.message
  || error.response?.data?.error
  || error.message
  || fallback
);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading, requireAuth, user } = useAuthBridge();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState('');
  const [lastMessage, setLastMessage] = useState('');

  const canUseCart = isAuthenticated && user?.role === 'user';

  const applyCartResponse = useCallback((payload) => {
    const nextCart = normalizeCart(payload);
    setCart(nextCart);
    return nextCart;
  }, []);

  const fetchCart = useCallback(async () => {
    if (!canUseCart) {
      setCart(EMPTY_CART);
      return EMPTY_CART;
    }

    try {
      setLoading(true);
      const response = await cartApi.get('/');
      return applyCartResponse(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setCart(EMPTY_CART);
        return EMPTY_CART;
      }
      setLastMessage(getErrorMessage(error, 'Unable to load cart'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [applyCartResponse, canUseCart]);

  const guardCartAccess = useCallback(() => {
    if (!isAuthenticated) {
      requireAuth('Login required to continue shopping');
      return 'login';
    }
    if (user?.role !== 'user') {
      const message = 'Cart is available for buyer accounts only.';
      setLastMessage(message);
      return message;
    }
    return '';
  }, [isAuthenticated, requireAuth, user?.role]);

  const addItem = useCallback(async (productId, quantity = 1, variantId = '') => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setBusyItemId(productId);
      const response = await cartApi.post('/items', { productId, quantity, variantId: variantId || undefined });
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Item added to cart';
      setLastMessage(message);
      return { success: true, message, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to add item to cart');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setBusyItemId('');
    }
  }, [applyCartResponse, guardCartAccess]);

  const updateItem = useCallback(async (productId, quantity, variantId = '') => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setBusyItemId(productId);
      const response = await cartApi.patch(`/items/${productId}`, { quantity, variantId: variantId || undefined });
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Cart item updated';
      setLastMessage(message);
      return { success: true, message, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update cart');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setBusyItemId('');
    }
  }, [applyCartResponse, guardCartAccess]);

  const removeItem = useCallback(async (productId, variantId = '') => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setBusyItemId(productId);
      const response = await cartApi.delete(`/items/${productId}`, { params: variantId ? { variantId } : {} });
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Item removed from cart';
      setLastMessage(message);
      return { success: true, message, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to remove item');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setBusyItemId('');
    }
  }, [applyCartResponse, guardCartAccess]);

  const clearCart = useCallback(async () => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setLoading(true);
      const response = await cartApi.delete('/');
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Cart cleared';
      setLastMessage(message);
      return { success: true, message, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to clear cart');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [applyCartResponse, guardCartAccess]);

  const validateCart = useCallback(async () => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setLoading(true);
      const response = await cartApi.post('/validate', {});
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Cart checked';
      setLastMessage(message);
      return { success: true, message, valid: response.data?.valid, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to validate cart');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [applyCartResponse, guardCartAccess]);

  const saveForLater = useCallback(async (productId, variantId = '') => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setBusyItemId(productId);
      const response = await cartApi.post(`/items/${productId}/save-for-later`, null, {
        params: variantId ? { variantId } : {},
      });
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Moved to save for later';
      setLastMessage(message);
      return { success: true, message, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save item for later');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setBusyItemId('');
    }
  }, [applyCartResponse, guardCartAccess]);

  const moveSavedToCart = useCallback(async (productId, variantId = '') => {
    const blocked = guardCartAccess();
    if (blocked) return { success: false, message: blocked };

    try {
      setBusyItemId(productId);
      const response = await cartApi.post(`/save-for-later/${productId}/move-to-cart`, null, {
        params: variantId ? { variantId } : {},
      });
      const nextCart = applyCartResponse(response.data);
      const message = response.data?.message || 'Saved item moved to cart';
      setLastMessage(message);
      return { success: true, message, cart: nextCart };
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to move saved item');
      setLastMessage(message);
      return { success: false, message };
    } finally {
      setBusyItemId('');
    }
  }, [applyCartResponse, guardCartAccess]);

  useEffect(() => {
    if (authLoading) return;
    fetchCart().catch(() => {});
  }, [authLoading, fetchCart]);

  const itemCount = useMemo(() => (
    cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0)
  ), [cart.items]);

  const value = useMemo(() => ({
    cart,
    loading,
    busyItemId,
    lastMessage,
    canUseCart,
    itemCount,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    validateCart,
    saveForLater,
    moveSavedToCart,
    fetchCart,
  }), [
    addItem,
    busyItemId,
    canUseCart,
    cart,
    clearCart,
    fetchCart,
    itemCount,
    lastMessage,
    loading,
    moveSavedToCart,
    removeItem,
    saveForLater,
    updateItem,
    validateCart,
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
