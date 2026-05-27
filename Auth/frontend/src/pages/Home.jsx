import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader,
  LogIn,
  PackageSearch,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  User,
  WandSparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { productApi } from '../services/productApi';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'title_asc', label: 'Name A-Z' },
  { value: 'stock_desc', label: 'Stock: High First' },
];

const availabilityMeta = {
  in_stock: { label: 'In stock', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  low_stock: { label: 'Low stock', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  out_of_stock: { label: 'Out of stock', className: 'bg-rose-50 text-rose-700 border-rose-100' },
};

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

const getProductImage = (product) => {
  const firstImage = product?.images?.[0];
  return firstImage?.thumbnail || firstImage?.url || '';
};

const getProductId = (product) => product?._id || product?.id;

const getAvailability = (product) => {
  if (product?.availability) return product.availability;
  const stock = Number(product?.stock || 0);
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 5) return 'low_stock';
  return 'in_stock';
};

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showNotification } = useNotification();
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [wishlistLoadingId, setWishlistLoadingId] = useState('');

  const categories = useMemo(
    () => [...new Set(products.map((item) => item.category).filter(Boolean))].slice(0, 10),
    [products]
  );

  const brands = useMemo(
    () => [...new Set(products.map((item) => item.brand).filter(Boolean))].slice(0, 10),
    [products]
  );

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          limit: 12,
          sort,
          status: 'active',
        };

        if (appliedQuery.trim()) params.q = appliedQuery.trim();
        if (category) params.category = category;
        if (brand) params.brand = brand;

        const [productResponse, trendingResponse] = await Promise.all([
          productApi.get('/api/products', { params }),
          productApi.get('/api/products/trending', { params: { limit: 6 } }).catch(() => null),
        ]);

        setProducts(Array.isArray(productResponse.data?.data) ? productResponse.data.data : []);
        setPagination(productResponse.data?.pagination || null);

        if (trendingResponse?.data?.success) {
          setTrendingProducts(Array.isArray(trendingResponse.data.data) ? trendingResponse.data.data : []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Product service se products load nahi ho paaye.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [appliedQuery, brand, category, page, sort]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query);
  };

  const handleWishlist = async (productId) => {
    if (!isAuthenticated) {
      showNotification('Wishlist ke liye pehle login karna hoga.', 'info');
      navigate('/login');
      return;
    }

    setWishlistLoadingId(productId);
    try {
      await productApi.post(`/api/products/wishlist/${productId}`);
      showNotification('Product wishlist mein add ho gaya.', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Wishlist update nahi ho paayi.', 'error');
    } finally {
      setWishlistLoadingId('');
    }
  };

  const clearFilters = () => {
    setQuery('');
    setAppliedQuery('');
    setCategory('');
    setBrand('');
    setSort('newest');
    setPage(1);
  };

  const totalProducts = pagination?.total ?? products.length;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-4 lg:px-8">
          <Link to="/" className="mr-2 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#11329e] text-white shadow-lg shadow-blue-900/15">
              <Store className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-2xl font-black leading-none tracking-tight text-[#11329e]">VendorHub</span>
              <span className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">AI Commerce</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex">
            <a href="#products" className="transition hover:text-[#11329e]">Shop</a>
            <a href="#trending" className="transition hover:text-[#11329e]">Trending</a>
            <a href="#ai-tools" className="transition hover:text-[#11329e]">AI Assist</a>
          </nav>

          <form onSubmit={handleSearch} className="ml-auto hidden h-12 min-w-[320px] max-w-md flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 md:flex">
            <Search className="h-5 w-5 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, brands, AI tools..."
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </form>

          {isAuthenticated ? (
            <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-[#11329e]/30">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                {(user?.fullName?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
              </span>
              <span className="hidden text-sm font-black text-slate-800 sm:block">Profile</span>
            </Link>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl bg-[#11329e] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/15">
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#11329e] shadow-sm">
              <Sparkles className="h-4 w-4" />
              Product Service Live Catalog
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              Discover AI-powered products from real Product Service.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
              Ye home page backend Product Service se products fetch karta hai, filters apply karta hai, trending items show karta hai, aur buyer actions ke liye ready marketplace experience deta hai.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#products" className="inline-flex items-center gap-2 rounded-2xl bg-[#11329e] px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-900/20">
                Browse Products
                <ArrowRight className="h-4 w-4" />
              </a>
              <button type="button" onClick={clearFilters} className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 shadow-sm">
                Reset Catalog
              </button>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-5 shadow-2xl shadow-slate-300">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(96,165,250,0.35),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(45,212,191,0.28),transparent_24%),linear-gradient(135deg,#020617,#111827_55%,#172554)]" />
            <div className="relative grid h-full content-between">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-xl">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">AI Storefront</p>
                  <p className="mt-1 text-lg font-black">Smart recommendations ready</p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-cyan-200 backdrop-blur-xl">
                  <Bot className="h-7 w-7" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['Products', totalProducts || 'Live', Boxes],
                  ['Trending', trendingProducts.length || 0, WandSparkles],
                  ['Wishlist', 'Ready', Heart],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-xl">
                    <Icon className="mb-5 h-6 w-6 text-cyan-200" />
                    <p className="text-2xl font-black">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="trending" className="mx-auto max-w-7xl px-5 pb-4 lg:px-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#11329e]">Popular Now</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Trending Products</h2>
            </div>
          </div>
          {trendingProducts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {trendingProducts.slice(0, 3).map((product) => (
                <MiniProductCard key={getProductId(product)} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm font-bold text-slate-500">
              Trending products abhi available nahi hain. Jaise hi Product Service mein views, wishlist, cart adds ya orders badhenge, yahan items appear honge.
            </div>
          )}
        </section>

        <section id="products" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <form onSubmit={handleSearch} className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:hidden">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
            </form>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} placeholder="All categories" />
              <FilterSelect label="Brand" value={brand} onChange={setBrand} options={brands} placeholder="All brands" />
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <SlidersHorizontal className="h-4 w-4" />
                  Sort
                </span>
                <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none">
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={clearFilters} className="mt-auto h-12 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-[#11329e]/30 hover:text-[#11329e]">
                Clear
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#11329e]">Marketplace</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">All Products</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {loading ? 'Product Service se loading...' : `${totalProducts} products found`}
              </p>
            </div>
            {pagination && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                  {page} / {totalPages}
                </span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {loading && <CatalogSkeleton />}

          {!loading && error && (
            <div className="rounded-[1.75rem] border border-rose-100 bg-rose-50 p-8 text-center">
              <PackageSearch className="mx-auto h-12 w-12 text-rose-500" />
              <h3 className="mt-4 text-xl font-black text-rose-900">Product Service connect nahi ho paaya</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-rose-700">{error}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-rose-500">Make sure Product server is running on port 3000</p>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-2xl font-black text-slate-900">No products found</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">
                Product Service working hai, but current filters ke according product nahi mila. Seller account se products add karne ke baad yahan automatically show honge.
              </p>
              <button type="button" onClick={clearFilters} className="mt-5 rounded-2xl bg-[#11329e] px-6 py-3 text-sm font-black text-white">
                Clear Filters
              </button>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={getProductId(product)}
                  product={product}
                  onWishlist={handleWishlist}
                  wishlistLoading={wishlistLoadingId === getProductId(product)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options, placeholder }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </label>
);

const ProductCard = ({ product, onWishlist, wishlistLoading }) => {
  const navigate = useNavigate();
  const image = getProductImage(product);
  const availability = getAvailability(product);
  const meta = availabilityMeta[availability] || availabilityMeta.in_stock;
  const productId = getProductId(product);

  const handleProductClick = (e) => {
    // Don't navigate if user clicked on wishlist button
    if (e.target.closest('button[data-action="wishlist"]')) {
      return;
    }
    navigate(`/product/${productId}`);
  };

  return (
    <article 
      onClick={handleProductClick}
      className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200 cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {image ? (
          <img src={image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200">
            <ShoppingBag className="h-14 w-14 text-slate-400" />
          </div>
        )}
        <button
          data-action="wishlist"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onWishlist(productId);
          }}
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-rose-50 hover:text-rose-600"
        >
          {wishlistLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
        </button>
        <span className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>
          {meta.label}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="truncate rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#11329e]">
            {product.category || 'Product'}
          </span>
          <span className="flex items-center gap-1 text-sm font-black text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            {Number(product.rating?.average || 0).toFixed(1)}
          </span>
        </div>
        <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-black leading-7 text-slate-950">{product.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-slate-500">{product.description || 'Smart product listing from VendorHub marketplace.'}</p>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{product.brand || 'VendorHub'}</p>
            <p className="mt-1 text-xl font-black text-[#11329e]">{formatPrice(product.price)}</p>
          </div>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product/${productId}`);
            }}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white transition hover:bg-[#11329e]"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>
        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/product/${productId}`);
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 transition hover:border-[#11329e]/30 hover:text-[#11329e]"
        >
          <Bot className="h-4 w-4" />
          Ask AI about this product
        </button>
      </div>
    </article>
  );
};

const MiniProductCard = ({ product }) => {
  const navigate = useNavigate();
  const productId = getProductId(product);

  return (
    <article 
      onClick={() => navigate(`/product/${productId}`)}
      className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-lg transition"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
        {getProductImage(product) ? (
          <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <ShoppingBag className="h-7 w-7 text-slate-400" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950">{product.title}</p>
        <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{product.brand || product.category || 'Trending'}</p>
        <p className="mt-2 text-sm font-black text-[#11329e]">{formatPrice(product.price)}</p>
      </div>
    </article>
  );
};

const CatalogSkeleton = () => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="aspect-[4/3] animate-pulse bg-slate-200" />
        <div className="space-y-4 p-5">
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-6 w-full animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

export default Home;

