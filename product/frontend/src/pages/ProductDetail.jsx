import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Heart,
  ImageIcon,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Zap,
  Bot
} from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

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

const normalizeImages = (product) => {
  const safeProduct = product || {};
  const images = [safeProduct.image, ...(safeProduct.images || [])]
    .map((image) => (typeof image === 'string' ? image : image?.url || image?.thumbnail || ''))
    .filter(Boolean);
  return [...new Set(images)];
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProductById, fetchRelatedProducts, loading, wishlist, toggleWishlist } = useProduct();
  const { requireAuth } = useAuthBridge();
  const { addItem, busyItemId } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  const [isLoading, setIsLoading] = useState(true);

  const images = useMemo(() => normalizeImages(product), [product]);
  const displayImage = selectedImage || images[0] || '';
  const previewImages = useMemo(() => (
    images.filter((image) => image && image !== displayImage).slice(0, 4)
  ), [displayImage, images]);
  const rating = Number(product?.ratingAverage || 0);
  const reviewCount = Number(product?.ratingCount || 0);
  const stockLabel = product?.inStock ? (product.lowStock ? 'Low stock' : 'In stock') : 'Out of stock';
  const isWishlisted = useMemo(() => (
    product?.id ? wishlist.some((item) => item.id === product.id || item._id === product.id) : false
  ), [product?.id, wishlist]);

  useEffect(() => {
    let mounted = true;
    const loadProduct = async () => {
      setIsLoading(true);
      const data = await fetchProductById(id);
      if (!mounted) return;
      
      if (data) {
        setProduct(data);
        const productImages = normalizeImages(data);
        setSelectedImage(productImages[0] || '');
        setIsLoading(false); // Render product immediately

        // Fetch related products in background
        fetchRelatedProducts(id).then(related => {
          if (mounted) setRelatedProducts(related);
        });
        
        // Fetch AI Insights in background
        const token = window.localStorage.getItem('vendorhub_access_token');
        fetch(`/ai/product/${id}/insights`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
        .then(res => res.json())
        .then(aiData => {
          if (mounted && aiData.success && aiData.aiInsights) {
            setAiInsights(aiData.aiInsights);
          }
          if (mounted) setAiLoading(false);
        })
        .catch(e => {
          console.error("Failed to fetch AI insights", e);
          if (mounted) setAiLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    };
    loadProduct();
    return () => {
      mounted = false;
    };
  }, [fetchProductById, fetchRelatedProducts, id]);

  const handleWishlist = async () => {
    if (!product?.id) return;
    if (!requireAuth('Login required to save products in wishlist')) return;
    setWishlistBusy(true);
    await toggleWishlist(product.id, !isWishlisted);
    setWishlistBusy(false);
  };

  const handleCartAction = async () => {
    if (!product?.id) return;
    if (!requireAuth('Login required to continue shopping')) return;
    const result = await addItem(product.id, quantity);
    setCartMessage(result.success ? `${quantity} item${quantity === 1 ? '' : 's'} added to cart` : result.message);
    window.setTimeout(() => setCartMessage(''), 2600);
  };

  if (isLoading || (loading && !product)) {
    return (
      <div className="min-h-screen bg-[#f6f4ee] px-4 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center rounded-[30px] border border-stone-200 bg-white p-10 text-center shadow-[0_22px_60px_rgba(28,25,23,0.10)]">
          <div className="h-12 w-12 animate-spin rounded-full border-[4px] border-stone-200 border-t-stone-950" />
          <p className="mt-4 text-lg font-black text-stone-950">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f6f4ee] px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-stone-200 bg-white p-10 text-center shadow-[0_22px_60px_rgba(28,25,23,0.10)]">
          <PackageCheck className="mx-auto h-12 w-12 text-emerald-700" />
          <h1 className="mt-4 text-3xl font-black text-stone-950">Product not found</h1>
          <p className="mt-2 font-bold text-stone-500">The product you are looking for is not available.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800">
            Back to store <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_8%,rgba(245,158,11,0.10),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.10),transparent_28%),linear-gradient(135deg,#fbfaf7_0%,#f3efe5_48%,#eef5ed_100%)] px-3 py-4 text-stone-950 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:text-stone-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="overflow-hidden rounded-[28px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,251,235,0.70)_48%,rgba(236,253,245,0.62))] shadow-[0_26px_70px_rgba(28,25,23,0.10)] backdrop-blur-xl">
          <div className="grid items-start gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-stone-200 bg-stone-50 p-3 sm:p-4 lg:border-b-0 lg:border-r">
              <div className="relative overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-sm">
                <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium pick
                </div>
                <div className="grid h-[165px] place-items-center sm:h-[260px] lg:aspect-[5/4] lg:h-auto lg:max-h-[calc(100vh-210px)] lg:min-h-[300px]">
                  {displayImage ? (
                    <img src={displayImage} alt={product.title} className="h-full w-full object-contain p-3" />
                  ) : (
                    <ImageIcon className="h-20 w-20 text-black/35" />
                  )}
                </div>
              </div>

              {previewImages.length > 0 && (
                <div className="mt-3 rounded-[20px] border border-stone-200 bg-white p-2 shadow-sm">
                  <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">More images</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {previewImages.map((image, index) => (
                    <button
                      key={`${image || 'placeholder'}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className="aspect-[4/3] overflow-hidden rounded-[14px] border border-stone-200 bg-stone-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:ring-4 hover:ring-emerald-100"
                      aria-label={`Preview product image ${index + 1}`}
                    >
                      <img src={image} alt={`${product.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-5 lg:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">{product.category || 'General'}</span>
                {product.brand && <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-stone-600">{product.brand}</span>}
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${product.inStock ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{stockLabel}</span>
              </div>

              <h1 className="mt-3 text-2xl font-black leading-none text-stone-950 sm:text-4xl">{product.title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <Star key={item} className={`h-5 w-5 ${item < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                  ))}
                </div>
                <p className="text-sm font-black text-stone-600">{rating.toFixed(1)} / 5</p>
                <p className="text-sm font-bold text-stone-400">{reviewCount} review{reviewCount === 1 ? '' : 's'}</p>
              </div>

              <div className="mt-3 rounded-[20px] bg-stone-950 p-3 text-white shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Current price</p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  <p className="text-3xl font-black text-amber-200 sm:text-4xl">{formatPrice(product.priceAmount, product.currency)}</p>
                  {product.discount && <p className="mb-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900">Save {product.discount}%</p>}
                </div>
              </div>

              <div className="mt-3 rounded-[20px] border border-stone-200 bg-stone-50 p-3 sm:p-4">
                <h2 className="text-base font-black sm:text-lg">Product details</h2>
                <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-stone-600 sm:line-clamp-4 sm:leading-6">{product.description || 'No description available for this product yet.'}</p>
                {product.tags?.length > 0 && (
                  <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
                    {product.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-black text-stone-500">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {product.inStock && (
                <div className="mt-3 flex flex-col gap-3 rounded-[20px] border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Quantity</p>
                    <div className="mt-2 flex items-center gap-2">
                      <QuantityButton disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></QuantityButton>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
                        className="h-10 w-16 rounded-2xl border border-stone-200 bg-stone-50 text-center text-sm font-black outline-none focus:border-emerald-400"
                      />
                      <QuantityButton onClick={() => setQuantity(quantity + 1)}><Plus className="h-4 w-4" /></QuantityButton>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-stone-500">Line total <span className="block text-xl font-black text-stone-950">{formatPrice(product.priceAmount * quantity, product.currency)}</span></p>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={handleCartAction}
                  disabled={!product.inStock || busyItemId === product.id}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 ${
                    product.inStock ? 'bg-stone-950 text-white hover:bg-emerald-800' : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {busyItemId === product.id ? 'Adding...' : product.inStock ? 'Add to cart' : 'Out of stock'}
                </button>
                <button
                  type="button"
                  onClick={handleWishlist}
                  disabled={wishlistBusy}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 ${
                    isWishlisted ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="hidden sm:inline">{isWishlisted ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              {cartMessage && (
                <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-black text-amber-900 shadow-sm">
                  {cartMessage}
                </div>
              )}

            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <TrustCard icon={Truck} title="Free delivery" text="Fast dispatch on eligible orders" />
          <TrustCard icon={RotateCcw} title="Easy returns" text="30-day replacement support" />
          <TrustCard icon={ShieldCheck} title="Secure checkout" text="Protected cart and payment flow" />
        </section>

        {aiLoading ? (
          <div className="mt-8 flex items-center gap-3 rounded-[24px] border border-stone-200 bg-stone-50 p-6 opacity-70">
            <div className="flex h-5 w-5 animate-spin items-center justify-center rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm font-black text-stone-500">Generating AI Summary...</span>
          </div>
        ) : aiInsights ? (
          <section className="mt-8 overflow-hidden rounded-[28px] border border-emerald-200/60 bg-[linear-gradient(145deg,rgba(236,253,245,0.7),rgba(255,255,255,0.9))] p-1.5 shadow-sm">
            <div className="rounded-[22px] bg-white/70 p-5 sm:p-7 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-black bg-gradient-to-r from-emerald-700 to-emerald-900 bg-clip-text text-transparent">AI Summary</h2>
              </div>
              
              <div className="text-[15px] font-medium leading-relaxed text-stone-700 min-h-[44px]">
                <TypewriterText text={aiInsights.shortSummary} speed={15} />
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800 mb-3">Key Highlights</h3>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {aiInsights.keyHighlights?.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm font-medium text-stone-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {aiInsights.insightBoxes && (
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/50 p-4 border border-emerald-100/50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-800">Shopper Appeal</h4>
                    </div>
                    <p className="text-xs font-bold text-stone-600 leading-snug">{aiInsights.insightBoxes.shopperAppeal}</p>
                  </div>
                  
                  <div className="rounded-2xl bg-white/50 p-4 border border-emerald-100/50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <PackageCheck className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-800">SKU & Seller</h4>
                    </div>
                    <p className="text-xs font-bold text-stone-600 leading-snug">{aiInsights.insightBoxes.skuAndSeller}</p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 border border-emerald-200/60 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-800">Buying Note</h4>
                    </div>
                    <p className="text-xs font-bold text-emerald-900 leading-snug">{aiInsights.insightBoxes.buyingNote}</p>
                  </div>
                </div>
              )}
              
              <p className="mt-4 text-right text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                Generated by AI • May contain inaccuracies
              </p>
            </div>
          </section>
        ) : null}

        {relatedProducts.length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Related picks</p>
                <h2 className="text-3xl font-black text-stone-950">More from this aisle</h2>
              </div>
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-stone-700 hover:text-emerald-800">
                Browse store <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const QuantityButton = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
  >
    {children}
  </button>
);

const TrustCard = ({ icon: Icon, title, text }) => (
  <article className="flex items-center gap-3 rounded-[20px] border border-stone-200 bg-white p-4 shadow-sm">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
      <Icon className="h-5 w-5" />
    </span>
    <span>
      <h3 className="text-sm font-black text-stone-950">{title}</h3>
      <p className="mt-0.5 text-xs font-bold leading-5 text-stone-500">{text}</p>
    </span>
  </article>
);

const InfoPanel = ({ icon: Icon, title, text }) => (
  <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f5ead2] text-stone-950">
      <Icon className="h-5 w-5" />
    </span>
    <h3 className="mt-3 text-lg font-black text-stone-950">{title}</h3>
    <p className="mt-2 text-sm font-bold leading-6 text-stone-500">{text}</p>
  </article>
);

const TypewriterText = ({ text, speed = 25 }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    if (!text) return;
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return <>{displayedText}<span className="inline-block w-1.5 h-4 ml-1 align-middle bg-emerald-500 animate-pulse rounded-sm" style={{ opacity: displayedText.length === text.length ? 0 : 1 }} /></>;
};
