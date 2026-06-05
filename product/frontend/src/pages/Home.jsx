import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  BadgePercent,
  Bot,
  Boxes,
  Cable,
  Camera,
  Clock,
  Eye,
  Filter,
  HardDrive,
  Headphones,
  Home as HomeIcon,
  Laptop,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tablet,
  TrendingUp,
  Watch,
} from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import AIControlCenter from '../components/AIControlCenter';
import AIChatBot from '../components/AIChatBot';
import AISmartFilterBanner from '../components/AISmartFilterBanner';
import CategoryFilterBar from '../components/CategoryFilterBar';

const heroSlides = [
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=2200&q=85',
];

const promoBanners = [
  {
    tag: 'VendorHub Sale',
    headline: 'Extra discounts for smart shoppers',
    strip: 'Early access for premium members',
    badgeTop: 'AI',
    badgeMid: 'Deals',
    badgeBottom: 'Sale',
    bg: '#d73a20',
    shapeA: '#f97316',
    shapeB: '#f59e0b',
    stripBg: '#facc15',
    text: '#ffe500',
    badgeTopBg: '#c92c13',
    badgeMidBg: '#facc15',
  },
  {
    tag: 'Creator Week',
    headline: 'Power picks for work and gaming',
    strip: 'Laptops, tablets, audio and desk upgrades',
    badgeTop: 'Pro',
    badgeMid: 'Gear',
    badgeBottom: 'Drop',
    bg: '#1d4ed8',
    shapeA: '#38bdf8',
    shapeB: '#0f172a',
    stripBg: '#67e8f9',
    text: '#ffffff',
    badgeTopBg: '#0f172a',
    badgeMidBg: '#67e8f9',
  },
  {
    tag: 'Home Upgrade',
    headline: 'Smart home deals are live now',
    strip: 'Security, appliances, charging and comfort picks',
    badgeTop: 'Hot',
    badgeMid: 'Home',
    badgeBottom: 'Sale',
    bg: '#047857',
    shapeA: '#22c55e',
    shapeB: '#facc15',
    stripBg: '#bbf7d0',
    text: '#fef3c7',
    badgeTopBg: '#065f46',
    badgeMidBg: '#bbf7d0',
  },
];

const demoProducts = [
  {
    id: 'demo-bottle',
    title: 'DFit Water Bottles & Flasks',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80',
    priceAmount: 799,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-laptop',
    title: 'Gaming Laptops',
    category: 'Computers',
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80',
    priceAmount: 59999,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-scale',
    title: 'Dr Trust Weighing Scales',
    category: 'Home Appliances',
    image: 'https://images.unsplash.com/photo-1576511746521-70e09b63e19e?auto=format&fit=crop&w=900&q=80',
    priceAmount: 1499,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-rollon',
    title: 'Deodorant Roll-ons',
    category: 'Personal Care',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80',
    priceAmount: 349,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-headphones',
    title: 'Studio Wireless Headphones',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    priceAmount: 8999,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-watch',
    title: 'Pulse Smart Watch',
    category: 'Wearables',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    priceAmount: 3999,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-camera',
    title: 'Vision Home Camera',
    category: 'Cameras',
    image: 'https://images.unsplash.com/photo-1580584126903-c17d41830450?auto=format&fit=crop&w=900&q=80',
    priceAmount: 6999,
    currency: 'INR',
    inStock: true,
  },
  {
    id: 'demo-tablet',
    title: 'Creator Tablet',
    category: 'Tablets',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
    priceAmount: 24999,
    currency: 'INR',
    inStock: true,
  },
];

export default function Home() {
  const { products, trendingProducts, recentlyViewed, homepageSections, loading, error, filters, updateFilters, resetFilters } = useProduct();
  const [showFilters, setShowFilters] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('vendorhub_recent_product_searches') || '[]');
    } catch {
      return [];
    }
  });

  const categories = useMemo(() => {
    const values = products.map((product) => product.category).filter(Boolean);
    return [...new Set(values)];
  }, [products]);

  const aiInsights = useMemo(() => buildCatalogInsights(products), [products]);
  const featuredProducts = (trendingProducts.length ? trendingProducts : products).slice(0, 4);
  const suggestions = useMemo(() => buildAiProductSuggestions(products, searchQuery), [products, searchQuery]);
  const personalized = useMemo(() => buildPersonalizedShelf(products, recentlyViewed, recentSearches), [products, recentlyViewed, recentSearches]);
  const activeStatus = error ? 'Service issue detected' : products.length ? 'Live Product Service' : 'Waiting for real products';
  const showcaseProducts = products.length ? products : demoProducts;
  const homepageByPlacement = useMemo(() => groupHomepageSections(homepageSections), [homepageSections]);
  const productShowcases = useMemo(() => buildProductShowcases(showcaseProducts, trendingProducts), [showcaseProducts, trendingProducts]);
  const hasDynamicHomepage = homepageSections.length > 0;
  const hasDynamicProductRows = homepageSections.some((section) => !HOMEPAGE_BANNER_TYPES.includes(section.type) && section.products?.length);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const saveRecentSearch = (query) => {
    const nextSearches = [query, ...recentSearches.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 5);
    setRecentSearches(nextSearches);
    window.localStorage.setItem('vendorhub_recent_product_searches', JSON.stringify(nextSearches));
  };

  const runProductSearch = (query = searchQuery) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    saveRecentSearch(cleanQuery);
    updateFilters({ searchTerm: cleanQuery });
    setSearchQuery('');
    setSearchFocused(false);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleHeroSearch = (event) => {
    event.preventDefault();
    runProductSearch();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_8%_10%,rgba(245,158,11,0.10),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(16,185,129,0.10),transparent_30%),linear-gradient(135deg,#fbfaf7_0%,#f3efe5_48%,#eef5ed_100%)] text-stone-950">
      <section className="relative overflow-hidden px-6 pb-10 pt-4 sm:px-10 lg:px-16 2xl:px-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,251,235,0.76)_48%,rgba(236,253,245,0.70))] shadow-[0_26px_70px_rgba(28,25,23,0.10)] backdrop-blur-xl">
          {/* Hero Image */}
          <div className="absolute inset-y-0 right-0 hidden w-[45%] overflow-hidden lg:block">
            {heroSlides.map((image, index) => (
              <div
                key={image}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === heroIndex ? 'opacity-100' : 'opacity-0'}`}
                style={{ backgroundImage: `url(${image})` }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-white" />
          </div>

          <div className="relative grid min-h-[520px] items-center gap-8 px-6 pb-16 pt-14 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-16">
            <div className="max-w-4xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-6 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-800">
                <Sparkles className="h-4 w-4" />
                <span>Premium Marketplace</span>
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
                Discover Premium Products
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-stone-600 sm:text-lg">
                Experience AI-powered shopping with real-time catalog, intelligent filters, smart recommendations and seamless checkout.
              </p>

              <form onSubmit={handleHeroSearch} className="relative mt-10 flex max-w-3xl flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-2 shadow-sm sm:flex-row">
                <div className="flex h-14 flex-1 items-center gap-3 rounded-xl bg-white px-4">
                  <Search className="h-5 w-5 text-stone-400" />
                  <input
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Find phones, laptops, electronics, accessories..."
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 rounded-xl bg-stone-950 px-8 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
                >
                  Search
                </button>
                {searchFocused && (searchQuery || suggestions.length > 0 || recentSearches.length > 0) && (
                  <div className="absolute left-2 right-2 top-[calc(100%+10px)] z-30 rounded-xl border border-stone-200 bg-white p-4 text-left shadow-2xl">
                    <div className="mb-3 flex items-center gap-2 px-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Suggestions
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {suggestions.map((product) => (
                        <a
                          key={product.id}
                          href={`/product/${product.id}`}
                          onClick={() => saveRecentSearch(searchQuery || product.title)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-stone-50"
                        >
                          <div className="h-10 w-10 overflow-hidden rounded-lg bg-stone-100">
                            {product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-stone-950">{product.title}</p>
                            <p className="truncate text-xs font-bold text-stone-500">{product.category || 'General'} - ₹{product.priceAmount}</p>
                          </div>
                        </a>
                      ))}
                      {!suggestions.length && searchQuery && (
                        <button type="button" onClick={() => runProductSearch(searchQuery)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-black text-stone-950 transition hover:bg-stone-50">
                          Search for "{searchQuery}"
                        </button>
                      )}
                      {!searchQuery && recentSearches.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-2 py-1">
                          {recentSearches.map((item) => (
                            <button key={item} type="button" onClick={() => runProductSearch(item)} className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-stone-50">
                              <Clock className="mr-1 inline h-3 w-3" />
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>

              {/* Quick Filters */}
              <div className="mt-6 flex max-w-2xl flex-wrap items-center gap-3">
                {['Electronics', 'Best value', 'Camera phone'].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => runProductSearch(prompt)}
                    className="rounded-full border border-stone-200 bg-white px-5 py-2 text-xs font-bold text-stone-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* AI Smart Filter Banner */}
      <section className="bg-transparent px-6 py-6 sm:px-10 lg:px-16 2xl:px-24">
        <div className="w-full">
          <AISmartFilterBanner
            suggestion="Find 4K monitors with low blue light for productivity"
            onApply={() => updateFilters({ searchTerm: '4K monitor low blue light' })}
          />
        </div>
      </section>

      {/* Category Filter Bar */}
      <section className="bg-transparent px-6 py-4 sm:px-10 lg:px-16 2xl:px-24">
        <div className="w-full">
          <CategoryFilterBar
            categories={categories}
            selectedCategory={filters.category}
            onCategoryChange={(cat) => updateFilters({ category: cat })}
            topCategories={['Computers', 'Audio', 'Cameras', 'Wearables']}
          />
        </div>
      </section>

      <HomepagePlacementBlock
        sections={(hasDynamicHomepage && homepageByPlacement.after_categories?.length > 0) ? homepageByPlacement.after_categories : [promoBanners[0]]}
        onOpen={runProductSearch}
      />

      <HomepagePlacementBlock
        sections={(hasDynamicHomepage && homepageByPlacement.after_stats?.length > 0) ? homepageByPlacement.after_stats : [promoBanners[1]]}
        fallbackQuery="laptop audio tablet"
        onOpen={runProductSearch}
      />

      {!hasDynamicProductRows && productShowcases.length > 0 && (
        <section className="bg-transparent px-6 py-12 sm:px-10 lg:px-16 2xl:px-24">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-4xl font-black text-stone-950">Suggested For You</h2>
              <p className="mt-2 text-base font-medium text-stone-600">
                Discover curated products based on your interests and preferences.
              </p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-950 text-2xl font-black text-white shadow-sm transition hover:scale-105 hover:bg-emerald-800"
              aria-label="View full catalog"
            >
              →
            </button>
          </div>

          <div className="space-y-10">
            {productShowcases.map((showcase, index) => (
              <ProductShowcase key={showcase.title} showcase={showcase} variant={index % 5} onExplore={runProductSearch} />
            ))}
          </div>
        </section>
      )}

      <HomepagePlacementBlock
        sections={(hasDynamicHomepage && homepageByPlacement.before_catalog?.length > 0) ? homepageByPlacement.before_catalog : [promoBanners[2]]}
        fallbackQuery="smart home"
        onOpen={runProductSearch}
      />

      {/* Premium Catalog Section */}
      <section id="catalog" className="w-full bg-transparent px-6 py-12 text-stone-950 sm:px-10 lg:px-16 2xl:px-24">
        {/* Status & Header */}
        <div className="mb-10 space-y-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${error ? 'bg-amber-400' : products.length ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              {activeStatus}
            </div>
            <h2 className="text-3xl font-black text-stone-950">
              Showing {products.length} Premium Products
            </h2>
            <p className="mt-2 text-base font-medium text-stone-600">
              {filters.searchTerm ? `Search results for: "${filters.searchTerm}"` : 'Explore our complete product catalog'}
            </p>
          </div>

          {/* Filter Controls Row */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-white/75 bg-white/72 p-5 shadow-sm backdrop-blur-xl">
            {/* Categories Filter */}
            <div className="flex h-11 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 text-sm font-bold text-stone-700 transition hover:bg-white">
              <Filter className="h-4 w-4" />
              <select
                value={filters.category}
                onChange={(event) => updateFilters({ category: event.target.value })}
                className="bg-transparent font-medium text-stone-950 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price Min */}
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={(event) => updateFilters({ minPrice: event.target.value })}
              placeholder="Min Price"
              className="h-10 w-24 rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs font-bold text-stone-950 outline-none placeholder:text-stone-400 focus:border-emerald-400"
            />

            {/* Price Max */}
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(event) => updateFilters({ maxPrice: event.target.value })}
              placeholder="Max Price"
              className="h-10 w-24 rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs font-bold text-stone-950 outline-none placeholder:text-stone-400 focus:border-emerald-400"
            />

            {/* Sort */}
            <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-bold">
              <SlidersHorizontal className="h-4 w-4 text-stone-500" />
              <select
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value })}
                className="bg-transparent text-stone-950 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Low Price</option>
                <option value="price_desc">High Price</option>
                <option value="title_asc">A to Z</option>
                <option value="stock_desc">Stock</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetFilters}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-xs font-black text-white transition hover:bg-emerald-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Product Service API response issue: {error}. Backend fix hote hi products yahan automatically show honge.</span>
          </div>
        )}

        {/* AI Insights Modal */}
        {showAIInsights && (
          <div className="fixed inset-0 z-40 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAIInsights(false)} />
            <div className="relative z-50 mx-auto my-8 max-w-4xl rounded-3xl border border-[#635bff]/40 bg-gradient-to-br from-[#1a1a2e] via-[#16171f] to-[#0f1119] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
              <button
                onClick={() => setShowAIInsights(false)}
                className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-[#aaa6ba] hover:bg-white/5"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <AiCatalogPanel insights={aiInsights} products={products} featuredProducts={featuredProducts} onReset={resetFilters} />
              {personalized.hasSignals && (
                <div className="mt-8">
                  <AIPersonalizedShelf personalized={personalized} onSearch={runProductSearch} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="min-w-0">
          {loading ? (
            <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[380px] animate-pulse rounded-2xl border border-stone-200 bg-white" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((product, index) => (
                <ProductCard key={product.id || index} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <Boxes className="mx-auto mb-3 h-10 w-10 text-stone-400" />
              <h3 className="text-xl font-black text-stone-950">No products found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-stone-500">
                Try adjusting your filters or search to find what you're looking for.
              </p>
              <button type="button" onClick={resetFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-950 px-5 py-3 text-sm font-black text-white">
                <RotateCcw className="h-4 w-4" />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Filter Modal */}
      <FilterSidebar isOpen={showFilters} onClose={() => setShowFilters(false)} categories={categories} />

      {/* AI Control Center - Floating Button */}
      <AIControlCenter
        onAIInsights={() => setShowAIInsights(true)}
        onFilters={() => setShowFilters(true)}
        aiActive={showAIInsights}
        filterActive={showFilters}
      />

      {/* AI Chat Bot */}
      <AIChatBot products={products} />
    </div>
  );
}

const buildCatalogInsights = (products) => {
  const inStock = products.filter((product) => product.inStock);
  const lowStock = products.filter((product) => product.lowStock);
  const cheapest = [...products].sort((a, b) => a.priceAmount - b.priceAmount)[0];
  const topRated = [...products].sort((a, b) => b.ratingAverage - a.ratingAverage)[0];
  const categoryCounts = products.reduce((acc, product) => {
    if (product.category) acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    inStockCount: inStock.length,
    lowStockCount: lowStock.length,
    cheapest,
    topRated,
    topCategory: topCategory ? `${topCategory[0]} (${topCategory[1]})` : 'No category yet',
    summary: products.length
      ? `${products.length} real products analyzed. ${inStock.length} in stock, ${lowStock.length} low-stock, top category ${topCategory?.[0] || 'not available'}.`
      : 'AI insights will activate when Product Service returns products.',
  };
};

const scoreProductForQuery = (product, query) => {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searchable = [
    product.title,
    product.category,
    product.brand,
    product.description,
    ...(product.tags || []),
  ].join(' ').toLowerCase();

  return tokens.reduce((score, token) => (
    searchable.includes(token) ? score + (product.title?.toLowerCase().includes(token) ? 3 : 1) : score
  ), 0);
};

const buildAiProductSuggestions = (products, query) => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return products.slice(0, 3);

  return products
    .map((product) => ({ product, score: scoreProductForQuery(product, cleanQuery) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.product.ratingAverage - a.product.ratingAverage)
    .slice(0, 4)
    .map((item) => item.product);
};

const buildPersonalizedShelf = (products, recentlyViewed = [], recentSearches = []) => {
  const signalText = [
    ...recentSearches,
    ...recentlyViewed.map((product) => `${product.title} ${product.category} ${product.brand}`),
  ].join(' ');

  const suggestedProducts = signalText
    ? products
      .map((product) => ({ product, score: scoreProductForQuery(product, signalText) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
    : products;

  const categoryCounts = suggestedProducts.reduce((acc, product) => {
    if (product.category) acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  const categories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => ({ category, count }));

  return {
    hasSignals: Boolean(recentSearches.length || recentlyViewed.length),
    recentSearches,
    viewed: recentlyViewed.slice(0, 3),
    categories,
    products: suggestedProducts.slice(0, 3),
  };
};

const CATEGORY_TILE_THEMES = [
  {
    match: ['computer', 'electronics', 'workstation'],
    icon: Laptop,
    accent: 'from-[#dbeafe] to-[#60a5fa]',
    panel: 'from-[#0f4c81] via-[#0b253f] to-[#07111f]',
    label: 'Performance gear and smart devices',
  },
  {
    match: ['audio', 'headphone'],
    icon: Headphones,
    accent: 'from-[#fce7f3] to-[#f472b6]',
    panel: 'from-[#7f1d5a] via-[#321123] to-[#130914]',
    label: 'Sound, music, calls, and focus',
  },
  {
    match: ['camera', 'vision'],
    icon: Camera,
    accent: 'from-[#ffedd5] to-[#fb923c]',
    panel: 'from-[#8a3a0a] via-[#3a1808] to-[#140b05]',
    label: 'Security and visual capture tools',
  },
  {
    match: ['wearable', 'band', 'watch'],
    icon: Watch,
    accent: 'from-[#dcfce7] to-[#22c55e]',
    panel: 'from-[#166534] via-[#063c35] to-[#051513]',
    label: 'Health, fitness, and daily tracking',
  },
  {
    match: ['home', 'appliance', 'smart'],
    icon: HomeIcon,
    accent: 'from-[#ede9fe] to-[#a78bfa]',
    panel: 'from-[#4c1d95] via-[#261144] to-[#10091d]',
    label: 'Automation, comfort, and home care',
  },
  {
    match: ['tablet'],
    icon: Tablet,
    accent: 'from-[#cffafe] to-[#22d3ee]',
    panel: 'from-[#155e75] via-[#083344] to-[#06131a]',
    label: 'Portable creation and entertainment',
  },
  {
    match: ['storage', 'ssd'],
    icon: HardDrive,
    accent: 'from-[#fef9c3] to-[#eab308]',
    panel: 'from-[#854d0e] via-[#3f2206] to-[#171006]',
    label: 'Backup, transfer, and secure files',
  },
  {
    match: ['accessor'],
    icon: Cable,
    accent: 'from-[#ffe4e6] to-[#fb7185]',
    panel: 'from-[#881337] via-[#3f0b1c] to-[#150812]',
    label: 'Desk essentials and add-ons',
  },
];

const getCategoryTileTheme = (category = '') => {
  const value = category.toLowerCase();
  return CATEGORY_TILE_THEMES.find((theme) => theme.match.some((token) => value.includes(token))) || {
    icon: ShoppingBag,
    accent: 'from-[#f1f5f9] to-[#94a3b8]',
    panel: 'from-[#334155] via-[#172033] to-[#08111f]',
    label: 'Curated marketplace products',
  };
};

const buildCategoryTiles = (products = []) => {
  const counts = products.reduce((acc, product) => {
    if (product.category) acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, count]) => ({
      category,
      count,
      ...getCategoryTileTheme(category),
    }));
};

const uniqueProducts = (items = []) => {
  const seen = new Set();
  return items.filter((product) => {
    const id = product.id || product._id || product.title;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const HOMEPAGE_BANNER_TYPES = ['banner', 'split_banner', 'coupon_banner', 'mini_banner', 'gif_banner'];
const HOMEPAGE_SECTION_TYPES = [
  ...HOMEPAGE_BANNER_TYPES,
  'product_row',
  'product_grid',
  'featured_split',
  'compact_deals',
  'category_tiles',
  'mosaic_grid',
  'editorial_stack',
  'brand_marquee',
];

const groupHomepageSections = (sections = []) => {
  const groups = {
    after_categories: [],
    after_stats: [],
    before_catalog: [],
  };

  sections
    .filter((section) => HOMEPAGE_SECTION_TYPES.includes(section.type))
    .forEach((section) => {
      const placement = groups[section.placement] ? section.placement : 'after_categories';
      groups[placement].push(section);
    });

  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  });

  return groups;
};

const mergeBannerTheme = (banner = {}) => ({
  tag: banner.tag || banner.title || 'VendorHub Sale',
  headline: banner.headline || banner.title || 'Fresh marketplace offer',
  strip: banner.strip || banner.subtitle || 'Limited time marketplace picks',
  badgeTop: banner.badgeTop || 'AI',
  badgeMid: banner.badgeMid || 'Deals',
  badgeBottom: banner.badgeBottom || 'Sale',
  query: banner.query || banner.title || '',
  link: banner.link || '',
  mediaUrl: banner.mediaUrl || '',
  mediaAlt: banner.mediaAlt || '',
  bg: banner.theme?.bg || banner.bg || '#d73a20',
  shapeStyle: banner.theme?.shapeStyle || banner.shapeStyle || 'circles',
  shapeA: banner.theme?.shapeA || banner.shapeA || '#f97316',
  shapeB: banner.theme?.shapeB || banner.shapeB || '#f59e0b',
  stripBg: banner.theme?.stripBg || banner.stripBg || '#facc15',
  text: banner.theme?.text || banner.text || '#ffe500',
  badgeTopBg: banner.theme?.badgeTopBg || banner.badgeTopBg || '#c92c13',
  badgeMidBg: banner.theme?.badgeMidBg || banner.badgeMidBg || '#facc15',
});

const HomepagePlacementBlock = ({ sections = [], fallbackQuery = '', onOpen }) => {
  if (!sections.length) return null;

  const banners = sections.filter((section) => !section.type || HOMEPAGE_BANNER_TYPES.includes(section.type));
  const modules = sections.filter((section) => section.type && !HOMEPAGE_BANNER_TYPES.includes(section.type));

  return (
    <section className="bg-transparent px-6 py-8 sm:px-10 lg:px-16 2xl:px-24">
      <div className="space-y-10">
        {banners.length > 0 && <BannerCarousel banners={banners} fallbackQuery={fallbackQuery} onOpen={onOpen} />}
        {modules.map((section, index) => (
          <DynamicHomepageModule key={section.id || `${section.type}-${section.title}-${index}`} section={section} index={index} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
};

const BannerCarousel = ({ banners = [], fallbackQuery = '', onOpen }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBanner = banners[activeIndex] || banners[0];

  const move = (direction) => {
    setActiveIndex((current) => {
      const next = current + direction;
      if (next < 0) return banners.length - 1;
      if (next >= banners.length) return 0;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <div key={banner.id || `${banner.title}-${index}`} className="w-full shrink-0 px-1">
              <BannerFrame banner={banner} fallbackQuery={fallbackQuery} onOpen={onOpen} />
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-lg font-black text-stone-950 shadow-sm transition hover:bg-stone-50" aria-label="Previous banner">
            ‹
          </button>
          <div className="flex gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id || `${banner.title}-dot-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition ${index === activeIndex ? 'w-9 bg-stone-950' : 'w-2.5 bg-stone-300 hover:bg-stone-400'}`}
                aria-label={`Show banner ${index + 1}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-lg font-black text-stone-950 shadow-sm transition hover:bg-stone-50" aria-label="Next banner">
            ›
          </button>
          <span className="sr-only">{activeBanner?.title}</span>
        </div>
      )}
    </div>
  );
};

const BannerFrame = ({ banner, fallbackQuery = '', onOpen }) => {
  if (banner.type === 'split_banner') return <SplitPromoBanner banner={banner} fallbackQuery={fallbackQuery} onOpen={onOpen} />;
  if (banner.type === 'coupon_banner') return <CouponBanner banner={banner} fallbackQuery={fallbackQuery} onOpen={onOpen} />;
  if (banner.type === 'mini_banner') return <MiniAnnouncementBanner banner={banner} fallbackQuery={fallbackQuery} onOpen={onOpen} />;
  if (banner.type === 'gif_banner') return <GifBanner banner={banner} fallbackQuery={fallbackQuery} onOpen={onOpen} />;
  return <PromoBanner banner={banner} fallbackQuery={fallbackQuery} onOpen={onOpen} />;
};

const openBannerAction = (displayBanner, fallbackQuery, onOpen) => {
  if (displayBanner.link) {
    window.location.href = displayBanner.link;
    return;
  }
  onOpen(displayBanner.query || fallbackQuery || displayBanner.headline);
};

const getBannerShapeStyle = (banner = {}) => {
  const shapeA = banner.shapeA || '#f97316';
  const shapeB = banner.shapeB || '#f59e0b';

  switch (banner.shapeStyle) {
    case 'diagonal':
      return { background: `linear-gradient(135deg, transparent 0 26%, ${shapeA} 27% 42%, transparent 43% 58%, ${shapeB} 59% 74%, transparent 75% 100%)` };
    case 'waves':
      return { background: `radial-gradient(ellipse at 12% 22%, ${shapeA} 0 18%, transparent 19%), radial-gradient(ellipse at 70% 88%, ${shapeB} 0 22%, transparent 23%), repeating-radial-gradient(circle at 50% 120%, transparent 0 28px, rgba(255,255,255,0.12) 29px 33px)` };
    case 'burst':
      return { background: `conic-gradient(from 20deg at 72% 34%, ${shapeA}, transparent 18deg, ${shapeB} 36deg, transparent 54deg, ${shapeA} 72deg, transparent 90deg)` };
    case 'blocks':
      return { background: `linear-gradient(90deg, ${shapeA} 0 18%, transparent 18% 34%, ${shapeB} 34% 52%, transparent 52% 72%, ${shapeA} 72% 100%)` };
    case 'spotlight':
      return { background: `radial-gradient(circle at 76% 22%, ${shapeB} 0 24%, transparent 25%), radial-gradient(circle at 20% 70%, ${shapeA} 0 18%, transparent 19%)` };
    case 'circles':
    default:
      return { background: `radial-gradient(circle at 12% 28%, ${shapeA} 0 18%, transparent 19%), radial-gradient(circle at 78% 12%, ${shapeB} 0 16%, transparent 17%), linear-gradient(135deg, transparent 0 34%, rgba(0,0,0,0.12) 35% 44%, transparent 45% 100%)` };
  }
};

const PromoBanner = ({ banner, fallbackQuery = '', onOpen }) => {
  const displayBanner = mergeBannerTheme(banner);
  const openBanner = () => openBannerAction(displayBanner, fallbackQuery, onOpen);

  return (
  <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_22px_58px_rgba(28,25,23,0.12)]">
    <div className="relative min-h-[210px] overflow-hidden px-6 py-8 text-white sm:px-10 lg:px-14" style={{ backgroundColor: displayBanner.bg }}>
      <div className="absolute inset-0 opacity-60 mix-blend-soft-light" style={getBannerShapeStyle(displayBanner)} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/24 via-black/8 to-transparent" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-4xl">
          <p className="mb-3 inline-flex rounded-full border border-white/45 bg-white/90 px-4 py-1 text-xs font-black uppercase tracking-[0.16em] text-stone-950 shadow-sm">
            {displayBanner.tag}
          </p>
          <h2 className="max-w-5xl text-4xl font-black leading-[1.02] tracking-tight text-white drop-shadow-sm sm:text-6xl lg:text-7xl">
            {displayBanner.headline}
          </h2>
        </div>
        <div className="relative shrink-0 rounded-2xl border border-white/35 bg-white/18 px-5 py-4 text-center shadow-lg backdrop-blur">
          <p className="text-2xl font-black text-white">{displayBanner.badgeTop}</p>
          <p className="mt-1 rounded-md bg-white px-4 py-1 text-2xl font-black text-stone-950">{displayBanner.badgeMid}</p>
          <p className="mt-2 text-3xl font-black uppercase text-white">{displayBanner.badgeBottom}</p>
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-2 px-6 py-4 text-lg font-black text-stone-950 sm:flex-row sm:items-center sm:justify-between sm:px-10" style={{ backgroundColor: displayBanner.stripBg }}>
      <span>{displayBanner.strip}</span>
      <button
        type="button"
        onClick={openBanner}
        className="inline-flex h-11 w-16 items-center justify-center rounded-full bg-stone-950 text-white transition hover:scale-105 hover:bg-emerald-800"
        aria-label={`Open ${displayBanner.tag}`}
      >
        →
      </button>
    </div>
  </div>
  );
};

const SplitPromoBanner = ({ banner, fallbackQuery = '', onOpen }) => {
  const displayBanner = mergeBannerTheme(banner);
  return (
    <div className="overflow-hidden rounded-[28px] border-[3px] border-[#151515] bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)]">
      <div className="grid min-h-[260px] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden px-6 py-8 sm:px-10 lg:px-14" style={{ backgroundColor: displayBanner.bg }}>
          <div className="absolute inset-0 opacity-70" style={getBannerShapeStyle(displayBanner)} />
          <div className="relative">
            <p className="inline-flex rounded-full border-[3px] border-black px-4 py-1 text-sm font-black uppercase text-black shadow-[5px_5px_0_#000]" style={{ backgroundColor: displayBanner.stripBg }}>{displayBanner.tag}</p>
            <h2 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[0.96] [text-shadow:4px_4px_0_#050505] sm:text-6xl" style={{ color: displayBanner.text }}>{displayBanner.headline}</h2>
            <p className="mt-5 max-w-2xl text-lg font-black text-white/85">{displayBanner.strip}</p>
          </div>
        </div>
        <div className="flex items-center justify-center bg-[#f6f6f6] p-8">
          <button type="button" onClick={() => openBannerAction(displayBanner, fallbackQuery, onOpen)} className="group rotate-2 rounded-[28px] border-[4px] border-black bg-white p-5 text-center shadow-[10px_10px_0_#111] transition hover:rotate-0 hover:scale-105">
            <p className="rounded-xl px-8 py-2 text-4xl font-black text-white" style={{ backgroundColor: displayBanner.badgeTopBg }}>{displayBanner.badgeTop}</p>
            <p className="mt-2 rounded-xl px-8 py-2 text-4xl font-black text-black" style={{ backgroundColor: displayBanner.badgeMidBg }}>{displayBanner.badgeMid}</p>
            <p className="mt-3 text-4xl font-black uppercase" style={{ color: displayBanner.badgeTopBg }}>{displayBanner.badgeBottom}</p>
          </button>
        </div>
      </div>
    </div>
  );
};

const CouponBanner = ({ banner, fallbackQuery = '', onOpen }) => {
  const displayBanner = mergeBannerTheme(banner);
  return (
    <div className="relative overflow-hidden rounded-[28px] border-[3px] border-[#151515] shadow-[0_18px_0_rgba(0,0,0,0.18)]" style={{ backgroundColor: displayBanner.bg }}>
      <div className="absolute inset-0 opacity-45" style={getBannerShapeStyle(displayBanner)} />
      <div className="relative grid gap-5 px-6 py-7 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: displayBanner.stripBg }}>{displayBanner.tag}</p>
          <h2 className="mt-2 text-4xl font-black uppercase leading-none text-white sm:text-6xl">{displayBanner.headline}</h2>
          <p className="mt-3 text-lg font-bold text-white/75">{displayBanner.strip}</p>
        </div>
        <button type="button" onClick={() => openBannerAction(displayBanner, fallbackQuery, onOpen)} className="rounded-3xl border-[4px] border-dashed border-black bg-white px-8 py-5 text-center shadow-[8px_8px_0_#111] transition hover:-translate-y-1">
          <p className="text-5xl font-black" style={{ color: displayBanner.badgeTopBg }}>{displayBanner.badgeTop}</p>
          <p className="text-3xl font-black text-black">{displayBanner.badgeMid}</p>
          <p className="mt-2 rounded-full px-5 py-2 text-sm font-black uppercase text-black" style={{ backgroundColor: displayBanner.stripBg }}>{displayBanner.badgeBottom}</p>
        </button>
      </div>
    </div>
  );
};

const MiniAnnouncementBanner = ({ banner, fallbackQuery = '', onOpen }) => {
  const displayBanner = mergeBannerTheme(banner);
  return (
    <button type="button" onClick={() => openBannerAction(displayBanner, fallbackQuery, onOpen)} className="flex w-full flex-col gap-3 rounded-[24px] border-[3px] border-black px-6 py-5 text-left shadow-[0_12px_0_rgba(0,0,0,0.16)] transition hover:-translate-y-1 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: displayBanner.stripBg }}>
      <span className="rounded-full bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">{displayBanner.tag}</span>
      <span className="text-2xl font-black uppercase text-black">{displayBanner.headline}</span>
      <span className="grid h-11 w-16 shrink-0 place-items-center rounded-full bg-black text-2xl font-black text-white">→</span>
    </button>
  );
};

const GifBanner = ({ banner, fallbackQuery = '', onOpen }) => {
  const displayBanner = mergeBannerTheme(banner);
  const openBanner = () => openBannerAction(displayBanner, fallbackQuery, onOpen);

  return (
    <div className="relative overflow-hidden rounded-[28px] border-[3px] border-[#151515] shadow-[0_18px_0_rgba(0,0,0,0.18)]" style={{ backgroundColor: displayBanner.bg }}>
      <div className="absolute inset-0 opacity-55" style={getBannerShapeStyle(displayBanner)} />
      <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <button type="button" onClick={openBanner} className="group overflow-hidden rounded-3xl border-[4px] border-black bg-black shadow-[10px_10px_0_#111]">
          {displayBanner.mediaUrl ? (
            <img src={displayBanner.mediaUrl} alt={displayBanner.mediaAlt || displayBanner.headline} className="aspect-video h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="grid aspect-video place-items-center bg-white/10 text-lg font-black text-white">GIF</div>
          )}
        </button>
        <div className="px-1 py-2 sm:px-4">
          <p className="mb-3 inline-flex rotate-[-2deg] rounded-lg border-[3px] border-black px-4 py-1 text-sm font-black uppercase tracking-wide text-black shadow-[5px_5px_0_#000]" style={{ backgroundColor: displayBanner.stripBg }}>
            {displayBanner.tag}
          </p>
          <h2 className="max-w-4xl text-4xl font-black uppercase leading-[0.96] tracking-tight [text-shadow:4px_4px_0_#050505] sm:text-5xl lg:text-6xl" style={{ color: displayBanner.text }}>
            {displayBanner.headline}
          </h2>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="rounded-2xl border-[3px] border-black px-4 py-3 text-base font-black uppercase text-black shadow-[5px_5px_0_#000]" style={{ backgroundColor: displayBanner.stripBg }}>
              {displayBanner.strip}
            </p>
            <button type="button" onClick={openBanner} className="inline-flex h-12 w-20 items-center justify-center rounded-full bg-[#151515] text-2xl font-black text-white transition hover:scale-105" aria-label={`Open ${displayBanner.tag}`}>
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DynamicHomepageModule = ({ section, index = 0, onOpen }) => {
  if (!section.products?.length) return null;

  if (section.type === 'featured_split') {
    return <FeaturedSplitModule section={section} onOpen={onOpen} />;
  }

  if (section.type === 'product_grid') {
    return <ProductGridModule section={section} onOpen={onOpen} />;
  }

  if (section.type === 'compact_deals') {
    return <CompactDealsModule section={section} onOpen={onOpen} />;
  }

  if (section.type === 'category_tiles') {
    return <DepartmentTilesModule section={section} onOpen={onOpen} />;
  }

  if (section.type === 'mosaic_grid') {
    return <MosaicGridModule section={section} onOpen={onOpen} />;
  }

  if (section.type === 'editorial_stack') {
    return <EditorialStackModule section={section} onOpen={onOpen} />;
  }

  if (section.type === 'brand_marquee') {
    return <BrandMarqueeModule section={section} onOpen={onOpen} />;
  }

  const [showcase] = buildDynamicProductShowcases([section], index);
  return showcase ? <ProductShowcase showcase={showcase} onExplore={onOpen} /> : null;
};

const sectionTheme = (section = {}, index = 0) => ({
  frame: section.theme?.frame || ['bg-[#047857]', 'bg-[#c2410c]', 'bg-[#1d4ed8]', 'bg-[#7c3aed]', 'bg-[#be123c]'][index % 5],
  stripe: section.theme?.stripe || ['bg-[#29aa78]', 'bg-[#fb923c]', 'bg-[#60a5fa]', 'bg-[#a78bfa]', 'bg-[#fb7185]'][index % 5],
});

const SectionHeader = ({ section, onOpen, light = false }) => (
  <div className="mb-4 flex items-center justify-between gap-4 px-1">
    <div>
      <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${light ? 'text-black/55' : 'text-white/75'}`}>{section.tag || 'Admin curated'}</p>
      <h3 className={`text-3xl font-black ${light ? 'text-black' : 'text-white'}`}>{section.title}</h3>
      {(section.subtitle || section.strip) && <p className={`mt-1 text-sm font-bold ${light ? 'text-black/60' : 'text-white/65'}`}>{section.subtitle || section.strip}</p>}
    </div>
    <button type="button" onClick={() => onOpen(section.query || section.title)} className={`inline-flex h-11 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-black transition hover:scale-105 ${light ? 'bg-black text-white' : 'bg-white text-[#151515]'}`} aria-label={`Explore ${section.title}`}>
      →
    </button>
  </div>
);

const ProductGridModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.products.slice(0, 6).map((product, index) => (
          <ProductMiniTile key={`${section.id}-grid-${product.id || index}`} product={product} index={index} compact={index > 1} />
        ))}
      </div>
    </section>
  );
};

const FeaturedSplitModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  const [hero, ...rest] = section.products;
  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="grid gap-3 rounded-2xl bg-white p-3 lg:grid-cols-[1.25fr_0.75fr]">
        <ProductMiniTile product={hero} index={0} size="hero" />
        <div className="grid gap-3">
          {rest.slice(0, 3).map((product, index) => (
            <ProductMiniTile key={`${section.id}-split-${product.id || index}`} product={product} index={index + 1} horizontal />
          ))}
        </div>
      </div>
    </section>
  );
};

const CompactDealsModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        {section.products.slice(0, 8).map((product, index) => (
          <a key={`${section.id}-deal-${product.id || index}`} href={`/product/${product.id}`} className="group flex min-w-0 items-center gap-3 rounded-xl bg-[#f3f3f3] p-3 transition hover:-translate-y-1 hover:shadow-[0_14px_26px_rgba(0,0,0,0.16)]">
            <ProductTileImage product={product} className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <h4 className="truncate text-sm font-black text-black">{product.title}</h4>
              <p className="text-xs font-black text-black">Limited offer</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

const DepartmentTilesModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  const departments = buildCategoryTiles(section.products).slice(0, 8);
  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        {departments.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <button key={`${tile.category}-${index}`} type="button" onClick={() => onOpen(tile.category)} className="overflow-hidden rounded-2xl bg-[#f4f4f4] text-left transition hover:-translate-y-1 hover:shadow-[0_14px_26px_rgba(0,0,0,0.16)]">
              <div className={`grid aspect-[1.45] place-items-center bg-gradient-to-br ${tile.accent}`}>
                <span className="grid h-20 w-20 place-items-center rounded-3xl border-[3px] border-black bg-white text-black shadow-[7px_7px_0_#111]">
                  <Icon className="h-9 w-9" />
                </span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="truncate text-lg font-black text-black">{tile.category}</h4>
                  <span className="rounded-full bg-black px-2.5 py-1 text-xs font-black text-white">{tile.count}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm font-bold text-black/60">{tile.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const MosaicGridModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  const products = section.products.slice(0, 7);
  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="grid gap-3 rounded-2xl bg-white p-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <div key={`${section.id}-mosaic-${product.id || index}`} className={index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}>
            <ProductMiniTile product={product} index={index} size={index === 0 ? 'hero' : 'regular'} />
          </div>
        ))}
      </div>
    </section>
  );
};

const EditorialStackModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  const [lead, ...rest] = section.products;
  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="grid gap-3 rounded-2xl bg-[#f8fafc] p-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-black p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">{section.tag || 'Guide'}</p>
          <h4 className="mt-3 text-3xl font-black">{section.headline || section.title}</h4>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/65">{section.strip || 'Curated products grouped into a shoppable story.'}</p>
          <button type="button" onClick={() => onOpen(section.query || section.title)} className="mt-5 rounded-full bg-white px-5 py-2 text-sm font-black text-black">Shop guide</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[lead, ...rest.slice(0, 3)].filter(Boolean).map((product, index) => (
            <ProductMiniTile key={`${section.id}-story-${product.id || index}`} product={product} index={index} compact />
          ))}
        </div>
      </div>
    </section>
  );
};

const BrandMarqueeModule = ({ section, onOpen }) => {
  const theme = sectionTheme(section);
  const brands = uniqueProducts(section.products)
    .map((product) => product.brand || product.category || 'VendorHub')
    .filter(Boolean)
    .filter((brand, index, arr) => arr.indexOf(brand) === index)
    .slice(0, 10);

  return (
    <section className={`overflow-hidden rounded-[28px] ${theme.frame} p-4 shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <SectionHeader section={section} onOpen={onOpen} />
      <div className="flex gap-3 overflow-x-auto rounded-2xl bg-white p-3">
        {brands.map((brand, index) => (
          <button key={`${brand}-${index}`} type="button" onClick={() => onOpen(brand)} className="min-w-[170px] rounded-2xl border-[3px] border-black px-5 py-6 text-left shadow-[6px_6px_0_#111] transition hover:-translate-y-1" style={{ backgroundColor: ['#bfdbfe', '#fde68a', '#fecdd3', '#bbf7d0', '#ddd6fe'][index % 5] }}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/55">Brand</p>
            <p className="mt-2 truncate text-2xl font-black text-black">{brand}</p>
          </button>
        ))}
      </div>
    </section>
  );
};

const buildDynamicProductShowcases = (sections = []) => (
  sections
    .filter((section) => section.type === 'product_row' && section.products?.length)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map((section, index) => ({
      title: section.title,
      eyebrow: section.tag || 'Admin curated',
      description: section.subtitle || 'Curated from admin homepage CMS.',
      icon: Sparkles,
      frame: section.theme?.frame || ['bg-[#047857]', 'bg-[#c2410c]', 'bg-[#1d4ed8]', 'bg-[#7c3aed]', 'bg-[#be123c]'][index % 5],
      stripe: section.theme?.stripe || ['bg-[#29aa78]', 'bg-[#fb923c]', 'bg-[#60a5fa]', 'bg-[#a78bfa]', 'bg-[#fb7185]'][index % 5],
      query: section.query || section.title,
      products: section.products.slice(0, 4),
    }))
);

const buildProductShowcases = (products = [], trendingProducts = []) => {
  const allProducts = uniqueProducts(products);
  if (!allProducts.length) return [];

  const randomLane = (offset = 0) => (
    allProducts
      .map((product, index) => ({ product, score: ((index + 1) * 37 + offset * 19) % 101 }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
      .slice(0, 4)
  );

  return [
    {
      title: 'Top Selection',
      eyebrow: 'Suggested lane',
      description: 'Random product mix for the first homepage lane.',
      icon: TrendingUp,
      frame: 'bg-[#047857]',
      stripe: 'bg-[#29aa78]',
      query: 'trending',
      products: randomLane(1),
    },
    {
      title: "Today's Deals",
      eyebrow: 'Offer lane',
      description: 'Random deal-style products for now.',
      icon: BadgePercent,
      frame: 'bg-[#c2410c]',
      stripe: 'bg-[#fb923c]',
      query: 'best value',
      products: randomLane(2),
    },
    {
      title: 'New Arrivals',
      eyebrow: 'Fresh picks',
      description: 'Random fresh-looking products from loaded catalog.',
      icon: Sparkles,
      frame: 'bg-[#1d4ed8]',
      stripe: 'bg-[#60a5fa]',
      query: 'new arrivals',
      products: randomLane(3),
    },
    {
      title: 'Ready To Ship',
      eyebrow: 'Quick picks',
      description: 'Random in-stock style lane for checkout-focused products.',
      icon: PackageCheck,
      frame: 'bg-[#7c3aed]',
      stripe: 'bg-[#a78bfa]',
      query: 'in stock',
      products: randomLane(4),
    },
    {
      title: 'Top Rated',
      eyebrow: 'Premium row',
      description: 'Random premium-looking product row.',
      icon: Star,
      frame: 'bg-[#be123c]',
      stripe: 'bg-[#fb7185]',
      query: 'top rated',
      products: randomLane(5),
    },
  ].filter((section) => section.products.length > 0);
};

const ProductShowcase = ({ showcase, onExplore }) => {
  return (
    <section className={`relative min-w-0 overflow-hidden rounded-[28px] ${showcase.frame} p-4 text-[#111] shadow-[0_14px_0_rgba(0,0,0,0.16)]`}>
      <div className={`absolute inset-x-0 bottom-0 h-1/2 ${showcase.stripe}`} />
      <div className="relative mb-4 flex items-center justify-between px-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/80">{showcase.eyebrow}</p>
          <h3 className="text-3xl font-black text-white">{showcase.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onExplore(showcase.query)}
          className="inline-flex h-11 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-[#151515] transition hover:scale-105"
          aria-label={`Explore ${showcase.title}`}
        >
          →
        </button>
      </div>
      <div className="relative grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        {showcase.products.map((product, index) => (
          <ProductMiniTile key={`${showcase.title}-${product.id || index}`} product={product} index={index} />
        ))}
      </div>
    </section>
  );
};

const ProductMiniTile = ({ product, index, compact = false, horizontal = false, size = 'regular' }) => {
  const label = index % 2 === 0 ? 'Widest Range' : 'Special offer';
  const isHero = size === 'hero';
  const isWide = size === 'wide';

  if (horizontal) {
    return (
      <a href={`/product/${product.id}`} className="group grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-xl bg-[#f3f3f3] transition hover:-translate-y-1 hover:shadow-[0_14px_26px_rgba(0,0,0,0.16)]">
        <ProductTileImage product={product} className="h-full min-h-[126px]" />
        <div className="flex min-w-0 flex-col justify-center px-4 py-3">
          <h4 className="line-clamp-2 text-lg font-black text-black">{product.title}</h4>
          <p className="mt-1 text-base font-black text-black">{label}</p>
        </div>
      </a>
    );
  }

  return (
    <a href={`/product/${product.id}`} className={`group block overflow-hidden rounded-xl bg-[#f3f3f3] transition hover:-translate-y-1 hover:shadow-[0_14px_26px_rgba(0,0,0,0.16)] ${isWide ? 'lg:grid lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
      <ProductTileImage product={product} className={compact ? 'aspect-[1.9]' : isHero ? 'aspect-[1.35]' : isWide ? 'aspect-[1.55] lg:aspect-auto' : 'aspect-[1.55]'} />
      <div className={`${isHero ? 'px-5 py-5' : 'px-3 py-3'} ${isWide ? 'lg:flex lg:flex-col lg:justify-center lg:px-5' : ''}`}>
        <h4 className={`${isHero ? 'text-2xl' : compact ? 'text-base' : 'text-lg'} truncate font-black text-black`}>{product.title}</h4>
        <p className={`${isHero ? 'text-xl' : 'text-base'} mt-0.5 font-black text-black`}>{label}</p>
      </div>
    </a>
  );
};

const ProductTileImage = ({ product, className = '' }) => (
  <div className={`flex items-center justify-center overflow-hidden bg-[#efefef] ${className}`}>
    {product.image ? (
      <img src={product.image} alt={product.title} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" loading="lazy" />
    ) : (
      <div className="grid h-20 w-20 place-items-center rounded-2xl border-[3px] border-black bg-white shadow-[6px_6px_0_#111]">
        <ShoppingBag className="h-9 w-9 text-black" />
      </div>
    )}
  </div>
);

const AIPersonalizedShelf = ({ personalized, onSearch }) => (
  <section className="mt-5 rounded-2xl border border-white/10 bg-[#11131f] p-5">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#635bff]/30 bg-[#635bff]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#c8c3ff]">
          <Eye className="h-3.5 w-3.5" />
          AI based on your activity
        </div>
        <h3 className="text-xl font-black text-[#f1efff]">Recommended categories for you</h3>
        <p className="mt-1 text-sm font-semibold text-[#aaa6ba]">
          Recent searches aur viewed products se AI matching category lane bana raha hai.
        </p>
      </div>
      {!personalized.hasSignals && (
        <p className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-[#aaa6ba]">
          Search ya product view karoge to yeh section personalize hoga.
        </p>
      )}
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(personalized.categories.length ? personalized.categories : []).map((item) => (
          <button
            key={item.category}
            type="button"
            onClick={() => onSearch(item.category)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#8079ff]/40 hover:bg-white/[0.07]"
          >
            <p className="text-sm font-black text-[#f1efff]">{item.category}</p>
            <p className="mt-1 text-xs font-bold text-[#aaa6ba]">{item.count} matched product{item.count === 1 ? '' : 's'}</p>
          </button>
        ))}
        {!personalized.categories.length && (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-semibold text-[#aaa6ba] sm:col-span-2">
            No category signal yet. Search a product or open any product detail.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <p className="mb-3 text-sm font-black text-[#f1efff]">AI matched products</p>
        <div className="space-y-2">
          {personalized.products.map((product) => (
            <a key={product.id} href={`/product/${product.id}`} className="block rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-[#d7d2ff] transition hover:bg-white/10">
              {product.title}
            </a>
          ))}
          {!personalized.products.length && (
            <p className="text-sm font-semibold leading-6 text-[#aaa6ba]">No product signal yet.</p>
          )}
        </div>
      </div>
    </div>
  </section>
);

const AiCatalogPanel = ({ insights, products, featuredProducts, onReset }) => (
  <section className="rounded-2xl border border-[#635bff]/25 bg-[linear-gradient(135deg,rgba(99,91,255,0.14),rgba(17,19,31,0.92))] p-5">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#635bff]/20 text-[#d8d4ff]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#aaa5ff]">AI Catalog Assistant</p>
            <h3 className="text-xl font-black text-[#f1efff]">Live product insights</h3>
          </div>
        </div>
        <p className="max-w-2xl text-sm font-semibold leading-6 text-[#c9c5dc]">{insights.summary}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <InsightChip label="Best value" value={insights.cheapest?.title || 'Waiting'} />
          <InsightChip label="Top rated" value={insights.topRated?.title || 'Waiting'} />
          <InsightChip label="Top category" value={insights.topCategory} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-[#f1efff]">AI picks from real data</p>
          <button type="button" onClick={onReset} className="text-xs font-black text-[#c8c3ff]">Reset</button>
        </div>
        <div className="space-y-2">
          {featuredProducts.length ? featuredProducts.slice(0, 3).map((product) => (
            <a key={product.id} href={`/product/${product.id}`} className="block rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-[#d7d2ff] transition hover:bg-white/10">
              {product.title}
            </a>
          )) : (
            <p className="text-sm font-semibold leading-6 text-[#aaa6ba]">No real product available for AI picking yet.</p>
          )}
        </div>
      </div>
    </div>
  </section>
);

const InsightChip = ({ label, value }) => (
  <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8d88b2]">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-[#f1efff]">{value}</p>
  </div>
);
