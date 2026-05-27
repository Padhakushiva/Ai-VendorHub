import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Loader,
  ShoppingBag,
  Star,
  Check,
  Truck,
  Shield,
  Bot,
  Share2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { productApi } from '../services/productApi';

const formatPrice = (price = {}) => {
  const amount = Number(price.amount ?? 0);
  const currency = price.currency || 'INR';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
};

const getAvailabilityBadge = (product) => {
  const stock = Number(product?.stock || 0);
  if (stock <= 0) {
    return { label: 'Out of stock', color: 'bg-rose-50 text-rose-700 border-rose-100' };
  }
  if (stock <= 5) {
    return { label: `Low stock (${stock} left)`, color: 'bg-amber-50 text-amber-700 border-amber-100' };
  }
  return { label: 'In stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showNotification } = useNotification();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await productApi.get(`/api/products/${id}`);
        if (response.data?.data) {
          setProduct(response.data.data);
        } else {
          setError('Product details load nahi ho paayi.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Product service se error aya.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showNotification('Cart ke liye pehle login karna hoga.', 'info');
      navigate('/login');
      return;
    }

    setCartLoading(true);
    try {
      await productApi.post('/api/cart', {
        productId: id,
        quantity,
      });
      showNotification(`${quantity} item(s) cart mein add ho gaye!`, 'success');
      setQuantity(1);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Cart mein add nahi ho paayi.', 'error');
    } finally {
      setCartLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      showNotification('Wishlist ke liye pehle login karna hoga.', 'info');
      navigate('/login');
      return;
    }

    setWishlistLoading(true);
    try {
      await productApi.post(`/api/products/wishlist/${id}`);
      setIsWishlisted(!isWishlisted);
      showNotification(
        isWishlisted ? 'Product wishlist se remove ho gaya.' : 'Product wishlist mein add ho gaya.',
        'success'
      );
    } catch (err) {
      showNotification(err.response?.data?.message || 'Wishlist update nahi ho paayi.', 'error');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShare = () => {
    const shareText = `Check out "${product?.title}" on VendorHub AI Commerce!`;
    if (navigator.share) {
      navigator.share({
        title: product?.title,
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification('Product link copy ho gaya!', 'success');
    }
  };

  const images = product?.images || [];
  const currentImage = images[selectedImage]?.url || images[selectedImage]?.thumbnail || '';
  const availability = getAvailabilityBadge(product);
  const inStock = Number(product?.stock || 0) > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-[#11329e] rounded-full animate-spin" />
          <p className="text-slate-600 font-semibold">Product details load ho rahe hain...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center p-5">
        <div className="max-w-md w-full">
          <div className="rounded-[1.75rem] border border-rose-100 bg-rose-50 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
            <h2 className="mt-4 text-xl font-black text-rose-900">Product nahi mila</h2>
            <p className="mt-2 text-sm font-semibold text-rose-700">{error || 'Product details available nahi hain.'}</p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-black text-white hover:bg-rose-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Home par wapas jao
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:border-[#11329e]/30 hover:text-[#11329e]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-500">{product.category}</p>
              <h1 className="truncate text-lg font-black text-slate-950">{product.title}</h1>
            </div>
            <button
              onClick={handleShare}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:border-[#11329e]/30 hover:text-[#11329e]"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.title}
                  className="h-[500px] w-full object-cover"
                />
              ) : (
                <div className="h-[500px] w-full bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 flex items-center justify-center">
                  <ShoppingBag className="h-24 w-24 text-slate-400" />
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`overflow-hidden rounded-lg border-2 transition ${
                      selectedImage === idx
                        ? 'border-[#11329e]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {img.thumbnail || img.url ? (
                      <img
                        src={img.thumbnail || img.url}
                        alt={`View ${idx + 1}`}
                        className="h-20 w-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-full bg-slate-100 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Title & Badge */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className={`inline-block rounded-full border px-3 py-1 text-xs font-black ${availability.color}`}>
                    {availability.label}
                  </span>
                </div>
                <button
                  onClick={handleWishlist}
                  disabled={wishlistLoading}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
                >
                  {wishlistLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-rose-600' : ''}`} />
                  )}
                </button>
              </div>
              <h1 className="text-3xl font-black leading-tight text-slate-950 mb-3">{product.title}</h1>
              
              {/* Rating & Reviews */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(product.rating?.average || 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm font-black text-slate-600">
                    {Number(product.rating?.average || 0).toFixed(1)} ({product.rating?.count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Price</p>
              <div className="text-4xl font-black text-[#11329e]">{formatPrice(product.price)}</div>
              {product.originalPrice && (
                <div className="flex items-center gap-2">
                  <span className="line-through text-slate-400">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-600">
                    {Math.round((1 - product.price.amount / product.originalPrice.amount) * 100)}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-slate-500">About this product</h2>
              <p className="leading-7 text-slate-600">{product.description || 'No description available.'}</p>
            </div>

            {/* Product Info */}
            {(product.brand || product.sku || product.category) && (
              <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                {product.brand && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Brand</p>
                    <p className="mt-1 font-black text-slate-950">{product.brand}</p>
                  </div>
                )}
                {product.sku && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">SKU</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-700">{product.sku}</p>
                  </div>
                )}
                {product.category && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Category</p>
                    <p className="mt-1 font-black text-slate-950">{product.category}</p>
                  </div>
                )}
              </div>
            )}

            {/* Shipping & Guarantees */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Truck className="h-6 w-6 shrink-0 text-[#11329e]" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">Free Shipping</p>
                  <p className="text-xs text-slate-600">Orders above ₹499</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Shield className="h-6 w-6 shrink-0 text-[#11329e]" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">Secure</p>
                  <p className="text-xs text-slate-600">100% Protected</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              {/* Quantity Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">Quantity:</span>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={!inStock}
                    className="px-3 py-2 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="px-4 font-bold text-slate-950 text-center min-w-[2rem]">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={!inStock}
                    className="px-3 py-2 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-500 ml-auto">{product.stock || 0} available</span>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={!inStock || cartLoading}
                className="w-full rounded-xl bg-[#11329e] px-6 py-4 font-black text-white transition hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cartLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Adding to cart...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    {inStock ? 'Add to Cart' : 'Out of Stock'}
                  </>
                )}
              </button>

              {/* AI Assistant Button */}
              <button className="w-full rounded-xl border border-slate-200 px-6 py-4 font-black text-slate-800 transition hover:border-[#11329e]/30 hover:text-[#11329e] flex items-center justify-center gap-2">
                <Bot className="h-5 w-5" />
                Ask AI about this product
              </button>
            </div>

            {/* Additional Info */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#11329e]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seller Info Card */}
        {product.sellerId && (
          <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#11329e] to-blue-700 flex items-center justify-center text-white font-black text-xl">
                {product.sellerName?.[0] || 'S'}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">
                  {product.sellerName || 'Seller'}
                </h3>
                <p className="text-sm text-slate-600">Verified Seller on VendorHub</p>
              </div>
            </div>
            <p className="text-slate-600 mb-4">
              {product.sellerDescription || 'Quality products from trusted sellers on VendorHub AI Commerce.'}
            </p>
            <button className="rounded-xl border border-[#11329e] px-6 py-3 font-bold text-[#11329e] hover:bg-blue-50">
              View Store
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductDetail;
