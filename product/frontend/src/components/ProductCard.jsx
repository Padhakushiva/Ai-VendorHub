import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cable,
  Camera,
  HardDrive,
  Headphones,
  Heart,
  Home,
  ImageIcon,
  Laptop,
  Package,
  ShoppingCart,
  Smartphone,
  Star,
  Tablet,
  Watch,
} from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useCart } from '../context/CartContext';

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

const CATEGORY_THEMES = [
  {
    match: ['computer', 'electronics', 'laptop', 'workstation'],
    icon: Laptop,
    accent: 'from-slate-100 to-blue-50',
    border: 'hover:border-blue-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-blue-700',
  },
  {
    match: ['audio', 'headphone', 'speaker'],
    icon: Headphones,
    accent: 'from-stone-100 to-rose-50',
    border: 'hover:border-rose-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-rose-700',
  },
  {
    match: ['camera', 'vision'],
    icon: Camera,
    accent: 'from-stone-100 to-amber-50',
    border: 'hover:border-amber-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-amber-700',
  },
  {
    match: ['wearable', 'band', 'watch'],
    icon: Watch,
    accent: 'from-stone-100 to-emerald-50',
    border: 'hover:border-emerald-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-emerald-700',
  },
  {
    match: ['home', 'appliance', 'smart'],
    icon: Home,
    accent: 'from-stone-100 to-lime-50',
    border: 'hover:border-lime-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-lime-700',
  },
  {
    match: ['tablet'],
    icon: Tablet,
    accent: 'from-stone-100 to-cyan-50',
    border: 'hover:border-cyan-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-cyan-700',
  },
  {
    match: ['storage', 'ssd'],
    icon: HardDrive,
    accent: 'from-stone-100 to-yellow-50',
    border: 'hover:border-yellow-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-yellow-700',
  },
  {
    match: ['accessor'],
    icon: Cable,
    accent: 'from-stone-100 to-orange-50',
    border: 'hover:border-orange-200',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-orange-700',
  },
];

const getProductTheme = (product = {}) => {
  const haystack = `${product.category || ''} ${product.title || ''} ${product.brand || ''}`.toLowerCase();
  return CATEGORY_THEMES.find((theme) => theme.match.some((token) => haystack.includes(token))) || {
    icon: Package,
    accent: 'from-stone-100 to-white',
    border: 'hover:border-stone-300',
    button: 'bg-stone-950 text-white hover:bg-emerald-800',
    categoryText: 'text-stone-500',
  };
};

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist } = useProduct();
  const { requireAuth } = useAuthBridge();
  const { addItem, busyItemId } = useCart();
  const [busyWishlist, setBusyWishlist] = useState(false);
  const [cartStatus, setCartStatus] = useState('');
  const image = product.image;
  const theme = getProductTheme(product);
  const ThemeIcon = theme.icon || Smartphone;
  const isWishlisted = useMemo(() => (
    wishlist.some((item) => item.id === product.id || item._id === product.id)
  ), [product.id, wishlist]);

  const getTopRightBadge = () => {
    if (product.lowStock) return { label: 'Limited', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    if (product.priceAmount && product.priceAmount < 1000) return { label: 'Value', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    return null;
  };

  const handleAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleCartAction = async (event) => {
    handleAction(event);
    if (!requireAuth('Login required to continue shopping')) return;
    const result = await addItem(product.id, 1);
    setCartStatus(result.success ? 'Added' : result.message);
    window.setTimeout(() => setCartStatus(''), 1800);
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
      <article className={`flex h-full min-h-[330px] flex-col overflow-hidden rounded-2xl border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,235,0.58))] shadow-[0_14px_36px_rgba(28,25,23,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(28,25,23,0.12)] ${theme.border}`}>
        {/* Image Section */}
        <div className={`relative aspect-[4/3] overflow-hidden border-b border-stone-100 bg-gradient-to-br ${theme.accent}`}>
          {image ? (
            <img
              src={image}
              alt={product.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-stone-950/10 opacity-70 transition duration-300 group-hover:opacity-100" />
          <div className="absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-xl border border-white/80 bg-white/90 text-stone-800 shadow-sm backdrop-blur">
            <ThemeIcon className="h-4 w-4" />
          </div>
          
          {/* HOT Badge - Top Right */}
          {(() => {
            const hotBadge = getTopRightBadge();
            return hotBadge ? (
              <div className={`absolute right-2.5 top-2.5 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black ${hotBadge.className}`}>
                {hotBadge.label}
              </div>
            ) : null;
          })()}
          
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlist}
            disabled={busyWishlist}
            className="absolute bottom-2.5 right-2.5 grid h-9 w-9 place-items-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:scale-105 disabled:opacity-70"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-4 w-4 transition ${isWishlisted ? 'scale-110 fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Stock Badge - Bottom Left */}
          <div className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur ${
            product.inStock
              ? product.lowStock
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
          }`}>
            <span className={`h-2 w-2 rounded-full ${product.inStock ? product.lowStock ? 'bg-amber-400' : 'bg-emerald-400' : 'bg-rose-400'}`} />
            {product.inStock ? (product.lowStock ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-4">
          <p className={`truncate text-[10px] font-black uppercase tracking-[0.16em] ${theme.categoryText}`}>{product.category || 'General'}</p>

          <h3 className="line-clamp-2 mt-1.5 min-h-[40px] text-sm font-black leading-snug text-stone-950">{product.title}</h3>
          
          <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[11px] font-semibold leading-4 text-stone-500">
            {product.description || 'Premium product from vendor catalog'}
          </p>

          {/* Rating */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((item) => (
                <Star
                  key={item}
                  className={`h-3 w-3 ${item < Math.round(product.ratingAverage || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-stone-500">{Number(product.ratingAverage || 0).toFixed(1)}</span>
          </div>

          {/* Price & Button */}
          <div className="mt-auto pt-4">
            <div className="mb-3 flex items-baseline gap-2">
              <p className="text-xl font-black text-stone-950">{formatPrice(product.priceAmount, product.currency)}</p>
            </div>
            <button
              type="button"
              onClick={handleCartAction}
              disabled={!product.inStock || busyItemId === product.id}
              className={`flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-xs font-black transition duration-200 ${
                product.inStock
                  ? `${theme.button} border-transparent shadow-sm`
                  : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {busyItemId === product.id ? 'Adding...' : cartStatus || (product.inStock ? 'Add to Cart' : 'Unavailable')}
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
