import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Bot,
  Boxes,
  Clock,
  Eye,
  Filter,
  Headphones,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
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

export default function Home() {
  const { products, trendingProducts, recentlyViewed, loading, error, filters, updateFilters, resetFilters, pagination } = useProduct();
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
  const totalProducts = pagination?.total ?? products.length;
  const activeStatus = error ? 'Service issue detected' : products.length ? 'Live Product Service' : 'Waiting for real products';

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
    <div className="min-h-screen overflow-hidden bg-[#050716] text-[#eeecff]">
      <section className="relative overflow-hidden border-b border-white/5">
        {heroSlides.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === heroIndex ? 'animate-hero-drift opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,22,0.76),rgba(5,7,22,0.92)),radial-gradient(circle_at_50%_20%,rgba(99,91,255,0.22),transparent_36%)]" />
        <div className="ai-wave-flow ai-wave-flow-one" />
        <div className="ai-wave-flow ai-wave-flow-two" />
        <div className="ai-wave-flow ai-wave-flow-three" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#c8c3ff]">
            <Sparkles className="h-4 w-4" />
            AI Commerce Catalog
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.04] tracking-tight text-[#f1efff] sm:text-5xl lg:text-6xl">
            Discover Premium Products
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-7 text-[#b9b6cb] sm:text-base">
            Product Service se real catalog load hota hai. Search, filters, stock status, detail flow, aur AI catalog insights ek hi storefront mein.
          </p>

          <form onSubmit={handleHeroSearch} className="relative mx-auto mt-7 flex max-w-2xl flex-col gap-3 rounded-2xl border border-[#8d87ff]/25 bg-white/[0.06] p-2 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur sm:flex-row">
            <div className="flex h-12 flex-1 items-center gap-3 rounded-xl bg-[#151724] px-4">
              <Search className="h-5 w-5 text-[#c8c3ff]" />
              <input
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="AI product finder: phone under 50000, Samsung, camera..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-[#f1efff] outline-none placeholder:text-[#817d94]"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-xl bg-[#635bff] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(99,91,255,0.24)] transition hover:bg-[#746dff]"
            >
              Find Products
            </button>
            {searchFocused && (searchQuery || suggestions.length > 0 || recentSearches.length > 0) && (
              <div className="absolute left-2 right-2 top-[calc(100%+10px)] z-30 rounded-2xl border border-white/10 bg-[#11131f]/95 p-3 text-left shadow-2xl backdrop-blur">
                <div className="mb-2 flex items-center gap-2 px-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#aaa5ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI product suggestions
                </div>
                <div className="space-y-2">
                  {suggestions.map((product) => (
                    <a
                      key={product.id}
                      href={`/product/${product.id}`}
                      onClick={() => saveRecentSearch(searchQuery || product.title)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/8"
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-white/10">
                        {product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#f1efff]">{product.title}</p>
                        <p className="truncate text-xs font-semibold text-[#aaa6ba]">{product.category || 'General'} - {product.currency} {product.priceAmount}</p>
                      </div>
                    </a>
                  ))}
                  {!suggestions.length && searchQuery && (
                    <button type="button" onClick={() => runProductSearch(searchQuery)} className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-[#d7d2ff] hover:bg-white/8">
                      Search Product Service for "{searchQuery}"
                    </button>
                  )}
                  {!searchQuery && recentSearches.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-2 py-1">
                      {recentSearches.map((item) => (
                        <button key={item} type="button" onClick={() => runProductSearch(item)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-[#c8c3ff] hover:bg-white/8">
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
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {['Electronics', 'Best value', 'Camera phone'].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => runProductSearch(prompt)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-black text-[#c8c3ff] transition hover:bg-white/10"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AI Smart Filter Banner */}
      <section className="border-b border-white/5 bg-[#0f1119]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <AISmartFilterBanner
            suggestion="Find 4K monitors with low blue light for productivity"
            onApply={() => updateFilters({ searchTerm: '4K monitor low blue light' })}
          />
        </div>
      </section>

      {/* Category Filter Bar */}
      <section className="border-b border-white/5 bg-[#050716]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <CategoryFilterBar
            categories={categories}
            selectedCategory={filters.category}
            onCategoryChange={(cat) => updateFilters({ category: cat })}
            topCategories={['Computers', 'Audio', 'Cameras', 'Wearables']}
          />
        </div>
      </section>

      <section className="border-b border-white/5 bg-[#12131c]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
          <StatCard icon={ShoppingBag} value={totalProducts} label="Products Available" tone="purple" />
          <StatCard icon={BadgeCheck} value={categories.length} label="Categories Found" tone="orange" />
          <StatCard icon={Headphones} value={aiInsights.inStockCount} label="Ready to Ship" tone="purple" />
        </div>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Compact Filter Bar */}
        <div className="mb-6 space-y-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#bdb8ff]">
              <span className={`h-2 w-2 rounded-full ${error ? 'bg-amber-300' : products.length ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              {activeStatus}
            </div>
            <h2 className="text-xl font-black text-[#f1efff]">Showing {products.length} products</h2>
            <p className="mt-1 text-xs font-semibold text-[#aaa6ba]">
              {filters.searchTerm ? `Search result: ${filters.searchTerm}` : 'All data is fetched from Product Service API'}
            </p>
          </div>

          {/* Filter Controls Row */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-[#1a1a25]/60 p-4">
            {/* Categories Filter */}
            <div className="flex h-10 items-center gap-2 rounded-lg bg-[#12131c] px-3 text-sm font-bold">
              <Filter className="h-4 w-4 text-[#8d87d8]" />
              <select
                value={filters.category}
                onChange={(event) => updateFilters({ category: event.target.value })}
                className="bg-transparent text-[#efedff] outline-none"
              >
                <option className="bg-[#12131c]" value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} className="bg-[#12131c]" value={cat}>{cat}</option>
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
              className="h-10 w-24 rounded-lg border border-white/10 bg-[#12131c] px-3 text-xs font-bold text-[#efedff] outline-none placeholder:text-[#777486] focus:border-[#716aff]"
            />

            {/* Price Max */}
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(event) => updateFilters({ maxPrice: event.target.value })}
              placeholder="Max Price"
              className="h-10 w-24 rounded-lg border border-white/10 bg-[#12131c] px-3 text-xs font-bold text-[#efedff] outline-none placeholder:text-[#777486] focus:border-[#716aff]"
            />

            {/* Sort */}
            <div className="flex h-10 items-center gap-2 rounded-lg bg-[#12131c] px-3 text-sm font-bold">
              <SlidersHorizontal className="h-4 w-4 text-[#8d87d8]" />
              <select
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value })}
                className="bg-transparent text-[#efedff] outline-none"
              >
                <option className="bg-[#12131c]" value="newest">Newest</option>
                <option className="bg-[#12131c]" value="price_asc">Low Price</option>
                <option className="bg-[#12131c]" value="price_desc">High Price</option>
                <option className="bg-[#12131c]" value="title_asc">A to Z</option>
                <option className="bg-[#12131c]" value="stock_desc">Stock</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetFilters}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-[#635bff]/15 px-3 text-xs font-black text-[#d8d4ff] hover:bg-[#635bff]/25 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">
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
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[380px] animate-pulse rounded-2xl border border-white/10 bg-[#1b1b25]" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product, index) => (
                <ProductCard key={product.id || index} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#11131f] p-8 text-center">
              <Boxes className="mx-auto mb-3 h-10 w-10 text-[#777486]" />
              <h3 className="text-xl font-black text-[#f1efff]">No products found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#aaa6ba]">
                Try adjusting your filters or search to find what you're looking for.
              </p>
              <button type="button" onClick={resetFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#dedcff] px-5 py-3 text-sm font-black text-[#131329]">
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

const StatCard = ({ icon: Icon, value, label, tone }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-[#1b1b24] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.2)]">
    <div className={`grid h-12 w-12 place-items-center rounded-xl ${tone === 'orange' ? 'bg-orange-500/15 text-orange-300' : 'bg-[#635bff]/15 text-[#c5c0ff]'}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-2xl font-black text-[#f4f1ff]">{value}</p>
      <p className="text-sm font-bold text-[#b8b3c8]">{label}</p>
    </div>
  </div>
);
