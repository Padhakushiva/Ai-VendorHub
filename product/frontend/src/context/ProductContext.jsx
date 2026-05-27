import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { productApi } from '../services/productApi';

const ProductContext = createContext();

const API_BASE_URL = import.meta.env.VITE_PRODUCT_API_URL || '/api/product';

const firstImage = (product) => {
  if (product?.image) return product.image;
  const image = product?.images?.[0];
  if (typeof image === 'string') return image;
  return image?.url || image?.thumbnail || '';
};

export const normalizeProduct = (product = {}) => {
  const amount = Number(product.price?.amount ?? product.price ?? product.amount ?? 0);
  const ratingAverage = Number(product.rating?.average ?? product.rating ?? 0);
  const ratingCount = Number(product.rating?.count ?? product.reviews ?? 0);
  const stock = Number(product.stock ?? 0);
  const availability = product.availability || product.statusLabel || product.stockStatus;

  return {
    ...product,
    id: product._id || product.id,
    title: product.title || product.name || 'Untitled product',
    description: product.description || '',
    brand: product.brand || 'VendorHub',
    category: product.category || 'General',
    image: firstImage(product),
    priceAmount: amount,
    currency: product.price?.currency || product.currency || 'INR',
    ratingAverage,
    ratingCount,
    stock,
    inStock: availability ? availability !== 'out_of_stock' : stock > 0,
    lowStock: availability === 'low_stock' || (stock > 0 && stock <= 5),
    tags: Array.isArray(product.tags) ? product.tags : [],
    popularityScore: Number(product.metrics?.popularityScore || 0),
  };
};

const unwrapList = (payload) => {
  const list = payload?.data?.products || payload?.data || payload?.products || payload;
  return Array.isArray(list) ? list.map(normalizeProduct) : [];
};

const apiErrorMessage = (err, fallback) => {
  const data = err.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((error) => error.message || error.msg).filter(Boolean).join(', ');
  }
  return data?.message || data?.error || err.message || fallback;
};

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    searchTerm: '',
    sort: 'newest',
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.searchTerm.trim()) params.append('q', filters.searchTerm.trim());
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice !== '') params.append('minPrice', filters.minPrice);
      if (filters.maxPrice !== '') params.append('maxPrice', filters.maxPrice);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('limit', '24');

      const response = await productApi.get(`/?${params.toString()}`);
      setProducts(unwrapList(response.data));
      setPagination(response.data?.pagination || null);
    } catch (err) {
      setProducts([]);
      setPagination(null);
      setError(apiErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTrendingProducts = useCallback(async () => {
    try {
      setTrendingLoading(true);
      const response = await productApi.get('/trending?limit=6');
      setTrendingProducts(unwrapList(response.data));
    } catch {
      setTrendingProducts([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const fetchRelatedProducts = useCallback(async (id) => {
    try {
      const response = await productApi.get(`/${id}/related?limit=4`);
      return unwrapList(response.data);
    } catch {
      return [];
    }
  }, []);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await productApi.get('/wishlist');
      const items = response.data?.data?.products || response.data?.data || response.data?.products || [];
      setWishlist(Array.isArray(items) ? items.map((item) => normalizeProduct(item.product || item)) : []);
    } catch {
      setWishlist([]);
    }
  }, []);

  const toggleWishlist = useCallback(async (productId, shouldAdd) => {
    try {
      if (shouldAdd) {
        await productApi.post(`/wishlist/${productId}`, {});
      } else {
        await productApi.delete(`/wishlist/${productId}`);
      }
      await fetchWishlist();
      return { success: true };
    } catch (err) {
      return { success: false, message: apiErrorMessage(err, 'Wishlist action failed') };
    }
  }, [fetchWishlist]);

  const fetchRecentlyViewed = useCallback(async () => {
    try {
      const response = await productApi.get('/recently-viewed');
      setRecentlyViewed(unwrapList(response.data));
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  const fetchSellerProducts = useCallback(async () => {
    try {
      const response = await productApi.get('/seller?limit=50');
      const data = unwrapList(response.data);
      setSellerProducts(data);
      return { success: true, products: data };
    } catch (err) {
      setSellerProducts([]);
      return { success: false, message: apiErrorMessage(err, 'Failed to load seller products') };
    }
  }, []);

  const createSellerProduct = useCallback(async (productData) => {
    try {
      const response = await productApi.post('/', productData);
      const product = response.data?.data ? normalizeProduct(response.data.data) : null;
      await Promise.all([fetchProducts(), fetchSellerProducts(), fetchTrendingProducts()]);
      return { success: true, product, message: response.data?.message || 'Product created successfully' };
    } catch (err) {
      return { success: false, message: apiErrorMessage(err, 'Product creation failed') };
    }
  }, [fetchProducts, fetchSellerProducts, fetchTrendingProducts]);

  const updateSellerProduct = useCallback(async (productId, productData) => {
    try {
      const response = await productApi.patch(`/${productId}`, productData);
      const product = response.data?.data ? normalizeProduct(response.data.data) : null;
      await Promise.all([fetchProducts(), fetchSellerProducts(), fetchTrendingProducts()]);
      return { success: true, product, message: response.data?.message || 'Product updated successfully' };
    } catch (err) {
      return { success: false, message: apiErrorMessage(err, 'Product update failed') };
    }
  }, [fetchProducts, fetchSellerProducts, fetchTrendingProducts]);

  const deleteSellerProduct = useCallback(async (productId) => {
    try {
      const response = await productApi.delete(`/${productId}`);
      await Promise.all([fetchProducts(), fetchSellerProducts(), fetchTrendingProducts()]);
      return { success: true, message: response.data?.message || 'Product deleted successfully' };
    } catch (err) {
      return { success: false, message: apiErrorMessage(err, 'Product delete failed') };
    }
  }, [fetchProducts, fetchSellerProducts, fetchTrendingProducts]);

  const fetchProductById = useCallback(async (id) => {
    try {
      const response = await productApi.get(`/${id}`);
      const product = response.data?.data ? normalizeProduct(response.data.data) : null;
      if (product?.id) {
        productApi.post(`/${product.id}/view`, {}).catch(() => {});
        fetchRecentlyViewed().catch(() => {});
      }
      return product;
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load product'));
      return null;
    }
  }, [fetchRecentlyViewed]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      searchTerm: '',
      sort: 'newest',
    });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);

  useEffect(() => {
    fetchWishlist();
    fetchRecentlyViewed();
  }, [fetchWishlist, fetchRecentlyViewed]);

  const categories = useMemo(() => {
    const values = products.map((product) => product.category).filter(Boolean);
    return [...new Set(values)];
  }, [products]);

  const value = {
    apiBaseUrl: API_BASE_URL,
    products,
    trendingProducts,
    sellerProducts,
    wishlist,
    recentlyViewed,
    loading,
    trendingLoading,
    error,
    filters,
    pagination,
    categories,
    updateFilters,
    resetFilters,
    fetchProducts,
    fetchProductById,
    fetchRelatedProducts,
    fetchWishlist,
    toggleWishlist,
    fetchRecentlyViewed,
    fetchSellerProducts,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within ProductProvider');
  }
  return context;
};
