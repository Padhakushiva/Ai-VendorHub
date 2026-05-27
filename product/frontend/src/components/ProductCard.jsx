import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageIcon, ShoppingCart, Star } from 'lucide-react';
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

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist } = useProduct();
  const { requireAuth } = useAuthBridge();
  const [busyWishlist, setBusyWishlist] = useState(false);
  const image = product.image;
  const isWishlisted = useMemo(() => (
    wishlist.some((item) => item.id === product.id || item._id === product.id)
  ), [product.id, wishlist]);

  // Determine AI badge based on product data
  const getAIBadge = () => {
    const badges = [
      { label: 'AI RECOMMENDED', color: 'from-[#635bff] to-[#8d87ff]', textColor: 'white' },
      { label: '95% MATCH FOR YOU', color: 'from-[#8d87ff] to-[#635bff]', textColor: 'white' },
      { label: 'AI CHOICE', color: 'from-[#635bff] to-[#7b6fff]', textColor: 'white' },
      { label: 'TRENDING WITH DEVS', color: 'from-[#7b6fff] to-[#635bff]', textColor: 'white' },
    ];
    // Pseudo-randomly select badge based on product ID
    const index = (parseInt(product.id?.toString().slice(-2) || 0) || 0) % badges.length;
    return badges[index];
  };

  const getTopRightBadge = () => {
    if (product.lowStock) return { label: 'HOT', color: 'from-[#ff6b35] to-[#ff8c42]', textColor: 'white' };
    if (product.priceAmount && product.priceAmount < 1000) return { label: 'HOT', color: 'from-[#ff6b35] to-[#ff8c42]', textColor: 'white' };
    return null;
  };

  const handleAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleCartAction = (event) => {
    handleAction(event);
    if (!requireAuth('Login required to continue shopping')) return;
    window.alert('Cart service frontend connect hote hi yeh product cart mein add hoga.');
  };

  const handleWishlist = async (event) => {
    handleAction(event);
    if (!requireAuth('Login required to save products in wishlist')) return;
    setBusyWishlist(true);
    await toggleWishlist(product.id, !isWishlisted);
    setBusyWishlist(false);
  };

  return (
    <Link to={`/product/${product.id}`} className="group block h-full">
      <article className="flex h-full min-h-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b24] shadow-[0_14px_38px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-2 hover:border-[#8079ff]/60 hover:shadow-[0_20px_50px_rgba(99,91,255,0.15)]">
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden border-b border-white/10 bg-[#34343d]">
          {image ? (
            <img
              src={image}
              alt={product.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(99,91,255,0.25),transparent_45%),#2a2a34] text-[#aaa6ba]">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#11131d]/40 opacity-0 transition duration-300 group-hover:opacity-100" />
          
          {/* AI Badge - Top Left */}
          {(() => {
            const badge = getAIBadge();
            return (
              <div className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black bg-gradient-to-r ${badge.color} text-${badge.textColor} shadow-[0_4px_12px_rgba(0,0,0,0.3)]`}>
                ✨ {badge.label}
              </div>
            );
          })()}

          {/* HOT Badge - Top Right */}
          {(() => {
            const hotBadge = getTopRightBadge();
            return hotBadge ? (
              <div className={`absolute right-3 top-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black bg-gradient-to-r ${hotBadge.color} text-${hotBadge.textColor} shadow-[0_4px_12px_rgba(255,107,53,0.3)]`}>
                🔥 {hotBadge.label}
              </div>
            ) : null;
          })()}
          
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlist}
            disabled={busyWishlist}
            className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#635bff] to-[#8d87ff] text-white shadow-[0_4px_12px_rgba(99,91,255,0.3)] transition hover:scale-110 disabled:opacity-70"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-5 w-5 transition ${isWishlisted ? 'fill-white scale-125' : ''}`} />
          </button>

          {/* Stock Badge - Bottom Left */}
          <div className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
            product.inStock
              ? product.lowStock
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/20 text-rose-300'
          }`}>
            <span className={`h-2 w-2 rounded-full ${product.inStock ? product.lowStock ? 'bg-amber-400' : 'bg-emerald-400' : 'bg-rose-400'}`} />
            {product.inStock ? (product.lowStock ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-4">
          <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-[#8d87d8]">{product.category || 'General'}</p>

          <h3 className="line-clamp-2 mt-2 min-h-[52px] text-base font-black leading-tight text-[#f0eeff]">{product.title}</h3>
          
          <p className="mt-2 line-clamp-2 min-h-[40px] text-xs font-semibold leading-4 text-[#a89db8]">
            {product.description || 'Premium product from vendor catalog'}
          </p>

          {/* Rating */}
          <div className="mt-3 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((item) => (
                <Star
                  key={item}
                  className={`h-3.5 w-3.5 ${item < Math.round(product.ratingAverage || 0) ? 'fill-amber-400 text-amber-400' : 'text-[#5d5b68]'}`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-[#9491aa]">{Number(product.ratingAverage || 0).toFixed(1)}</span>
          </div>

          {/* Price & Button */}
          <div className="mt-auto pt-4">
            <div className="mb-4 flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#f1efff]">{formatPrice(product.priceAmount, product.currency)}</p>
            </div>
            <button
              type="button"
              onClick={handleCartAction}
              disabled={!product.inStock}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border font-black transition duration-200 text-sm ${
                product.inStock
                  ? 'border-[#635bff] bg-[#635bff]/10 text-[#d0cbff] hover:bg-[#635bff] hover:text-white hover:shadow-[0_8px_20px_rgba(99,91,255,0.3)]'
                  : 'border-white/5 bg-white/5 text-[#666575] cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {product.inStock ? 'Add to Cart' : 'Unavailable'}
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
