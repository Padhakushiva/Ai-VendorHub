import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Heart, Star, ImageIcon } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useAuthBridge } from '../context/AuthBridgeContext';

const formatPrice = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProductById, loading, wishlist, toggleWishlist } = useProduct();
  const { requireAuth } = useAuthBridge();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const isWishlisted = useMemo(() => (
    product?.id ? wishlist.some((item) => item.id === product.id || item._id === product.id) : false
  ), [product?.id, wishlist]);

  useEffect(() => {
    const loadProduct = async () => {
      const data = await fetchProductById(id);
      if (data) {
        setProduct(data);
      }
    };
    loadProduct();
  }, [fetchProductById, id]);

  const handleWishlist = async () => {
    if (!product?.id) return;
    if (!requireAuth('Login required to save products in wishlist')) return;
    setWishlistBusy(true);
    await toggleWishlist(product.id, !isWishlisted);
    setWishlistBusy(false);
  };

  const handleCartAction = () => {
    if (!requireAuth('Login required to continue shopping')) return;
    window.alert('Cart service frontend connect hote hi yeh product cart mein add hoga.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Product Not Found</h1>
          <p className="text-slate-400 mb-6">The product you're looking for doesn't exist.</p>
          <Link to="/" className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition mb-8 font-medium"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        {/* Product Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <div>
            <div className="bg-slate-900/50 border border-indigo-500/10 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-16 w-16 text-slate-500" />
              )}
            </div>
            {product.images && product.images.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-6">
                {product.images.map((img, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-indigo-500/10 rounded-lg overflow-hidden aspect-square cursor-pointer hover:border-indigo-500/30 transition">
                    <img src={img} alt={`${product.title} ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            {/* Category & Title */}
            {product.category && (
              <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wide mb-2">
                {product.category}
              </p>
            )}
            <h1 className="text-4xl font-bold text-white mb-4">{product.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < Math.floor(product.ratingAverage || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{Number(product.ratingAverage || 0).toFixed(1)}/5</span>
                <span className="text-slate-400">({product.ratingCount || 0} reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-indigo-500/10">
              <span className="text-4xl font-bold text-white">
                {formatPrice(product.priceAmount, product.currency)}
              </span>
              {product.originalPrice && (
                <span className="text-xl text-slate-500 line-through">
                  ${product.originalPrice?.toFixed(2)}
                </span>
              )}
              {product.discount && (
                <span className="text-lg font-bold text-green-400 ml-4">
                  Save {product.discount}%
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mb-6 pb-6 border-b border-indigo-500/10">
              <h3 className="text-white font-semibold mb-3">Description</h3>
              <p className="text-slate-400 leading-relaxed">
                {product.description || 'No description available'}
              </p>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <span className={`inline-block px-4 py-2 rounded-lg font-semibold text-sm ${product.inStock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
              </span>
            </div>

            {/* Quantity Selector */}
            {product.inStock && (
              <div className="mb-6 pb-6 border-b border-indigo-500/10">
                <label className="text-white font-semibold block mb-3">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-3 py-2 bg-slate-800 border border-indigo-500/20 rounded-lg text-white text-center focus:outline-none focus:border-indigo-500/50"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 flex-col sm:flex-row">
              <button
                onClick={handleCartAction}
                disabled={!product.inStock}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition ${
                  product.inStock
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart size={20} />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={handleWishlist}
                disabled={wishlistBusy}
                className={`px-6 py-3 rounded-lg font-semibold transition border ${
                  isWishlisted
                    ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-70`}
              >
                <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-12 pt-8 border-t border-indigo-500/10 space-y-4">
              <div>
                <p className="text-slate-400 text-sm">SKU: {product.sku || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Free Shipping on orders over $50</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">30-day Money Back Guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
